from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timezone

scheduler = AsyncIOScheduler()


async def _auto_start_meeting(meeting_id: str):
    """Called by scheduler when scheduled_at time is reached."""
    from app.models.meeting import Meeting
    meeting = await Meeting.get(meeting_id)
    if meeting and meeting.status == "scheduled":
        meeting.status = "live"
        meeting.started_at = datetime.now(timezone.utc)
        await meeting.save()
        print(f"✅ Meeting '{meeting.title}' auto-started")


def schedule_meeting_start(meeting_id: str, run_date: datetime):
    """Register a one-time job to flip meeting status to live."""
    scheduler.add_job(
        _auto_start_meeting,
        trigger="date",
        run_date=run_date,
        args=[meeting_id],
        id=f"start_meeting_{meeting_id}",
        replace_existing=True,
    )