import React, { useEffect, useState } from 'react';
import { Container, Button, Alert, Badge, Table, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent } from '../../api/events';
import { submitScore, getEventParticipants, getEventTeams } from '../../api/scores';
import LoadingSpinner from '../../components/LoadingSpinner';

const Scoring = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]); // Or teams
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scores, setScores] = useState({}); // Local state for inputs: { id: score }
    const [submitting, setSubmitting] = useState({}); // { id: boolean }
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const eventData = await getEvent(eventId);
            setEvent(eventData);

            if (eventData.event_type === 'SOLO') {
                const parts = await getEventParticipants(eventId);
                // Filter only Approved?
                // Backend get_participants returns all registrations.
                // We should filter client side or trust backend to optimize later.
                // Requirement says "GET approved registrations".
                // Let's filter.
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
            const payload = {
                event_id: eventId,
                score: parseFloat(scoreVal),
                // Solo has participant ID (registration ID needed?), Group has Team ID.
                // Wait. getEventParticipants returns flattened object?
                // Let's check get_participants in events.py (Step 1463).
                // It returns { student_name, registration_number, team_name, status ... } but NO ID!
                // Ah, get_participants in events.py does NOT include _id or registration_id in $project!
                // Major Bug! I need to fix get_participants to include registration_id (for solo) and team_id (usually redundant but good to have)
                // Actually, for SOLO, `get_participants` uses `registrations` collection. the `_id` of the document IS the `registration_id`.
                // But `$project` sets `_id: 0`.
                // I need to fix backend `events.py` `get_participants`!
                
                // For TEAM, `getTeam` returns `id`. `getEventTeams` uses `find()` so it has `id`.
                
                // I will add a fix step for backend events.py to return IDs.
            };
            
            if (event.event_type === 'SOLO') {
                 // Pending Fix: We need registration ID here.
                 // Assuming I fix backend to return 'id' (registration id).
                 // Use temporary placeholder logic or assumption that entityId IS the id.
                 payload.registration_id = entityId; 
            } else {
                 payload.team_id = entityId;
            }

            await submitScore(payload);
            setSuccessMsg("Score submitted successfully");
            
            // Mark as scored locally? 
            // Ideally backend returns "is_scored" flag per participant?
            // Current backend schemas don't seem to pass "my_score" back in list.
            // Judge might accidentally score twice? Backend returns 409 Conflict.
            // We should catch 409 and show "Already Scored".
            
        } catch (err) {
            if (err.response?.status === 409) {
                 alert("You have already scored this participant.");
            } else {
                 alert(err.response?.data?.detail || "Submission failed");
            }
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
                                        />
                                    </td>
                                    <td>
                                        <Button 
                                            variant="primary" 
                                            size="sm" 
                                            onClick={() => handleSubmit(p.id)}
                                            disabled={submitting[p.id]}
                                        >
                                            {submitting[p.id] ? 'Saving...' : 'Save'}
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

