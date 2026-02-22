import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Modal, Form } from 'react-bootstrap';
import { getEvents } from '../../api/events';
import { createRegistration, getMyRegistrations, cancelRegistration } from '../../api/registrations';
import { getUsers } from '../../api/admin';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const StudentEvents = () => {
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [myRegistrations, setMyRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    
    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [teamName, setTeamName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [studentList, setStudentList] = useState([]);
    const [submitLoading, setSubmitLoading] = useState(false);

    useEffect(() => {
        fetchData();
        fetchStudents();
    }, []);

    const fetchData = async () => {
        try {
            const [eventsData, regData] = await Promise.all([getEvents(), getMyRegistrations()]);
            setEvents(eventsData);
            setMyRegistrations(regData);
        } catch (err) {
            console.error("Failed to load data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async () => {
        try {
            // Fetch students from backend
            const users = await getUsers({ role: 'STUDENT' });
            setStudentList(users.filter(u => u.id !== user.id));
        } catch (err) {
            console.error("Failed to load students", err);
        }
    };

    const handleRegisterSolo = async (event) => {
        if (!window.confirm(`Confirm registration for ${event.title}?`)) return;
        
        try {
            await createRegistration({
                event_id: event.id,
                team_name: null,
                member_ids: []
            });
            alert("Registered successfully!");
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "Registration failed");
        }
    };

    const handleGroupRegisterClick = (event) => {
        setSelectedEvent(event);
        setTeamName('');
        setSelectedMembers([]);
        setShowModal(true);
    };

    const handleGroupSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            await createRegistration({
                event_id: selectedEvent.id,
                team_name: teamName,
                member_ids: selectedMembers
            });
            alert("Team registered successfully!");
            setShowModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "Registration failed");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCancel = async (regId) => {
        if (!window.confirm("Are you sure you want to cancel this registration?")) return;
        try {
            await cancelRegistration(regId);
            fetchData();
            alert("Registration cancelled.");
        } catch (err) {
            alert(err.response?.data?.detail || "Cancellation failed");
        }
    };

    const getRegistrationStatus = (eventId) => {
        const reg = myRegistrations.find(r => r.event_id === eventId);
        return reg ? reg : null;
    };

    const filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || event.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">Upcoming Events</h1>

            <Row className="mb-4">
                <Col md={4}>
                    <Form.Control 
                        placeholder="Search events..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </Col>
                <Col md={3}>
                    <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="ALL">All Status</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="ONGOING">Ongoing</option>
                        <option value="COMPLETED">Completed</option>
                    </Form.Select>
                </Col>
            </Row>

            <Row>
                {filteredEvents.map(event => {
                    const reg = getRegistrationStatus(event.id);
                    const isDeadlinePassed = new Date(event.registration_deadline) < new Date();
                    const isClosed = event.status === 'COMPLETED';

                    return (
                        <Col md={4} key={event.id} className="mb-4">
                            <Card className="h-100 shadow-sm">
                                <Card.Body className="d-flex flex-column">
                                    <div className="d-flex justify-content-between mb-2">
                                        <Badge bg={event.event_type === 'SOLO' ? 'info' : 'primary'}>{event.event_type}</Badge>
                                        <Badge bg={
                                            event.status === 'SCHEDULED' ? 'primary' :
                                            event.status === 'ONGOING' ? 'warning' : 'success'
                                        }>{event.status}</Badge>
                                    </div>
                                    <Card.Title>{event.title}</Card.Title>
                                    <Card.Text className="text-muted small mb-2">
                                        <i className="far fa-calendar-alt me-1"></i> {new Date(event.event_date).toLocaleDateString()} <br/>
                                        <i className="fas fa-map-marker-alt me-1"></i> {event.location}
                                    </Card.Text>
                                    <Card.Text className="flex-grow-1">
                                        {event.description?.substring(0, 100)}...
                                    </Card.Text>
                                    
                                    <div className="mt-auto">
                                        {event.rulebook_url && (
                                            <a href={`http://localhost:8000${event.rulebook_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info w-100 mb-2">
                                                View Rulebook
                                            </a>
                                        )}

                                        {reg ? (
                                            <div className="d-grid gap-2">
                                                <Button variant={
                                                    reg.status === 'APPROVED' ? 'success' : 
                                                    reg.status === 'REJECTED' ? 'danger' : 'warning'
                                                } disabled>
                                                    {reg.status}
                                                </Button>
                                                {reg.status === 'PENDING' && !isClosed && (
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleCancel(reg.id)}>
                                                        Cancel Registration
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="d-grid gap-2">
                                                {isClosed ? (
                                                    <Button variant="secondary" disabled>Event Closed</Button>
                                                ) : isDeadlinePassed ? (
                                                    <Button variant="secondary" disabled>Deadline Passed</Button>
                                                ) : (
                                                    <Button variant="primary" onClick={() => 
                                                        event.event_type === 'SOLO' 
                                                            ? handleRegisterSolo(event) 
                                                            : handleGroupRegisterClick(event)
                                                    }>
                                                        Register Now
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {/* Group Registration Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Group Registration: {selectedEvent?.title}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleGroupSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Team Name *</Form.Label>
                            <Form.Control 
                                value={teamName} 
                                onChange={(e) => setTeamName(e.target.value)} 
                                required 
                            />
                        </Form.Group>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Select Team Members (Max {selectedEvent?.max_team_size - 1} more)</Form.Label>
                            <Form.Select 
                                multiple 
                                value={selectedMembers} 
                                onChange={(e) => {
                                    const options = [...e.target.selectedOptions];
                                    const values = options.map(option => option.value);
                                    if (values.length < selectedEvent?.max_team_size) {
                                         setSelectedMembers(values);
                                    }
                                }}
                                style={{ height: '150px' }}
                            >
                                {studentList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.full_name} ({s.registration_number})
                                    </option>
                                ))}
                            </Form.Select>
                            <Form.Text className="text-muted">
                                Hold Ctrl to select multiple members. You are automatically included as Leader.
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

