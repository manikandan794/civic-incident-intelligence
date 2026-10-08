import os
from datetime import datetime, timezone, timedelta
from ..core.database import SessionLocal, init_db
from ..core.security import get_password_hash
from ..core.config import settings
from ..models.models import (
    User, Worker, Ward, Complaint, ComplaintReport, ComplaintMedia,
    AIAnalysis, ComplaintTimeline, Notification, WorkAssignment,
    SystemSetting, UserRole, ComplaintStatus, SeverityLevel, PriorityLevel,
    CitizenEvidenceReport, EvidenceAttachment, EvidenceReportTimeline,
    DuplicateMatch
)
from sqlalchemy import or_, text
from ..services.geospatial_service import TAMIL_NADU_WARDS

def seed_database(reset: bool = False):
    """Populates realistic Tamil Nadu municipal seed data for competition demo"""
    init_db()
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    
    try:
        if reset:
            try:
                db.execute(text("TRUNCATE TABLE duplicate_matches, evidence_report_timelines, evidence_attachments, citizen_evidence_reports, notifications, work_assignments, complaint_timelines, ai_analyses, complaint_media, complaint_reports, complaints, workers, wards, users RESTART IDENTITY CASCADE"))
                db.commit()
            except Exception:
                db.rollback()
                db.query(DuplicateMatch).delete(synchronize_session=False)
                db.query(EvidenceReportTimeline).delete(synchronize_session=False)
                db.query(EvidenceAttachment).delete(synchronize_session=False)
                db.query(CitizenEvidenceReport).delete(synchronize_session=False)
                db.query(Notification).delete(synchronize_session=False)
                db.query(WorkAssignment).delete(synchronize_session=False)
                db.query(ComplaintTimeline).delete(synchronize_session=False)
                db.query(AIAnalysis).delete(synchronize_session=False)
                db.query(ComplaintMedia).delete(synchronize_session=False)
                db.query(ComplaintReport).delete(synchronize_session=False)
                db.query(Complaint).delete(synchronize_session=False)
                db.query(Worker).delete(synchronize_session=False)
                db.query(Ward).delete(synchronize_session=False)
                db.query(User).delete(synchronize_session=False)
                db.commit()
            print("Database reset successfully.")

        # 1. System Settings
        rad_setting = db.query(SystemSetting).filter(SystemSetting.key == "duplicate_radius_meters").first()
        if not rad_setting:
            rad_setting = SystemSetting(
                key="duplicate_radius_meters",
                value="50.0",
                description="Challenge Default Active Spatial Deduplication Radius (50m default)"
            )
            db.add(rad_setting)
            db.commit()

        # 2. Wards
        if db.query(Ward).count() == 0:
            for w in TAMIL_NADU_WARDS:
                ward_obj = Ward(
                    city=w["city"],
                    ward_number=w["ward_number"],
                    ward_name=w["name"],
                    officer_name=w["officer"],
                    contact_phone=w["phone"],
                    center_latitude=w["lat"],
                    center_longitude=w["lng"]
                )
                db.add(ward_obj)
            db.commit()

        # 3. Users (Officer, Worker, Citizen)
        # Admin / Municipal Commissioner
        admin_user = db.query(User).filter(or_(User.email == "admin@urbangrid.gov.in", User.email == "admin")).first()
        if not admin_user:
            admin_user = User(
                email="admin@urbangrid.gov.in",
                full_name="Municipal Operations Commissioner",
                phone="+91 94440 00000",
                password_hash=get_password_hash("admin123"),
                role=UserRole.ADMIN.value,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # Officer
        officer_user = db.query(User).filter(User.email == "officer@chennai.urbangrid.gov.in").first()
        if not officer_user:
            officer_user = User(
                email="officer@chennai.urbangrid.gov.in",
                full_name="Thiru R. Selvakumar, B.E.",
                phone="+91 94441 23412",
                password_hash=get_password_hash("Officer@1234"),
                role=UserRole.OFFICER.value,
                is_active=True
            )
            db.add(officer_user)
            db.commit()
            db.refresh(officer_user)

        # Worker
        worker_user = db.query(User).filter(User.email == "worker.karthik@worker.urbangrid.gov.in").first()
        if not worker_user:
            worker_user = User(
                email="worker.karthik@worker.urbangrid.gov.in",
                full_name="Karthikeyan M (Civil Specialist)",
                phone="+91 98840 55123",
                password_hash=get_password_hash("Worker@1234"),
                role=UserRole.WORKER.value,
                is_active=True
            )
            db.add(worker_user)
            db.commit()
            db.refresh(worker_user)

        worker_profile = db.query(Worker).filter(Worker.user_id == worker_user.id).first()
        if not worker_profile:
            worker_profile = Worker(
                user_id=worker_user.id,
                name="Karthikeyan M",
                username="worker.karthik",
                phone="+91 98840 55123",
                ward_number=12,
                role="Senior Road Works Specialist",
                specialization="Roads & Civil Works",
                availability="AVAILABLE",
                status="ACTIVE"
            )
            db.add(worker_profile)
            db.commit()
            db.refresh(worker_profile)

        # Citizen
        citizen_user = db.query(User).filter(User.email == "citizen.anbu@gmail.com").first()
        if not citizen_user:
            citizen_user = User(
                email="citizen.anbu@gmail.com",
                full_name="Anbuselvan K",
                phone="+91 97890 12345",
                password_hash=get_password_hash("Citizen@1234"),
                role=UserRole.CITIZEN.value,
                is_active=True
            )
            db.add(citizen_user)
            db.commit()
            db.refresh(citizen_user)

        # 4. Golden Live Demo Anchor Complaint: UG-1001 (Chennai Central / Anna Salai)
        golden = db.query(Complaint).filter(Complaint.ticket_number == "UG-1001").first()
        if not golden:
            now = datetime.now(timezone.utc)
            # Coordinates: 13.0827, 80.2707 (Anna Salai, Chennai)
            golden = Complaint(
                ticket_number="UG-1001",
                category="Pothole",
                severity="HIGH",
                priority="HIGH",
                status=ComplaintStatus.IN_PROGRESS.value,
                title="Pothole at Royapuram - Zone 5",
                description="Large 4-inch deep asphalt pothole on main carriageway near Royapuram junction posing danger to two-wheelers.",
                latitude=13.1075,
                longitude=80.2934,
                address="Near Royapuram Market, Zone 5, Chennai, Tamil Nadu",
                ward_number=12,
                city="Chennai",
                report_count=1,
                supporting_report_count=0,
                recurrence_count=0,
                assigned_worker_id=worker_profile.id,
                active_duplicate_radius_meters=50.0,
                created_at=now - timedelta(hours=3),
                updated_at=now - timedelta(hours=1)
            )
            db.add(golden)
            db.commit()
            db.refresh(golden)

            # Master report
            rep1 = ComplaintReport(
                complaint_id=golden.id,
                citizen_id=citizen_user.id,
                citizen_name="Anbuselvan K",
                citizen_phone="+91 97890 12345",
                description=golden.description,
                latitude=golden.latitude,
                longitude=golden.longitude,
                distance_to_master_meters=0.0,
                is_master_report=True,
                created_at=now - timedelta(hours=3)
            )
            db.add(rep1)
            db.commit()
            db.refresh(rep1)

            # Media
            med1 = ComplaintMedia(
                complaint_id=golden.id,
                report_id=rep1.id,
                media_type="image",
                file_url="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&q=80",
                file_name="pothole_royapuram_sample.jpg",
                file_size_bytes=124000,
                mime_type="image/jpeg",
                created_at=now - timedelta(hours=3)
            )
            db.add(med1)

            # AI Analysis
            ai1 = AIAnalysis(
                complaint_id=golden.id,
                report_id=rep1.id,
                model="gemini-2.5-flash",
                provider="Google Gemini Vision AI",
                category_detected="Pothole",
                severity_detected="HIGH",
                confidence=0.96,
                summary="Deep asphalt depression on urban carriageway presenting acute vehicle skidding hazard.",
                keywords=["pothole", "asphalt depression", "carriageway", "two-wheeler risk"],
                safety_impact="High risk of motorcycle skidding and front-axle vehicular damage.",
                latency_ms=840,
                is_fallback=False,
                created_at=now - timedelta(hours=3)
            )
            db.add(ai1)

            # Timeline
            t_events = [
                ComplaintTimeline(
                    complaint_id=golden.id,
                    event_type="REPORT_SUBMITTED",
                    actor_role="CITIZEN",
                    actor_name="Anbuselvan K",
                    description="Citizen registered pothole grievance with photo evidence.",
                    created_at=now - timedelta(hours=3)
                ),
                ComplaintTimeline(
                    complaint_id=golden.id,
                    event_type="AI_ANALYSIS_COMPLETED",
                    actor_role="SYSTEM",
                    actor_name="Gemini Multimodal AI",
                    description="Vision AI verified asphalt depression with 96% confidence. Severity: HIGH.",
                    created_at=now - timedelta(hours=3, seconds=-12)
                ),
                ComplaintTimeline(
                    complaint_id=golden.id,
                    event_type="WARD_ASSIGNED",
                    actor_role="SYSTEM",
                    actor_name="Tamil Nadu GIS Routing",
                    description="Geospatially routed to Greater Chennai Corporation Ward 12.",
                    created_at=now - timedelta(hours=3, seconds=-15)
                ),
                ComplaintTimeline(
                    complaint_id=golden.id,
                    event_type="WORKER_ASSIGNED",
                    actor_role="OFFICER",
                    actor_name="Thiru R. Selvakumar",
                    description="Ward Officer dispatched Karthikeyan M (Civil Specialist) with cold-mix asphalt patch truck.",
                    created_at=now - timedelta(hours=2)
                ),
                ComplaintTimeline(
                    complaint_id=golden.id,
                    event_type="WORK_STARTED",
                    actor_role="WORKER",
                    actor_name="Karthikeyan M",
                    description="Field crew deployed safety cones and began cleaning loose gravel in pothole crater.",
                    created_at=now - timedelta(hours=1)
                )
            ]
            for ev in t_events:
                db.add(ev)

            # Assignment
            wa = WorkAssignment(
                complaint_id=golden.id,
                worker_id=worker_profile.id,
                assigned_by_user_id=officer_user.id,
                status="IN_PROGRESS",
                notes="Priority cold-mix asphalt patch required immediately.",
                assigned_at=now - timedelta(hours=2),
                started_at=now - timedelta(hours=1)
            )
            db.add(wa)
            db.commit()

        # 5. Additional Realistic Complaints (Resolved complaint for recurring test, Tambaram, Ramanathapuram)
        resolved_comp = db.query(Complaint).filter(Complaint.ticket_number == "UG-0985").first()
        if not resolved_comp:
            now = datetime.now(timezone.utc)
            resolved_comp = Complaint(
                ticket_number="UG-0985",
                category="Water Leakage",
                severity="MEDIUM",
                priority="MEDIUM",
                status=ComplaintStatus.RESOLVED.value,
                title="Drinking Water Pipeline Joint Leakage",
                description="Underground Metro Water distribution valve leaking onto roadside.",
                latitude=13.0368,
                longitude=80.2676,
                address="Luz Church Road, Mylapore, Chennai",
                ward_number=124,
                city="Chennai",
                report_count=2,
                supporting_report_count=1,
                recurrence_count=0,
                assigned_worker_id=worker_profile.id,
                active_duplicate_radius_meters=50.0,
                created_at=now - timedelta(days=12),
                resolved_at=now - timedelta(days=10)
            )
            db.add(resolved_comp)
            db.commit()

        # Ramanathapuram Grievance
        ramnad_comp = db.query(Complaint).filter(Complaint.ticket_number == "UG-1020").first()
        if not ramnad_comp:
            now = datetime.now(timezone.utc)
            ramnad_comp = Complaint(
                ticket_number="UG-1020",
                category="Garbage Overflow",
                severity="HIGH",
                priority="HIGH",
                status=ComplaintStatus.SUBMITTED.value,
                title="Garbage Bin Overflow near Kenikarai Market",
                description="Municipal secondary bin overflowing with green waste and plastic near bus stop.",
                latitude=9.3639,
                longitude=78.8395,
                address="Kenikarai Main Road, Ward 7, Ramanathapuram, Tamil Nadu",
                ward_number=7,
                city="Ramanathapuram",
                report_count=1,
                supporting_report_count=0,
                recurrence_count=0,
                active_duplicate_radius_meters=50.0,
                created_at=now - timedelta(hours=5)
            )
            db.add(ramnad_comp)
            db.commit()

        # Tambaram Grievance (Awaiting Verification)
        tambaram_comp = db.query(Complaint).filter(Complaint.ticket_number == "UG-1015").first()
        if not tambaram_comp:
            now = datetime.now(timezone.utc)
            tambaram_comp = Complaint(
                ticket_number="UG-1015",
                category="Broken Streetlight",
                severity="MEDIUM",
                priority="MEDIUM",
                status=ComplaintStatus.WORK_COMPLETED.value,  # Awaiting officer verification!
                title="Non-functional LED Streetlight fixture Pole #14",
                description="LED street lamp fixture dark during night causing safety concern for pedestrians.",
                latitude=12.9345,
                longitude=80.1250,
                address="Sanatorium Main Road, Ward 32, Tambaram, Tamil Nadu",
                ward_number=32,
                city="Tambaram",
                report_count=1,
                supporting_report_count=0,
                recurrence_count=0,
                assigned_worker_id=worker_profile.id,
                active_duplicate_radius_meters=50.0,
                created_at=now - timedelta(hours=8),
                updated_at=now - timedelta(minutes=45)
            )
            db.add(tambaram_comp)
            db.commit()

        # Notification for Officer
        if db.query(Notification).count() == 0:
            notif1 = Notification(
                user_id=officer_user.id,
                target_role="OFFICER",
                complaint_id=golden.id,
                title="Field Action in Progress: UG-1001",
                message="Worker Karthikeyan M has commenced patch remediation on Royapuram Pothole.",
                type="INFO",
                is_read=False
            )
            notif2 = Notification(
                user_id=officer_user.id,
                target_role="OFFICER",
                complaint_id=tambaram_comp.id,
                title="Verification Required: UG-1015",
                message="Streetlight repairs completed in Ward 32. Awaiting Officer verification and resolution.",
                type="ALERT",
                is_read=False
            )
            db.add(notif1)
            db.add(notif2)
            db.commit()

        # 6. Citizen Evidence Reports Module
        if db.query(CitizenEvidenceReport).count() == 0:
            ev1 = CitizenEvidenceReport(
                public_report_id="REP-0001",
                related_ticket_number="UG-1001",
                complaint_id=golden.id,
                citizen_id=citizen_user.id,
                citizen_name="Anbuselvan K",
                citizen_phone="+91 97890 12345",
                report_type="Issue Still Exists",
                description="Road damage and asphalt disintegration is still visible after yesterday's rain near the Royapuram junction.",
                latitude=13.1076,
                longitude=80.2935,
                location_name="Royapuram Main Road, Ward 12, Chennai",
                ward_number=12,
                status="RECEIVED",
                priority="HIGH",
                created_at=now - timedelta(hours=3)
            )
            db.add(ev1)
            db.commit()
            db.refresh(ev1)

            att1 = EvidenceAttachment(
                report_id=ev1.id,
                file_type="photo",
                file_url="/uploads/pothole_evidence.jpg",
                file_name="pothole_condition_followup.jpg",
                mime_type="image/jpeg",
                file_size_bytes=45200,
                created_at=now - timedelta(hours=3)
            )
            db.add(att1)

            t1 = EvidenceReportTimeline(
                report_id=ev1.id,
                event_type="REPORT_SUBMITTED",
                actor_role="CITIZEN",
                actor_name="Anbuselvan K",
                description="Citizen submitted follow-up evidence: Road damage is still visible.",
                created_at=now - timedelta(hours=3)
            )
            db.add(t1)

            ev2 = CitizenEvidenceReport(
                public_report_id="REP-0002",
                related_ticket_number="UG-1015",
                complaint_id=tambaram_comp.id,
                citizen_id=citizen_user.id,
                citizen_name="Karthik Citizen",
                citizen_phone="+91 98402 11111",
                report_type="Work Completed",
                description="Streetlight pole #14 has been rewired and light fixture is illuminated properly at night.",
                latitude=12.9345,
                longitude=80.1250,
                location_name="Sanatorium Main Road, Ward 32, Tambaram",
                ward_number=32,
                status="UNDER_REVIEW",
                priority="MEDIUM",
                created_at=now - timedelta(hours=1, minutes=30)
            )
            db.add(ev2)
            db.commit()
            db.refresh(ev2)

            t2 = EvidenceReportTimeline(
                report_id=ev2.id,
                event_type="REPORT_SUBMITTED",
                actor_role="CITIZEN",
                actor_name="Karthik Citizen",
                description="Citizen reported work completion observation with photo.",
                created_at=now - timedelta(hours=1, minutes=30)
            )
            db.add(t2)
            db.commit()

        print("UrbanGrid Tamil Nadu Demo Data Seeded Successfully!")
        print("  - Officer Login: officer@chennai.urbangrid.gov.in / Officer@1234")
        print("  - Worker Login:  worker.karthik / Worker@1234")
        print("  - Citizen Login: citizen.anbu@gmail.com / Citizen@1234")
        print("  - Golden Demo Anchor Ticket: UG-1001 (Lat: 13.1075, Lng: 80.2934)")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
