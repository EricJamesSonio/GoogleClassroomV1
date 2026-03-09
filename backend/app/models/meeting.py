from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class MeetingStatus(str, enum.Enum):
    scheduled = "scheduled"
    live = "live"
    ended = "ended"


class VideoMeeting(Base):
    __tablename__ = "video_meetings"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(MeetingStatus), default=MeetingStatus.scheduled)

    # Daily.co fields
    daily_room_name = Column(String, nullable=True)
    daily_room_url = Column(String, nullable=True)

    # Recording
    recording_url = Column(String, nullable=True)
    is_recorded = Column(Boolean, default=False)

    # Timing
    start_time = Column(DateTime(timezone=True), nullable=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    classroom = relationship("Classroom", back_populates="meetings")
    created_by = relationship("User", back_populates="meetings_created")
    comments = relationship("Comment", back_populates="meeting")