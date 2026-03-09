import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Badge, Button, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getResults } from '../../api/scores';
import { getEvent } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const JudgeResults = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [results, setResults] = useState(null);
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const [eventData, resultsData] = await Promise.all([
                    getEvent(eventId),
                    getResults(eventId)
                ]);
                setEvent(eventData);
                setResults(resultsData);
            } catch (err) {
                setError("Failed to load results. They may not be locked yet.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [eventId]);

    if (loading) return <LoadingSpinner />;
    if (error) return (
        <Container className="mt-4">
            <div className="alert alert-danger">{error}</div>
            <Button variant="primary" onClick={() => navigate('/judge/events')}>Back to Dashboard</Button>
        </Container>
    );

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                   <h2 className="fw-bold mb-0">🏆 Event Results: {event?.title}</h2>
                   <p className="text-muted">Final leaderboard for {event?.category}</p>
                </div>
                <Button variant="outline-secondary" onClick={() => navigate('/judge/events')}>
                    Back to Dashboard
                </Button>
            </div>

            <Row>
                <Col lg={8}>
                    <Card className="border-0 shadow-sm" style={{ borderRadius: 15 }}>
                        <Card.Body className="p-0">
                            <Table responsive hover className="mb-0 align-middle">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="px-4 py-3" style={{ width: '80px' }}>Rank</th>
                                        <th className="py-3">Participant / Team</th>
                                        <th className="py-3 text-center">Avg Score</th>
                                        <th className="py-3 text-center">Total Score</th>
                                        <th className="py-3 text-center">Judges</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results?.results.map((res) => (
                                        <tr key={res.rank}>
                                            <td className="px-4">
                                                {res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : res.rank === 3 ? '🥉' : res.rank}
                                            </td>
                                            <td>
                                                <div className="fw-bold">{res.participant_name || res.team_name}</div>
                                                {res.registration_number && (
                                                    <small className="text-muted">{res.registration_number}</small>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                <Badge bg="info" className="px-3 py-2" pill style={{ fontSize: 13 }}>
                                                    {res.average_score.toFixed(2)}
                                                </Badge>
                                            </td>
                                            <td className="text-center fw-bold text-primary">
                                                {res.total_score}
                                            </td>
                                            <td className="text-center text-muted small">
                                                {res.score_count}
                                            </td>
                                        </tr>
                                    ))}
                                    {results?.results.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center py-5 text-muted">
                                                No scores submitted for this event yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="border-0 shadow-sm bg-primary text-white mb-4" style={{ borderRadius: 15 }}>
                        <Card.Body className="p-4">
                            <h5 className="fw-bold mb-3">Event Summary</h5>
                            <div className="mb-2 d-flex justify-content-between">
                                <span>Status:</span>
                                <Badge bg="light" text="dark">COMPLETED</Badge>
                            </div>
                            <div className="mb-2 d-flex justify-content-between">
                                <span>Results:</span>
                                <Badge bg="success">LOCKED</Badge>
                            </div>
                            <hr />
                            <div className="small opacity-75">
                                These results have been finalized and verified by the event coordinator.
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default JudgeResults;
