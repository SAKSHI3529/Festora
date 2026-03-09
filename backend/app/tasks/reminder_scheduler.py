import asyncio
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.db import get_database
from app.services.email_service import send_event_reminder_email, send_event_starting_email
from bson import ObjectId

logger = logging.getLogger("ReminderScheduler")

async def check_and_send_reminders():
    """
    Find events requiring reminders (24h before or at start time).
    """
    logger.info("Running event reminder job...")
    db = await get_database()
    
    now = datetime.utcnow()
    tomorrow = now + timedelta(days=1)
    
    # 1. 24-HOUR REMINDERS
    # Events starting in 20-24 hours that haven't sent the 24h reminder
    query_24h = {
        "event_date": {"$gt": now + timedelta(hours=20), "$lte": tomorrow},
        "status": "SCHEDULED",
        "reminder_24h_sent": {"$ne": True}
    }
    events_24h = await db["events"].find(query_24h).to_list(None)
    for event in events_24h:
        await process_reminders(db, event, "24h")

    # 2. START-TIME REMINDERS
    # Events starting now or in the last 15 mins (if scheduler skipped a beat)
    query_start = {
        "event_date": {"$lte": now + timedelta(minutes=5), "$gt": now - timedelta(minutes=15)},
        "status": "SCHEDULED",
        "reminder_start_sent": {"$ne": True}
    }
    events_start = await db["events"].find(query_start).to_list(None)
    for event in events_start:
        await process_reminders(db, event, "start")

async def process_reminders(db, event, stage):
    event_id = str(event["_id"])
    event_name = event["title"]
    event_date_str = event["event_date"].strftime("%Y-%m-%d %H:%M")
    location = event["location"]
    time_slot = event.get("time_slot")
    
    logger.info(f"Processing {stage} reminders for event: {event_name}")
    
    # Recipients: Students, Faculty, Judges
    recipients = []
    
    # Students
    registrations = await db["registrations"].find({"event_id": event_id, "status": "APPROVED"}).to_list(None)
    for reg in registrations:
        student = await db["users"].find_one({"_id": ObjectId(reg["student_id"])})
        if student and student.get("email"):
            recipients.append((student["email"], student["full_name"]))
            
    # Faculty
    faculty = await db["users"].find_one({"_id": ObjectId(event["faculty_coordinator_id"])})
    if faculty and faculty.get("email"):
        recipients.append((faculty["email"], faculty["full_name"]))
        
    # Judges
    for jid in event.get("judge_ids", []):
        judge = await db["users"].find_one({"_id": ObjectId(jid)})
        if judge and judge.get("email"):
            recipients.append((judge["email"], judge["full_name"]))

    # Send Emails
    for email, name in recipients:
        if stage == "24h":
            await send_event_reminder_email(email, name, event_name, event_date_str, location, time_slot)
        else:
            await send_event_starting_email(email, name, event_name, location, time_slot)

    # Update Database Flag
    flag = "reminder_24h_sent" if stage == "24h" else "reminder_start_sent"
    await db["events"].update_one({"_id": event["_id"]}, {"$set": {flag: True}})
    logger.info(f"Marked {flag} as True for event {event_id}")

def start_scheduler():
    scheduler = AsyncIOScheduler()
    # Run every hour
    scheduler.add_job(check_and_send_reminders, 'interval', hours=1)
    scheduler.start()
    logger.info("Reminder scheduler started (running every hour).")
    return scheduler
