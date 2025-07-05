
import json
from fastapi import APIRouter, Request, Header, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
import cloudinary
import cloudinary.utils

from app.config import settings
from app.database import db_manager
from app.websocket import manager as ws_manager
from app.chat.routes import get_message_with_details_from_db
from app.utils.logging import logger

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

def verify_cloudinary_webhook(body: bytes, timestamp: str, signature: str) -> bool:
    """Verifies the signature of an incoming Cloudinary webhook using the official SDK."""
    try:
        cloudinary.utils.verify_webhook_signature(body.decode('utf-8'), signature, int(timestamp))
        return True
    except cloudinary.exceptions.AuthorizationError as e:
        logger.warning(f"Cloudinary webhook verification failed: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during webhook verification: {e}")
        return False

class EagerTransformation(BaseModel):
    transformation: str
    width: Optional[int] = None
    height: Optional[int] = None
    bytes: Optional[int] = None
    format: str
    url: str
    secure_url: str

class CloudinaryWebhookPayload(BaseModel):
    public_id: str
    version: int
    asset_id: str
    resource_type: str
    format: str
    bytes: int
    url: str
    secure_url: str
    duration: Optional[float] = None
    original_filename: Optional[str] = None
    eager: Optional[List[EagerTransformation]] = Field(None)
    notification_type: str

@router.post("/cloudinary/media-processed")
async def handle_cloudinary_media_processed(
    request: Request,
    x_cld_timestamp: str = Header(...),
    x_cld_signature: str = Header(...)
):
    """
    Handles webhook notifications from Cloudinary after a file upload and processing is complete.
    It updates the message in the database with the final media URLs and metadata.
    """
    if not settings.CLOUDINARY_API_SECRET:
        logger.error("CLOUDINARY_API_SECRET is not set, cannot verify webhook.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Webhook verification not configured.")
        
    body_bytes = await request.body()
    
    # 1. Verify webhook signature
    if not verify_cloudinary_webhook(body_bytes, x_cld_signature, x_cld_timestamp):
        logger.warning("Invalid Cloudinary webhook signature received.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    # 2. Parse body and find the message in DB
    try:
        data = json.loads(body_bytes)
        # We only care about the 'eager' notification type
        if data.get('notification_type') != 'eager':
            return {"status": "ignored", "reason": "notification type is not 'eager'"}
        
        payload = CloudinaryWebhookPayload.model_validate(data)
    except Exception as e:
        logger.error(f"Webhook payload validation error: {e}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Invalid webhook payload: {e}")

    message_resp = await db_manager.get_table("messages").select("id, chat_id").eq("client_temp_id", payload.public_id).maybe_single().execute()

    if not message_resp.data:
        logger.warning(f"Webhook received for unknown public_id/client_temp_id: {payload.public_id}")
        return {"status": "ignored", "reason": "message not found"}

    message_db_id = UUID(message_resp.data['id'])
    chat_id = str(message_resp.data['chat_id'])

    # 3. Prepare update data
    update_data = {
        "media_url": payload.secure_url,
        "upload_status": "completed",
        "file_size": payload.bytes,
    }
    
    file_metadata = {
        "duration_seconds": payload.duration,
        "document_name": payload.original_filename,
    }

    if payload.eager:
        # Assuming the first eager transformation is our standard preview/thumbnail
        update_data["thumbnail_url"] = payload.eager[0].secure_url
        file_metadata["preview_dimensions"] = f"{payload.eager[0].width}x{payload.eager[0].height}"

    update_data["file_metadata"] = json.dumps({k: v for k, v in file_metadata.items() if v is not None})

    # 4. Update DB
    await db_manager.get_table("messages").update(update_data).eq("id", str(message_db_id)).execute()

    # 5. Broadcast update via WebSocket
    updated_message = await get_message_with_details_from_db(message_db_id)
    if updated_message:
        await ws_manager.broadcast_media_processed(chat_id, updated_message)

    return {"status": "success"}
