import os
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp", "image/x-ms-bmp"}

def validate_image_file(file: UploadFile) -> None:
    """
    Validates file extension, MIME type, file size, integrity/corruption, and dimensions.
    """
    # 1. Validate file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 2. Validate MIME type
    mime_type = file.content_type
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported MIME type '{mime_type}'. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        )

    # 3. Validate file size
    try:
        # Check size by seeking to the end
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to read file size: {str(e)}"
        )

    max_size = settings.MAX_IMAGE_SIZE_BYTES
    if size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the limit of {max_size / (1024*1024):.1f} MB (got {size / (1024*1024):.1f} MB)."
        )

    # 4. Verify image format and integrity
    try:
        img = Image.open(file.file)
        img.verify()
        
        # Seek back to 0 because verify() reads data
        file.file.seek(0)
        
        # Reload to check size dimensions
        img_loaded = Image.open(file.file)
        width, height = img_loaded.size
        if width < 32 or height < 32:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image dimensions are too small (must be at least 32x32)."
            )
        file.file.seek(0)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file is not a valid or uncorrupted image: {str(e)}"
        )
