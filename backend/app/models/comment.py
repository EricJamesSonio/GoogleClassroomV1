from sqlalchemy import Column, Integer, ForeignKey, DateTime, Text, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class CommentType(str, enum.Enum):
    class_post = "class_post"           # general post/announcement in a class
    meeting_comment = "meeting_comment" # comment tied to a specific meeting


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    meeting_id = Column(Integer, ForeignKey("video_meetings.id"), nullable=True)
    content = Column(Text, nullable=False)
    comment_type = Column(Enum(CommentType), nullable=False)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="comments")
    classroom = relationship("Classroom", back_populates="comments")
    meeting = relationship("VideoMeeting", back_populates="comments")