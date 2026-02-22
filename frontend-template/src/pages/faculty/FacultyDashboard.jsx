import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const FacultyDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getEvents(); // Backend filters for Faculty
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
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Faculty Dashboard</h1>
                <Button variant="outline-primary" onClick={() => navigate('/faculty/budgets')}>
                    <i className="fas fa-money-bill me-2"></i>Manage Budgets
                </Button>
            </div>

            {events.length === 0 ? (
                <div className="alert alert-info">No events assigned to you as coordinator.</div>
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
                                        <Button variant="outline-primary" size="sm" onClick={() => navigate(`/faculty/approvals/${event.id}`)}>
                                            Approvals & Registrations
                                        </Button>
                                        <Button variant="outline-success" size="sm" onClick={() => navigate(`/faculty/attendance/${event.id}`)}>
                                            Attendance
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

export default FacultyDashboard;

