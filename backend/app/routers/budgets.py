from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.event import EventStatus
from app.models.budget import Budget, BudgetStatus
from app.schemas.budget import BudgetCreate, BudgetResponse, BudgetApprove
from app.dependencies.rbac import RoleChecker, get_current_user

router = APIRouter()

allow_create_budget = RoleChecker([UserRole.FACULTY])
allow_manage_budget = RoleChecker([UserRole.ADMIN])
allow_view_budget = RoleChecker([UserRole.ADMIN, UserRole.FACULTY])

from app.utils.audit import log_action, AuditAction, AuditModule

@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_create_budget)])
async def create_budget(budget_in: BudgetCreate, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    try:
        # 1. Validate Event
        if not ObjectId.is_valid(budget_in.event_id):
            raise HTTPException(status_code=400, detail="Invalid Event ID")
        
        event = await db["events"].find_one({"_id": ObjectId(budget_in.event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # 2. Check Event Status
        if event["status"] != EventStatus.SCHEDULED:
            raise HTTPException(status_code=400, detail=f"Budgets can only be requested for SCHEDULED events. Current: {event['status']}")
        
        # 3. Check Ownership
        if event["faculty_coordinator_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="You are not the Faculty Coordinator for this event")

        # 4. Check Pending Duplicates
        existing_pending = await db["budgets"].find_one({
            "event_id": budget_in.event_id,
            "status": BudgetStatus.PENDING
        })
        if existing_pending:
            raise HTTPException(status_code=400, detail="A pending budget request already exists for this event")

        # 5. Create Budget
        new_budget = Budget(
            event_id=budget_in.event_id,
            requested_by=current_user.id,
            requested_amount=budget_in.requested_amount,
            description=budget_in.description,
            justification=budget_in.justification,
            status=BudgetStatus.PENDING,
            requested_at=datetime.utcnow()
        )
        
        budget_dict = new_budget.dict(by_alias=True)
        if "_id" in budget_dict and budget_dict["_id"] is None:
            del budget_dict["_id"]

        result = await db["budgets"].insert_one(budget_dict)
        created_budget = await db["budgets"].find_one({"_id": result.inserted_id})
        created_budget["_id"] = str(created_budget["_id"])
        created_budget["id"] = created_budget["_id"]
        
        # Log Action
        await log_action(
            user_id=current_user.id,
            user_role=current_user.role,
            action=AuditAction.CREATE,
            module=AuditModule.BUDGETS,
            ref_id=created_budget["id"],
            description=f"Requested budget for event: {event['title']}",
            db=db
        )
        
        return BudgetResponse(**created_budget)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"BUDGET CREATE ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

# Helper: build the MongoDB query filter for a budget by its string id.
# Documents accidentally stored with _id=null in MongoDB stringify to 'None'.
def _budget_query(id: str):
    if ObjectId.is_valid(id):
        return {"_id": ObjectId(id)}
    elif id == "None":
        return {"_id": None}   # matches document where _id was stored as null
    return None   # caller should 404

@router.get("/", dependencies=[Depends(allow_view_budget)])
async def get_budgets(db=Depends(get_database), current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == UserRole.FACULTY:
        query["requested_by"] = current_user.id

    budgets = await db["budgets"].find(query).to_list(1000)
    result = []
    for b in budgets:
        raw_id = b.get("_id")
        str_id = str(raw_id) if raw_id is not None else "None"
        b["_id"] = str_id
        b["id"]  = str_id

        # Enrich with event title - try ObjectId lookup, fallback to event_id string
        event_id_str = b.get("event_id", "")
        event_title = event_id_str  # default = raw id
        try:
            if ObjectId.is_valid(event_id_str):
                ev = await db["events"].find_one({"_id": ObjectId(event_id_str)})
                if ev:
                    event_title = ev.get("title") or event_id_str
                else:
                    # Event might also have _id=null; scan by event_id field if present
                    ev2 = await db["events"].find_one({"id": event_id_str})
                    if ev2:
                        event_title = ev2.get("title") or event_id_str
        except Exception:
            pass
        b["event_title"] = event_title

        # Enrich with requester name
        requester_name = b.get("requested_by", "")
        try:
            if ObjectId.is_valid(b.get("requested_by", "")):
                u = await db["users"].find_one({"_id": ObjectId(b["requested_by"])})
                if u:
                    requester_name = u.get("full_name") or b["requested_by"]
        except Exception:
            pass
        b["requester_name"] = requester_name

        result.append(b)
    return result

@router.put("/{id}/approve", dependencies=[Depends(allow_manage_budget)])
async def approve_budget(id: str, approval: BudgetApprove, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    qf = _budget_query(id)
    if qf is None:
        raise HTTPException(status_code=400, detail="Invalid Budget ID")

    budget = await db["budgets"].find_one(qf)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if budget["status"] != BudgetStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot approve. Current status: {budget['status']}")

    if approval.approved_amount > budget["requested_amount"]:
        raise HTTPException(status_code=400, detail="Approved amount cannot exceed requested amount")

    update_data = {
        "status": BudgetStatus.APPROVED,
        "approved_amount": approval.approved_amount,
        "approved_by": current_user.id,
        "approved_at": datetime.utcnow()
    }
    await db["budgets"].update_one(qf, {"$set": update_data})

    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.APPROVE,
        module=AuditModule.BUDGETS,
        ref_id=id,
        description=f"Approved budget request: {budget.get('description', '')}",
        db=db
    )
    updated = await db["budgets"].find_one(qf)
    updated["_id"] = str(updated["_id"])
    updated["id"]  = updated["_id"]
    return updated

@router.put("/{id}/reject", dependencies=[Depends(allow_manage_budget)])
async def reject_budget(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    qf = _budget_query(id)
    if qf is None:
        raise HTTPException(status_code=400, detail="Invalid Budget ID")

    budget = await db["budgets"].find_one(qf)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if budget["status"] != BudgetStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot reject. Current status: {budget['status']}")

    update_data = {
        "status": BudgetStatus.REJECTED,
        "approved_by": current_user.id,
        "approved_at": datetime.utcnow()
    }
    await db["budgets"].update_one(qf, {"$set": update_data})

    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.REJECT,
        module=AuditModule.BUDGETS,
        ref_id=id,
        description=f"Rejected budget request: {budget.get('description', '')}",
        db=db
    )
    updated = await db["budgets"].find_one(qf)
    updated["_id"] = str(updated["_id"])
    updated["id"]  = updated["_id"]
    return updated

@router.get("/events/{event_id}/summary", dependencies=[Depends(allow_view_budget)])
async def get_budget_summary(event_id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")
        
    pipeline = [
        {"$match": {"event_id": event_id}},
        {"$group": {
            "_id": "$status",
            "total_requested": {"$sum": "$requested_amount"},
            "total_approved": {"$sum": "$approved_amount"},
            "count": {"$sum": 1}
        }}
    ]
    
    summary = await db["budgets"].aggregate(pipeline).to_list(None)
    return {"event_id": event_id, "summary": summary}
