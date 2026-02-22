import React, { useEffect, useState, useContext } from 'react';
import {
    Container, Row, Col, Card, Badge, Button, Table, Alert, Spinner
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents, getEventResults } from '../../api/events';
import { getMyRegistrations } from '../../api/registrations';
import { AuthContext } from '../../context/AuthContext';

// ─── Medal config ────────────────────────────────────────────────────────────
const MEDAL = {
    1: { emoji: '🥇', label: 'Gold',   bg: '#FFF8E1', border: '#F9A825', text: '#E65100' },
    2: { emoji: '🥈', label: 'Silver', bg: '#F5F5F5', border: '#9E9E9E', text: '#424242' },
    3: { emoji: '🥉', label: 'Bronze', bg: '#FBE9E7', border: '#FF7043', text: '#BF360C' },
};

// ─── Leaderboard for a single event ──────────────────────────────────────────
const Leaderboard = ({ eventId, eventTitle, myRegNum, onBack }) => {
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const result = await getEventResults(eventId);
                setData(result);
            } catch (err) {
                setError(err.response?.data?.detail || 'Results not available.');
            } finally {
                setLoading(false);
            }
        })();
    }, [eventId]);

    if (loading) return (
        <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2 text-muted">Loading leaderboard…</div>
        </div>
    );

    if (error) return (
        <Alert variant="warning" className="mt-3">
            <strong>Results Not Published Yet</strong><br />
            {error}
        </Alert>
    );

    if (!data?.is_locked) return (
        <Alert variant="secondary" className="mt-3">
            <span style={{ fontSize: 28 }}>🔒</span>
            <strong className="ms-2">Results Not Published Yet</strong>
            <div className="text-muted mt-1">The organiser hasn't locked the results for this event.</div>
        </Alert>
    );

    const entries = data.results || [];

    return (
        <Card className="border-0 shadow-sm" style={{ borderRadius: 14 }}>
            <Card.Header
                style={{
                    background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                    borderRadius: '14px 14px 0 0',
                    padding: '20px 24px',
                }}
            >
                <div className="d-flex align-items-center gap-3">
                    <span style={{ fontSize: 32 }}>🏆</span>
                    <div>
                        <div className="text-white fw-bold" style={{ fontSize: 18 }}>{eventTitle}</div>
                        <div className="text-white-50" style={{ fontSize: 12 }}>Leaderboard • {entries.length} participants</div>
                    </div>
                </div>
            </Card.Header>

            {entries.length === 0 ? (
                <Card.Body className="text-center py-5 text-muted">
                    <span style={{ fontSize: 48 }}>📭</span>
                    <div className="mt-2">No scores recorded yet.</div>
                </Card.Body>
            ) : (
                <Table responsive hover className="mb-0">
                    <thead style={{ background: '#f8f9fc' }}>
                        <tr>
                            <th style={{ width: 70, paddingLeft: 20 }}>Rank</th>
                            <th>Participant / Team</th>
                            <th className="text-center">Total</th>
                            <th className="text-center">Average</th>
                            <th className="text-center">Award</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry, idx) => {
                            const medal = MEDAL[entry.rank];
                            const isMe = myRegNum && entry.registration_number === myRegNum;
                            const rowStyle = medal
                                ? { background: medal.bg, borderLeft: `4px solid ${medal.border}` }
                                : isMe
                                    ? { background: '#EDE7F6', borderLeft: '4px solid #7B1FA2' }
                                    : {};

                            return (
                                <tr key={idx} style={rowStyle}>
                                    <td style={{ paddingLeft: 20, fontWeight: 700, fontSize: 18 }}>
                                        {medal ? (
                                            <span title={medal.label} style={{ color: medal.text }}>
                                                {medal.emoji}
                                            </span>
                                        ) : (
                                            <span className="text-muted">#{entry.rank}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="fw-semibold">
                                            {entry.team_name || entry.participant_name}
                                            {isMe && (
                                                <Badge bg="primary" className="ms-2" style={{ fontSize: 10 }}>You</Badge>
                                            )}
                                        </div>
                                        {!entry.team_name && entry.registration_number && (
                                            <small className="text-muted">{entry.registration_number}</small>
                                        )}
                                    </td>
                                    <td className="text-center fw-bold">{entry.total_score}</td>
                                    <td className="text-center">{Number(entry.average_score).toFixed(2)}</td>
                                    <td className="text-center">
                                        {entry.rank === 1 && <Badge style={{ background: '#F9A825', color: '#fff' }}>🥇 Winner</Badge>}
                                        {entry.rank === 2 && <Badge bg="secondary">🥈 Runner-up</Badge>}
                                        {entry.rank === 3 && <Badge style={{ background: '#FF7043', color: '#fff' }}>🥉 Third</Badge>}
                                        {entry.rank > 3 && <Badge bg="light" text="dark">Participant</Badge>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            )}
        </Card>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const EventResults = () => {
    const { user } = useContext(AuthContext);
    const navigate  = useNavigate();

    const [events,        setEvents]        = useState([]);
    const [myRegs,        setMyRegs]        = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [loading,       setLoading]       = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [evts, regs] = await Promise.all([getEvents(), getMyRegistrations()]);
                // Only show COMPLETED events (locked check happens inside Leaderboard)
                setEvents(evts.filter(e => e.status === 'COMPLETED'));
                setMyRegs(regs);
            } catch (err) {
                console.error('Failed to load events', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const isRegistered = (eventId) => myRegs.some(r => r.event_id === eventId);

    if (loading) return (
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
            <Spinner animation="border" variant="primary" />
        </Container>
    );

    // ── Detail view ──────────────────────────────────────────────────────────
    if (selectedEvent) {
        return (
            <Container fluid>
                <Button
                    variant="outline-secondary"
                    className="mb-4 rounded-pill"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                >
                    ← Back to Results
                </Button>
                <Leaderboard
                    eventId={selectedEvent.id}
                    eventTitle={selectedEvent.title}
                    myRegNum={user?.registration_number}
                    onBack={() => setSelectedEvent(null)}
                />
            </Container>
        );
    }

    // ── List view ────────────────────────────────────────────────────────────
    return (
        <Container fluid>
            {/* Header */}
            <div className="mb-4">
                <h4 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>🏆 Event Results</h4>
                <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                    View leaderboards for completed events.
                </p>
            </div>

            {events.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: 14 }}>
                    <Card.Body>
                        <div style={{ fontSize: 56 }}>📭</div>
                        <h5 className="mt-3 text-muted fw-semibold">No Completed Events</h5>
                        <p className="text-muted" style={{ fontSize: 14 }}>
                            Results will appear here once events are completed.
                        </p>
                    </Card.Body>
                </Card>
            ) : (
                <Row>
                    {events.map(event => {
                        const participated = isRegistered(event.id);
                        return (
                            <Col key={event.id} md={6} xl={4} className="mb-4">
                                <Card
                                    className="h-100 border-0 shadow-sm"
                                    style={{ borderRadius: 14, cursor: 'pointer', transition: 'transform .15s' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    {/* Purple header strip */}
                                    <div style={{
                                        background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                                        borderRadius: '14px 14px 0 0',
                                        padding: '18px 20px',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            position: 'absolute', top: -20, right: -20,
                                            width: 100, height: 100, borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.1)',
                                        }} />
                                        <div style={{ fontSize: 28 }}>🏁</div>
                                        <div className="text-white fw-bold mt-1" style={{ fontSize: 15 }}>
                                            {event.title}
                                        </div>
                                        <div className="text-white-50" style={{ fontSize: 11 }}>
                                            {event.category} • {event.event_type}
                                        </div>
                                    </div>

                                    <Card.Body className="d-flex flex-column p-3">
                                        <div className="d-flex gap-2 flex-wrap mb-3">
                                            <Badge bg="secondary" style={{ fontSize: 11 }}>✅ Completed</Badge>
                                            {participated && (
                                                <Badge style={{ background: '#6a11cb', fontSize: 11 }}>
                                                    🎯 You Participated
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="text-muted mb-3" style={{ fontSize: 12, flexGrow: 1 }}>
                                            📅 {new Date(event.event_date).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}&nbsp;&nbsp;
                                            📍 {event.location}
                                        </div>

                                        <Button
                                            className="rounded-pill mt-auto"
                                            style={{
                                                background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                                                border: 'none',
                                                fontSize: 13,
                                            }}
                                            onClick={() => setSelectedEvent(event)}
                                        >
                                            View Leaderboard
                                        </Button>
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

export default EventResults;
