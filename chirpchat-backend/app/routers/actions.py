from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from datetime import datetime, timezone

from app.auth.dependencies import get_current_active_user
from app.auth.schemas import UserPublic
from app.notifications.service import notification_service
from app.database import db_manager
from app.websocket import manager as ws_manager
from app.utils.logging import logger
from app.actions.schemas import MoodUpdatePayload

router = APIRouter(prefix="/actions", tags=["Quick Actions"])

@router.post("/update-mood", response_model=UserPublic)
async def update_mood(
    payload: MoodUpdatePayload,
    current_user: UserPublic = Depends(get_current_active_user)
):
    """
    Updates the user's mood and notifies their partner.
    This is a simplified endpoint intended for quick actions like from the AssistiveTouch menu.
    """
    logger.info(f"User {current_user.id} updating mood to '{payload.mood}' via quick action.")
    
    update_data = {
        "mood": payload.mood,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # 1. Update the user's mood in the database
    updated_user_response_obj = await db_manager.get_table("users").update(update_data).eq("id", str(current_user.id)).select().single().execute()
    
    if not updated_user_response_obj.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or update failed")

    updated_user = UserPublic.model_validate(updated_user_response_obj.data)

    # 2. Broadcast the mood update via WebSocket to the partner
    await ws_manager.broadcast_user_profile_update(user_id=current_user.id, updated_data={"mood": updated_user.mood})
    
    # 3. Send a push notification to the partner (if they are offline)
    # The notification service will automatically check for DND status.
    if updated_user.partner_id and updated_user.mood != current_user.mood:
        await notification_service.send_mood_change_notification(user=updated_user, new_mood=updated_user.mood)
        
    return updated_user
