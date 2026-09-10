from sqlalchemy import Column, Integer, String, Date, ForeignKey
from database.connection import Base


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    food_name = Column(
        String(100),
        nullable=False
    )

    category = Column(
        String(50),
        nullable=False
    )

    quantity = Column(
        Integer,
        nullable=False
    )

    batch_number = Column(
        String(100),
        nullable=False
    )

    purchase_date = Column(
        Date,
        nullable=False
    )

    expiry_date = Column(
        Date,
        nullable=False
    )