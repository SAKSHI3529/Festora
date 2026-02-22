import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const JudgeDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssignedEvents();
    }, []);

    const fetchAssignedEvents = async () => {
        try {
            // Backend filters to only show assigned events for Judges
            const data = await getEvents();
            setEvents(data);
        } catch (err) {
            console.error("Failed to load events", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">Assigned Events</h1>
            
            {events.length === 0 ? (
                <div className="alert alert-info">No events assigned to you yet.</div>
            ) : (
                <Row>
                    {events.map(event => {
                        const isOngoing = event.status === 'ONGOING';
                        const isLocked = event.is_result_locked;
                        const canScore = isOngoing && !isLocked;

                        return (
                            <Col md={4} key={event.id} className="mb-4">
                                <Card className="h-100 shadow-sm">
                                    <Card.Body className="d-flex flex-column">
                                        <div className="d-flex justify-content-between mb-2">
                                            <Badge bg="info">{event.event_type}</Badge>
                                            <Badge bg={
                                                event.status === 'SCHEDULED' ? 'primary' :
                                                event.status === 'ONGOING' ? 'warning' : 'success'
                                            }>{event.status}</Badge>
                                        </div>
                                        <Card.Title>{event.title}</Card.Title>
                                        <Card.Text className="text-muted small">
                                            {new Date(event.event_date).toLocaleDateString()}
                                        </Card.Text>
                                        
                                        <div className="mt-auto">
                                            {isLocked && <Badge bg="dark" className="w-100 mb-2 p-2">Results Locked</Badge>}
                                            
                                            <Button 
                                                variant={canScore ? "primary" : "secondary"} 
                                                className="w-100"
                                                disabled={!canScore}
                                                onClick={() => navigate(`/judge/score/${event.id}`)}
                                            >
                                                {isLocked ? "Scoring Closed" : isOngoing ? "Score Now" : `Status: ${event.status}`}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}
        </Container>
    );
};

export default JudgeDashboard;

