import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import UserRole

async def seed_users():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DATABASE_NAME]
    users_collection = db["users"]

    users_to_seed = [
        # Admin
        {
            "full_name": "Admin User",
            "email": "admin@festora.com",
            "password": "Admin@123",
            "role": UserRole.ADMIN
        },
        # Faculty Coordinators
        {
            "full_name": "Faculty One",
            "email": "faculty1@festora.com",
            "password": "Faculty@123",
            "role": UserRole.FACULTY
        },
        {
            "full_name": "Faculty Two",
            "email": "faculty2@festora.com",
            "password": "Faculty@123",
            "role": UserRole.FACULTY
        },
        # Event Coordinators
        {
            "full_name": "Coordinator One",
            "email": "coordinator1@festora.com",
            "password": "Coordinator@123",
            "role": UserRole.EVENT_COORDINATOR
        },
        {
            "full_name": "Coordinator Two",
            "email": "coordinator2@festora.com",
            "password": "Coordinator@123",
            "role": UserRole.EVENT_COORDINATOR
        },
        # Judges
        {
            "full_name": "Judge One",
            "email": "judge1@festora.com",
            "password": "Judge@123",
            "role": UserRole.JUDGE
        },
        {
            "full_name": "Judge Two",
            "email": "judge2@festora.com",
            "password": "Judge@123",
            "role": UserRole.JUDGE
        },
        # Students
        {
            "full_name": "Student One",
            "email": "student1@festora.com",
            "password": "Student@123",
            "role": UserRole.STUDENT,
            "registration_number": "REG001",
            "department": "CSE",
            "year": 3
        },
        {
            "full_name": "Student Two",
            "email": "student2@festora.com",
            "password": "Student@123",
            "role": UserRole.STUDENT,
            "registration_number": "REG002",
            "department": "ECE",
            "year": 2
        },
        {
            "full_name": "Student Three",
            "email": "student3@festora.com",
            "password": "Student@123",
            "role": UserRole.STUDENT,
            "registration_number": "REG003",
            "department": "MECH",
            "year": 4
        },
        {
            "full_name": "Student Four",
            "email": "student4@festora.com",
            "password": "Student@123",
            "role": UserRole.STUDENT,
            "registration_number": "REG004",
            "department": "CSE",
            "year": 1
        },
        {
            "full_name": "Student Five",
            "email": "student5@festora.com",
            "password": "Student@123",
            "role": UserRole.STUDENT,
            "registration_number": "REG005",
            "department": "IT",
            "year": 3
        }
    ]

    print("Seeding users...")
    stats = {role: 0 for role in UserRole}

    for user_data in users_to_seed:
        existing_user = await users_collection.find_one({"email": user_data["email"]})
        if not existing_user:
            user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
            await users_collection.insert_one(user_data)
            print(f"Created user: {user_data['email']} ({user_data['role']})")
            stats[user_data['role']] += 1
        else:
            print(f"User already exists: {user_data['email']}")
            stats[user_data['role']] += 1 # counting existing towards total

    print("\n--- Seeding Summary ---")
    for role, count in stats.items():
        print(f"{role.value}: {count}")
    print("-----------------------")
    client.close()

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(seed_users())
