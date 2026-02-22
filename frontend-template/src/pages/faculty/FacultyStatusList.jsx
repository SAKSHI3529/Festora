import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents, updateEvent } from '../../api/events';
import { AuthContext } from '../../context/AuthContext';

const FacultyStatusList = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

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

    const handleStatusUpdate = async (event, newStatus) => {
        // Lifecycle validations
        if (newStatus === 'ONGOING' && event.status !== 'SCHEDULED') {
            alert('Can only mark ONGOING if currently SCHEDULED');
            return;
        }
        if (newStatus === 'COMPLETED' && event.status !== 'ONGOING') {
            alert('Event must be ONGOING before marking as COMPLETED');
            return;
        }

        if (!window.confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

        setUpdatingId(event.id);
        try {
            await updateEvent(event.id, { ...event, status: newStatus });
            await fetchEvents();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return (
        <Container fluid className="text-center py-5">
            <Spinner animation="border" variant="primary" />
        </Container>
    );

    return (
        <Container fluid>
            <div className="mb-4">
                <h4 className="fw-bold mb-1">🏁 Event Status Control</h4>
                <p className="text-muted small">Manage the lifecycle of your assigned events.</p>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {events.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5">
                    <Card.Body>
                        <div style={{ fontSize: 48 }}>📭</div>
                        <h5 className="mt-3 text-muted">No Events Assigned</h5>
                        <p className="text-muted small">You don't have any events assigned for status management.</p>
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
                                        <Badge bg={
                                            event.status === 'SCHEDULED' ? 'warning' :
                                            event.status === 'ONGOING' ? 'success' : 'secondary'
                                        }>
                                            {event.status}
                                        </Badge>
                                    </div>
                                    <p className="text-muted small mb-3">
                                        📂 {event.category} · 🗓 {new Date(event.event_date).toLocaleDateString()}
                                    </p>
                                    
                                    <div className="mt-auto">
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Update Status</Form.Label>
                                            <Form.Select 
                                                size="sm" 
                                                value={event.status} 
                                                onChange={(e) => handleStatusUpdate(event, e.target.value)}
                                                disabled={updatingId === event.id || event.is_result_locked}
                                            >
                                                <option value="SCHEDULED">🗓 Scheduled</option>
                                                <option value="ONGOING">🔴 Ongoing</option>
                                                <option value="COMPLETED">✅ Completed</option>
                                            </Form.Select>
                                            {event.is_result_locked && (
                                                <small className="text-danger mt-1 d-block">Results are locked.</small>
                                            )}
                                        </Form.Group>
                                        <div className="d-grid gap-2">
                                            {event.status === 'COMPLETED' && !event.is_result_locked && (
                                                <Button 
                                                    variant="danger" 
                                                    size="sm" 
                                                    className="rounded-pill"
                                                    onClick={async () => {
                                                        if (window.confirm('Lock results? This action is irreversible.')) {
                                                            try {
                                                                await updateEvent(event.id, { ...event, is_result_locked: true });
                                                                await fetchEvents();
                                                            } catch (err) {
                                                                alert(err.response?.data?.detail || 'Locking failed');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    🔒 Lock Results
                                                </Button>
                                            )}
                                            <Button 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="rounded-pill"
                                                onClick={() => navigate(`/events/${event.id}`)}
                                            >
                                                View Full Details
                                            </Button>
                                        </div>
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

export default FacultyStatusList;
