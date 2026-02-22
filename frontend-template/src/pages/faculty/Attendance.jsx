import React, { useEffect, useState } from 'react';
import { Container, Button, Badge, Table } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getParticipants, markAttendance, getAttendance } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const Attendance = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [attendanceLog, setAttendanceLog] = useState({}); // { student_id: status }
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const [parts, atts] = await Promise.all([
                getParticipants(eventId),
                getAttendance(eventId)
            ]);
            
            // Only show APPROVED participants
            const approved = parts.filter(p => p.status === 'APPROVED');
            setParticipants(approved);

            // Map current attendance
            const log = {};
            atts.forEach(a => {
                log[a.student_id] = a.status;
            });
            setAttendanceLog(log);

        } catch (err) {
            console.error("Failed to load attendance data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (studentId, status) => {
        setSubmitting(true);
        try {
            // We assume backend returns user object, but get_participants returns projected object.
            // In Step 1480, I mapped `student_id` (from backend field) to `id` (Wait, Step 1480 logic was `id: {"$toString": "$_id"}` where `_id` is REGISTRATION ID).
            // But `mark_attendance` expects `student_id`.
            // Does `get_participants` return student_id?
            // Checking Step 1463: `$project: { ... student_name, registration_number ... }`.
            // IT DOES NOT RETURN STUDENT ID!
            // I need to fix `get_participants` AGAIN to include `student_id`.
            
            // Temporary Workaround: Use registration number? No, backend expects ID.
            // I MUST fix backend.
            
            // Let's assume I fix Step 1463's projection to include student_id.
            
            await markAttendance(eventId, studentId, status);
            setAttendanceLog(prev => ({ ...prev, [studentId]: status }));
        } catch (err) {
            alert("Failed to mark attendance");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
             <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Mark Attendance</h1>
                <Button variant="outline-secondary" onClick={() => navigate(-1)}>Back</Button>
            </div>

            <div className="table-responsive bg-white rounded shadow-sm">
                <Table hover className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Participant</th>
                            <th>Reg. No</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map(p => {
                             // Assuming p.student_id will be available after fix
                             const status = attendanceLog[p.student_id] || 'N/A';
                             return (
                                <tr key={p.id}>
                                    <td>{p.student_name}</td>
                                    <td>{p.registration_number}</td>
                                    <td>
                                        <Badge bg={status === 'PRESENT' ? 'success' : status === 'ABSENT' ? 'danger' : 'secondary'}>
                                            {status}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Button 
                                            variant={status === 'PRESENT' ? "success" : "outline-success"} 
                                            size="sm" 
                                            className="me-2"
                                            disabled={submitting}
                                            onClick={() => handleMark(p.student_id, 'PRESENT')}
                                        >
                                            P
                                        </Button>
                                        <Button 
                                            variant={status === 'ABSENT' ? "danger" : "outline-danger"} 
                                            size="sm"
                                            disabled={submitting}
                                            onClick={() => handleMark(p.student_id, 'ABSENT')}
                                        >
                                            A
                                        </Button>
                                    </td>
                                </tr>
                             );
                        })}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
};

export default Attendance;

