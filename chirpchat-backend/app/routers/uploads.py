
import os
import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import cloudinary
import cloudinary.utils

from app.auth.dependencies import get_current_active_user 
from app.auth.schemas import UserPublic 
from app.utils.logging import logger 

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True 
)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

class SignUploadRequest(BaseModel):
    public_id: Optional[str] = None
    folder: str = "kuchlu_chat_media"
    eager: Optional[str] = None

@router.post("/sign", summary="Generate a signature for direct Cloudinary upload")
async def sign_cloudinary_upload(
    payload: SignUploadRequest,
    current_user: UserPublic = Depends(get_current_active_user)
):
    """
    Generates a secure, time-sensitive signature that allows the client
    to upload a file directly to Cloudinary, bypassing our backend.
    """
    timestamp = int(time.time())
    
    # Ensure uploads are sandboxed to a user-specific folder
    final_folder = f"{payload.folder}/user_{current_user.id}"

    params_to_sign = {
        "timestamp": timestamp,
        "folder": final_folder,
    }
    # These parameters must be passed exactly the same from the client
    if payload.public_id:
        params_to_sign["public_id"] = payload.public_id
    if payload.eager:
        params_to_sign["eager"] = payload.eager

    try:
        # The secret key is only used here on the backend
        signature = cloudinary.utils.api_sign_request(
            params_to_sign, 
            os.getenv("CLOUDINARY_API_SECRET")
        )
        
        # Return all necessary parameters for the client to perform the upload
        return {
            "signature": signature,
            "timestamp": timestamp,
            "api_key": os.getenv("CLOUDINARY_API_KEY"),
            "folder": final_folder,
            "public_id": payload.public_id,
            "eager": payload.eager,
        }
    except Exception as e:
        logger.error(f"Error generating Cloudinary signature: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate upload signature.")
