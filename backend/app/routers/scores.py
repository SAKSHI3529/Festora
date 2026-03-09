from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.event import EventStatus, EventType
from app.models.registration import RegistrationStatus
from app.models.team import TeamStatus
from app.models.score import Score
from app.schemas.score import ScoreCreate, ScoreResponse, ScoreUpdate
from app.dependencies.rbac import RoleChecker, get_current_user

router = APIRouter()

allow_score_submission = RoleChecker([UserRole.JUDGE, UserRole.ADMIN]) # Admins can score too strictly speaking? Req says Judge. Admin usually has all access.

from app.utils.audit import log_action, AuditAction, AuditModule

@router.post("/", response_model=ScoreResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_score_submission)])
async def submit_score(score_in: ScoreCreate, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    # 1. Validate Event
    if not ObjectId.is_valid(score_in.event_id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")
    
    event = await db["events"].find_one({"_id": ObjectId(score_in.event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["status"] != EventStatus.ONGOING:
        raise HTTPException(status_code=400, detail="Event is not ONGOING")
    
    if event.get("is_result_locked", False):
         raise HTTPException(status_code=400, detail="Event results are locked")

    # 2. Validate Judge Assignment
    is_assigned = str(current_user.id) in event.get("judge_ids", [])
    if not is_assigned and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You are not assigned as a judge for this event")

    # 3. Validate Entity & Duplicate Scoring
    # Check if Score already exists for this judge + event + entity
    query = {
        "event_id": score_in.event_id,
        "judge_id": current_user.id
    }
    
    if event["event_type"] == EventType.SOLO:
        if not score_in.registration_id:
            raise HTTPException(status_code=400, detail="registration_id required for SOLO event")
        if score_in.team_id:
            raise HTTPException(status_code=400, detail="team_id must be null for SOLO event")
            
        if not ObjectId.is_valid(score_in.registration_id):
             raise HTTPException(status_code=400, detail="Invalid Registration ID")

        # Validate Registration
        reg = await db["registrations"].find_one({"_id": ObjectId(score_in.registration_id)})
        if not reg:
            raise HTTPException(status_code=404, detail="Registration not found")
        if reg["event_id"] != score_in.event_id:
             raise HTTPException(status_code=400, detail="Registration does not belong to this event")
        if reg["status"] != RegistrationStatus.APPROVED:
             raise HTTPException(status_code=400, detail="Participant is not APPROVED")

        query["registration_id"] = score_in.registration_id

    elif event["event_type"] == EventType.GROUP:
        if not score_in.team_id:
            raise HTTPException(status_code=400, detail="team_id required for GROUP event")
        if score_in.registration_id:
             raise HTTPException(status_code=400, detail="registration_id must be null for GROUP event")

        if not ObjectId.is_valid(score_in.team_id):
             raise HTTPException(status_code=400, detail="Invalid Team ID")

        # Validate Team
        team = await db["teams"].find_one({"_id": ObjectId(score_in.team_id)})
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")
        if team["event_id"] != score_in.event_id:
             raise HTTPException(status_code=400, detail="Team does not belong to this event")
        if team["status"] != TeamStatus.APPROVED:
             raise HTTPException(status_code=400, detail="Team is not APPROVED")

        query["team_id"] = score_in.team_id

    # Check Duplicate
    existing_score = await db["scores"].find_one(query)
    if existing_score:
         raise HTTPException(status_code=409, detail="You have already scored this participant/team")

    # 4. Save Score
    new_score = Score(
        event_id=score_in.event_id,
        judge_id=current_user.id,
        registration_id=score_in.registration_id,
        team_id=score_in.team_id,
        score=score_in.score,
        remarks=score_in.remarks,
        submitted_at=datetime.utcnow()
    )
    
    score_dict = new_score.dict(by_alias=True)
    if "_id" in score_dict:
        del score_dict["_id"]

    result = await db["scores"].insert_one(score_dict)
    created_score = await db["scores"].find_one({"_id": result.inserted_id})
    
    created_score["_id"] = str(created_score["_id"])
    created_score["id"] = created_score["_id"]
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.SUBMIT,
        module=AuditModule.SCORES,
        ref_id=created_score["id"],
        description=f"Submitted score: {score_in.score} for event {event['title']}",
        db=db
    )
    
    return ScoreResponse(**created_score)

@router.get("/{event_id}/my-scores", response_model=list[ScoreResponse])
async def get_my_scores(event_id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    # Judges can only see their own scores
    scores = await db["scores"].find({
        "event_id": event_id,
        "judge_id": current_user.id
    }).to_list(None)
    
    for score in scores:
        score["_id"] = str(score["_id"])
        score["id"] = score["_id"]
        
    return scores

@router.put("/{score_id}", response_model=ScoreResponse)
async def update_score(score_id: str, score_update: ScoreUpdate, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(score_id):
        raise HTTPException(status_code=400, detail="Invalid Score ID")
    
    existing_score = await db["scores"].find_one({"_id": ObjectId(score_id)})
    if not existing_score:
        raise HTTPException(status_code=404, detail="Score not found")
    
    # Check Ownership
    if existing_score["judge_id"] != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="You can only edit your own scores")
    
    # Check Event Status & Lock
    event = await db["events"].find_one({"_id": ObjectId(existing_score["event_id"])})
    if not event:
        raise HTTPException(status_code=404, detail="Associated event not found")
        
    if event["status"] != EventStatus.ONGOING:
        raise HTTPException(status_code=400, detail="Scores can only be edited while event is ONGOING")
    
    if event.get("is_result_locked", False):
        raise HTTPException(status_code=400, detail="Cannot edit scores because results are locked")

    # Update
    update_data = {
        "score": score_update.score,
        "remarks": score_update.remarks,
        "updated_at": datetime.utcnow()
    }
    
    await db["scores"].update_one(
        {"_id": ObjectId(score_id)},
        {"$set": update_data}
    )
    
    updated_score = await db["scores"].find_one({"_id": ObjectId(score_id)})
    updated_score["_id"] = str(updated_score["_id"])
    updated_score["id"] = updated_score["_id"]
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.UPDATE,
        module=AuditModule.SCORES,
        ref_id=score_id,
        description=f"Updated score to {score_update.score} for event {event['title']}",
        db=db
    )
    
    return ScoreResponse(**updated_score)

from app.schemas.result import EventResultResponse, ResultEntry

@router.put("/{event_id}/lock", dependencies=[Depends(get_current_user)])
async def lock_results(event_id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    event = await db["events"].find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Permissions Check: Admin or Assigned Faculty
    if current_user.role == UserRole.FACULTY:
        if event.get("faculty_coordinator_id") != str(current_user.id):
            raise HTTPException(status_code=403, detail="Only the assigned faculty coordinator can lock results")
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins or assigned faculty can lock results")

    if event["status"] != EventStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Event must be COMPLETED to lock results")
    
    await db["events"].update_one({"_id": ObjectId(event_id)}, {"$set": {"is_result_locked": True}})
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.LOCK,
        module=AuditModule.SCORES,
        ref_id=event_id,
        description=f"Locked results for event {event['title']}",
        db=db
    )
    
    return {"message": "Event results locked successfully"}

@router.get("/{event_id}/results", response_model=EventResultResponse)
async def get_results(event_id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    # Who can see results? Admin, Faculty, and maybe everyone if locked?
    # Assumption: Admin/Faculty always. Everyone else only if locked? 
    # Or maybe everyone sees leaderboard live? 
    # Let's restrict to Admin/Faculty for now unless locked? 
    # Or just keep it simple: Authenticated.
    
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    event = await db["events"].find_one({"_id": ObjectId(event_id)})
    if not event:
         raise HTTPException(status_code=404, detail="Event not found")

    # Aggregation Pipeline
    pipeline = [
        {"$match": {"event_id": event_id}},
    ]
    
    if event["event_type"] == EventType.SOLO:
        pipeline.extend([
            {
                "$group": {
                    "_id": "$registration_id",
                    "total_score": {"$sum": "$score"},
                    "average_score": {"$avg": "$score"},
                    "score_count": {"$sum": 1}
                }
            },
            {
                 "$lookup": {
                    "from": "registrations",
                    "let": {"regId": {"$toObjectId": "$_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$regId"]}}}
                    ],
                    "as": "registration"
                }
            },
            {"$unwind": "$registration"},
            {
                 "$lookup": {
                    "from": "users",
                    "let": {"studentId": {"$toObjectId": "$registration.student_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$studentId"]}}}
                    ],
                    "as": "student"
                }
            },
            {"$unwind": "$student"},
            {
                "$project": {
                    "rank": {"$literal": 0}, 
                    "participant_name": "$student.full_name",
                    "registration_number": "$student.registration_number",
                    "total_score": 1,
                    "average_score": 1,
                    "score_count": 1
                }
            }
        ])
    elif event["event_type"] == EventType.GROUP:
         pipeline.extend([
            {
                "$group": {
                    "_id": "$team_id",
                    "total_score": {"$sum": "$score"},
                    "average_score": {"$avg": "$score"},
                    "score_count": {"$sum": 1}
                }
            },
             {
                 "$lookup": {
                    "from": "teams",
                    "let": {"teamId": {"$toObjectId": "$_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$teamId"]}}}
                    ],
                    "as": "team"
                }
            },
            {"$unwind": "$team"},
             {
                "$project": {
                    "rank": {"$literal": 0},
                    "team_name": "$team.team_name",
                    "total_score": 1,
                    "average_score": 1,
                    "score_count": 1
                }
            }
         ])

    # Sort by Total Score DESC
    pipeline.append({"$sort": {"total_score": -1}})

    results = await db["scores"].aggregate(pipeline).to_list(None)
    
    final_results = []
    for i, res in enumerate(results):
        entry = ResultEntry(
            rank=i+1,
            participant_name=res.get("participant_name"),
            team_name=res.get("team_name"),
            registration_number=res.get("registration_number"),
            total_score=res["total_score"],
            average_score=res["average_score"],
            score_count=res["score_count"]
        )
        final_results.append(entry)

    return EventResultResponse(
        event_id=event_id,
        is_locked=event.get("is_result_locked", False),
        results=final_results
    )
