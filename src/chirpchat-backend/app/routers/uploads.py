

import os
import time
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Literal, Optional, List, Dict, Any

import cloudinary
from cloudinary.utils import api_sign_request
import cloudinary.uploader

from app.auth.dependencies import get_current_active_user 
from app.auth.schemas import UserPublic 
from app.utils.logging import logger 
from app.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True 
)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

class GetUploadSignatureRequest(BaseModel):
    public_id: str
    resource_type: Literal["image", "video", "raw", "auto"] = "auto"
    folder: str = "kuchlu_chat_media"

class UploadSignatureResponse(BaseModel):
    signature: str
    timestamp: int
    api_key: str
    cloud_name: str
    public_id: str
    folder: str
    resource_type: str
    type: str = "private"
    eager: Optional[str] = None
    notification_url: Optional[str] = None

@router.post("/get-cloudinary-upload-signature", response_model=UploadSignatureResponse, summary="Generate a signature for direct Cloudinary upload")
async def get_cloudinary_upload_signature(
    request: GetUploadSignatureRequest,
    current_user: UserPublic = Depends(get_current_active_user)
):
    """
    Generates a secure, time-sensitive signature that allows the client
    to upload a file directly to Cloudinary, bypassing our backend.
    """
    try:
        timestamp = int(time.time())
        final_folder = f"{request.folder}/user_{current_user.id}"
        
        params_to_sign: Dict[str, Any] = {
            "timestamp": timestamp,
            "public_id": request.public_id,
            "folder": final_folder,
            "resource_type": request.resource_type,
            "type": "private",
        }
        
        notification_url = None
        if settings.CLOUDINARY_WEBHOOK_URL:
            notification_url = settings.CLOUDINARY_WEBHOOK_URL
            params_to_sign["notification_url"] = notification_url
        else:
            logger.warning("CLOUDINARY_WEBHOOK_URL is not set. Direct uploads will work, but server-side processing notifications will not be received.")


        eager_transformations: List[Dict[str, Any]] = []
        if request.resource_type == "image":
            eager_transformations.extend([
                {"width": 250, "height": 250, "crop": "fill", "quality": "auto", "format": "jpg"},
                {"width": 800, "quality": "auto", "format": "webp"}
            ])
        elif request.resource_type == "video":
            eager_transformations.extend([
                {"format": "mp4", "quality": "auto:low", "video_codec": "auto"},
                {"streaming_profile": "auto", "format": "m3u8"},
                {"streaming_profile": "auto", "format": "mpd"},
                {"format": "jpg", "start_offset": "1", "width": 400, "crop": "scale"},
                {"format": "gif", "duration": "5", "width": 250, "crop": "fill"}
            ])

        if eager_transformations:
            eager_strings = []
            for t in eager_transformations:
                eager_strings.append(",".join([f"{k}_{v}" for k, v in t.items()]))
            params_to_sign["eager"] = "|".join(eager_strings)

        signature = api_sign_request(params_to_sign, settings.CLOUDINARY_API_SECRET)
        
        return UploadSignatureResponse(
            signature=signature,
            timestamp=timestamp,
            api_key=settings.CLOUDINARY_API_KEY,
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            public_id=request.public_id,
            folder=final_folder,
            resource_type=request.resource_type,
            type="private",
            eager=params_to_sign.get("eager"),
            notification_url=notification_url
        )
    except Exception as e:
        logger.error(f"Error generating Cloudinary signature: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate upload signature.")

async def delete_cloudinary_asset(public_id: str, resource_type: str):
    """
    Asynchronously deletes a media asset from Cloudinary.
    Intended to be run as a background task.
    """
    try:
        logger.info(f"Background task: Deleting Cloudinary asset {public_id} (Type: {resource_type})")
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type,
            invalidate=True  # Invalidate CDN cache
        )
        if result.get("result") == "ok":
            logger.info(f"Successfully deleted Cloudinary asset: {public_id}")
        elif result.get("result") == "not found":
            logger.warning(f"Cloudinary asset {public_id} not found, assuming already deleted.")
        else:
            logger.error(f"Cloudinary API reported an error for asset {public_id}: {result.get('error', 'Unknown error')}")
    except Exception as e:
        logger.error(f"Exception during Cloudinary deletion for asset {public_id}: {e}", exc_info=True)
        # In a production system, you might re-queue this task or send it to a dead-letter queue.
