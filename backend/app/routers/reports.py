from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, Response
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import csv
import io
from app.core.db import get_database
from app.models.user import User, UserRole
from app.models.event import EventStatus, EventType
from app.models.registration import RegistrationStatus
from app.dependencies.rbac import RoleChecker, get_current_user

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter()

allow_view_reports = RoleChecker([UserRole.ADMIN, UserRole.FACULTY])
allow_admin_reports = RoleChecker([UserRole.ADMIN])

@router.get("/dashboard", dependencies=[Depends(allow_admin_reports)])
async def get_dashboard_stats(db=Depends(get_database), current_user: User = Depends(get_current_user)):
    # Event Stats — status stored lowercase in DB
    total_events = await db["events"].count_documents({})
    scheduled_events = await db["events"].count_documents({"status": "SCHEDULED"})
    ongoing_events  = await db["events"].count_documents({"status": "ONGOING"})
    completed_events = await db["events"].count_documents({"status": "COMPLETED"})

    # User Stats — roles stored lowercase in DB
    total_users    = await db["users"].count_documents({})
    total_students = await db["users"].count_documents({"role": "student"})
    total_faculty  = await db["users"].count_documents({"role": "faculty"})

    # Registration Stats
    total_registrations = await db["registrations"].count_documents({})
    total_approved_registrations = await db["registrations"].count_documents({"status": "APPROVED"})

    # Budget Stats Breakdown
    budget_stats_pipeline = [
        {"$group": {
            "_id": "$status",
            "total_requested": {"$sum": "$requested_amount"},
            "total_approved": {"$sum": "$approved_amount"}
        }}
    ]
    budget_breakdown = await db["budgets"].aggregate(budget_stats_pipeline).to_list(10)
    
    finances = {
        "requested": 0,
        "approved": 0,
        "pending_amount": 0,
        "rejected_amount": 0,
        "approved_amount": 0
    }
    
    for stat in budget_breakdown:
        status = stat["_id"]
        total_requested = stat.get("total_requested", 0)
        total_approved = stat.get("total_approved", 0)
        
        finances["requested"] += total_requested
        finances["approved"] += total_approved
        
        if status == "PENDING":
            finances["pending_amount"] = total_requested
        elif status == "APPROVED":
            finances["approved_amount"] = total_approved
        elif status == "REJECTED":
            finances["rejected_amount"] = total_requested

    # count pending budgets for flat dashboard stat
    pending_budgets = await db["budgets"].count_documents({"status": "PENDING"})

    # Locked Results Count
    locked_results_count = await db["events"].count_documents({"is_result_locked": True})

    return {
        # Flat fields used directly by the Dashboard frontend
        "total_users": total_users,
        "total_events": total_events,
        "total_registrations": total_registrations,
        "pending_budgets": pending_budgets,
        "active_events": ongoing_events,
        "locked_results": locked_results_count,
        # Detailed breakdowns
        "events": {
            "total": total_events,
            "scheduled": scheduled_events,
            "ongoing": ongoing_events,
            "completed": completed_events,
        },
        "users": {
            "total": total_users,
            "students": total_students,
            "faculty": total_faculty,
        },
        "registrations": {
            "total": total_registrations,
            "approved": total_approved_registrations,
        },
        "finances": finances,
    }

@router.get("/events/{id}/analytics", dependencies=[Depends(allow_view_reports)])
async def get_event_analytics(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")
        
    event = await db["events"].find_one({"_id": ObjectId(id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    # Check Access (Admin or Faculty Coordinator)
    if current_user.role == UserRole.FACULTY and event["faculty_coordinator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this event")
        
    # 1. Registration Stats
    total_regs = await db["registrations"].count_documents({"event_id": id})
    approved_regs = await db["registrations"].count_documents({"event_id": id, "status": "APPROVED"})
    
    # 2. Attendance Stats
    # Count unique students marked 'PRESENT'
    attendance_pipeline = [
        {"$match": {"event_id": id, "status": "PRESENT"}},
        {"$group": {"_id": "$student_id"}},
        {"$count": "total_present"}
    ]
    att_result = await db["attendance"].aggregate(attendance_pipeline).to_list(1)
    total_present = att_result[0]["total_present"] if att_result else 0
    
    attendance_percentage = 0
    if approved_regs > 0:
        attendance_percentage = (total_present / approved_regs) * 100
        
    # 3. Department Breakdown
    dept_pipeline = [
        {"$match": {"event_id": id}},
        {"$lookup": {
            "from": "users",
            "let": {"studentId": {"$toObjectId": "$student_id"}},
            "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$studentId"]}}}],
            "as": "student"
        }},
        {"$unwind": "$student"},
        {"$group": {"_id": "$student.department", "count": {"$sum": 1}}}
    ]
    dept_breakdown = await db["registrations"].aggregate(dept_pipeline).to_list(None)
    
    # 4. Average Score (if Completed)
    average_score = 0
    if event["status"] == EventStatus.COMPLETED:
        score_pipeline = [
            {"$match": {"event_id": id}},
            {"$group": {"_id": None, "avg": {"$avg": "$score"}}}
        ]
        score_res = await db["scores"].aggregate(score_pipeline).to_list(1)
        average_score = score_res[0]["avg"] if score_res else 0
        
    return {
        "event_title": event["title"],
        "registrations": {
            "total": total_regs,
            "approved": approved_regs
        },
        "attendance": {
            "present": total_present,
            "percentage": round(attendance_percentage, 2)
        },
        "average_score": round(average_score, 2),
        "department_breakdown": dept_breakdown
    }

@router.get("/events/{id}/participants/export", dependencies=[Depends(allow_view_reports)])
async def export_participants(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")

    event = await db["events"].find_one({"_id": ObjectId(id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if current_user.role == UserRole.FACULTY and event["faculty_coordinator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch Participants
    pipeline = [
        {"$match": {
            "$or": [
                {"event_id": id},
                {"event_id": ObjectId(id)}
            ]
        }},
        {"$lookup": {
            "from": "users",
            "let": {"studentId": {"$toObjectId": "$student_id"}},
            "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$studentId"]}}}],
            "as": "student"
        }},
        {"$unwind": "$student"},
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
        {"$project": {
            "name": "$student.full_name",
            "reg_no": "$student.registration_number",
            "dept": "$student.department",
            "team": {"$ifNull": ["$team.team_name", "N/A"]},
            "status": "$status"
        }}
    ]
    
    participants = await db["registrations"].aggregate(pipeline).to_list(None)
    print(f"DEBUG: Generating CSV for event {id}, participants found: {len(participants)}")
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Registration Number", "Department", "Team Name", "Status"])
    
    for p in participants:
        writer.writerow([p.get("name"), p.get("reg_no"), p.get("dept"), p.get("team"), p.get("status")])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=participants_{id}.csv"}
    )

@router.get("/events/{id}/results/export", dependencies=[Depends(allow_view_reports)])
async def export_results_pdf(id: str, db=Depends(get_database), current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid Event ID")

    event = await db["events"].find_one({"_id": ObjectId(id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if current_user.role == UserRole.FACULTY and event["faculty_coordinator_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not event.get("is_result_locked", False):
        raise HTTPException(status_code=400, detail="Results are not locked yet")

    # Fetch Results (Reuse logic from scores.py or duplicate pipeline for simplicity)
    # Handle both string and ObjectId for event_id in match
    pipeline = [{"$match": {
        "$or": [
            {"event_id": id},
            {"event_id": ObjectId(id)}
        ]
    }}]
    
    if event["event_type"] == EventType.SOLO:
        pipeline.extend([
            {"$group": {"_id": "$registration_id", "total_score": {"$sum": "$score"}}},
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
                "name": "$student.full_name",
                "identifier": "$student.registration_number",
                "score": "$total_score"
            }}
        ])
    elif event["event_type"] == EventType.GROUP:
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
                "name": "$team.team_name",
                "identifier": "Team",
                "score": "$total_score"
            }}
         ])

    pipeline.append({"$sort": {"score": -1}})
    results = await db["scores"].aggregate(pipeline).to_list(None)
    
    print(f"DEBUG: Generating PDF for event {id}, results found: {len(results)}")
    
    # Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []
    
    elements.append(Paragraph(f"Results: {event['title']}", styles['Title']))
    elements.append(Spacer(1, 12))
    
    data = [["Rank", "Name/Team", "ID/Reg No", "Score"]]
    for i, res in enumerate(results):
        data.append([str(i+1), str(res.get("name")), str(res.get("identifier")), str(res.get("score"))])
        
    table = Table(data)
    style_list = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]
    
    # Only apply body style if there's data rows
    if len(results) > 0:
        style_list.append(('BACKGROUND', (0, 1), (-1, -1), colors.beige))
        
    table.setStyle(TableStyle(style_list))
    elements.append(table)
    
    try:
        doc.build(elements)
    except Exception as e:
        print(f"DEBUG: PDF build error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=results_{id}.pdf"}
    )
