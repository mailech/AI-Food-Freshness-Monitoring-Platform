"""Repositories for the food catalogue, batches, inventory and images."""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import joinedload

from app.models import (
    FoodBatch,
    FoodCategory,
    FoodImage,
    FoodProduct,
    InventoryItem,
)
from app.repositories.base import BaseRepository


class CategoryRepository(BaseRepository[FoodCategory]):
    model = FoodCategory
    sortable_fields = {"id", "name", "slug", "created_at", "updated_at"}
    default_sort = "name"

    def by_slug(self, slug: str) -> FoodCategory | None:
        return self.db.scalar(
            select(FoodCategory).where(FoodCategory.slug == str(slug).upper())
        )

    def list_all(self, *, include_inactive: bool = False) -> list[FoodCategory]:
        stmt = select(FoodCategory)
        if not include_inactive:
            stmt = stmt.where(FoodCategory.is_active.is_(True))
        return list(self.db.scalars(stmt.order_by(FoodCategory.name)).all())

    def product_counts(self) -> dict[int, int]:
        rows = self.db.execute(
            select(FoodProduct.category_id, func.count(FoodProduct.id))
            .where(FoodProduct.is_active.is_(True))
            .group_by(FoodProduct.category_id)
        ).all()
        return {int(cid): int(count) for cid, count in rows}


class ProductRepository(BaseRepository[FoodProduct]):
    model = FoodProduct
    sortable_fields = {"id", "name", "sku", "brand", "created_at", "updated_at", "shelf_life_days"}
    default_sort = "name"

    def by_sku(self, sku: str) -> FoodProduct | None:
        return self.db.scalar(select(FoodProduct).where(FoodProduct.sku == sku))

    def search(
        self,
        *,
        query: str | None = None,
        category_id: int | None = None,
        category_slug: str | None = None,
        brand: str | None = None,
        is_active: bool | None = True,
        created_by_id: int | None = None,
    ) -> Select:
        stmt = select(FoodProduct).options(joinedload(FoodProduct.category))

        if query:
            pattern = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    FoodProduct.name.ilike(pattern),
                    FoodProduct.sku.ilike(pattern),
                    FoodProduct.brand.ilike(pattern),
                    FoodProduct.description.ilike(pattern),
                )
            )
        if category_id is not None:
            stmt = stmt.where(FoodProduct.category_id == category_id)
        if category_slug:
            stmt = stmt.join(FoodCategory).where(
                FoodCategory.slug == str(category_slug).upper()
            )
        if brand:
            stmt = stmt.where(FoodProduct.brand.ilike(f"%{brand}%"))
        if is_active is not None:
            stmt = stmt.where(FoodProduct.is_active.is_(is_active))
        if created_by_id is not None:
            stmt = stmt.where(FoodProduct.created_by_id == created_by_id)
        return stmt


class BatchRepository(BaseRepository[FoodBatch]):
    model = FoodBatch
    sortable_fields = {
        "id",
        "batch_number",
        "created_at",
        "updated_at",
        "expected_expiry_date",
        "predicted_expiry_date",
        "purchase_date",
        "storage_date",
        "quantity",
        "status",
        "current_freshness_score",
        "remaining_shelf_life_days",
    }
    default_sort = "created_at"

    def by_number(self, batch_number: str) -> FoodBatch | None:
        return self.db.scalar(
            select(FoodBatch).where(FoodBatch.batch_number == batch_number)
        )

    def with_relations(self, batch_id: int) -> FoodBatch | None:
        return self.db.scalar(
            select(FoodBatch)
            .options(
                joinedload(FoodBatch.product).joinedload(FoodProduct.category),
            )
            .where(FoodBatch.id == batch_id)
        )

    def search(
        self,
        *,
        query: str | None = None,
        product_id: int | None = None,
        category_slug: str | None = None,
        status: list[str] | None = None,
        freshness_category: list[str] | None = None,
        storage_location: str | None = None,
        batch_number: str | None = None,
        expiring_within_days: int | None = None,
        expired: bool | None = None,
        purchased_from: date | None = None,
        purchased_to: date | None = None,
        created_by_id: int | None = None,
        min_freshness: float | None = None,
        max_freshness: float | None = None,
        include_archived: bool = False,
    ) -> Select:
        stmt = select(FoodBatch).options(
            joinedload(FoodBatch.product).joinedload(FoodProduct.category)
        )

        if not include_archived:
            stmt = stmt.where(FoodBatch.is_archived.is_(False))

        if query:
            pattern = f"%{query.strip()}%"
            stmt = stmt.join(FoodProduct, FoodBatch.product_id == FoodProduct.id).where(
                or_(
                    FoodBatch.batch_number.ilike(pattern),
                    FoodBatch.storage_location.ilike(pattern),
                    FoodBatch.supplier.ilike(pattern),
                    FoodProduct.name.ilike(pattern),
                    FoodProduct.brand.ilike(pattern),
                )
            )
        if product_id is not None:
            stmt = stmt.where(FoodBatch.product_id == product_id)
        if category_slug:
            # Subquery rather than a join so this composes safely with the
            # optional text-search join above.
            stmt = stmt.where(
                FoodBatch.product_id.in_(
                    select(FoodProduct.id)
                    .join(FoodCategory)
                    .where(FoodCategory.slug == str(category_slug).upper())
                )
            )
        if status:
            stmt = stmt.where(FoodBatch.status.in_([s.upper() for s in status]))
        if freshness_category:
            stmt = stmt.where(
                FoodBatch.current_freshness_category.in_(
                    [c.upper() for c in freshness_category]
                )
            )
        if storage_location:
            stmt = stmt.where(FoodBatch.storage_location.ilike(f"%{storage_location}%"))
        if batch_number:
            stmt = stmt.where(FoodBatch.batch_number.ilike(f"%{batch_number}%"))
        if expiring_within_days is not None:
            cutoff = date.today() + timedelta(days=int(expiring_within_days))
            stmt = stmt.where(
                and_(
                    FoodBatch.expected_expiry_date.is_not(None),
                    FoodBatch.expected_expiry_date <= cutoff,
                    FoodBatch.expected_expiry_date >= date.today(),
                )
            )
        if expired is True:
            stmt = stmt.where(
                and_(
                    FoodBatch.expected_expiry_date.is_not(None),
                    FoodBatch.expected_expiry_date < date.today(),
                )
            )
        elif expired is False:
            stmt = stmt.where(
                or_(
                    FoodBatch.expected_expiry_date.is_(None),
                    FoodBatch.expected_expiry_date >= date.today(),
                )
            )
        if purchased_from:
            stmt = stmt.where(FoodBatch.purchase_date >= purchased_from)
        if purchased_to:
            stmt = stmt.where(FoodBatch.purchase_date <= purchased_to)
        if created_by_id is not None:
            stmt = stmt.where(FoodBatch.created_by_id == created_by_id)
        if min_freshness is not None:
            stmt = stmt.where(FoodBatch.current_freshness_score >= min_freshness)
        if max_freshness is not None:
            stmt = stmt.where(FoodBatch.current_freshness_score <= max_freshness)
        return stmt

    def owned_by(self, user_id: int) -> Select:
        """Batches a consumer can see: created by them or held in their inventory."""
        return (
            select(FoodBatch)
            .options(joinedload(FoodBatch.product).joinedload(FoodProduct.category))
            .where(
                or_(
                    FoodBatch.created_by_id == user_id,
                    FoodBatch.id.in_(
                        select(InventoryItem.batch_id).where(InventoryItem.owner_id == user_id)
                    ),
                )
            )
        )

    def next_batch_number(self, prefix: str = "BTCH") -> str:
        """Human-readable sequential batch number."""
        today = date.today()
        like = f"{prefix}-{today:%Y%m%d}-%"
        existing = self.db.scalar(
            select(func.count(FoodBatch.id)).where(FoodBatch.batch_number.like(like))
        ) or 0
        return f"{prefix}-{today:%Y%m%d}-{existing + 1:04d}"

    def status_counts(self, *, owner_id: int | None = None) -> dict[str, int]:
        stmt = select(FoodBatch.status, func.count(FoodBatch.id)).where(
            FoodBatch.is_archived.is_(False)
        )
        if owner_id is not None:
            stmt = stmt.where(
                FoodBatch.id.in_(
                    select(InventoryItem.batch_id).where(InventoryItem.owner_id == owner_id)
                )
            )
        rows = self.db.execute(stmt.group_by(FoodBatch.status)).all()
        return {str(status): int(count) for status, count in rows}


class InventoryRepository(BaseRepository[InventoryItem]):
    model = InventoryItem
    sortable_fields = {
        "id",
        "created_at",
        "updated_at",
        "expected_expiry_date",
        "purchase_date",
        "quantity",
        "status",
        "rotation_priority",
    }
    default_sort = "created_at"

    def search(
        self,
        *,
        owner_id: int | None = None,
        query: str | None = None,
        status: list[str] | None = None,
        category_slug: str | None = None,
        storage_location: str | None = None,
        expiring_within_days: int | None = None,
        include_consumed: bool = False,
        include_discarded: bool = False,
    ) -> Select:
        stmt = select(InventoryItem).options(
            joinedload(InventoryItem.batch)
            .joinedload(FoodBatch.product)
            .joinedload(FoodProduct.category)
        )
        if owner_id is not None:
            stmt = stmt.where(InventoryItem.owner_id == owner_id)
        if not include_consumed:
            stmt = stmt.where(InventoryItem.consumed.is_(False))
        if not include_discarded:
            stmt = stmt.where(InventoryItem.discarded.is_(False))
        if status:
            stmt = stmt.where(InventoryItem.status.in_([s.upper() for s in status]))
        if storage_location:
            stmt = stmt.where(InventoryItem.storage_location.ilike(f"%{storage_location}%"))
        if expiring_within_days is not None:
            cutoff = date.today() + timedelta(days=int(expiring_within_days))
            stmt = stmt.where(
                and_(
                    InventoryItem.expected_expiry_date.is_not(None),
                    InventoryItem.expected_expiry_date <= cutoff,
                )
            )
        if query or category_slug:
            batch_ids = select(FoodBatch.id).join(
                FoodProduct, FoodBatch.product_id == FoodProduct.id
            )
            if query:
                pattern = f"%{query.strip()}%"
                batch_ids = batch_ids.where(
                    or_(
                        FoodProduct.name.ilike(pattern),
                        FoodBatch.batch_number.ilike(pattern),
                        FoodProduct.brand.ilike(pattern),
                    )
                )
            if category_slug:
                batch_ids = batch_ids.join(
                    FoodCategory, FoodProduct.category_id == FoodCategory.id
                ).where(FoodCategory.slug == str(category_slug).upper())
            stmt = stmt.where(InventoryItem.batch_id.in_(batch_ids))
        return stmt

    def for_owner_and_batch(self, owner_id: int, batch_id: int) -> InventoryItem | None:
        return self.db.scalar(
            select(InventoryItem).where(
                InventoryItem.owner_id == owner_id, InventoryItem.batch_id == batch_id
            )
        )

    def locations(self, owner_id: int | None = None) -> list[str]:
        stmt = select(InventoryItem.storage_location).where(
            InventoryItem.storage_location.is_not(None)
        )
        if owner_id is not None:
            stmt = stmt.where(InventoryItem.owner_id == owner_id)
        rows = self.db.execute(stmt.distinct()).all()
        return sorted({str(r[0]) for r in rows if r[0]})


class ImageRepository(BaseRepository[FoodImage]):
    model = FoodImage
    sortable_fields = {"id", "created_at", "size_bytes"}
    default_sort = "created_at"

    def for_batch(self, batch_id: int, limit: int = 50) -> list[FoodImage]:
        return list(
            self.db.scalars(
                select(FoodImage)
                .where(FoodImage.batch_id == batch_id)
                .order_by(FoodImage.created_at.desc())
                .limit(limit)
            ).all()
        )

    def by_checksum(self, checksum: str, batch_id: int | None = None) -> FoodImage | None:
        stmt = select(FoodImage).where(FoodImage.checksum_sha256 == checksum)
        if batch_id is not None:
            stmt = stmt.where(FoodImage.batch_id == batch_id)
        return self.db.scalar(stmt.order_by(FoodImage.created_at.desc()))

    def search(
        self,
        *,
        batch_id: int | None = None,
        uploaded_by_id: int | None = None,
        analyzed: bool | None = None,
    ) -> Select:
        stmt = select(FoodImage)
        if batch_id is not None:
            stmt = stmt.where(FoodImage.batch_id == batch_id)
        if uploaded_by_id is not None:
            stmt = stmt.where(FoodImage.uploaded_by_id == uploaded_by_id)
        if analyzed is not None:
            stmt = stmt.where(FoodImage.is_analyzed.is_(analyzed))
        return stmt
