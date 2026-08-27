import os
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import PermissionChecker, get_current_user
from app.models.all import User, Media
from app.schemas.post import MediaResponse
from app.schemas.media import MediaUpdate
from app.services.media_storage import media_storage
from app.services.audit_logger import log_action
from app.core.config import settings

router = APIRouter()


@router.post(
    "/upload",
    response_model=MediaResponse,
    dependencies=[Depends(PermissionChecker(["media:upload"]))],
)
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    category: str = Form("general"),
    tags: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Uploads a file to local storage or S3 and catalogs it in the media library."""
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Simple size validation (e.g. 50MB limit)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 50MB.")

    # Save to storage
    try:
        stored_path = media_storage.save_file(
            content=content,
            filename=file.filename,
            content_type=file.content_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write file to storage: {str(e)}")

    # Create DB entry
    db_media = Media(
        filename=file.filename,
        file_path=stored_path,
        file_size=file_size,
        content_type=file.content_type,
        category=category,
        tags=tags,
        uploaded_by_id=current_user.id,
    )
    db.add(db_media)
    db.commit()
    db.refresh(db_media)

    log_action(
        db,
        user_id=current_user.id,
        action="media_upload",
        target_object=f"media:{db_media.id}",
        details={"filename": file.filename, "size": file_size},
        request=request
    )

    return db_media


@router.get(
    "/",
    response_model=List[MediaResponse],
    dependencies=[Depends(PermissionChecker(["media:view"]))],
)
def get_media_library(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve media library assets, searchable by tag or file name."""
    query = db.query(Media)
    if category:
        query = query.filter(Media.category == category)
    if search:
        query = query.filter(
            (Media.filename.ilike(f"%{search}%")) | (Media.tags.ilike(f"%{search}%"))
        )
    return query.order_by(Media.created_at.desc()).all()


@router.put(
    "/{media_id}",
    response_model=MediaResponse,
    dependencies=[Depends(PermissionChecker(["media:upload"]))],
)
def update_media_details(
    media_id: int,
    media_update: MediaUpdate,
    db: Session = Depends(get_db)
) -> Any:
    """Update metadata (category, tags) of a media item."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media asset not found.")

    if media_update.category is not None:
        media.category = media_update.category
    if media_update.tags is not None:
        media.tags = media_update.tags

    db.commit()
    db.refresh(media)
    return media


@router.delete(
    "/{media_id}",
    dependencies=[Depends(PermissionChecker(["media:upload"]))],
)
def delete_media(
    media_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Delete a media asset from storage and databases."""
    media = db.query(Media).filter(Media.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media asset not found.")

    # Delete physical asset
    media_storage.delete_file(media.file_path)

    log_action(
        db,
        user_id=current_user.id,
        action="media_delete",
        target_object=f"media:{media_id}",
        details={"filename": media.filename},
        request=request
    )

    db.delete(media)
    db.commit()
    return {"message": "Media asset deleted successfully."}


# Local File Server Route (Development Fallback)
@router.get("/file/{filename}", include_in_schema=False)
def serve_local_file(filename: str):
    """Serves files stored locally on the server when running in local storage mode."""
    # Ensure correct local storage location
    file_path = os.path.join(settings.STORAGE_LOCAL_PATH, filename)
    
    # Path traversal validation
    real_path = os.path.abspath(file_path)
    real_storage_dir = os.path.abspath(settings.STORAGE_LOCAL_PATH)
    if not real_path.startswith(real_storage_dir):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path query.")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")
        
    return FileResponse(file_path)
