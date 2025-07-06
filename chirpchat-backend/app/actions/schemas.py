from pydantic import BaseModel

class MoodUpdatePayload(BaseModel):
    mood: str
