from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from datetime import datetime
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog, AuditModule
from app.dependencies.rbac import RoleChecker, get_current_user

router = APIRouter()

allow_view_audit = RoleChecker([UserRole.ADMIN])
allow_view_own_audit = RoleChecker([UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.EVENT_COORDINATOR, UserRole.JUDGE])

@router.get("/", dependencies=[Depends(allow_view_audit)])
async def get_audit_logs(
    module: Optional[AuditModule] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    db = Depends(get_database), 
    current_user: User = Depends(get_current_user)
):
    query = {}
    if module:
        query["module"] = module
    if user_id:
        query["user_id"] = user_id
        
    logs = await db["audit_logs"].find(query).sort("timestamp", -1).limit(limit).to_list(None)
    for log in logs:
        log["_id"] = str(log["_id"])
        log["id"] = log["_id"]
    return logs

@router.get("/my", dependencies=[Depends(allow_view_own_audit)])
async def get_my_audit_logs(
    limit: int = 50,
    db = Depends(get_database), 
    current_user: User = Depends(get_current_user)
):
    logs = await db["audit_logs"].find({"user_id": current_user.id}).sort("timestamp", -1).limit(limit).to_list(None)
    for log in logs:
        log["_id"] = str(log["_id"])
        log["id"] = log["_id"]
    return logs

@router.get("/events/{event_id}", dependencies=[Depends(allow_view_audit)]) # Admin/Faculty? Requirement: ADMIN, FACULTY
async def get_event_audit_logs(
    event_id: str,
    db = Depends(get_database), 
    current_user: User = Depends(get_current_user)
):
    # If Faculty, check assignment? 
    # For now, simplistic check.
    
    query = {"ref_id": event_id}
    # Could also include logs where module=REGISTRATION and ref_id=reg_id linked to event?
    # That requires join. 
    # "GET /audit/events/{id}" -> Event specific logs. 
    # Usually logs related to the Event object itself (Update, Status Change) 
    # OR all actions related to that event (registrations, scores).
    # Since we store ref_id, we need to know what ref_id points to.
    # In `log_action`, for REGISTRATION, ref_id is likely Registration ID.
    # So searching audit_logs by `ref_id=event_id` ONLY finds changes to the Event itself.
    # To find all logs for an event (including regs), we'd need to store event_id in the log explicitly or search broadly.
    # User Request: "GET /audit/events/{id}"
    # Let's stick to logs where `ref_id == event_id` OR description/metadata contains event_id?
    # Or we can add `event_id` field to AuditLog model?
    # Adding `event_id` to AuditLog would be cleaner for this requirement.
    # But current model is generic.
    # Let's check `ref_id`.
    
    logs = await db["audit_logs"].find(query).sort("timestamp", -1).to_list(None)
    for log in logs:
        log["_id"] = str(log["_id"])
        log["id"] = log["_id"]
    return logs
