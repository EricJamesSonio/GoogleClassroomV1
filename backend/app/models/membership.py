from sqlalchemy import Column, Integer, ForeignKey, Enum, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class MembershipStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class MembershipRole(str, enum.Enum):
    student = "student"
    guest = "guest"


class ClassMembership(Base):
    __tablename__ = "class_memberships"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role_in_class = Column(Enum(MembershipRole), default=MembershipRole.student)
    status = Column(Enum(MembershipStatus), default=MembershipStatus.pending)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_banned = Column(Boolean, default=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    classroom = relationship("Classroom", back_populates="memberships")
    user = relationship("User", foreign_keys=[user_id], back_populates="memberships")
    inviter = relationship("User", foreign_keys=[invited_by])