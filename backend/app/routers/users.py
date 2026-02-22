from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.core.db import get_database
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse
from app.dependencies.rbac import RoleChecker, get_current_user

router = APIRouter()

allow_create_user = RoleChecker([UserRole.ADMIN])

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_create_user)])
async def create_user(user: UserCreate, db=Depends(get_database)):
    existing_user = await db["users"].find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user_dict = user.dict()
    user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
    
    # Logic to ensure student fields are handled correctly is in Pydantic schema validation
    # But we can enforce it here too just in case or for cleaning up non-student roles
    if user.role != UserRole.STUDENT:
        user_dict["registration_number"] = None
        user_dict["department"] = None
        user_dict["year"] = None

    new_user = await db["users"].insert_one(user_dict)
    created_user = await db["users"].find_one({"_id": new_user.inserted_id})
    
    created_user["_id"] = str(created_user["_id"])
    created_user["id"] = created_user["_id"]
    return created_user

@router.get("/", response_model=List[UserResponse])
async def read_users(
    skip: int = 0, 
    limit: int = 100, 
    role: Optional[UserRole] = None,
    db=Depends(get_database),
    current_user: User = Depends(get_current_user) # Authenticated users only
):
    query = {}
    if role:
        query["role"] = role
        
    users = await db["users"].find(query).skip(skip).limit(limit).to_list(limit)
    
    # Map _id to id
    for user in users:
        user["_id"] = str(user["_id"])
        user["id"] = user["_id"]
        
    return users

allow_delete_user = RoleChecker([UserRole.ADMIN])

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(allow_delete_user)])
async def delete_user(user_id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    from bson import ObjectId
    
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Prevent admin from deleting themselves
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    
    target = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting the last admin
    if target.get("role") == UserRole.ADMIN:
        admin_count = await db["users"].count_documents({"role": UserRole.ADMIN})
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last admin account")
    
    await db["users"].delete_one({"_id": ObjectId(user_id)})

