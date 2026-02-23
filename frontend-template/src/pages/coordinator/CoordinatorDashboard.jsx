import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

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

const CoordinatorDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getEvents(); // Backend filters for Coordinator
            setEvents(data.map(e => ({ ...e, id: e.id || e._id })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fmt = (dateStr) => dateStr
        ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="mb-4">
                <h4 className="fw-bold mb-0">👨‍ COORDINATOR DASHBOARD</h4>
                <p className="text-muted small">Manage and assist with your assigned events</p>
            </div>

            {events.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: 14 }}>
                    <Card.Body>
                        <div style={{ fontSize: 56 }}>📭</div>
                        <h5 className="mt-3 text-muted fw-semibold">No Shared Events</h5>
                        <p className="text-muted small">You haven't been assigned as a coordinator to any events yet.</p>
                    </Card.Body>
                </Card>
            ) : (
                <Row className="g-4">
                    {events.map(event => {
                        const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS['General'];
                        const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['SCHEDULED'];
                        
                        return (
                            <Col md={6} xl={4} key={event.id}>
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

                                    <Card.Body className="p-3 d-flex flex-column">
                                        <h6 className="fw-bold mb-2" style={{
                                            fontSize: 16, lineHeight: 1.3,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}>
                                            {event.title}
                                        </h6>
                                        <div className="text-muted mb-3" style={{ fontSize: 12 }}>
                                            <div className="mb-1">📅 {fmt(event.event_date)}</div>
                                            <div>📍 {event.location}</div>
                                        </div>

                                        <div className="d-grid gap-2 mt-auto">
                                            <Button 
                                                variant="outline-primary" 
                                                className="rounded-pill" 
                                                size="sm"
                                                style={{ fontSize: 12, fontWeight: 600 }}
                                                onClick={() => navigate(`/coordinator/events/${event.id}/participants`)}
                                            >
                                                👥 View Participants
                                            </Button>
                                            <Button 
                                                variant="outline-success" 
                                                className="rounded-pill" 
                                                size="sm"
                                                style={{ fontSize: 12, fontWeight: 600 }}
                                                onClick={() => navigate(`/faculty/attendance/${event.id}`)}
                                            >
                                                📝 Mark Attendance
                                            </Button>
                                            <Button 
                                                variant="outline-dark" 
                                                className="rounded-pill" 
                                                size="sm"
                                                style={{ fontSize: 12 }}
                                                onClick={() => navigate(`/events/${event.id}`)}
                                            >
                                                🔗 Event Details
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

export default CoordinatorDashboard;

