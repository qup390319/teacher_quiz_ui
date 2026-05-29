"""Teacher-owned class categories (groupings).

See spec-04 §5.1, spec-11 (class_categories table), docs/deviations.md (2026-05-29).

Categories are per-teacher private. Deleting a category sets `classes.category_id`
back to NULL via the FK ON DELETE SET NULL (so classes don't vanish).
"""
from secrets import token_hex

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import require_teacher
from app.db.models import ClassCategory, User
from app.db.session import get_db
from app.schemas.class_category import (
    ClassCategoryRead,
    CreateClassCategoryRequest,
    ReorderClassCategoriesRequest,
    UpdateClassCategoryRequest,
)

router = APIRouter()


def _to_read(c: ClassCategory) -> ClassCategoryRead:
    return ClassCategoryRead(
        id=c.id, name=c.name, sort_order=c.sort_order,
        created_at=c.created_at, updated_at=c.updated_at,
    )


@router.get("", response_model=list[ClassCategoryRead], response_model_by_alias=True)
async def list_categories(
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[ClassCategoryRead]:
    stmt = (
        select(ClassCategory)
        .where(ClassCategory.teacher_id == teacher.id)
        .order_by(ClassCategory.sort_order, ClassCategory.created_at)
    )
    res = await db.execute(stmt)
    return [_to_read(c) for c in res.scalars().all()]


@router.post(
    "",
    response_model=ClassCategoryRead,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    payload: CreateClassCategoryRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassCategoryRead:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "NAME_REQUIRED")

    # Reject duplicate names for the same teacher
    dup = await db.execute(
        select(ClassCategory.id).where(
            ClassCategory.teacher_id == teacher.id,
            ClassCategory.name == name,
        ),
    )
    if dup.scalar_one_or_none() is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "DUPLICATE_NAME")

    # Append to the end
    max_order = await db.execute(
        select(func.coalesce(func.max(ClassCategory.sort_order), -1)).where(
            ClassCategory.teacher_id == teacher.id,
        ),
    )
    next_order = (max_order.scalar() or -1) + 1

    cat = ClassCategory(
        id=f"cat_{token_hex(8)}",
        teacher_id=teacher.id,
        name=name,
        sort_order=next_order,
    )
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return _to_read(cat)


@router.patch(
    "/{category_id}",
    response_model=ClassCategoryRead,
    response_model_by_alias=True,
)
async def rename_category(
    category_id: str,
    payload: UpdateClassCategoryRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> ClassCategoryRead:
    cat = await db.get(ClassCategory, category_id)
    if cat is None or cat.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CATEGORY_NOT_FOUND")
    if payload.name is not None:
        new_name = payload.name.strip()
        if not new_name:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "NAME_REQUIRED")
        if new_name != cat.name:
            dup = await db.execute(
                select(ClassCategory.id).where(
                    ClassCategory.teacher_id == teacher.id,
                    ClassCategory.name == new_name,
                    ClassCategory.id != category_id,
                ),
            )
            if dup.scalar_one_or_none() is not None:
                raise HTTPException(status.HTTP_409_CONFLICT, "DUPLICATE_NAME")
            cat.name = new_name
    await db.commit()
    await db.refresh(cat)
    return _to_read(cat)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: str,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Classes in this category will fall back to "uncategorized" via FK SET NULL."""
    cat = await db.get(ClassCategory, category_id)
    if cat is None or cat.teacher_id != teacher.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "CATEGORY_NOT_FOUND")
    await db.delete(cat)
    await db.commit()


@router.put(
    "/reorder",
    response_model=list[ClassCategoryRead],
    response_model_by_alias=True,
)
async def reorder_categories(
    payload: ReorderClassCategoriesRequest,
    teacher: User = Depends(require_teacher),
    db: AsyncSession = Depends(get_db),
) -> list[ClassCategoryRead]:
    """Set sort_order according to the given id list.

    Unknown ids are ignored; ids not in the list keep their previous relative order
    appended to the end.
    """
    res = await db.execute(
        select(ClassCategory).where(ClassCategory.teacher_id == teacher.id),
    )
    cats = list(res.scalars().all())
    by_id = {c.id: c for c in cats}

    seen: set[str] = set()
    new_order = 0
    for cat_id in payload.ids:
        cat = by_id.get(cat_id)
        if cat is None or cat_id in seen:
            continue
        seen.add(cat_id)
        cat.sort_order = new_order
        new_order += 1

    # Anything not listed → keep at the end in their previous order
    leftover = [c for c in cats if c.id not in seen]
    leftover.sort(key=lambda c: c.sort_order)
    for cat in leftover:
        cat.sort_order = new_order
        new_order += 1

    await db.commit()
    return [
        _to_read(c) for c in sorted(cats, key=lambda c: c.sort_order)
    ]
