from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    invite_code = Column(String, unique=True, index=True)
    cover_image_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    educator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    educator = relationship("User", back_populates="classrooms")
    memberships = relationship("ClassMembership", back_populates="classroom")
    meetings = relationship("VideoMeeting", back_populates="classroom")
    comments = relationship("Comment", back_populates="classroom")