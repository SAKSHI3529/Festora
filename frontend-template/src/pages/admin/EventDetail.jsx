import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Table, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent } from '../../api/events';
import { getUsers } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';

// Category → gradient background mapping
const CATEGORY_GRADIENTS = {
    'Music':        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'Dance':        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'Sports':       'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'Art':          'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'Technology':   'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'Drama':        'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'Quiz':         'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'Photography':  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'Literature':   'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
    'General':      'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
};
const STATUS_CONFIG = {
    SCHEDULED: { bg: 'warning', label: '🗓 Scheduled' },
    ONGOING:   { bg: 'success', label: '🔴 Live Now' },
    COMPLETED: { bg: 'secondary', label: '✅ Completed' },
};

const EventDetail = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [ev, usersData] = await Promise.all([getEvent(eventId), getUsers()]);
                setEvent(ev);
                setUsers(usersData);
            } catch (err) {
                setError('Failed to load event details.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [eventId]);

    if (loading) return <LoadingSpinner />;
    if (error)   return <Alert variant="danger" className="m-4">{error}</Alert>;
    if (!event)  return <Alert variant="warning" className="m-4">Event not found.</Alert>;

    const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS['General'];
    const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['SCHEDULED'];

    const getUserName = (id) => {
        const u = users.find(u => u.id === id);
        return u ? u.full_name : id;
    };

    const fmt = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) : '—';

    return (
        <Container fluid className="pb-5">
            {/* Hero Banner */}
            <div style={{
                background: gradient,
                borderRadius: '16px',
                padding: '48px 40px',
                marginBottom: '32px',
                color: '#fff',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <div style={{
                    position:'absolute', top:-40, right:-40,
                    width:200, height:200, borderRadius:'50%',
                    background:'rgba(255,255,255,0.1)'
                }}/>
                <div style={{
                    position:'absolute', bottom:-60, right:80,
                    width:150, height:150, borderRadius:'50%',
                    background:'rgba(255,255,255,0.07)'
                }}/>

                <Button variant="light" size="sm" className="mb-3 opacity-75"
                    onClick={() => navigate(-1)}>
                    ← Back
                </Button>

                <div className="d-flex align-items-center gap-3 flex-wrap mb-2">
                    <Badge bg={statusCfg.bg} style={{ fontSize:'14px', padding:'6px 14px' }}>
                        {statusCfg.label}
                    </Badge>
                    <Badge bg="light" text="dark" style={{ fontSize:'13px' }}>
                        {event.event_type}
                    </Badge>
                    <Badge bg="light" text="dark" style={{ fontSize:'13px' }}>
                        📂 {event.category}
                    </Badge>
                </div>

                <h1 style={{ fontWeight: 700, fontSize: '2.2rem', marginBottom: 8 }}>
                    {event.title}
                </h1>
                <p style={{ opacity: 0.9, fontSize: '1.05rem', maxWidth: 700, marginBottom: 0 }}>
                    {event.description}
                </p>
            </div>

            <Row className="g-4">
                {/* Left Column — Key Info */}
                <Col lg={8}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white border-bottom fw-semibold">
                            📅 Event Details
                        </Card.Header>
                        <Card.Body>
                            <Table borderless className="mb-0">
                                <tbody>
                                    <tr>
                                        <td className="text-muted fw-semibold" style={{width:'40%'}}>Event Date</td>
                                        <td>{fmt(event.event_date)}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted fw-semibold">Registration Deadline</td>
                                        <td>{fmt(event.registration_deadline)}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted fw-semibold">Location</td>
                                        <td>📍 {event.location}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted fw-semibold">Event Type</td>
                                        <td>{event.event_type}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted fw-semibold">Max Team Size</td>
                                        <td>{event.max_team_size} member{event.max_team_size !== 1 ? 's' : ''}</td>
                                    </tr>
                                    {event.min_participants && (
                                        <tr>
                                            <td className="text-muted fw-semibold">Participants</td>
                                            <td>{event.min_participants} – {event.max_participants}</td>
                                        </tr>
                                    )}
                                    <tr>
                                        <td className="text-muted fw-semibold">Result Locked</td>
                                        <td>{event.is_result_locked ? '🔒 Yes' : '🔓 No'}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>

                    {/* Rulebook */}
                    {event.rulebook_url && (
                        <Card className="shadow-sm border-0 mb-4">
                            <Card.Header className="bg-white border-bottom fw-semibold">
                                📄 Rulebook
                            </Card.Header>
                            <Card.Body>
                                <a
                                    href={`http://localhost:8000${event.rulebook_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-outline-primary"
                                >
                                    📥 Download Rulebook (PDF)
                                </a>
                            </Card.Body>
                        </Card>
                    )}
                </Col>

                {/* Right Column — People */}
                <Col lg={4}>
                    {/* Faculty Coordinator */}
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white border-bottom fw-semibold">
                            👩‍🏫 Faculty Coordinator
                        </Card.Header>
                        <Card.Body>
                            {event.faculty_coordinator_id
                                ? <p className="mb-0 fw-semibold">{getUserName(event.faculty_coordinator_id)}</p>
                                : <p className="text-muted mb-0">Not assigned</p>
                            }
                        </Card.Body>
                    </Card>

                    {/* Event Coordinators */}
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white border-bottom fw-semibold">
                            📋 Event Coordinators
                        </Card.Header>
                        <Card.Body>
                            {event.event_coordinator_ids?.length > 0
                                ? event.event_coordinator_ids.map(id => (
                                    <Badge key={id} bg="primary" className="me-2 mb-2 p-2">
                                        {getUserName(id)}
                                    </Badge>
                                ))
                                : <p className="text-muted mb-0">None assigned</p>
                            }
                        </Card.Body>
                    </Card>

                    {/* Judges */}
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white border-bottom fw-semibold">
                            ⚖️ Judges
                        </Card.Header>
                        <Card.Body>
                            {event.judge_ids?.length > 0
                                ? event.judge_ids.map(id => (
                                    <Badge key={id} bg="info" className="me-2 mb-2 p-2">
                                        {getUserName(id)}
                                    </Badge>
                                ))
                                : <p className="text-muted mb-0">None assigned</p>
                            }
                        </Card.Body>
                    </Card>

                    {/* Quick Actions & Status Control */}
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white border-bottom fw-semibold">
                            ⚡ Admin Control Panel
                        </Card.Header>
                        <Card.Body className="d-grid gap-2">
                            <div className="mb-3">
                                <Form.Label className="small fw-bold">Update Event Status</Form.Label>
                                <Form.Select 
                                    size="sm" 
                                    value={event.status} 
                                    onChange={async (e) => {
                                        const newStatus = e.target.value;
                                        // Validation: Cannot mark Completed if not Ongoing
                                        if (newStatus === 'COMPLETED' && event.status !== 'ONGOING') {
                                            alert('Event must be "Ongoing" before marking as "Completed"');
                                            return;
                                        }
                                        if (window.confirm(`Change status to ${newStatus}?`)) {
                                            try {
                                                const updated = await updateEvent(event.id, { ...event, status: newStatus });
                                                setEvent(updated);
                                            } catch (err) {
                                                alert(err.response?.data?.detail || 'Update failed');
                                            }
                                        }
                                    }}
                                    disabled={event.is_result_locked}
                                >
                                    <option value="SCHEDULED">🗓 Scheduled</option>
                                    <option value="ONGOING">🔴 Ongoing</option>
                                    <option value="COMPLETED">✅ Completed</option>
                                </Form.Select>
                                {event.is_result_locked && <small className="text-danger">Status locked after results are finalized.</small>}
                            </div>

                            <Button variant="outline-primary" size="sm"
                                onClick={() => navigate(`/admin/reports/events/${eventId}`)}>
                                📊 Detailed Analytics
                            </Button>
                            <Button variant="outline-success" size="sm"
                                onClick={() => navigate(`/admin/certificates/${eventId}`)}>
                                🎓 Certificates
                            </Button>
                            <Button variant="outline-info" size="sm"
                                onClick={() => navigate(`/admin/participants`)}>
                                👥 All Participants
                            </Button>
                        </Card.Body>
                    </Card>

                    {/* Attendance Overview (Phase 3) */}
                    <AttendanceOverview eventId={eventId} />
                </Col>
            </Row>
        </Container>
    );
};

const AttendanceOverview = ({ eventId }) => {
    const [attStats, setAttStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAtt = async () => {
            try {
                const data = await getAttendance(eventId);
                // Calculate stats
                const total = data.length;
                const present = data.filter(a => a.status === 'PRESENT').length;
                const absent = total - present;
                const percent = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
                setAttStats({ total, present, absent, percent });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAtt();
    }, [eventId]);

    if (loading) return null;
    if (!attStats) return null;

    return (
        <Card className="shadow-sm border-0 bg-light">
            <Card.Header className="bg-transparent border-0 fw-semibold pb-0">
                📊 Attendance Summary
            </Card.Header>
            <Card.Body className="pt-2">
                <div className="d-flex justify-content-between mb-1">
                    <span className="small text-muted">Attendance Rate</span>
                    <span className="small fw-bold">{attStats.percent}%</span>
                </div>
                <div className="progress mb-3" style={{ height: 6 }}>
                    <div className="progress-bar bg-success" role="progressbar" style={{ width: `${attStats.percent}%` }}></div>
                </div>
                <div className="row text-center g-0">
                    <div className="col-4 border-end">
                        <div className="fw-bold">{attStats.total}</div>
                        <div className="text-muted" style={{ fontSize: 9, textTransform: 'uppercase' }}>Regd</div>
                    </div>
                    <div className="col-4 border-end text-success">
                        <div className="fw-bold">{attStats.present}</div>
                        <div className="text-muted" style={{ fontSize: 9, textTransform: 'uppercase' }}>Pres</div>
                    </div>
                    <div className="col-4 text-danger">
                        <div className="fw-bold">{attStats.absent}</div>
                        <div className="text-muted" style={{ fontSize: 9, textTransform: 'uppercase' }}>Abs</div>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default EventDetail;
