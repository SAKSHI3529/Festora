import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Badge, Button, Table, Alert
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const getEvents    = () => api.get('/events').then(r => r.data);
const lockResults  = (eventId) => api.put(`/scores/${eventId}/lock`).then(r => r.data);

const STATUS_CFG = {
    SCHEDULED: { bg: 'secondary', label: '🗓 Scheduled' },
    ONGOING:   { bg: 'warning',   label: '🔴 Ongoing',  text: 'dark' },
    COMPLETED: { bg: 'success',   label: '✅ Completed' },
};

const AdminScores = () => {
    const navigate = useNavigate();
    const [events,   setEvents]   = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [error,    setError]    = useState(null);
    const [locking,  setLocking]  = useState(null); // eventId being locked

    const loadEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getEvents();
            const normalized = data.map(e => ({ ...e, id: e.id || e._id || '' }));
            setEvents(normalized);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load events.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadEvents(); }, []);

    const handleLock = async (event) => {
        if (!window.confirm(`Lock results for "${event.title}"? This cannot be undone.`)) return;
        setLocking(event.id);
        try {
            await lockResults(event.id);
            // Update local state
            setEvents(prev => prev.map(e =>
                e.id === event.id ? { ...e, is_result_locked: true } : e
            ));
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to lock results.');
        } finally {
            setLocking(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    // Summary
    const completed = events.filter(e => e.status === 'COMPLETED');
    const locked    = events.filter(e => e.is_result_locked);
    const ongoing   = events.filter(e => e.status === 'ONGOING');

    return (
        <Container fluid>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">🏅 Score Management</h4>
                    <small className="text-muted">View scoring status and lock results for completed events</small>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={loadEvents}>🔄 Refresh</Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Summary Cards */}
            <Row className="g-3 mb-4">
                {[
                    { label: 'Total Events',  value: events.length,   color: '#6366f1' },
                    { label: 'Ongoing',        value: ongoing.length,  color: '#f59e0b' },
                    { label: 'Completed',      value: completed.length, color: '#10b981' },
                    { label: 'Results Locked', value: locked.length,   color: '#ef4444' },
                ].map(({ label, value, color }) => (
                    <Col xs={6} md={3} key={label}>
                        <Card className="border-0 shadow-sm text-center py-3" style={{ borderRadius: 12 }}>
                            <div className="h4 fw-bold mb-0" style={{ color }}>{value}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>{label}</div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Events Table */}
            <div className="bg-white rounded shadow-sm p-3">
                <Table hover responsive className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Event</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Results</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-muted py-5">No events found.</td>
                            </tr>
                        ) : events.map(ev => {
                            const sCfg = STATUS_CFG[ev.status] || STATUS_CFG['SCHEDULED'];
                            const isLocked = ev.is_result_locked;
                            const isCompleted = ev.status === 'COMPLETED';
                            return (
                                <tr key={ev.id}>
                                    <td>
                                        <div className="fw-semibold">{ev.title}</div>
                                        <small className="text-muted">{ev.category}</small>
                                    </td>
                                    <td>
                                        <Badge bg="light" text="dark" className="border">
                                            {ev.event_type || '—'}
                                        </Badge>
                                    </td>
                                    <td>
                                        <Badge bg={sCfg.bg} text={sCfg.text}>{sCfg.label}</Badge>
                                    </td>
                                    <td>
                                        {isLocked ? (
                                            <Badge bg="danger">🔒 Locked</Badge>
                                        ) : isCompleted ? (
                                            <Badge bg="warning" text="dark">🔓 Unlocked</Badge>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="d-flex gap-1 flex-wrap">
                                            {/* View Results */}
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                disabled={!isCompleted}
                                                onClick={() => navigate(`/admin/results?eventId=${ev.id}`)}
                                            >
                                                📊 Results
                                            </Button>

                                            {/* Lock Results */}
                                            {isCompleted && !isLocked && (
                                                <Button
                                                    size="sm"
                                                    variant="danger"
                                                    disabled={locking === ev.id}
                                                    onClick={() => handleLock(ev)}
                                                >
                                                    {locking === ev.id ? '⏳ Locking…' : '🔒 Lock'}
                                                </Button>
                                            )}

                                            {/* Certificates */}
                                            {isLocked && (
                                                <Button
                                                    size="sm"
                                                    variant="outline-success"
                                                    onClick={() => navigate(`/admin/certificates?eventId=${ev.id}`)}
                                                >
                                                    🎓 Certs
                                                </Button>
                                            )}
                                        </div>
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

export default AdminScores;
