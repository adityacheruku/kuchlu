import os
import time
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Literal, Optional, List, Dict, Any # Import Any

import cloudinary
from cloudinary.utils import api_sign_request
from dotenv import load_dotenv
load_dotenv()
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
    folder: str = "user_media_uploads"
    # NEW: Add upload_preset to the request if client decides it, or hardcode it in backend
    # For simplicity, let's hardcode it in backend for now, as it's part of the preset setup.
    # If client needs to choose, add it here.

class UploadSignatureResponse(BaseModel):
    signature: str
    timestamp: int
    api_key: str
    cloud_name: str
    public_id: str
    folder: str
    resource_type: str
    upload_preset: str # <--- NEW: Add this to the response model
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

        # NEW: Define the upload preset name
        upload_preset_name = "my_signed__upload_preset" # <--- MUST BE EXACTLY YOUR PRESET NAME!

        if not settings.CLOUDINARY_WEBHOOK_URL:
            logger.error("CLOUDINARY_WEBHOOK_URL is not configured in the environment.")
            raise HTTPException(status_code=500, detail="Server is not configured for upload notifications.")

        notification_url = settings.CLOUDINARY_WEBHOOK_URL

        params_to_sign: Dict[str, Any] = {
            "timestamp": timestamp,
            "public_id": request.public_id,
            "folder": final_folder,
            "resource_type": request.resource_type,
            "type": "private", # This is the 'type' parameter (e.g., 'upload', 'private', 'authenticated')
            "notification_url": notification_url,
            "upload_preset": upload_preset_name, # <--- NEW: Include upload_preset in signed params
        }

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
        elif request.resource_type == "raw": # For documents, audio (if not video type)
            # No eager transformations for raw files typically, or specific document transforms
            pass
        elif request.resource_type == "auto": # Handle auto detection if needed
            # You might want to infer type from public_id or file extension here
            pass


        if eager_transformations:
            # Cloudinary expects eager transformations as a list of dictionaries,
            # but api_sign_request expects a string representation.
            # The way you're building eager_strings is correct for signing.
            eager_strings = []
            for t in eager_transformations:
                # Ensure keys are sorted for consistent signing if not already
                sorted_t_items = sorted(t.items())
                eager_strings.append(",".join([f"{k}_{v}" for k, v in sorted_t_items]))
            params_to_sign["eager"] = "|".join(eager_strings)

        logger.info(f"Parameters to sign: {params_to_sign}")
        signature = api_sign_request(params_to_sign, settings.CLOUDINARY_API_SECRET)

        return UploadSignatureResponse(
            signature=signature,
            timestamp=timestamp,
            api_key=settings.CLOUDINARY_API_KEY,
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            public_id=request.public_id,
            folder=final_folder,
            resource_type=request.resource_type,
            upload_preset=upload_preset_name, # <--- NEW: Return the preset name
            eager=params_to_sign.get("eager"),
            notification_url=notification_url
        )
    except HTTPException: # Re-raise FastAPI HTTPExceptions directly
        raise
    except Exception as e:
        logger.error(f"Error generating Cloudinary signature: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate upload signature.")