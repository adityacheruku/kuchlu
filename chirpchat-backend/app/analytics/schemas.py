

from pydantic import BaseModel, Field
from typing import Optional, Literal
from uuid import UUID

class FileAnalyticsCreate(BaseModel):
    message_id: UUID
    upload_duration_seconds: float
    file_size_bytes: int
    compressed_size_bytes: Optional[int] = None
    network_quality: str
    file_type: str

class MoodAnalyticsContext(BaseModel):
    time_of_day: Literal['morning', 'afternoon', 'evening', 'night']
    day_of_week: Literal['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

class MoodAnalyticsCreate(BaseModel):
    mood_id: str = Field(..., max_length=50)
    context: MoodAnalyticsContext
