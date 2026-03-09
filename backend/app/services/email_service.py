import os
import logging
from typing import List, Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from dotenv import load_dotenv

load_dotenv()

os.makedirs("logs", exist_ok=True)

# Logger configuration
logging.basicConfig(
    filename='logs/email_notifications.log',
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("EmailService")

conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("EMAIL_USERNAME"),
    MAIL_PASSWORD = os.getenv("EMAIL_PASSWORD"),
    MAIL_FROM = os.getenv("EMAIL_USERNAME"), # Defaulting to username if EMAIL_FROM not parsed easily
    MAIL_PORT = int(os.getenv("SMTP_PORT", 587)),
    MAIL_SERVER = os.getenv("SMTP_SERVER"),
    MAIL_FROM_NAME = "Festora Notifications",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True,
    TEMPLATE_FOLDER = "app/services/templates"
)

fm = FastMail(conf)

async def send_email(to_email: str, subject: str, template_name: str, template_body: dict):
    """
    Generalized function to send email asynchronously.
    """
    try:
        message = MessageSchema(
            subject=subject,
            recipients=[to_email],
            template_body=template_body,
            subtype=MessageType.html
        )
        await fm.send_message(message, template_name=template_name)
        logger.info(f"Email sent to {to_email} with subject: {subject}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")

# Registration Emails
async def send_registration_submitted_email(student_email: str, student_name: str, event_name: str, event_date: str, location: str, time_slot: Optional[str] = None):
    await send_email(
        student_email,
        "Festora Registration Submitted",
        "registration_submitted.html",
        {"student_name": student_name, "event_name": event_name, "event_date": event_date, "location": location, "time_slot": time_slot}
    )

async def send_registration_approved_email(student_email: str, student_name: str, event_name: str, event_date: str, location: str, time_slot: Optional[str] = None):
    await send_email(
        student_email,
        "Registration Approved - Festora",
        "registration_approved.html",
        {"student_name": student_name, "event_name": event_name, "event_date": event_date, "location": location, "time_slot": time_slot}
    )

async def send_registration_rejected_email(student_email: str, student_name: str, event_name: str):
    await send_email(
        student_email,
        "Registration Rejected - Festora",
        "registration_rejected.html",
        {"student_name": student_name, "event_name": event_name}
    )

# Event Reminders
async def send_event_reminder_email(to_email: str, recipient_name: str, event_name: str, event_date: str, location: str, time_slot: Optional[str] = None):
    await send_email(
        to_email,
        f"Festora Event Reminder - {event_name} Tomorrow",
        "event_reminder.html",
        {"recipient_name": recipient_name, "event_name": event_name, "event_date": event_date, "location": location, "time_slot": time_slot}
    )

async def send_event_starting_email(to_email: str, recipient_name: str, event_name: str, location: str, time_slot: Optional[str] = None):
    await send_email(
        to_email,
        f"Festora Event Starting NOW - {event_name}",
        "event_starting.html",
        {"recipient_name": recipient_name, "event_name": event_name, "location": location, "time_slot": time_slot}
    )

# Budget Emails
async def send_budget_request_email(admin_email: str, faculty_name: str, amount: float, description: str):
    await send_email(
        admin_email,
        "New Budget Request - Festora",
        "budget_request.html",
        {"faculty_name": faculty_name, "amount": amount, "description": description}
    )

async def send_budget_approved_email(faculty_email: str, faculty_name: str, amount: float):
    await send_email(
        faculty_email,
        "Budget Approved - Festora",
        "budget_approved.html",
        {"faculty_name": faculty_name, "amount": amount}
    )

async def send_budget_rejected_email(faculty_email: str, faculty_name: str, amount: float, reason: Optional[str] = None):
    await send_email(
        faculty_email,
        "Budget Rejected - Festora",
        "budget_rejected.html",
        {"faculty_name": faculty_name, "amount": amount, "reason": reason}
    )

# Results and Certificates
async def send_results_published_email(student_email: str, student_name: str, event_name: str):
    await send_email(
        student_email,
        "Festora Results Published",
        "results_published.html",
        {"student_name": student_name, "event_name": event_name}
    )

async def send_certificate_generated_email(student_email: str, student_name: str, event_name: str, cert_url: str):
    await send_email(
        student_email,
        "Festora Certificate Available",
        "certificate_generated.html",
        {"student_name": student_name, "event_name": event_name, "cert_url": cert_url}
    )
