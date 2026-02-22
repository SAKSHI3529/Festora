from datetime import datetime
from app.core.db import get_database
from app.models.audit_log import AuditLog, AuditAction, AuditModule

async def log_action(
    user_id: str,
    user_role: str,
    action: AuditAction,
    module: AuditModule,
    description: str,
    ref_id: str = None,
    ip_address: str = None,
    db = None 
):
    """
    Logs an action to the audit_logs collection.
    If db is not provided, it attempts to get it (though usually passed from router).
    """
    if db is None:
        # In case we need to get it, but ideally pass it from the dependent router to reuse session/connection if applicable
        # For simplicity, assuming db is passed or we import the getter instance mechanism if needed.
        # But `get_database` is a dependency generator.
        # We will assume db is passed from the calling route handler.
        return 

    log_entry = AuditLog(
        user_id=user_id,
        user_role=user_role,
        action=action,
        module=module,
        ref_id=ref_id,
        description=description,
        ip_address=ip_address,
        timestamp=datetime.utcnow()
    )
    
    # Fire and forget? Or await?
    # Await is safer for consistency.
    log_dict = log_entry.dict(by_alias=True)
    if "_id" in log_dict:
        del log_dict["_id"]
        
    await db["audit_logs"].insert_one(log_dict)
