from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.team import TeamStatus
from app.models.registration import RegistrationStatus
from app.dependencies.rbac import RoleChecker, get_current_user
from typing import List
from app.schemas.team import TeamResponse
from app.utils.audit import log_action, AuditAction, AuditModule
from app.services.email_service import send_registration_approved_email, send_registration_rejected_email

router = APIRouter()

allow_approve_reject = RoleChecker([UserRole.ADMIN, UserRole.FACULTY])

@router.put("/{id}/approve", dependencies=[Depends(allow_approve_reject)])
async def approve_team(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    team = await db["teams"].find_one({"_id": ObjectId(id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Assignment Check for Faculty
    if current_user.role == UserRole.FACULTY:
        event = await db["events"].find_one({"_id": ObjectId(team["event_id"])})
        if not event or event.get("faculty_coordinator_id") != str(current_user.id):
            raise HTTPException(status_code=403, detail="You are not authorized to approve teams for this event")

    if team["status"] != TeamStatus.PENDING:
         raise HTTPException(status_code=400, detail=f"Cannot approve. Current status: {team['status']}")

    # Update Team Status
    await db["teams"].update_one(
        {"_id": ObjectId(id)}, 
        {"$set": {"status": TeamStatus.APPROVED}}
    )

    # Cascade Update Registrations
    await db["registrations"].update_many(
        {"team_id": id},
        {"$set": {
            "status": RegistrationStatus.APPROVED,
            "approved_by": current_user.id,
            "approved_at": datetime.utcnow()
        }}
    )

    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.APPROVE,
        module=AuditModule.TEAMS,
        ref_id=id,
        description=f"Approved team {team['team_name']}",
        db=db
    )
    
    # Email Notification for all members (Async)
    event = await db["events"].find_one({"_id": ObjectId(team["event_id"])})
    if event:
        for member_id in team["member_ids"]:
            member = await db["users"].find_one({"_id": ObjectId(member_id)})
            if member and member.get("email"):
                await send_registration_approved_email(
                    member["email"],
                    member["full_name"],
                    event["title"],
                    event["event_date"].strftime("%Y-%m-%d %H:%M"),
                    event["location"],
                    event.get("time_slot")
                )

    return {"message": "Team and members approved"}

@router.put("/{id}/reject", dependencies=[Depends(allow_approve_reject)])
async def reject_team(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    team = await db["teams"].find_one({"_id": ObjectId(id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Assignment Check for Faculty
    if current_user.role == UserRole.FACULTY:
        event = await db["events"].find_one({"_id": ObjectId(team["event_id"])})
        if not event or event.get("faculty_coordinator_id") != str(current_user.id):
            raise HTTPException(status_code=403, detail="You are not authorized to reject teams for this event")

    if team["status"] != TeamStatus.PENDING:
         raise HTTPException(status_code=400, detail=f"Cannot reject. Current status: {team['status']}")

    # Update Team Status
    await db["teams"].update_one(
        {"_id": ObjectId(id)}, 
        {"$set": {"status": TeamStatus.REJECTED}}
    )

    # Cascade Update Registrations
    await db["registrations"].update_many(
        {"team_id": id},
        {"$set": {
            "status": RegistrationStatus.REJECTED,
            "approved_by": current_user.id,
            "approved_at": datetime.utcnow()
        }}
    )
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.REJECT,
        module=AuditModule.TEAMS,
        ref_id=id,
        description=f"Rejected team {team['team_name']}",
        db=db
    )
    
    # Email Notification for all members (Async)
    event = await db["events"].find_one({"_id": ObjectId(team["event_id"])})
    if event:
        for member_id in team["member_ids"]:
            member = await db["users"].find_one({"_id": ObjectId(member_id)})
            if member and member.get("email"):
                await send_registration_rejected_email(
                    member["email"],
                    member["full_name"],
                    event["title"]
                )

    return {"message": "Team and members rejected"}

@router.get("/{id}", response_model=TeamResponse)
async def get_team(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    team = await db["teams"].find_one({"_id": ObjectId(id)})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Access Control: Admin, Faculty, or Team Member
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY, UserRole.EVENT_COORDINATOR]:
        # Check if user is leader or member
        is_leader = team["leader_id"] == current_user.id
        is_member = current_user.id in team["member_ids"]
        
        if not (is_leader or is_member):
             raise HTTPException(status_code=403, detail="Not authorized to view this team")
    
    team["id"] = str(team["_id"])
    
    # Enrich Leader Name
    leader = await db["users"].find_one({"_id": ObjectId(team["leader_id"])})
    team["leader_name"] = leader.get("full_name") if leader else "Unknown"
    
    return team

@router.get("/events/{event_id}", response_model=List[TeamResponse])
async def get_event_teams(event_id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")
        
    teams = await db["teams"].find({"event_id": event_id}).to_list(1000)
    for team in teams:
        team["id"] = str(team["_id"])
        
        # Enrich Leader Name
        leader = await db["users"].find_one({"_id": ObjectId(team["leader_id"])})
        team["leader_name"] = leader.get("full_name") if leader else "Unknown"
        
    return teams
