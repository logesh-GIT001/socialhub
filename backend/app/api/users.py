from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_password_hash
from app.api.deps import get_current_user, PermissionChecker
from app.models.all import User, Role
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.audit_logger import log_action

router = APIRouter()


@router.get(
    "/",
    response_model=List[UserResponse],
    dependencies=[Depends(PermissionChecker(["users:manage"]))],
)
def get_users(
    db: Session = Depends(get_db)
) -> Any:
    """Retrieve all users in the system."""
    return db.query(User).all()


@router.post(
    "/",
    response_model=UserResponse,
    dependencies=[Depends(PermissionChecker(["users:manage"]))],
)
def create_user(
    user_in: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Creates a new user and assigns the selected roles."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )

    # Hash user password
    hashed_pwd = get_password_hash(user_in.password)
    
    new_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pwd,
        is_active=user_in.is_active,
        custom_permissions=user_in.custom_permissions,
    )
    db.add(new_user)
    db.flush()

    # Assign roles
    if user_in.roles:
        for r_name in user_in.roles:
            role_record = db.query(Role).filter(Role.name == r_name).first()
            if role_record:
                new_user.roles.append(role_record)
    
    db.commit()
    db.refresh(new_user)

    log_action(
        db,
        user_id=current_user.id,
        action="user_create",
        target_object=f"user:{new_user.id}",
        details={"assigned_roles": user_in.roles},
        request=request
    )

    return new_user


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieves detailed profile data for the currently authenticated user."""
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Retrieves detailed profile data for a single user."""
    # Employees can view their own profile, managers can view all
    if current_user.id != user_id:
        # Check permissions
        user_permissions = current_user.permissions
        if "users:manage" not in user_permissions:
            raise HTTPException(status_code=403, detail="Forbidden profile access.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Updates user fields, credentials, and role associations."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Permissions check
    is_self = current_user.id == user_id
    user_permissions = current_user.permissions
    is_admin = "users:manage" in user_permissions
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Forbidden profile update.")

    # Apply updates
    if user_in.email is not None:
        user.email = user_in.email
    if user_in.full_name is not None:
        user.full_name = user_in.full_name
    if user_in.password is not None:
        user.hashed_password = get_password_hash(user_in.password)
    
    # Fields that only an Administrator can modify
    if is_admin:
        if user_in.is_active is not None:
            user.is_active = user_in.is_active
            
        if user_in.roles is not None:
            user.roles = []
            for r_name in user_in.roles:
                role_record = db.query(Role).filter(Role.name == r_name).first()
                if role_record:
                    user.roles.append(role_record)
        
        if user_in.custom_permissions is not None:
            user.custom_permissions = user_in.custom_permissions

    db.commit()
    db.refresh(user)

    log_action(
        db,
        user_id=current_user.id,
        action="user_update",
        target_object=f"user:{user.id}",
        details={"updated_fields": list(user_in.model_dump(exclude_none=True).keys())},
        request=request
    )

    return user


@router.delete(
    "/{user_id}",
    dependencies=[Depends(PermissionChecker(["users:manage"]))],
)
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Deletes a user account from the system completely."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Users cannot delete their own accounts.")

    db.delete(user)
    db.commit()

    log_action(
        db,
        user_id=current_user.id,
        action="user_delete",
        target_object=f"user:{user_id}",
        request=request
    )

    return {"message": "User deleted successfully."}
