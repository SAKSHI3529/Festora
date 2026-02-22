from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.event import Event, EventStatus, EventType
from app.models.registration import Registration, RegistrationStatus
from app.models.team import Team, TeamStatus
from app.schemas.registration import RegistrationCreate, RegistrationResponse
from app.schemas.team import TeamResponse
from app.dependencies.rbac import RoleChecker, get_current_user

router = APIRouter()

allow_create_registration = RoleChecker([UserRole.STUDENT])
allow_approve_reject = RoleChecker([UserRole.ADMIN, UserRole.FACULTY])

from app.utils.audit import log_action, AuditAction, AuditModule

@router.post("/", response_model=RegistrationResponse | TeamResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_create_registration)])
async def create_registration(
    reg_in: RegistrationCreate, 
    db=Depends(get_database), 
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch Event
    if not ObjectId.is_valid(reg_in.event_id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")
    
    event = await db["events"].find_one({"_id": ObjectId(reg_in.event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # 2. Validate Event Status & Deadline
    if event["status"] != EventStatus.SCHEDULED:
        raise HTTPException(status_code=400, detail="Event is not open for registration")
    
    if event["registration_deadline"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Registration deadline has passed")

    # 3. Check for Existing Registration (for this student, for this event)
    existing_reg = await db["registrations"].find_one({
        "event_id": reg_in.event_id,
        "student_id": current_user.id
    })
    if existing_reg:
         raise HTTPException(status_code=400, detail="You are already registered for this event")

    # --- SOLO LOGIC ---
    if event["event_type"] == EventType.SOLO:
        new_reg = Registration(
            event_id=reg_in.event_id,
            student_id=current_user.id,
            status=RegistrationStatus.PENDING
        )
        reg_dict = new_reg.dict(by_alias=True)
        if "_id" in reg_dict:
            del reg_dict["_id"]
            
        result = await db["registrations"].insert_one(reg_dict)
        created_reg = await db["registrations"].find_one({"_id": result.inserted_id})
        created_reg["_id"] = str(created_reg["_id"])
        created_reg["id"] = created_reg["_id"]
        
        # Log Action
        await log_action(
            user_id=current_user.id,
            user_role=current_user.role,
            action=AuditAction.CREATE,
            module=AuditModule.REGISTRATIONS,
            ref_id=created_reg["id"],
            description=f"Registered for event: {event['title']}",
            db=db
        )
        
        return RegistrationResponse(**created_reg)

    # --- GROUP LOGIC ---
    elif event["event_type"] == EventType.GROUP:
        # Validate Team Name
        if not reg_in.team_name:
            raise HTTPException(status_code=400, detail="Team name is required for group events")
        
        # Check Team Name Uniqueness for this event
        existing_team = await db["teams"].find_one({"event_id": reg_in.event_id, "team_name": reg_in.team_name})
        if existing_team:
            raise HTTPException(status_code=400, detail="Team name already taken for this event")

        # Validate Members
        if not reg_in.member_ids:
             raise HTTPException(status_code=400, detail="Team members are required")
        
        all_member_ids = set(reg_in.member_ids)
        all_member_ids.add(current_user.id) # Ensure leader is in the set
        all_member_ids_list = list(all_member_ids)

        if len(all_member_ids_list) > event["max_team_size"]:
            raise HTTPException(status_code=400, detail=f"Team size exceeds limit of {event['max_team_size']}")

        # Validate all members exist and are STUDENTS
        for member_id in all_member_ids_list:
            # Check existence/role
            member = await db["users"].find_one({"_id": ObjectId(member_id), "role": UserRole.STUDENT})
            if not member:
                 raise HTTPException(status_code=400, detail=f"Invalid member ID or not a student: {member_id}")
            
            # Check existing registration for this event
            existing_member_reg = await db["registrations"].find_one({
                "event_id": reg_in.event_id,
                "student_id": member_id
            })
            if existing_member_reg:
                 raise HTTPException(status_code=400, detail=f"Member {member['email']} is already registered for this event")

        # Create Team
        new_team = Team(
            event_id=reg_in.event_id,
            team_name=reg_in.team_name,
            leader_id=current_user.id,
            member_ids=all_member_ids_list,
            status=TeamStatus.PENDING
        )
        team_dict = new_team.dict(by_alias=True)
        if "_id" in team_dict:
            del team_dict["_id"]
            
        team_result = await db["teams"].insert_one(team_dict)
        team_id = str(team_result.inserted_id)

        # Create Registrations for ALL members
        registrations = []
        for member_id in all_member_ids_list:
            reg = Registration(
                event_id=reg_in.event_id,
                student_id=member_id,
                team_id=team_id,
                status=RegistrationStatus.PENDING
            )
            reg_dict = reg.dict(by_alias=True)
            if "_id" in reg_dict:
                del reg_dict["_id"]
            registrations.append(reg_dict)
        
        await db["registrations"].insert_many(registrations)

        created_team = await db["teams"].find_one({"_id": team_result.inserted_id})
        created_team["_id"] = str(created_team["_id"])
        created_team["id"] = created_team["_id"]
        
        # Log Action (Team Create)
        await log_action(
            user_id=current_user.id,
            user_role=current_user.role,
            action=AuditAction.CREATE,
            module=AuditModule.TEAMS,
            ref_id=team_id,
            description=f"Created team: {created_team['team_name']} for event {event['title']}",
            db=db
        )
        
        return TeamResponse(**created_team)

@router.put("/{id}/approve", dependencies=[Depends(allow_approve_reject)])
async def approve_registration(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    reg = await db["registrations"].find_one({"_id": ObjectId(id)})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")
    
    if reg["status"] != RegistrationStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot approve. Current status: {reg['status']}")
    
    if reg.get("team_id"):
        raise HTTPException(status_code=400, detail="Cannot approve individual team member. Use Team Approval.")

    update_data = {
        "status": RegistrationStatus.APPROVED,
        "approved_by": current_user.id,
        "approved_at": datetime.utcnow()
    }
    await db["registrations"].update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.APPROVE,
        module=AuditModule.REGISTRATIONS,
        ref_id=id,
        description=f"Approved registration for student {reg['student_id']}",
        db=db
    )
    
    return {"message": "Registration approved"}

@router.put("/{id}/reject", dependencies=[Depends(allow_approve_reject)])
async def reject_registration(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    reg = await db["registrations"].find_one({"_id": ObjectId(id)})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    if reg["status"] != RegistrationStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot reject. Current status: {reg['status']}")

    if reg.get("team_id"):
        raise HTTPException(status_code=400, detail="Cannot reject individual team member. Use Team Rejection.")

    update_data = {
        "status": RegistrationStatus.REJECTED,
        "approved_by": current_user.id, # or rejected_by field? Reusing approved_by as 'decided_by'
        "approved_at": datetime.utcnow()
    }
    await db["registrations"].update_one({"_id": ObjectId(id)}, {"$set": update_data})
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.REJECT,
        module=AuditModule.REGISTRATIONS,
        ref_id=id,
        description=f"Rejected registration for student {reg['student_id']}",
        db=db
    )
    
    return {"message": "Registration rejected"}

allow_view_registrations = RoleChecker([UserRole.ADMIN, UserRole.FACULTY, UserRole.EVENT_COORDINATOR])

@router.get("/events/{event_id}", response_model=List[RegistrationResponse], dependencies=[Depends(allow_view_registrations)])
async def get_event_registrations(event_id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    # Check if event exists?
    # Usually good practice.
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")
        
    registrations = await db["registrations"].find({"event_id": event_id}).to_list(1000)
    for reg in registrations:
        reg["_id"] = str(reg["_id"])
        reg["id"] = reg["_id"]
    return registrations

@router.get("/my", response_model=List[RegistrationResponse], dependencies=[Depends(allow_create_registration)])
async def get_my_registrations(db=Depends(get_database), current_user: User = Depends(get_current_user)):
    registrations = await db["registrations"].find({"student_id": current_user.id}).to_list(1000)
    for reg in registrations:
        reg["_id"] = str(reg["_id"])
        reg["id"] = reg["_id"]
    return registrations
@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_registration(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    # Fetch registration
    reg = await db["registrations"].find_one({"_id": ObjectId(id)})
    if not reg:
        raise HTTPException(status_code=404, detail="Registration not found")

    # Check ownership or admin
    if reg["student_id"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to delete this registration")
    
    # Check status (Can only cancel PENDING)
    if reg["status"] != RegistrationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cannot cancel processed registration")

    # Delete
    await db["registrations"].delete_one({"_id": ObjectId(id)})
    
    # If it's a team leader and team registration?
    # Logic in create_registration creates multiple registrations linked by team_id.
    # If a member cancels, remove them? Or entire team?
    # Simple logic: If part of a team, maybe warn or handle differently. 
    # For now, simple delete.
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.DELETE,
        module=AuditModule.REGISTRATIONS,
        ref_id=id,
        description=f"Cancelled registration",
        db=db
    )
