"""File storage abstraction.

`LocalFileStorage` is the default and needs no cloud credentials. `S3FileStorage`
and `AzureBlobStorage` implement the same interface so switching is a
configuration change (`STORAGE_BACKEND=s3`) rather than a code change - the rest
of the application only ever sees an opaque `storage_key`.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
import uuid
from abc import ABC, abstractmethod
from datetime import date
from pathlib import Path
from typing import Any, BinaryIO

from app.config import settings
from app.core.errors import AppError, NotFoundError
from app.core.logging_config import get_logger

logger = get_logger("app.services.storage")

_UNSAFE = re.compile(r"[^A-Za-z0-9._-]+")
_MAX_STEM = 60


def secure_filename(filename: str | None, fallback_ext: str = ".jpg") -> str:
    """Produce a filesystem-safe name.

    Strips directory components, normalises unicode, removes anything outside a
    conservative allow-list and forces a single known-good extension. Also blocks
    double extensions such as `photo.php.jpg` becoming executable on a
    misconfigured server.
    """
    raw = (filename or "").strip().replace("\\", "/").split("/")[-1]
    raw = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode("ascii")

    if "." in raw:
        stem, _, ext = raw.rpartition(".")
        ext = "." + ext.lower()
    else:
        stem, ext = raw, ""

    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        ext = fallback_ext

    # Collapse any remaining dots in the stem so only one extension survives.
    stem = _UNSAFE.sub("-", stem).replace(".", "-").strip("-.")[:_MAX_STEM]
    if not stem:
        stem = "upload"
    return f"{stem}{ext}"


def build_storage_key(filename: str, *, prefix: str = "food-images", owner_id: int | None = None) -> str:
    """Date-partitioned, collision-free object key."""
    today = date.today()
    safe = secure_filename(filename)
    unique = uuid.uuid4().hex[:12]
    owner = f"u{owner_id}" if owner_id else "anon"
    return f"{prefix}/{today:%Y/%m/%d}/{owner}-{unique}-{safe}"


class FileStorage(ABC):
    """Backend-agnostic blob storage interface."""

    name: str = "abstract"

    @abstractmethod
    def save(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Persist `data` under `key` and return the canonical key."""

    @abstractmethod
    def read(self, key: str) -> bytes: ...

    @abstractmethod
    def delete(self, key: str) -> bool: ...

    @abstractmethod
    def exists(self, key: str) -> bool: ...

    @abstractmethod
    def url_for(self, key: str) -> str:
        """A URL the frontend can use to fetch the object."""

    def open_stream(self, key: str) -> BinaryIO:  # pragma: no cover - convenience
        import io

        return io.BytesIO(self.read(key))

    def checksum(self, data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()


class LocalFileStorage(FileStorage):
    """Filesystem storage rooted at `UPLOAD_DIR` (development default)."""

    name = "local"

    def __init__(self, root: str | Path | None = None) -> None:
        self.root = Path(root or settings.UPLOAD_DIR).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        # Reject traversal: the resolved path must stay under the root.
        candidate = (self.root / key).resolve()
        if not str(candidate).startswith(str(self.root)):
            raise AppError(
                "Invalid storage key.", code="INVALID_STORAGE_KEY", status_code=400
            )
        return candidate

    def save(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        path = self._resolve(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        logger.info("stored file key=%s bytes=%d backend=local", key, len(data))
        return key

    def read(self, key: str) -> bytes:
        path = self._resolve(key)
        if not path.is_file():
            raise NotFoundError("The stored file no longer exists.", code="FILE_NOT_FOUND")
        return path.read_bytes()

    def delete(self, key: str) -> bool:
        path = self._resolve(key)
        if path.is_file():
            path.unlink()
            return True
        return False

    def exists(self, key: str) -> bool:
        return self._resolve(key).is_file()

    def url_for(self, key: str) -> str:
        # Served by the API so access can be authorised (see routers/images.py).
        return f"{settings.API_V1_PREFIX}/images/file/{key}"


class S3FileStorage(FileStorage):  # pragma: no cover - requires AWS credentials
    """AWS S3 storage. Requires `boto3` and valid credentials/IAM role."""

    name = "s3"

    def __init__(self, bucket: str | None = None, region: str | None = None) -> None:
        self.bucket = bucket or settings.S3_BUCKET
        self.region = region or settings.S3_REGION
        self.prefix = settings.S3_PREFIX
        if not self.bucket:
            raise AppError("S3_BUCKET is not configured.", code="STORAGE_MISCONFIGURED", status_code=500)
        try:
            import boto3  # noqa: PLC0415 - optional dependency
        except ImportError as exc:
            raise AppError(
                "boto3 is required for the S3 storage backend (pip install boto3).",
                code="STORAGE_DEPENDENCY_MISSING",
                status_code=500,
            ) from exc
        self._client = boto3.client("s3", region_name=self.region)

    def _full(self, key: str) -> str:
        return f"{self.prefix}{key}" if self.prefix and not key.startswith(self.prefix) else key

    def save(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        self._client.put_object(
            Bucket=self.bucket, Key=self._full(key), Body=data, ContentType=content_type
        )
        return key

    def read(self, key: str) -> bytes:
        try:
            response = self._client.get_object(Bucket=self.bucket, Key=self._full(key))
            return response["Body"].read()
        except Exception as exc:  # noqa: BLE001
            raise NotFoundError("The stored object could not be read.", code="FILE_NOT_FOUND") from exc

    def delete(self, key: str) -> bool:
        self._client.delete_object(Bucket=self.bucket, Key=self._full(key))
        return True

    def exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self.bucket, Key=self._full(key))
            return True
        except Exception:  # noqa: BLE001
            return False

    def url_for(self, key: str) -> str:
        return self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": self._full(key)},
            ExpiresIn=3600,
        )


class AzureBlobStorage(FileStorage):  # pragma: no cover - requires Azure credentials
    """Azure Blob Storage backend."""

    name = "azure"

    def __init__(self) -> None:
        if not settings.AZURE_STORAGE_CONNECTION_STRING or not settings.AZURE_STORAGE_CONTAINER:
            raise AppError(
                "Azure storage is not configured.", code="STORAGE_MISCONFIGURED", status_code=500
            )
        try:
            from azure.storage.blob import BlobServiceClient  # noqa: PLC0415
        except ImportError as exc:
            raise AppError(
                "azure-storage-blob is required for the Azure backend.",
                code="STORAGE_DEPENDENCY_MISSING",
                status_code=500,
            ) from exc
        self._service = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )
        self._container = self._service.get_container_client(settings.AZURE_STORAGE_CONTAINER)

    def save(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        from azure.storage.blob import ContentSettings  # noqa: PLC0415

        self._container.upload_blob(
            name=key, data=data, overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
        return key

    def read(self, key: str) -> bytes:
        try:
            return self._container.download_blob(key).readall()
        except Exception as exc:  # noqa: BLE001
            raise NotFoundError("The stored blob could not be read.", code="FILE_NOT_FOUND") from exc

    def delete(self, key: str) -> bool:
        try:
            self._container.delete_blob(key)
            return True
        except Exception:  # noqa: BLE001
            return False

    def exists(self, key: str) -> bool:
        return self._container.get_blob_client(key).exists()

    def url_for(self, key: str) -> str:
        return f"{self._container.url}/{key}"


_backend: FileStorage | None = None


def get_storage() -> FileStorage:
    """Return the configured storage backend (cached).

    Falls back to local storage - with a warning - if a cloud backend is
    selected but not properly configured, so the app still starts.
    """
    global _backend
    if _backend is not None:
        return _backend

    choice = settings.STORAGE_BACKEND.lower()
    try:
        if choice == "s3":
            _backend = S3FileStorage()
        elif choice == "azure":
            _backend = AzureBlobStorage()
        else:
            _backend = LocalFileStorage()
    except AppError as exc:
        logger.warning(
            "storage backend '%s' unavailable (%s) - falling back to local storage",
            choice, exc.message,
        )
        _backend = LocalFileStorage()
    logger.info("file storage backend: %s", _backend.name)
    return _backend


def reset_storage() -> None:
    """Drop the cached backend (used by tests)."""
    global _backend
    _backend = None


def storage_info() -> dict[str, Any]:
    backend = get_storage()
    return {
        "backend": backend.name,
        "configured": settings.STORAGE_BACKEND,
        "max_upload_mb": settings.MAX_UPLOAD_SIZE_MB,
        "allowed_extensions": settings.ALLOWED_IMAGE_EXTENSIONS,
        "allowed_mime_types": settings.ALLOWED_IMAGE_MIME_TYPES,
    }
