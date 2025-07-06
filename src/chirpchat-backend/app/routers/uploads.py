

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
    public_id: Optional[str] = None
    folder: str = "kuchlu_chat_media"

class UploadSignatureResponse(BaseModel):
    signature: str
    timestamp: int
    api_key: str
    cloud_name: str
    public_id: Optional[str] = None
    folder: str
    upload_preset: str

@router.post("/get-cloudinary-upload-signature", response_model=UploadSignatureResponse, summary="Generate a signature for direct Cloudinary upload")
async def get_cloudinary_upload_signature(
    request: GetUploadSignatureRequest,
    current_user: UserPublic = Depends(get_current_active_user)
):
    """
    Generates a secure, time-sensitive signature that allows the client
    to upload a file directly to Cloudinary using a signed upload preset.
    The preset handles transformations, tagging, and webhook notifications.
    """
    try:
        timestamp = int(time.time())
        final_folder = f"{request.folder}/user_{current_user.id}"
        # NOTE: This upload preset must be created in your Cloudinary account
        # and configured as a 'signed' preset. It should also contain the
        # eager transformations and webhook notification URL.
        upload_preset = "kuchlu_signed_uploads"
        
        params_to_sign: Dict[str, Any] = {
            "timestamp": timestamp,
            "upload_preset": upload_preset,
            "folder": final_folder,
        }
        if request.public_id:
            params_to_sign["public_id"] = request.public_id
        
        signature = api_sign_request(params_to_sign, settings.CLOUDINARY_API_SECRET)
        
        return UploadSignatureResponse(
            signature=signature,
            timestamp=timestamp,
            api_key=settings.CLOUDINARY_API_KEY,
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            public_id=request.public_id,
            folder=final_folder,
            upload_preset=upload_preset
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
