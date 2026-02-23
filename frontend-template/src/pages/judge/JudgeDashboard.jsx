import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORY_GRADIENTS = {
    'Music':        'linear-gradient(135deg,#667eea,#764ba2)',
    'Dance':        'linear-gradient(135deg,#f093fb,#f5576c)',
    'Sports':       'linear-gradient(135deg,#4facfe,#00f2fe)',
    'Art':          'linear-gradient(135deg,#43e97b,#38f9d7)',
    'Technology':   'linear-gradient(135deg,#fa709a,#fee140)',
    'Drama':        'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    'Quiz':         'linear-gradient(135deg,#ffecd2,#fcb69f)',
    'Photography':  'linear-gradient(135deg,#30cfd0,#330867)',
    'Literature':   'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    'General':      'linear-gradient(135deg,#6a11cb,#2575fc)',
};

const STATUS_CONFIG = {
    SCHEDULED: { bg: 'warning',   label: '🗓 Scheduled' },
    ONGOING:   { bg: 'success',   label: '🔴 Live Now'  },
    COMPLETED: { bg: 'secondary', label: '✅ Completed'  },
};

const EventCard = ({ event, navigate }) => {
    const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS['General'];
    const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['SCHEDULED'];
    
    const isOngoing = event.status === 'ONGOING';
    const isLocked = event.is_result_locked;
    const canScore = isOngoing && !isLocked;

    const fmt = (dateStr) => dateStr
        ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    return (
        <Col md={6} xl={4} className="mb-4">
            <Card className="h-100 border-0 shadow-sm overflow-hidden"
                style={{ borderRadius: 14 }}>
                <div style={{
                    background: gradient,
                    height: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position:'absolute', top:-30, right:-30,
                        width:120, height:120, borderRadius:'50%',
                        background:'rgba(255,255,255,0.12)',
                    }}/>
                    <div style={{
                        position:'absolute', bottom:-40, right:40,
                        width:90, height:90, borderRadius:'50%',
                        background:'rgba(255,255,255,0.07)',
                    }}/>
                    <div>
                        <Badge bg={statusCfg.bg} style={{ fontSize: 11, padding: '4px 10px' }}>
                            {statusCfg.label}
                        </Badge>
                    </div>
                    <div>
                        <span style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                        }}>
                            {event.category} · {event.event_type}
                        </span>
                    </div>
                </div>

                <Card.Body className="p-3">
                    <h6 className="fw-bold mb-1" style={{
                        fontSize: 16, lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}>
                        {event.title}
                    </h6>
                    <div className="text-muted mb-3" style={{ fontSize: 12 }}>
                        📅 {fmt(event.event_date)} &nbsp; 📍 {event.location}
                    </div>

                    <div className="mt-auto">
                        {isLocked && (
                            <div className="text-center mb-2">
                                <Badge bg="dark" className="px-3 py-2" style={{ fontSize: 11 }}>🔒 Results Locked</Badge>
                            </div>
                        )}
                        <Button 
                            variant={canScore ? "primary" : "secondary"} 
                            className="w-100 rounded-pill"
                            style={{ 
                                background: canScore ? 'linear-gradient(135deg,#6a11cb,#2575fc)' : '#6c757d',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: 13
                            }}
                            disabled={!canScore}
                            onClick={() => navigate(`/judge/score/${event.id}`)}
                        >
                            {isLocked ? "Scoring Closed" : isOngoing ? "Score Now →" : `Upcoming Event`}
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Col>
    );
};

const JudgeDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAssignedEvents();
    }, []);

    const fetchAssignedEvents = async () => {
        try {
            const data = await getEvents();
            setEvents(data.map(e => ({ ...e, id: e.id || e._id })));
        } catch (err) {
            console.error("Failed to load events", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <h4 className="fw-bold mb-4" style={{ color: '#1a1a2e' }}>👨‍⚖️ Assigned Events</h4>
            
            {events.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: 14 }}>
                    <Card.Body>
                        <div style={{ fontSize: 56 }}>📭</div>
                        <h5 className="mt-3 text-muted fw-semibold">No events assigned yet</h5>
                    </Card.Body>
                </Card>
            ) : (
                <Row>
                    {events.map(event => (
                        <EventCard key={event.id} event={event} navigate={navigate} />
                    ))}
                </Row>
            )}
        </Container>
    );
};

export default JudgeDashboard;

