import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Form, Alert } from 'react-bootstrap';
import { getEvents } from '../../api/events';
import { createRegistration, getMyRegistrations, cancelRegistration, getMyTeams } from '../../api/registrations';
import { getUsers } from '../../api/admin';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

// Category → gradient mapping (keeps cards visually distinct)
const CATEGORY_GRADIENTS = {
    'Music':        'linear-gradient(135deg,#667eea,#764ba2)',
    'Dance':        'linear-gradient(135deg,#f093fb,#f5576c)',
    'Sports':       'linear-gradient(135deg,#4facfe,#00f2fe)',
    'Art':          'linear-gradient(135deg,#43e97b,#38f9d7)',
    'Technology':   'linear-gradient(135deg,#fa709a,#fee140)',
    'Drama':        'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    'Quiz':         'linear-gradient(135deg,#ffecd2,#fcb69f)',
    'Photography':  'linear-gradient(135deg,#30cfd0,#330867)',
    'Literature':   'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    'General':      'linear-gradient(135deg,#6a11cb,#2575fc)',
};

const STATUS_CONFIG = {
    SCHEDULED: { bg: 'warning',   label: '🗓 Scheduled' },
    ONGOING:   { bg: 'success',   label: '🔴 Live Now'  },
    COMPLETED: { bg: 'secondary', label: '✅ Completed'  },
};

const StudentEvents = () => {
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [myTeams, setMyTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [teamName, setTeamName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [studentList, setStudentList] = useState([]);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [modalError, setModalError] = useState(null);

    useEffect(() => {
        fetchData();
        fetchStudents();
    }, []);

    const fetchData = async () => {
        try {
            const [eventsData, regData, teamsData] = await Promise.all([
                getEvents(),
                getMyRegistrations(),
                getMyTeams(),
            ]);
            setEvents(eventsData.map(e => ({ ...e, id: e.id || e._id })));
            setMyRegistrations(regData);
            setMyTeams(teamsData);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            // Fetch students from backend - note: role is lowercase 'student' in backend
            const users = await getUsers({ role: 'student' });
            setStudentList(users.filter(u => u.id !== user.id));
        } catch (err) {
            console.error("Failed to load students", err);
        }
    };

    const handleRegisterSolo = async (event) => {
        if (!window.confirm(`Confirm registration for "${event.title}"?`)) return;
        setErrorMsg(null);
        try {
            await createRegistration({
                event_id: event.id,
                team_name: null,
                member_ids: []
            });
            setSuccessMsg(`Successfully registered for "${event.title}"!`);
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || 'Registration failed. Please try again.');
        }
    };

    const handleGroupRegisterClick = (event) => {
        setSelectedEvent(event);
        setTeamName('');
        setSelectedMembers([]);
        setMemberSearchTerm('');
        setModalError(null);
        setShowModal(true);
    };

    const handleGroupSubmit = async (e) => {
        e.preventDefault();
        setModalError(null);

        // Client-side validation
        const minSize = selectedEvent?.min_team_size ?? 2;
        const maxSize = selectedEvent?.max_team_size ?? 10;
        // selectedMembers doesn't include leader; total = selectedMembers + 1 (leader)
        const totalMembers = selectedMembers.length + 1;
        if (selectedMembers.length === 0) {
            setModalError('Please select at least one team member.');
            return;
        }
        if (totalMembers < minSize) {
            setModalError(`Team must have at least ${minSize} members (including you). Currently: ${totalMembers}.`);
            return;
        }
        if (totalMembers > maxSize) {
            setModalError(`Team exceeds maximum size of ${maxSize}. Currently: ${totalMembers}.`);
            return;
        }

        setSubmitLoading(true);
        try {
            await createRegistration({
                event_id: selectedEvent.id,
                team_name: teamName,
                member_ids: selectedMembers
            });
            setSuccessMsg(`Team "${teamName}" registered for "${selectedEvent.title}" successfully!`);
            setShowModal(false);
            fetchData();
        } catch (err) {
            setModalError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = async (regId, isGroup) => {
        const msg = isGroup
            ? '⚠️ You are the team leader. Cancelling will remove the ENTIRE team registration for this event. Are you sure?'
            : 'Are you sure you want to cancel your registration?';
        if (!window.confirm(msg)) return;
        setErrorMsg(null);
        try {
            await cancelRegistration(regId);
            setSuccessMsg(isGroup ? 'Team registration cancelled for all members.' : 'Registration cancelled.');
            fetchData();
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || 'Cancellation failed.');
        }
    };

    // Returns { reg, isLeader } for a given event
    const getRegistrationInfo = (eventId) => {
        const reg = myRegistrations.find(r => r.event_id === eventId);
        if (!reg) return { reg: null, isLeader: false };
        if (!reg.team_id) return { reg, isLeader: false }; // solo
        const team = myTeams.find(t => t.id === reg.team_id);
        const isLeader = team ? team.leader_id === user.id : false;
        return { reg, isLeader, team };
    };

    const fmt = (dateStr) => dateStr
        ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const filteredStudents = studentList.filter(s => 
        s.full_name.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
        s.registration_number?.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || event.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <LoadingSpinner />;

    const EventCard = ({ event }) => {
        const { reg, isLeader } = getRegistrationInfo(event.id);
        const isGroupReg = reg && reg.team_id;
        const isDeadlinePassed = new Date(event.registration_deadline) < new Date();
        const isClosed = event.status === 'COMPLETED';
        const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS['General'];
        const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['SCHEDULED'];

        return (
            <Col md={6} xl={4} className="mb-4">
                <Card className="h-100 border-0 shadow-sm overflow-hidden"
                    style={{ borderRadius: 14 }}>
                    {/* Background image / gradient hero */}
                    <div style={{
                        background: gradient,
                        height: 140,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Decorative circles */}
                        <div style={{
                            position:'absolute', top:-30, right:-30,
                            width:120, height:120, borderRadius:'50%',
                            background:'rgba(255,255,255,0.12)',
                        }}/>
                        <div style={{
                            position:'absolute', bottom:-40, right:40,
                            width:90, height:90, borderRadius:'50%',
                            background:'rgba(255,255,255,0.07)',
                        }}/>
                        {/* Status badge */}
                        <div className="d-flex justify-content-between align-items-start">
                            <Badge bg={statusCfg.bg} style={{ fontSize: 11, padding: '4px 10px' }}>
                                {statusCfg.label}
                            </Badge>
                            <Badge bg={event.event_type === 'SOLO' ? 'light' : 'dark'} text={event.event_type === 'SOLO' ? 'dark' : 'white'} style={{ fontSize: 10, padding: '4px 8px' }}>
                                {event.event_type}
                            </Badge>
                        </div>
                        {/* Category */}
                        <div>
                            <span style={{
                                color: 'rgba(255,255,255,0.8)',
                                fontSize: 12,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                            }}>
                                {event.category}
                            </span>
                        </div>
                    </div>

                    {/* Card Body */}
                    <Card.Body className="p-3 d-flex flex-column">
                        <h6 className="fw-bold mb-1" style={{
                            fontSize: 16, lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            minHeight: '2.6em'
                        }}>
                            {event.title}
                        </h6>
                        <p className="text-muted mb-3" style={{
                            fontSize: 12,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            flexGrow: 1
                        }}>
                            {event.description}
                        </p>

                        <div className="mb-3">
                            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Event Date & Timing
                            </div>
                            <div className="d-flex align-items-center gap-3">
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                    📅 {fmt(event.event_date)}
                                </div>
                                {event.time_slot && (
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                        🕒 {event.time_slot}
                                    </div>
                                )}
                            </div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                                📍 {event.location}
                            </div>
                        </div>

                        {event.rulebook_url && (
                            <Button 
                                variant="link" 
                                className="p-0 mb-3 text-start text-decoration-none" 
                                style={{ fontSize: 12, color: '#2575fc', fontWeight: 600 }}
                                onClick={() => window.open(`http://localhost:8000${event.rulebook_url}`, '_blank')}
                            >
                                <i className="fas fa-file-pdf me-1"></i> View Rulebook
                            </Button>
                        )}

                        <div className="mt-auto">
                            {reg ? (
                                <div className="d-grid gap-2">
                                    <div className={`text-center py-2 rounded-3 fw-bold border ${
                                        reg.status === 'APPROVED' ? 'bg-success-subtle text-success border-success' : 
                                        reg.status === 'REJECTED' ? 'bg-danger-subtle text-danger border-danger' : 
                                        'bg-warning-subtle text-warning-emphasis border-warning'
                                    }`} style={{ fontSize: 13 }}>
                                        {reg.status === 'APPROVED' ? '✅ Registered' : 
                                         reg.status === 'REJECTED' ? '❌ Rejected' : 
                                         isGroupReg ? (isLeader ? '⏳ Pending (Leader)' : '⏳ Pending (Member)') : '⏳ Pending Approval'}
                                    </div>
                                    {/* Cancel button: only for leader (group) or the student (solo) */}
                                    {reg.status === 'PENDING' && !isClosed && (isGroupReg ? isLeader : true) && (
                                        <Button 
                                            variant="outline-danger" 
                                            size="sm" 
                                            className="rounded-pill" 
                                            style={{ fontSize: 12 }} 
                                            onClick={() => handleCancel(reg.id, !!isGroupReg)}
                                        >
                                            {isGroupReg ? '🚫 Cancel Team Registration' : 'Cancel Registration'}
                                        </Button>
                                    )}
                                    {/* Info for non-leader group members */}
                                    {reg.status === 'PENDING' && isGroupReg && !isLeader && (
                                        <div className="text-center text-muted" style={{ fontSize: 11 }}>
                                            Only the team leader can cancel this registration.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="d-grid gap-2">
                                    {event.status === 'COMPLETED' ? (
                                        <Button variant="secondary" disabled className="rounded-pill">Event Closed</Button>
                                    ) : event.status === 'ONGOING' ? (
                                        <Button variant="success" disabled className="rounded-pill">Event Live / Registration Closed</Button>
                                    ) : isDeadlinePassed ? (
                                        <Button variant="secondary" disabled className="rounded-pill">Deadline Passed</Button>
                                    ) : (
                                        <Button 
                                            style={{
                                                background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                                                border: 'none',
                                                borderRadius: 20,
                                                padding: '8px 16px',
                                                fontSize: 13,
                                                fontWeight: 600,
                                            }}
                                            onClick={() => 
                                                event.event_type === 'SOLO' 
                                                    ? handleRegisterSolo(event) 
                                                    : handleGroupRegisterClick(event)
                                            }
                                        >
                                            Register Now →
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        );
    };

    return (
        <Container fluid>
            <div className="mb-1">
                <h4 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>🎪 Browse Events</h4>
                <p className="text-muted" style={{ fontSize: 14 }}>Discover and register for upcoming events.</p>
            </div>

            {/* Global alerts */}
            {errorMsg && (
                <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="mb-3">
                    <strong>Error:</strong> {errorMsg}
                </Alert>
            )}
            {successMsg && (
                <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)} className="mb-3">
                    {successMsg}
                </Alert>
            )}

            <Row className="mb-4 align-items-center">
                <Col md={4}>
                    <Form.Control 
                        placeholder="Search events..." 
                        className="rounded-pill border-0 shadow-sm"
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </Col>
                <Col md={3}>
                    <Form.Select 
                        value={filterStatus} 
                        className="rounded-pill border-0 shadow-sm"
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="ONGOING">Ongoing</option>
                        <option value="COMPLETED">Completed</option>
                    </Form.Select>
                </Col>
            </Row>

            <Row>
                {filteredEvents.map(event => <EventCard key={event.id} event={event} />)}
            </Row>

            {/* Group Registration Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Group Registration: {selectedEvent?.title}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleGroupSubmit}>
                    <Modal.Body>
                        {/* Validation / backend errors */}
                        {modalError && (
                            <Alert variant="danger" className="py-2 mb-3" style={{ fontSize: 13 }}>
                                <strong>⚠️</strong> {modalError}
                            </Alert>
                        )}

                        {/* Team size hint */}
                        {selectedEvent && (
                            <div className="mb-3 text-muted" style={{ fontSize: 12 }}>
                                Team size: <strong>{selectedEvent.min_team_size ?? 2} – {selectedEvent.max_team_size ?? 10}</strong> members (including you)
                            </div>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>Team Name *</Form.Label>
                            <Form.Control 
                                value={teamName} 
                                onChange={(e) => setTeamName(e.target.value)} 
                                required 
                            />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Select Team Members</Form.Label>
                            <div className="mb-2">
                                <Form.Control 
                                    size="sm"
                                    placeholder="🔍 Search student by name or Reg No..." 
                                    className="rounded-pill border-0 bg-light"
                                    value={memberSearchTerm} 
                                    onChange={(e) => setMemberSearchTerm(e.target.value)} 
                                />
                            </div>
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                    {selectedMembers.length + 1} / {selectedEvent?.max_team_size || 10} members selected
                                </span>
                                {selectedMembers.length + 1 >= (selectedEvent?.max_team_size || 10) && (
                                    <Badge bg="warning" text="dark" style={{ fontSize: 10 }}>Max limit reached</Badge>
                                )}
                            </div>
                            <Form.Select 
                                multiple 
                                value={selectedMembers} 
                                onChange={(e) => {
                                    const options = [...e.target.selectedOptions];
                                    const values = options.map(option => option.value);
                                    const maxAllowed = (selectedEvent?.max_team_size || 10) - 1; // -1 for leader
                                    
                                    if (values.length <= maxAllowed) {
                                         setSelectedMembers(values);
                                    }
                                }}
                                style={{ height: '180px', borderRadius: '12px', padding: '10px' }}
                                className="shadow-sm border-0"
                            >
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map(s => (
                                        <option key={s.id} value={s.id} className="py-1">
                                            {s.full_name} {s.registration_number ? `(${s.registration_number})` : ''}
                                        </option>
                                    ))
                                ) : (
                                    <option disabled>No students found</option>
                                )}
                            </Form.Select>
                            <Form.Text className="text-muted mt-2 d-block small">
                                <i className="fas fa-info-circle me-1"></i> Hold <b>Ctrl / Cmd</b> to select multiple members. 
                                Max additional members: {(selectedEvent?.max_team_size - 1) || 0}
                            </Form.Text>
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={submitLoading}>
                            {submitLoading ? 'Registering...' : 'Register Team'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default StudentEvents;

