from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_status() -> dict[str, str]:
    return {"module": "analytics", "status": "healthy_stub"}
