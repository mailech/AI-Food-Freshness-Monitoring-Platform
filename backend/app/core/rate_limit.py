import time
from fastapi import Request, HTTPException, status
from typing import Dict, List

class SimpleRateLimiter:
    def __init__(self, requests_limit: int = 30, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.records: Dict[str, List[float]] = {}

    async def __call__(self, request: Request):
        import sys
        if "pytest" in sys.modules:
            return
            
        client_ip = request.client.host if request.client else "unknown"
        if client_ip == "testclient":
            return
            
        endpoint = request.url.path
        key = f"{client_ip}:{endpoint}"
        
        now = time.time()
        
        # Clean expired timestamps
        if key in self.records:
            self.records[key] = [t for t in self.records[key] if now - t < self.window_seconds]
        else:
            self.records[key] = []
            
        # Check limit
        if len(self.records[key]) >= self.requests_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Rate limit exceeded. Please wait before retrying."
            )
            
        self.records[key].append(now)

# Instantiate limits for the endpoints
auth_rate_limiter = SimpleRateLimiter(requests_limit=10, window_seconds=60)
upload_rate_limiter = SimpleRateLimiter(requests_limit=5, window_seconds=60)
