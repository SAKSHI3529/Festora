import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Badge, Button, Table,
    Alert, Form
} from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const getEvents  = () => api.get('/events').then(r => r.data);
const getResults = (eventId) => api.get(`/scores/${eventId}/results`).then(r => r.data);
const lockResults = (eventId) => api.put(`/scores/${eventId}/lock`).then(r => r.data);

const RANK_STYLE = {
    1: { bg: '#ffd700', icon: '🥇', label: 'Gold'   },
    2: { bg: '#c0c0c0', icon: '🥈', label: 'Silver' },
    3: { bg: '#cd7f32', icon: '🥉', label: 'Bronze' },
};

const AdminResults = () => {
    const navigate      = useNavigate();
    const [searchParams] = useSearchParams();
    const preselect     = searchParams.get('eventId');

    const [events,    setEvents]    = useState([]);
    const [selectedId, setSelectedId] = useState(preselect || '');
    const [results,   setResults]   = useState(null);  // EventResultResponse
    const [loading,   setLoading]   = useState(false);
    const [evLoading, setEvLoading] = useState(true);
    const [error,     setError]     = useState(null);
    const [locking,   setLocking]   = useState(false);

    // Load events list
    useEffect(() => {
        getEvents()
            .then(d => {
                const norm = d.map(e => ({ ...e, id: e.id || e._id || '' }));
                setEvents(norm);
                if (preselect) fetchResults(preselect);
            })
            .catch(() => {})
            .finally(() => setEvLoading(false));
    }, []);

    const fetchResults = async (eventId) => {
        if (!eventId) return;
        setLoading(true);
        setError(null);
        setResults(null);
        try {
            const data = await getResults(eventId);
            setResults(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to fetch results.');
        } finally {
            setLoading(false);
        }
    };

    const handleEventChange = (id) => {
        setSelectedId(id);
        if (id) fetchResults(id);
        else setResults(null);
    };

    const handleLock = async () => {
        if (!selectedEvent) return;
        if (!window.confirm(`Lock results for "${selectedEvent.title}"? This cannot be undone.`)) return;
        setLocking(true);
        try {
            await lockResults(selectedId);
            setEvents(prev => prev.map(e => e.id === selectedId ? { ...e, is_result_locked: true } : e));
            await fetchResults(selectedId);
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to lock.');
        } finally {
            setLocking(false);
        }
    };

    const selectedEvent = events.find(e => e.id === selectedId);
    const isLocked      = selectedEvent?.is_result_locked;
    const isCompleted   = selectedEvent?.status === 'COMPLETED';

    return (
        <Container fluid>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">🏆 Results & Leaderboard</h4>
                    <small className="text-muted">View ranked results and manage result locking</small>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/scores')}>
                    ← Score Management
                </Button>
            </div>

            {/* Event Selector */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="align-items-end g-3">
                        <Col md={5}>
                            <Form.Label className="fw-semibold">Select Event</Form.Label>
                            {evLoading ? (
                                <div className="text-muted">Loading events…</div>
                            ) : (
                                <Form.Select
                                    value={selectedId}
                                    onChange={e => handleEventChange(e.target.value)}
                                >
                                    <option value="">— Choose an event —</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.title} [{ev.status}]
                                        </option>
                                    ))}
                                </Form.Select>
                            )}
                        </Col>
                        {selectedEvent && (
                            <Col md="auto">
                                <div className="d-flex gap-2 align-items-center">
                                    <Badge bg={isLocked ? 'danger' : isCompleted ? 'warning' : 'secondary'}
                                           text={!isLocked && isCompleted ? 'dark' : 'white'}>
                                        {isLocked ? '🔒 Results Locked' : isCompleted ? '🔓 Not Locked' : selectedEvent.status}
                                    </Badge>
                                    {isCompleted && !isLocked && (
                                        <Button size="sm" variant="danger" onClick={handleLock} disabled={locking}>
                                            {locking ? '⏳ Locking…' : '🔒 Lock Results'}
                                        </Button>
                                    )}
                                    {isLocked && (
                                        <Button
                                            size="sm"
                                            variant="outline-success"
                                            onClick={() => navigate(`/admin/certificates?eventId=${selectedId}`)}
                                        >
                                            🎓 Certificates
                                        </Button>
                                    )}
                                </div>
                            </Col>
                        )}
                    </Row>
                </Card.Body>
            </Card>

            {/* Guards */}
            {selectedId && selectedEvent && !isCompleted && (
                <Alert variant="info">
                    This event is not yet <strong>COMPLETED</strong>. Results are only available for completed events.
                </Alert>
            )}

            {/* Results */}
            {loading && <LoadingSpinner />}
            {error   && <Alert variant="danger">{error}</Alert>}

            {results && !loading && (
                <>
                    {/* Podium — top 3 */}
                    {results.results.length > 0 && (
                        <Row className="g-3 mb-4 justify-content-center">
                            {results.results.slice(0, 3).map(entry => {
                                const rs = RANK_STYLE[entry.rank] || {};
                                const name = entry.participant_name || entry.team_name || '—';
                                return (
                                    <Col xs={12} md={4} key={entry.rank}>
                                        <Card
                                            className="border-0 shadow text-center py-4"
                                            style={{
                                                background: `linear-gradient(135deg, ${rs.bg}33, ${rs.bg}11)`,
                                                borderTop: `4px solid ${rs.bg}`,
                                                borderRadius: 16,
                                            }}
                                        >
                                            <div style={{ fontSize: 48 }}>{rs.icon}</div>
                                            <div className="fw-bold fs-5 mt-1">{name}</div>
                                            {entry.registration_number && (
                                                <small className="text-muted">{entry.registration_number}</small>
                                            )}
                                            <div className="mt-2">
                                                <span className="fw-bold" style={{ fontSize: 22, color: rs.bg }}>
                                                    {entry.total_score}
                                                </span>
                                                <span className="text-muted ms-1" style={{ fontSize: 13 }}>pts</span>
                                            </div>
                                            <div className="text-muted" style={{ fontSize: 12 }}>
                                                avg {entry.average_score?.toFixed(1)} | {entry.score_count} judges
                                            </div>
                                            <Badge bg="light" text="dark" className="mt-2 border" style={{ color: rs.bg }}>
                                                {rs.label} — Rank #{entry.rank}
                                            </Badge>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    )}

                    {/* Full Leaderboard Table */}
                    <div className="bg-white rounded shadow-sm p-3">
                        <div className="fw-semibold mb-3">
                            Full Leaderboard
                            {!results.is_locked && (
                                <Badge bg="warning" text="dark" className="ms-2" style={{ fontSize: 11 }}>
                                    ⚠ Results not locked yet
                                </Badge>
                            )}
                        </div>
                        <Table hover responsive className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Rank</th>
                                    <th>Participant / Team</th>
                                    <th>Reg. No</th>
                                    <th>Total Score</th>
                                    <th>Avg Score</th>
                                    <th>Judges</th>
                                    <th>Award</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.results.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center text-muted py-5">
                                            No scores submitted yet.
                                        </td>
                                    </tr>
                                ) : results.results.map(entry => {
                                    const rs = RANK_STYLE[entry.rank];
                                    const name = entry.participant_name || entry.team_name || '—';
                                    return (
                                        <tr key={entry.rank}
                                            style={rs ? { background: `${rs.bg}18` } : {}}>
                                            <td>
                                                <span className="fw-bold" style={{ fontSize: 18 }}>
                                                    {rs ? rs.icon : `#${entry.rank}`}
                                                </span>
                                            </td>
                                            <td className="fw-semibold">{name}</td>
                                            <td className="text-muted" style={{ fontSize: 13 }}>
                                                {entry.registration_number || '—'}
                                            </td>
                                            <td>
                                                <span className="fw-bold" style={{ color: rs?.bg || 'inherit' }}>
                                                    {entry.total_score}
                                                </span>
                                            </td>
                                            <td>{entry.average_score?.toFixed(2)}</td>
                                            <td>
                                                <Badge bg="light" text="dark" className="border">
                                                    {entry.score_count}
                                                </Badge>
                                            </td>
                                            <td>
                                                {rs ? (
                                                    <Badge style={{ background: rs.bg, color: '#000' }}>
                                                        {rs.label}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                </>
            )}

            {!selectedId && (
                <div className="text-center py-5 text-muted">
                    <div style={{ fontSize: 64 }}>📊</div>
                    <p>Select an event above to view its results leaderboard.</p>
                </div>
            )}
        </Container>
    );
};

export default AdminResults;
