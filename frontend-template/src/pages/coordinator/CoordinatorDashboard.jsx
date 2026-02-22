import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const CoordinatorDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getEvents(); // Backend filters for Coordinator
            setEvents(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">Coordinator Dashboard</h1>

            {events.length === 0 ? (
                <div className="alert alert-info">No events assigned to you.</div>
            ) : (
                <Row>
                    {events.map(event => (
                        <Col md={6} lg={4} key={event.id} className="mb-4">
                            <Card className="h-100 shadow-sm border-0">
                                <Card.Body>
                                    <div className="d-flex justify-content-between mb-2">
                                        <Badge bg="info">{event.event_type}</Badge>
                                        <Badge bg={
                                            event.status === 'SCHEDULED' ? 'primary' :
                                            event.status === 'ONGOING' ? 'warning' : 'success'
                                        }>{event.status}</Badge>
                                    </div>
                                    <Card.Title>{event.title}</Card.Title>
                                    <Card.Text className="text-muted small">
                                        Date: {new Date(event.event_date).toLocaleDateString()}
                                    </Card.Text>

                                    <div className="d-grid gap-2 mt-3">
                                        <Button variant="outline-info" size="sm" onClick={() => navigate(`/coordinator/events/${event.id}/participants`)}>
                                            View Participants
                                        </Button>
                                        <Button variant="outline-success" size="sm" onClick={() => navigate(`/faculty/attendance/${event.id}`)}>
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

export default CoordinatorDashboard;

