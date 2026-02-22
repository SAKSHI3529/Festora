from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from bson import ObjectId
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.category import Category
from app.dependencies.rbac import RoleChecker, get_current_user
from app.utils.audit import log_action, AuditAction, AuditModule

router = APIRouter()

allow_manage_categories = RoleChecker([UserRole.ADMIN])

@router.get("/", response_model=List[Category])
async def get_categories(db=Depends(get_database)):
    categories = await db["categories"].find().to_list(100)
    for cat in categories:
        cat["_id"] = str(cat["_id"])
    return categories

@router.post("/", response_model=Category)
async def create_category(
    category: Category, 
    db=Depends(get_database), 
    current_user: User = Depends(get_current_user),
    _ = Depends(allow_manage_categories)
):
    cat_data = category.dict(by_alias=True, exclude={"id"})
    result = await db["categories"].insert_one(cat_data)
    cat_data["_id"] = str(result.inserted_id)
    
    await log_action(
        db, current_user.id, AuditAction.CREATE, AuditModule.EVENTS,
        str(result.inserted_id), {"name": cat_data["name"]}
    )
    return cat_data

@router.put("/{id}", response_model=Category)
async def update_category(
    id: str, 
    category: Category, 
    db=Depends(get_database), 
    current_user: User = Depends(get_current_user),
    _ = Depends(allow_manage_categories)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Category ID")
    
    update_data = category.dict(by_alias=True, exclude={"id", "created_at"})
    result = await db["categories"].update_one(
        {"_id": ObjectId(id)}, {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    update_data["_id"] = id
    await log_action(
        db, current_user.id, AuditAction.UPDATE, AuditModule.EVENTS,
        id, {"name": update_data["name"]}
    )
    return update_data

@router.delete("/{id}")
async def delete_category(
    id: str, 
    db=Depends(get_database), 
    current_user: User = Depends(get_current_user),
    _ = Depends(allow_manage_categories)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Category ID")
    
    # Check if used by any events
    # Important: Category names might be stored as strings in events.category
    # We should check both by name (if we have it) or just name since event.category is a string
    category = await db["categories"].find_one({"_id": ObjectId(id)})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    event_count = await db["events"].count_documents({"category": category["name"]})
    if event_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete category linked to {event_count} event(s)"
        )
        
    await db["categories"].delete_one({"_id": ObjectId(id)})
    await log_action(
        db, current_user.id, AuditAction.DELETE, AuditModule.EVENTS,
        id, {"name": category["name"]}
    )
    return {"message": "Category deleted successfully"}
