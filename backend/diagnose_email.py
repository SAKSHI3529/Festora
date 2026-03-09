import os
from fastapi_mail import ConnectionConfig
from dotenv import load_dotenv

load_dotenv()

try:
    conf = ConnectionConfig(
        MAIL_USERNAME = os.getenv("EMAIL_USERNAME"),
        MAIL_PASSWORD = os.getenv("EMAIL_PASSWORD"),
        MAIL_FROM = os.getenv("EMAIL_USERNAME"),
        MAIL_PORT = int(os.getenv("SMTP_PORT", 587)),
        MAIL_SERVER = os.getenv("SMTP_SERVER"),
        MAIL_FROM_NAME = "Festora Notifications",
        MAIL_STARTTLS = True,
        MAIL_SSL_TLS = False,
        USE_CREDENTIALS = True,
        VALIDATE_CERTS = True,
        TEMPLATE_FOLDER = "app/services/templates"
    )
    print("ConnectionConfig created successfully!")
except Exception as e:
    print(f"Error creating ConnectionConfig: {e}")
    import traceback
    traceback.print_exc()
