import React, { useEffect, useState, useContext } from 'react';
import { Container, Card, Button, Badge, Alert, Table } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventResults } from '../../api/events';
import { getEvents } from '../../api/events';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const EventResults = () => {
    const { eventId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [results, setResults] = useState(null); // { event_id, is_locked, results: [] }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchResults();
    }, [eventId]);

    const fetchResults = async () => {
        try {
            const data = await getEventResults(eventId);
            setResults(data);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to load results. They might not be published yet.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error) return (
        <Container className="mt-4">
             <Alert variant="warning">
                {error} <br/>
                <Button variant="link" onClick={() => navigate(-1)}>Go Back</Button>
             </Alert>
        </Container>
    );

    const myResult = results.results.find(r => 
        (r.registration_number === user.registration_number) || // For Solo (match reg number or name?) 
        // Backend returns participant_name or team_name. 
        // We don't have easy ID match in backend response schema yet?
        // ResultEntry has: rank, participant_name, team_name, registration_number, scores...
        // We can match by reg number for student.
        (user.registration_number && r.registration_number === user.registration_number) ||
        (r.team_name && false) // We'd need to know my team name.
        // Doing strict highlight might be hard without ID.
        // Let's just show table.
    );

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Event Results</h1>
                <Button variant="outline-secondary" onClick={() => navigate(-1)}>Back</Button>
            </div>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">Leaderboard</h5>
                </Card.Header>
                <Table responsive hover className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Rank</th>
                            <th>Participant / Team</th>
                            <th>Total Score</th>
                            <th>Avg Score</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.results.map((entry, index) => {
                            const isMe = (user.registration_number && entry.registration_number === user.registration_number);
                            // Simple highlighting
                            return (
                                <tr key={index} className={isMe ? "table-primary" : ""}>
                                    <td>
                                        {entry.rank === 1 && <i className="fas fa-trophy text-warning me-1"></i>}
                                        {entry.rank === 2 && <i className="fas fa-medal text-secondary me-1"></i>}
                                        {entry.rank === 3 && <i className="fas fa-medal text-danger me-1"></i>}
                                        <span className="fw-bold">#{entry.rank}</span>
                                    </td>
                                    <td>
                                        {entry.team_name ? (
                                            <span className="fw-bold">{entry.team_name}</span>
                                        ) : (
                                            <div>
                                                <span className="fw-bold">{entry.participant_name}</span>
                                                <small className="d-block text-muted">{entry.registration_number}</small>
                                            </div>
                                        )}
                                    </td>
                                    <td>{entry.total_score}</td>
                                    <td>{entry.average_score.toFixed(2)}</td>
                                    <td>
                                        {entry.rank === 1 ? <Badge bg="success">Winner</Badge> : 
                                         entry.rank <= 3 ? <Badge bg="info">Top 3</Badge> : 
                                         <Badge bg="secondary">Participant</Badge>}
                                    </td>
                                </tr>
                            )
                        })}
                        {results.results.length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center py-4">No results available.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card>
        </Container>
    );
};

export default EventResults;

