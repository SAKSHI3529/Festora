import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../../api/admin';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

// Category → gradient mapping (keeps cards visually distinct)
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

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const [statsData, eventsData] = await Promise.all([
                    getDashboardStats(),
                    getEvents(),
                ]);
                setStats(statsData);
                setEvents(eventsData);
            } catch (err) {
                setError('Failed to load dashboard.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (error)   return <div className="alert alert-danger m-4">{error}</div>;

    const StatCard = ({ title, count, icon, color }) => (
        <Col md={3} className="mb-4">
            <Card className="shadow h-100 py-2 border-0"
                style={{ borderLeft: `4px solid ${color}`, borderRadius: 12 }}>
                <Card.Body>
                    <Row className="no-gutters align-items-center">
                        <Col>
                            <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {title}
                            </div>
                            <div className="h4 mb-0 fw-bold mt-1">{count}</div>
                        </Col>
                        <Col className="col-auto">
                            <i className={`fas ${icon} fa-2x`} style={{ color, opacity: 0.3 }}></i>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </Col>
    );

    const fmt = (dateStr) => dateStr
        ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    const EventCard = ({ event }) => {
        const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS['General'];
        const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['SCHEDULED'];

        return (
            <Col md={6} xl={4} className="mb-4">
                <Card className="h-100 border-0 shadow-sm overflow-hidden"
                    style={{ borderRadius: 14 }}>
                    {/* Background image / gradient hero */}
                    <div style={{
                        background: gradient,
                        height: 160,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Decorative circles */}
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
                        {/* Status badge */}
                        <div>
                            <Badge bg={statusCfg.bg} style={{ fontSize: 11, padding: '4px 10px' }}>
                                {statusCfg.label}
                            </Badge>
                        </div>
                        {/* Category */}
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

                    {/* Card Body */}
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
                        <p className="text-muted mb-2" style={{
                            fontSize: 12,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                        }}>
                            {event.description}
                        </p>
                    </Card.Body>

                    {/* Footer with date + button */}
                    <Card.Footer className="bg-white border-top-0 px-3 pb-3 pt-0">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    Event Date
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                    📅 {fmt(event.event_date)}
                                </div>
                                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                                    📍 {event.location}
                                </div>
                            </div>
                            <Button
                                size="sm"
                                style={{
                                    background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                                    border: 'none',
                                    borderRadius: 20,
                                    padding: '6px 16px',
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                                onClick={() => navigate(`/events/${event.id}`)}
                            >
                                Details →
                            </Button>
                        </div>
                    </Card.Footer>
                </Card>
            </Col>
        );
    };

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">Admin Dashboard</h1>

            {/* Stat Cards */}
            <Row>
                <StatCard title="Total Users"     count={stats?.total_users || 0}         icon="fa-users"         color="#4e73df" />
                <StatCard title="Total Events"    count={stats?.total_events || 0}         icon="fa-calendar"      color="#1cc88a" />
                <StatCard title="Active Events"   count={stats?.active_events || 0}         icon="fa-bolt"          color="#e74a3b" />
                <StatCard title="Registrations"   count={stats?.total_registrations || 0}  icon="fa-clipboard-list" color="#36b9cc" />
                <StatCard title="Pending Budgets" count={stats?.pending_budgets || 0}       icon="fa-cash-register" color="#f6c23e" />
                <StatCard title="Results Locked"  count={stats?.locked_results || 0}        icon="fa-lock"          color="#5a5c69" />
            </Row>

            {/* Events Section */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-semibold mb-0">🎪 Events</h5>
                <Button variant="outline-primary" size="sm"
                    onClick={() => navigate('/admin/events')}>
                    Manage All Events →
                </Button>
            </div>

            {events.length === 0 ? (
                <div className="text-center text-muted py-5">
                    <p>No events yet. <a href="/admin/events">Create your first event</a>.</p>
                </div>
            ) : (
                <Row>
                    {events.map(ev => <EventCard key={ev.id} event={ev} />)}
                </Row>
            )}
        </Container>
    );
};

export default AdminDashboard;
