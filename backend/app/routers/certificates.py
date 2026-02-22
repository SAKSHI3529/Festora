from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import os
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.event import EventStatus, EventType
from app.models.registration import RegistrationStatus
from app.models.certificate import Certificate, CertificateType
from app.schemas.certificate import CertificateResponse
from app.dependencies.rbac import RoleChecker, get_current_user

# ReportLab imports
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

router = APIRouter()

allow_generate_certificates = RoleChecker([UserRole.ADMIN])
allow_view_certificates = RoleChecker([UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT]) # Students see own, others see event's

def generate_pdf(file_path: str, title: str, student_name: str, event_name: str, rank: Optional[int] = None):
    c = canvas.Canvas(file_path, pagesize=landscape(letter))
    width, height = landscape(letter)
    
    # Border
    c.setStrokeColor(colors.gold)
    c.setLineWidth(5)
    c.rect(30, 30, width-60, height-60)
    
    # Title
    c.setFont("Helvetica-Bold", 40)
    c.drawCentredString(width/2, height-100, "CERTIFICATE OF ACHIEVEMENT" if rank else "CERTIFICATE OF PARTICIPATION")
    
    # Presented to
    c.setFont("Helvetica", 24)
    c.drawCentredString(width/2, height-180, "This is presented to")
    
    # Name
    c.setFont("Helvetica-Bold", 32)
    c.drawCentredString(width/2, height-230, student_name)
    
    # For
    c.setFont("Helvetica", 20)
    text = f"For achieving {rank}{'st' if rank==1 else 'nd' if rank==2 else 'rd' if rank==3 else 'th'} Place in" if rank else "For participating in"
    c.drawCentredString(width/2, height-280, text)
    
    # Event Name
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width/2, height-330, event_name)
    
    # Date
    c.setFont("Helvetica", 14)
    c.drawCentredString(width/2, height-400, f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}")
    
    # Signature Placeholder
    c.line(width/2 + 200, height-450, width/2 + 400, height-450)
    c.drawString(width/2 + 250, height-470, "Authorized Signature")
    
    c.save()

from app.utils.audit import log_action, AuditAction, AuditModule

@router.post("/events/{id}/generate", status_code=status.HTTP_201_CREATED, dependencies=[Depends(allow_generate_certificates)])
async def generate_certificates(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")
        
    event = await db["events"].find_one({"_id": ObjectId(id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if event["status"] != EventStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Event must be COMPLETED")
    
    if not event.get("is_result_locked", False):
        raise HTTPException(status_code=400, detail="Results must be LOCKED")
        
    # Check if already generated
    existing_count = await db["certificates"].count_documents({"event_id": id})
    if existing_count > 0:
        raise HTTPException(status_code=400, detail="Certificates already generated for this event")
        
    generated_count = 0
    os.makedirs("uploads/certificates", exist_ok=True)
    
    # 1. Fetch Leaderboard for Winners (Rank 1, 2, 3)
    # Reusing simplified pipeline from reports/scores
    pipeline = [{"$match": {"event_id": id}}]
    if event["event_type"] == EventType.SOLO:
        pipeline.extend([
            {"$group": {"_id": "$registration_id", "total_score": {"$sum": "$score"}}},
            # Lookup Registration -> Student
             {"$lookup": {
                "from": "registrations",
                "let": {"regId": {"$toObjectId": "$_id"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$regId"]}}}],
                "as": "registration"
            }},
            {"$unwind": "$registration"},
            {"$lookup": {
                "from": "users",
                "let": {"studentId": {"$toObjectId": "$registration.student_id"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$studentId"]}}}],
                "as": "student"
            }},
            {"$unwind": "$student"},
             {"$project": {
                "student_id": "$student._id",
                "student_name": "$student.full_name",
                "score": "$total_score"
            }}
        ])
    elif event["event_type"] == EventType.GROUP:
        # Group logic: Certificates for ALL members of winning teams?
        # Requirement: "Generate Winner certificates for top 3".
        # If group, we need to get all members of the team.
        # Let's support SOLO first fully. For GROUP, we get Team -> Members.
        pipeline.extend([
            {"$group": {"_id": "$team_id", "total_score": {"$sum": "$score"}}},
             {"$lookup": {
                "from": "teams",
                "let": {"teamId": {"$toObjectId": "$_id"}},
                "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$teamId"]}}}],
                "as": "team"
            }},
            {"$unwind": "$team"},
             {"$project": {
                "team_id": "$team._id",
                "team_name": "$team.team_name",
                "member_ids": "$team.member_ids",
                "score": "$total_score"
            }}
        ])

    pipeline.append({"$sort": {"score": -1}})
    pipeline.append({"$limit": 3}) # Top 3
    
    winners_data = await db["scores"].aggregate(pipeline).to_list(None)
    
    # Process Winners
    for i, winner in enumerate(winners_data):
        rank = i + 1
        
        if event["event_type"] == EventType.SOLO:
            student_id = str(winner["student_id"])
            student_name = winner["student_name"]
            
            # Generate PDF
            filename = f"certificate_{id}_{student_id}_winner.pdf"
            filepath = f"uploads/certificates/{filename}"
            generate_pdf(filepath, "WINNER", student_name, event["title"], rank)
            
            # Save Record
            cert = Certificate(
                event_id=id,
                student_id=student_id,
                certificate_type=CertificateType.WINNER,
                rank=rank,
                certificate_url=f"/uploads/certificates/{filename}",
                generated_by=current_user.id
            )
            await db["certificates"].insert_one(cert.dict(by_alias=True))
            generated_count += 1
            
        elif event["event_type"] == EventType.GROUP:
             member_ids = winner.get("member_ids", [])
             for member_id in member_ids:
                 # Fetch student name
                 student = await db["users"].find_one({"_id": ObjectId(member_id)})
                 if student:
                    student_name = student["full_name"]
                    filename = f"certificate_{id}_{member_id}_winner.pdf"
                    filepath = f"uploads/certificates/{filename}"
                    generate_pdf(filepath, "WINNER", student_name, event["title"], rank)
                    
                    cert = Certificate(
                        event_id=id,
                        student_id=str(member_id),
                        certificate_type=CertificateType.WINNER,
                        rank=rank,
                        certificate_url=f"/uploads/certificates/{filename}",
                        generated_by=current_user.id
                    )
                    await db["certificates"].insert_one(cert.dict(by_alias=True))
                    generated_count += 1
                    
    # 2. Fetch Participants (Approved)
    # Exclude winners? Usually yes, or winners get both?
    # Requirement: "Generate Participation certificates for approved & attended students"
    # Logic: Get all approved regs. If ID not in winners list (already generated), generate participation.
    
    # Get all winners student IDs
    winner_student_ids = []
    # (Populate this set based on db insertions above, but for simplicity let's query DB certificates?)
    # Or just track in set.
    # Refetch certificates for this event to get current list of students who have one.
    existing_certs = await db["certificates"].find({"event_id": id}, {"student_id": 1}).to_list(None)
    processed_student_ids = {c["student_id"] for c in existing_certs}
    
    # Fetch Approved Registrations
    regs = await db["registrations"].find({"event_id": id, "status": RegistrationStatus.APPROVED}).to_list(None)
    
    for reg in regs:
        # Check attendance? "approved & attended"
        # Check if attendance marked PRESENT
        attendance = await db["attendance"].find_one({"event_id": id, "student_id": reg["student_id"], "status": "PRESENT"})
        
        # If attended OR (maybe attendance check is strict? Requirement says "attended")
        # Let's enforce attendance check.
        if attendance:
             student_id = reg["student_id"]
             if student_id not in processed_student_ids:
                 # Fetch student details
                 student = await db["users"].find_one({"_id": ObjectId(student_id)})
                 if student:
                     student_name = student["full_name"]
                     filename = f"certificate_{id}_{student_id}_participation.pdf"
                     filepath = f"uploads/certificates/{filename}"
                     generate_pdf(filepath, "PARTICIPATION", student_name, event["title"])
                     
                     cert = Certificate(
                        event_id=id,
                        student_id=student_id,
                        certificate_type=CertificateType.PARTICIPATION,
                        certificate_url=f"/uploads/certificates/{filename}",
                        generated_by=current_user.id
                    )
                     await db["certificates"].insert_one(cert.dict(by_alias=True))
                     generated_count += 1
    
    # Log Action
    await log_action(
        user_id=current_user.id,
        user_role=current_user.role,
        action=AuditAction.GENERATE,
        module=AuditModule.CERTIFICATES,
        ref_id=id,
        description=f"Generated {generated_count} certificates for event {event['title']}",
        db=db
    )

    return {"message": f"Generated {generated_count} certificates"}

@router.get("/my", response_model=List[CertificateResponse])
async def get_my_certificates(db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can view 'my' certificates")
        
    certs = await db["certificates"].find({"student_id": current_user.id}).to_list(None)
    for c in certs:
        c["_id"] = str(c["_id"])
        c["id"] = c["_id"]
    return certs

@router.get("/events/{id}", response_model=List[CertificateResponse], dependencies=[Depends(allow_view_certificates)])
async def get_event_certificates(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    # Student should only see own? Or all? Requirement says "Role: ADMIN, FACULTY" for this endpoint.
    # Students use /my.
    if current_user.role == UserRole.STUDENT:
         raise HTTPException(status_code=403, detail="Students should use /certificates/my")
         
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    certs = await db["certificates"].find({"event_id": id}).to_list(None)
    for c in certs:
        c["_id"] = str(c["_id"])
        c["id"] = c["_id"]
    return certs
