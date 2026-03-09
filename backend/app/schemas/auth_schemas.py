from pydantic import BaseModel, EmailStr
from typing import Optional


# ── Request Schemas ──────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # "student" | "educator"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Response Schemas ─────────────────────────────────────────

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse