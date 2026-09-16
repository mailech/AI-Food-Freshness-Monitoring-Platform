"""Food category and product endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.enums import Permission
from app.deps import CurrentUser, DbSession, Pagination, RequestMeta, require_permissions
from app.inventory import service as inventory_service
from app.inventory.categories import (
    create_category,
    resolve_category,
    serialise_category,
    sync_categories,
)
from app.repositories.food import CategoryRepository, ProductRepository
from app.schemas.common import Message, Page
from app.schemas.product import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    ProductCreate,
    ProductOut,
    ProductUpdate,
)

router = APIRouter(tags=["Catalogue"])


# ------------------------------------------------------------- categories
@router.get(
    "/categories",
    response_model=list[CategoryOut],
    summary="List food categories",
    description="Returns every category with its effective storage envelope "
    "(code defaults merged with any deployment override).",
)
def list_categories(
    db: DbSession,
    user: CurrentUser,
    include_inactive: bool = Query(default=False),
) -> list[CategoryOut]:
    repo = CategoryRepository(db)
    categories = repo.list_all(include_inactive=include_inactive)
    if not categories:
        categories = sync_categories(db)
        db.commit()
    counts = repo.product_counts()
    return [
        CategoryOut.model_validate(serialise_category(c, counts.get(c.id, 0)))
        for c in categories
    ]


@router.get("/categories/{slug}", response_model=CategoryOut, summary="Get one category")
def get_category(slug: str, db: DbSession, user: CurrentUser) -> CategoryOut:
    category = resolve_category(db, category_slug=slug)
    counts = CategoryRepository(db).product_counts()
    return CategoryOut.model_validate(serialise_category(category, counts.get(category.id, 0)))


@router.post(
    "/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a category (admin)",
)
def create_category_endpoint(
    payload: CategoryCreate,
    db: DbSession,
    user: Annotated[object, Depends(require_permissions(Permission.SYSTEM_MANAGE))],
) -> CategoryOut:
    category = create_category(db, payload.model_dump())
    db.commit()
    db.refresh(category)
    return CategoryOut.model_validate(serialise_category(category))


@router.put(
    "/categories/{slug}",
    response_model=CategoryOut,
    summary="Update a category's thresholds (admin)",
)
def update_category(
    slug: str,
    payload: CategoryUpdate,
    db: DbSession,
    user: Annotated[object, Depends(require_permissions(Permission.SYSTEM_MANAGE))],
) -> CategoryOut:
    category = resolve_category(db, category_slug=slug)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(category, field, value)
    db.commit()
    db.refresh(category)
    return CategoryOut.model_validate(serialise_category(category))


# --------------------------------------------------------------- products
@router.get(
    "/products",
    response_model=Page[ProductOut],
    summary="List / search products",
    description="Supports free-text search, category filter, sorting and pagination.",
)
def list_products(
    db: DbSession,
    user: Annotated[object, Depends(require_permissions(Permission.PRODUCT_READ))],
    pagination: Pagination,
    q: str | None = Query(default=None, description="Free-text search"),
    category_id: int | None = None,
    category_slug: str | None = None,
    brand: str | None = None,
    is_active: bool | None = Query(default=True),
    sort_by: str = Query(default="name"),
    sort_dir: str = Query(default="asc", pattern="^(asc|desc)$"),
) -> Page[ProductOut]:
    repo = ProductRepository(db)
    stmt = repo.search(
        query=q,
        category_id=category_id,
        category_slug=category_slug,
        brand=brand,
        is_active=is_active,
    )
    stmt = repo.apply_sort(stmt, sort_by, sort_dir)
    rows, total = repo.paginate(stmt, page=pagination.page, page_size=pagination.page_size)
    items = [
        ProductOut.model_validate(inventory_service.serialise_product(db, product))
        for product in rows
    ]
    return Page.build(items, total=total, page=pagination.page, page_size=pagination.page_size)


@router.get("/products/{product_id}", response_model=ProductOut, summary="Get a product")
def get_product(
    product_id: int,
    db: DbSession,
    user: Annotated[object, Depends(require_permissions(Permission.PRODUCT_READ))],
) -> ProductOut:
    product = ProductRepository(db).get_or_404(product_id, "Product")
    return ProductOut.model_validate(inventory_service.serialise_product(db, product))


@router.post(
    "/products",
    response_model=ProductOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a product",
)
def create_product(
    payload: ProductCreate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[object, Depends(require_permissions(Permission.PRODUCT_WRITE))],
) -> ProductOut:
    product = inventory_service.create_product(db, payload.model_dump(), user, meta)  # type: ignore[arg-type]
    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(inventory_service.serialise_product(db, product))


@router.put("/products/{product_id}", response_model=ProductOut, summary="Update a product")
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[object, Depends(require_permissions(Permission.PRODUCT_WRITE))],
) -> ProductOut:
    product = ProductRepository(db).get_or_404(product_id, "Product")
    inventory_service.update_product(
        db, product, payload.model_dump(exclude_unset=True), user, meta  # type: ignore[arg-type]
    )
    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(inventory_service.serialise_product(db, product))


@router.delete(
    "/products/{product_id}",
    response_model=Message,
    summary="Delete a product",
    description="Products with existing batches are deactivated instead of deleted so "
    "that analysis history is preserved.",
)
def delete_product(
    product_id: int,
    db: DbSession,
    meta: RequestMeta,
    user: Annotated[object, Depends(require_permissions(Permission.PRODUCT_WRITE))],
) -> Message:
    product = ProductRepository(db).get_or_404(product_id, "Product")
    name = product.name
    inventory_service.delete_product(db, product, user, meta)  # type: ignore[arg-type]
    db.commit()
    return Message(message=f"Product '{name}' removed.")
