from fastapi import HTTPException, status
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth_schema import RegisterRequest, LoginRequest, UserResponse, AuthResponse


def _user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        role=user.role,
        avatar_url=user.avatar_url,
    )


async def register_user(data: RegisterRequest) -> AuthResponse:
    # Check role is valid
    if data.role not in ("student", "educator"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'student' or 'educator'",
        )

    # Check email not already taken
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Create and save user
    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    await user.insert()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return AuthResponse(access_token=token, user=_user_to_response(user))


async def login_user(data: LoginRequest) -> AuthResponse:
    user = await User.find_one(User.email == data.email)

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return AuthResponse(access_token=token, user=_user_to_response(user))


async def get_me(user: User) -> UserResponse:
    return _user_to_response(user)