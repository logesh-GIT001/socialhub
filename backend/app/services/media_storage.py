import os
import uuid
from typing import Optional
from app.core.config import settings

class MediaStorage:
    def __init__(self):
        self.storage_type = settings.STORAGE_TYPE.lower()
        self.local_path = settings.STORAGE_LOCAL_PATH
        
        if self.storage_type == "local":
            os.makedirs(self.local_path, exist_ok=True)
        elif self.storage_type in ("s3", "minio"):
            # Import dynamically to make boto3 optional for basic runs
            import boto3
            from botocore.client import Config
            
            # Configure custom endpoint for MinIO/R2
            s3_args = {
                "aws_access_key_id": settings.S3_ACCESS_KEY,
                "aws_secret_access_key": settings.S3_SECRET_KEY,
                "region_name": settings.S3_REGION,
            }
            if settings.S3_ENDPOINT:
                s3_args["endpoint_url"] = settings.S3_ENDPOINT
                s3_args["config"] = Config(signature_version="s3v4")
                
            self.s3_client = boto3.client("s3", **s3_args)
            self.bucket_name = settings.S3_BUCKET_NAME

    def save_file(self, content: bytes, filename: str, content_type: str) -> str:
        """Saves file content to configured storage.
        
        Returns:
            Publicly accessible URL or relative asset path.
        """
        # Generate unique file name
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"

        if self.storage_type == "local":
            dest_path = os.path.join(self.local_path, unique_filename)
            with open(dest_path, "wb") as f:
                f.write(content)
            # Return relative path for web access or simulated URL
            return f"/api/media/file/{unique_filename}"
        else:
            # S3 / MinIO upload
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=content,
                ContentType=content_type,
                ACL="public-read" if self.storage_type == "s3" else "custom"
            )
            
            if settings.S3_ENDPOINT:
                # E.g. http://localhost:9000/socialhub-media/filename
                return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{unique_filename}"
            return f"https://{self.bucket_name}.s3.{settings.S3_REGION}.amazonaws.com/{unique_filename}"

    def delete_file(self, file_path: str) -> bool:
        """Deletes file from storage."""
        if self.storage_type == "local":
            filename = os.path.basename(file_path)
            full_path = os.path.join(self.local_path, filename)
            if os.path.exists(full_path):
                os.remove(full_path)
                return True
        else:
            # Extract key from S3 URL
            key = file_path.split("/")[-1]
            try:
                self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
                return True
            except Exception:
                return False
        return False


# Singleton instance
media_storage = MediaStorage()
