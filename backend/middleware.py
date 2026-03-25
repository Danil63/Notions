import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

COOKIE_NAME = "user_id"
COOKIE_MAX_AGE = 315_360_000  # ~10 лет


class UserIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        if not request.url.path.startswith("/api/"):
            return await call_next(request)

        user_id = request.cookies.get(COOKIE_NAME)
        is_new = user_id is None
        if is_new:
            user_id = str(uuid.uuid4())

        request.state.user_id = user_id
        response: Response = await call_next(request)

        if is_new:
            response.set_cookie(
                key=COOKIE_NAME,
                value=user_id,
                max_age=COOKIE_MAX_AGE,
                httponly=True,
                samesite="lax",
                secure=True,
            )

        return response
