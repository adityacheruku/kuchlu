
import os
import time
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Literal, Optional, List

import cloudinary
from cloudinary.utils import api_sign_request

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
    eager: Optional[str] = None # E.g., "w_250,h_250,c_fill"

class UploadSignatureResponse(BaseModel):
    signature: str
    timestamp: int
    api_key: str
    cloud_name: str
    public_id: str
    folder: str
    resource_type: str
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
    Crucially, it includes a notification_url so Cloudinary can inform our backend
    when processing is complete.
    """
    try:
        timestamp = int(time.time())
        final_folder = f"{request.folder}/user_{current_user.id}"
        
        notification_url = f"{settings.API_BASE_URL}/webhooks/cloudinary/media-processed"

        params_to_sign = {
            "timestamp": timestamp,
            "public_id": request.public_id,
            "folder": final_folder,
            "resource_type": request.resource_type,
            "type": "private",
            "notification_url": notification_url,
        }
        if request.eager:
            params_to_sign["eager"] = request.eager

        signature = api_sign_request(params_to_sign, settings.CLOUDINARY_API_SECRET)
        
        return UploadSignatureResponse(
            signature=signature,
            timestamp=timestamp,
            api_key=settings.CLOUDINARY_API_KEY,
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            public_id=request.public_id,
            folder=final_folder,
            resource_type=request.resource_type,
            eager=request.eager,
            notification_url=notification_url
        )
    except Exception as e:
        logger.error(f"Error generating Cloudinary signature: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate upload signature.")
