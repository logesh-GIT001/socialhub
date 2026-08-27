from typing import Optional
from pydantic import BaseModel


class MediaUpdate(BaseModel):
    category: Optional[str] = None
    tags: Optional[str] = None
