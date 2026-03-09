from fastapi import APIRouter, Depends
from app.schemas.class_schema import CreateClassRequest, ClassResponse, ClassDetailResponse
from app.services.class_service import create_class, get_my_classes, get_class_detail
from app.core.dependencies import get_current_user, require_educator
from app.models.user import User
from typing import List

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.post("", response_model=ClassResponse)
async def create(
    data: CreateClassRequest,
    educator: User = Depends(require_educator),
):
    return await create_class(data, educator)


@router.get("", response_model=List[ClassResponse])
async def list_classes(current_user: User = Depends(get_current_user)):
    return await get_my_classes(current_user)


@router.get("/{class_id}", response_model=ClassDetailResponse)
async def get_detail(
    class_id: str,
    current_user: User = Depends(get_current_user),
):
    return await get_class_detail(class_id, current_user)