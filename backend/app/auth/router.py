from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import schemas, service
from app.auth.schemas import (
    AuthResponse,
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UpdateProfileRequest,
    UserOut,
)
from app.database import get_db
from app.deps import get_current_user
from app.auth.models import User
from app.models.household import Household, HouseholdMember

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_client_meta(request: Request) -> tuple[str | None, str | None]:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    return ua, ip


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    try:
        user = await service.register_user(db, body)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    # Create household if name provided
    if body.household_name:
        slug = body.household_name.lower().replace(" ", "-")[:100]
        import re, uuid as _uuid
        slug = re.sub(r"[^a-z0-9-]", "", slug) + "-" + str(_uuid.uuid4())[:8]
        household = Household(
            name=body.household_name,
            slug=slug,
        )
        db.add(household)
        await db.flush()

        member = HouseholdMember(
            household_id=household.id,
            user_id=user.id,
            role="owner",
            is_primary=True,
            display_name=user.full_name,
        )
        db.add(member)
        await db.flush()

    ua, ip = _get_client_meta(request)
    tokens = await service.issue_token_pair(db, user, ua, ip)
    return AuthResponse(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/login", response_model=AuthResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    user = await service.authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    ua, ip = _get_client_meta(request)
    tokens = await service.issue_token_pair(db, user, ua, ip)
    return AuthResponse(user=UserOut.model_validate(user), tokens=tokens)


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    try:
        tokens = await service.refresh_access_token(db, body.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    return tokens


@router.post("/logout", response_model=MessageResponse)
async def logout(body: RefreshRequest, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    await service.revoke_refresh_token(db, body.refresh_token)
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.patch("/me", response_model=UserOut)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    if body.first_name is not None:
        current_user.first_name = body.first_name
    if body.last_name is not None:
        current_user.last_name = body.last_name
    if body.phone is not None:
        current_user.phone = body.phone
    if body.avatar_url is not None:
        current_user.avatar_url = body.avatar_url
    await db.flush()
    return UserOut.model_validate(current_user)


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if not service.verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = service.hash_password(body.new_password)
    await db.flush()
    return MessageResponse(message="Password changed successfully")
