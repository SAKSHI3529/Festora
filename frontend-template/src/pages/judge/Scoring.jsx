import React, { useEffect, useState } from 'react';
import { Container, Button, Alert, Badge, Table, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent } from '../../api/events';
import { submitScore, getEventParticipants, getEventTeams, getMyScores, updateScore } from '../../api/scores';
import LoadingSpinner from '../../components/LoadingSpinner';

const Scoring = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]); // Or teams
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scores, setScores] = useState({}); 
    const [submittedScores, setSubmittedScores] = useState({}); // { entityId: scoreObject }
    const [submitting, setSubmitting] = useState({}); 
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const [eventData, myScoresData] = await Promise.all([
                getEvent(eventId),
                getMyScores(eventId)
            ]);
            
            const normalizedEvent = { ...eventData, id: eventData.id || eventData._id };
            setEvent(normalizedEvent);

            // Map existing scores
            const scoreMap = {};
            const submittedMap = {};
            myScoresData.forEach(s => {
                const targetId = s.registration_id || s.team_id;
                scoreMap[targetId] = s.score;
                submittedMap[targetId] = s;
            });
            setScores(scoreMap);
            setSubmittedScores(submittedMap);

            if (normalizedEvent.event_type === 'SOLO') {
                const parts = await getEventParticipants(eventId);
                setParticipants(parts.filter(p => p.status === 'APPROVED'));
            } else {
                const teams = await getEventTeams(eventId);
                setParticipants(teams.filter(t => t.status === 'APPROVED'));
            }
        } catch (err) {
            setError("Failed to load scoring data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (id, value) => {
        // Validate range? 0-100 usually.
        if (value > 100) value = 100;
        if (value < 0) value = 0;
        setScores({ ...scores, [id]: value });
    };

    const handleSubmit = async (entityId) => {
        const scoreVal = scores[entityId];
        if (scoreVal === undefined || scoreVal === '') {
            alert("Please enter a score");
            return;
        }

        setSubmitting({ ...submitting, [entityId]: true });
        try {
            const existing = submittedScores[entityId];
            if (existing) {
                // Update
                const updated = await updateScore(existing.id, {
                    score: parseFloat(scoreVal)
                });
                setSubmittedScores({ ...submittedScores, [entityId]: updated });
                setSuccessMsg("Score updated successfully");
            } else {
                // Create
                const payload = {
                    event_id: eventId,
                    score: parseFloat(scoreVal)
                };
                
                if (event.event_type === 'SOLO') {
                     payload.registration_id = entityId; 
                } else {
                     payload.team_id = entityId;
                }

                const created = await submitScore(payload);
                setSubmittedScores({ ...submittedScores, [entityId]: created });
                setSuccessMsg("Score submitted successfully");
            }
        } catch (err) {
            alert(err.response?.data?.detail || "Submission failed");
        } finally {
            setSubmitting({ ...submitting, [entityId]: false });
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!event) return <Alert variant="danger">Event not found</Alert>;

    if (error) return <Alert variant="danger">{error}</Alert>;
    
    if (event.is_result_locked) {
        return (
            <Container className="mt-5 text-center">
                <Alert variant="dark">
                    <h4 className="alert-heading">Scoring Closed</h4>
                    <p>The results for this event have been locked by the administrator.</p>
                    <Button variant="outline-dark" onClick={() => navigate('/judge/events')}>Back to Dashboard</Button>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                   <h1 className="h3 text-gray-800">Scoring: {event.title}</h1>
                   <Badge bg="info">{event.event_type}</Badge>
                </div>
                <Button variant="outline-secondary" onClick={() => navigate('/judge/events')}>Back</Button>
            </div>

            {successMsg && <Alert variant="success" onClose={() => setSuccessMsg('')} dismissible>{successMsg}</Alert>}

            <div className="table-responsive bg-white rounded shadow-sm">
                <Table hover className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>{event.event_type === 'SOLO' ? 'Participant' : 'Team Name'}</th>
                            <th>ID / Members</th>
                            <th style={{ width: '150px' }}>Score (0-100)</th>
                            <th style={{ width: '100px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {participants.map(p => {
                            // Bug Workaround Plan:
                            // p.id needs to be registration_id (Solo) or team_id (Group)
                            // I need to ensure backend provides this.
                            
                            return (
                                <tr key={p.id}>
                                    <td>
                                        <span className="fw-bold">
                                            {event.event_type === 'SOLO' ? p.student_name : p.team_name}
                                        </span>
                                    </td>
                                    <td>
                                        {event.event_type === 'SOLO' ? (
                                            <span className="text-muted small">{p.registration_number}</span>
                                        ) : (
                                            <span className="text-muted small">
                                                {/* Teams Endpoint returns member_ids list usually. Not names unless aggregated. */}
                                                {/* For now, just show ID or Count */}
                                                Member Count: {p.member_ids?.length || 0}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <Form.Control 
                                            type="number" 
                                            min="0" 
                                            max="100"
                                            value={scores[p.id] || ''}
                                            onChange={(e) => handleScoreChange(p.id, e.target.value)}
                                            disabled={event.status !== 'ONGOING' || event.is_result_locked}
                                        />
                                    </td>
                                    <td>
                                        <Button 
                                            variant={submittedScores[p.id] ? "success" : "primary"} 
                                            size="sm" 
                                            onClick={() => handleSubmit(p.id)}
                                            disabled={submitting[p.id] || event.status !== 'ONGOING' || event.is_result_locked}
                                        >
                                            {submitting[p.id] ? 'Saving...' : (submittedScores[p.id] ? 'Update' : 'Save')}
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

export default Scoring;

