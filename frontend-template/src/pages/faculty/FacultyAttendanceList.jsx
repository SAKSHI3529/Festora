import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../api/events';
import { AuthContext } from '../../context/AuthContext';

const FacultyAttendanceList = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await getEvents();
                // Backend already filters by assigned faculty
                setEvents(data.map(e => ({ ...e, id: e.id || e._id })));
            } catch (err) {
                setError('Failed to load assigned events.');
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading) return (
        <Container fluid className="text-center py-5">
            <Spinner animation="border" variant="primary" />
        </Container>
    );

    return (
        <Container fluid>
            <div className="mb-4">
                <h4 className="fw-bold mb-1">📍 Event Attendance</h4>
                <p className="text-muted small">Select an event to mark participant attendance.</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {events.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5">
                    <Card.Body>
                        <div style={{ fontSize: 48 }}>📭</div>
                        <h5 className="mt-3 text-muted">No Events Assigned</h5>
                        <p className="text-muted small">You don't have any events assigned for attendance management.</p>
                    </Card.Body>
                </Card>
            ) : (
                <Row className="g-3">
                    {events.map(event => (
                        <Col key={event.id} md={6} xl={4}>
                            <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                                <Card.Body className="d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h6 className="fw-bold mb-0">{event.title}</h6>
                                        <Badge bg={event.status === 'ONGOING' ? 'success' : 'secondary'}>
                                            {event.status}
                                        </Badge>
                                    </div>
                                    <p className="text-muted small mb-3">
                                        📂 {event.category} · 🗓 {new Date(event.event_date).toLocaleDateString()}
                                    </p>
                                    <div className="mt-auto d-grid">
                                        <Button 
                                            variant="success" 
                                            size="sm" 
                                            className="rounded-pill"
                                            onClick={() => navigate(`/faculty/attendance/${event.id}`)}
                                        >
                                            Mark Attendance
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default FacultyAttendanceList;
