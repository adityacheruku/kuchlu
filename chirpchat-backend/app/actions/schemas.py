from pydantic import BaseModel

class MoodUpdatePayload(BaseModel):
    mood: str

class MoodPingPayload(BaseModel):
    mood_id: str
    mood_emoji: str
