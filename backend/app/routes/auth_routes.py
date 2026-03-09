from fastapi import APIRouter, Depends
from app.schemas.auth_schema import RegisterRequest, LoginRequest, AuthResponse, UserResponse
from app.services.auth_service import register_user, login_user, get_me
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=AuthResponse)
async def register(data: RegisterRequest):
    return await register_user(data)


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest):
    return await login_user(data)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return await get_me(current_user)