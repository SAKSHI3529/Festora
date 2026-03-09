from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import shutil
import os
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.event import Event, EventStatus, EventType
from app.schemas.event import EventCreate, EventUpdate, EventResponse
from app.dependencies.rbac import RoleChecker, get_current_user
from app.services.email_service import send_results_published_email

router = APIRouter()

allow_create_event = RoleChecker([UserRole.ADMIN])
allow_edit_event = RoleChecker([UserRole.ADMIN, UserRole.FACULTY])
allow_upload_rulebook = RoleChecker([UserRole.ADMIN, UserRole.FACULTY])

async def validate_event_roles(event_in: EventCreate | EventUpdate, db):
    # Validate Faculty Coordinator
    if event_in.faculty_coordinator_id and event_in.faculty_coordinator_id.strip():
        if not ObjectId.is_valid(event_in.faculty_coordinator_id):
            raise HTTPException(status_code=400, detail="Invalid Faculty Coordinator ID format")
        faculty = await db["users"].find_one({"_id": ObjectId(event_in.faculty_coordinator_id), "role": UserRole.FACULTY})
        if not faculty:
            raise HTTPException(status_code=400, detail="Faculty Coordinator not found or has wrong role")

    # Validate Event Coordinators
    if event_in.event_coordinator_ids:
        for coord_id in event_in.event_coordinator_ids:
            if not coord_id or not coord_id.strip():
                continue
            if not ObjectId.is_valid(coord_id):
                raise HTTPException(status_code=400, detail=f"Invalid Event Coordinator ID format: {coord_id}")
            coord = await db["users"].find_one({"_id": ObjectId(coord_id), "role": UserRole.EVENT_COORDINATOR})
            if not coord:
                raise HTTPException(status_code=400, detail=f"Event Coordinator not found: {coord_id}")

    # Validate Judges
    if event_in.judge_ids:
        for judge_id in event_in.judge_ids:
            if not judge_id or not judge_id.strip():
                continue
            if not ObjectId.is_valid(judge_id):
                raise HTTPException(status_code=400, detail=f"Invalid Judge ID format: {judge_id}")
            judge = await db["users"].find_one({"_id": ObjectId(judge_id), "role": UserRole.JUDGE})
            if not judge:
                raise HTTPException(status_code=400, detail=f"Judge not found: {judge_id}")

from app.utils.audit import log_action, AuditAction, AuditModule

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_create_event)])
async def create_event(event: EventCreate, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    try:
        await validate_event_roles(event, db)
        
        event_dict = event.dict()
        # Remove keys that might be None but have defaults in DB or logic
        if "id" in event_dict:
            del event_dict["id"]
        if "_id" in event_dict:
            del event_dict["_id"]

        event_dict["created_by"] = current_user.id
        event_dict["created_at"] = datetime.utcnow()
        
        new_event = await db["events"].insert_one(event_dict)
        created_event = await db["events"].find_one({"_id": new_event.inserted_id})
        
        # Map _id to id for Response Model
        created_event["id"] = str(created_event["_id"])
        created_event["_id"] = str(created_event["_id"])
        
        # Log Action
        await log_action(
            user_id=current_user.id,
            user_role=current_user.role,
            action=AuditAction.CREATE,
            module=AuditModule.EVENTS,
            ref_id=created_event["id"],
            description=f"Created event: {created_event['title']}",
            db=db
        )

        return created_event
    except Exception as e:
        # Log validation errors specifically if it's a Pydantic ValidationError (wrapped in generic 500 by FastAPI if not raised as RequestValidationError)
        # But here 'e' is strict Exception. validation of RESPONSE happens AFTER return.
        # So this try-except block WON'T catch response validation errors!
        # Response validation happens inside FastAPI's wrapper.
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/", response_model=List[EventResponse])
async def read_events(db=Depends(get_database), current_user: User = Depends(get_current_user)):
    query = {}
    
    # If Judge, only show assigned events
    if current_user.role == UserRole.JUDGE:
        query["judge_ids"] = current_user.id
    elif current_user.role == UserRole.FACULTY:
        query["faculty_coordinator_id"] = current_user.id
    elif current_user.role == UserRole.EVENT_COORDINATOR:
        query["event_coordinator_ids"] = current_user.id
        
    events = await db["events"].find(query).sort("created_at", -1).to_list(1000)
    for event in events:
        event["_id"] = str(event["_id"])
        event["id"] = event["_id"]
        if "faculty_coordinator_id" in event:
            event["faculty_coordinator_id"] = str(event["faculty_coordinator_id"])
        if "event_coordinator_ids" in event:
            event["event_coordinator_ids"] = [str(eid) for eid in event["event_coordinator_ids"]]
        if "judge_ids" in event:
            event["judge_ids"] = [str(jid) for jid in event["judge_ids"]]
        if "created_at" not in event or event["created_at"] is None:
            event["created_at"] = datetime.utcnow()
    return events

@router.get("/{id}", response_model=EventResponse)
async def read_event(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    event = await db["events"].find_one({"_id": ObjectId(id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    event["_id"] = str(event["_id"])
    event["id"] = event["_id"]
    if "faculty_coordinator_id" in event:
        event["faculty_coordinator_id"] = str(event["faculty_coordinator_id"])
    if "event_coordinator_ids" in event:
        event["event_coordinator_ids"] = [str(eid) for eid in event["event_coordinator_ids"]]
    if "judge_ids" in event:
        event["judge_ids"] = [str(jid) for jid in event["judge_ids"]]
    return event

@router.put("/{id}", response_model=EventResponse, dependencies=[Depends(allow_edit_event)])
async def update_event(id: str, event_update: EventUpdate, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    event = await db["events"].find_one({"_id": ObjectId(id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Permissions Check: Faculty can only edit their own events
    if current_user.role == UserRole.FACULTY and event.get("faculty_coordinator_id") != str(current_user.id):
        raise HTTPException(status_code=403, detail="You can only edit events you are coordinating")

    await validate_event_roles(event_update, db)

    update_data = {k: v for k, v in event_update.dict(exclude_unset=True).items()}
    
    if "status" in update_data:
        new_status = update_data["status"]
        old_status = event.get("status")
        
        # Enforce lifecycle rules
        if current_user.role != UserRole.ADMIN:
            # Result locking is Admin or assigned Faculty only
            if "is_result_locked" in update_data:
                # Check if actually changing the locking state
                if update_data["is_result_locked"] != event.get("is_result_locked"):
                    if current_user.role == UserRole.FACULTY:
                        if event.get("faculty_coordinator_id") != str(current_user.id):
                            raise HTTPException(status_code=403, detail="Only the assigned faculty coordinator can lock results")
                    elif current_user.role != UserRole.ADMIN:
                        raise HTTPException(status_code=403, detail="Only admins or assigned faculty can lock results")

                # Validate that event is COMPLETED before locking
                if update_data["is_result_locked"]:
                    final_status = update_data.get("status", event.get("status"))
                    if final_status != EventStatus.COMPLETED:
                        raise HTTPException(status_code=400, detail="Cannot lock results unless event is COMPLETED")

    if update_data:
        await db["events"].update_one({"_id": ObjectId(id)}, {"$set": update_data})
        
        # Log Action
        await log_action(
            user_id=current_user.id,
            user_role=current_user.role,
            action=AuditAction.UPDATE,
            module=AuditModule.EVENTS,
            ref_id=id,
            description=f"Updated event: {event['title']}. Changes: {', '.join(update_data.keys())}",
            db=db
        )
        
        # Result Locking Notification (Async)
        if update_data.get("is_result_locked") and not event.get("is_result_locked"):
            # Fetch all approved participants
            regs = await db["registrations"].find({"event_id": id, "status": "APPROVED"}).to_list(None)
            for reg in regs:
                student = await db["users"].find_one({"_id": ObjectId(reg["student_id"])})
                if student and student.get("email"):
                    await send_results_published_email(
                        student["email"],
                        student["full_name"],
                        event["title"]
                    )
    
    updated_event = await db["events"].find_one({"_id": ObjectId(id)})
    updated_event["_id"] = str(updated_event["_id"])
    updated_event["id"] = updated_event["_id"]
    if "faculty_coordinator_id" in updated_event:
        updated_event["faculty_coordinator_id"] = str(updated_event["faculty_coordinator_id"])
    if "event_coordinator_ids" in updated_event:
        updated_event["event_coordinator_ids"] = [str(eid) for eid in updated_event["event_coordinator_ids"]]
    if "judge_ids" in updated_event:
        updated_event["judge_ids"] = [str(jid) for jid in updated_event["judge_ids"]]
    return updated_event

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_edit_event)])
async def delete_event(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    result = await db["events"].delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.DELETE,
        module=AuditModule.EVENTS,
        ref_id=id,
        description=f"Deleted event ID: {id}",
        db=db
    )

@router.post("/{id}/upload-rulebook", dependencies=[Depends(allow_upload_rulebook)])
async def upload_rulebook(id: str, file: UploadFile = File(...), db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    file_location = f"uploads/rulebooks/event_{id}.pdf"
    os.makedirs(os.path.dirname(file_location), exist_ok=True)
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    file_size = os.path.getsize(file_location)
    if file_size > 5 * 1024 * 1024:
        os.remove(file_location)
        raise HTTPException(status_code=400, detail="File too large (Max 5MB)")

    rulebook_url = f"/uploads/rulebooks/event_{id}.pdf"
    await db["events"].update_one({"_id": ObjectId(id)}, {"$set": {"rulebook_url": rulebook_url}})
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.UPDATE,
        module=AuditModule.EVENTS,
        ref_id=id,
        description="Uploaded rulebook",
        db=db
    )
    
    return {"filename": file.filename, "rulebook_url": rulebook_url}

# --- Participants & Attendance ---

allow_view_participants = RoleChecker([UserRole.ADMIN, UserRole.FACULTY, UserRole.EVENT_COORDINATOR])

@router.get("/{id}/participants", dependencies=[Depends(allow_view_participants)]) 
async def get_participants(
    id: str, 
    department: Optional[str] = None, 
    db=Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # TODO: Add specific RoleChecker for Coordinators if needed.
    # For now, strict RBAC might block coordinators if they try. 
    # Let's add coordinator role to allowed list in logic if needed, but sticking to provided checkers for speed.
    
    try:
        match_query = {"event_id": id}
        
        # Aggregation Pipeline
        pipeline = [
            {"$match": match_query},
            {
                "$lookup": {
                    "from": "users",
                    "let": {"studentId": {
                        "$convert": {
                            "input": "$student_id",
                            "to": "objectId",
                            "onError": None,
                            "onNull": None
                        }
                    }},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$studentId"]}}}
                    ],
                    "as": "student"
                }
            },
            {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
            {
                 "$lookup": {
                    "from": "teams",
                    "let": {"teamId": "$team_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$eq": [
                                        "$_id",
                                        {
                                            "$convert": {
                                                "input": "$$teamId",
                                                "to": "objectId",
                                                "onError": None,
                                                "onNull": None
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "team"
                }
            },
            {"$unwind": {"path": "$team", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 0,
                    "id": {"$toString": "$_id"}, 
                    "student_id": {"$toString": "$student_id"},
                    "student_name": {"$ifNull": ["$student.full_name", "Unknown"]},
                    "registration_number": {"$ifNull": ["$student.registration_number", ""]},
                    "department": {"$ifNull": ["$student.department", ""]},
                    "team_id": {"$toString": "$team_id"},
                    "team_name": {"$ifNull": ["$team.team_name", None]},
                    "status": "$status"
                }
            }
        ]

        if department:
            pipeline.append({"$match": {"department": department}})

        participants = await db["registrations"].aggregate(pipeline).to_list(None)
        return participants
    except Exception as e:
        print(f"ERROR in get_participants: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

from app.schemas.attendance import AttendanceCreate, AttendanceResponse
from app.models.attendance import Attendance, AttendanceStatus

@router.post("/{id}/attendance", response_model=AttendanceResponse)
async def mark_attendance(
    id: str, 
    att_in: AttendanceCreate, 
    db=Depends(get_database),
    current_user: User = Depends(get_current_user)
):
    # Role: Faculty / Coordinator (Admin usually implies all)
    # Check roles strictly? 
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY, UserRole.EVENT_COORDINATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")

    # Check if registration exists/approved?
    # Usually attendance is for approved participants.
    reg = await db["registrations"].find_one({
        "event_id": id, 
        "student_id": att_in.student_id,
        "status": "APPROVED" 
    })
    if not reg:
        raise HTTPException(status_code=400, detail="Student not registered or not approved")

    # Check if attendance already marked (Immutability Rule)
    existing_att = await db["attendance"].find_one({"event_id": id, "student_id": att_in.student_id})
    if existing_att:
        raise HTTPException(status_code=400, detail="Attendance already marked and cannot be changed")

    # Use update_one with upsert=True to prevent duplicates and ensure we have only one record per student/event
    attendance_data = {
        "event_id": id,
        "student_id": att_in.student_id,
        "status": att_in.status,
        "marked_by": current_user.id,
        "marked_at": datetime.utcnow()
    }
    
    await db["attendance"].update_one(
        {"event_id": id, "student_id": att_in.student_id},
        {"$set": attendance_data},
        upsert=True
    )
    
    # Fetch the record (either newly created or updated) to return it
    created_att = await db["attendance"].find_one({"event_id": id, "student_id": att_in.student_id})
    created_att["_id"] = str(created_att["_id"])
    created_att["id"] = created_att["_id"]
    
    return created_att

@router.get("/{id}/attendance")
async def get_attendance(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
     # Role: Faculty / Coordinator
    if current_user.role not in [UserRole.ADMIN, UserRole.FACULTY, UserRole.EVENT_COORDINATOR]:
        raise HTTPException(status_code=403, detail="Not authorized")

    attendance_records = await db["attendance"].find({"event_id": id}).to_list(None)
    for record in attendance_records:
        record["_id"] = str(record["_id"])
    return attendance_records


