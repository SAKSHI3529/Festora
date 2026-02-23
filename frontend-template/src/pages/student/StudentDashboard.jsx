import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getMyRegistrations } from '../../api/registrations';
import { getEvents } from '../../api/events';
import { getMyTeams } from '../../api/registrations';
import { AuthContext } from '../../context/AuthContext';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, color, loading }) => (
    <Col xs={6} xl={3} className="mb-4">
        <Card className="shadow-sm h-100 py-2 border-0"
            style={{ borderLeft: `4px solid ${color}`, borderRadius: 12 }}>
            <Card.Body>
                <Row className="no-gutters align-items-center">
                    <Col>
                        <div style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 1 }}>
                            {label}
                        </div>
                        <div className="h4 mb-0 fw-bold mt-1">
                            {loading ? <Spinner size="sm" animation="border" /> : value}
                        </div>
                    </Col>
                    <Col className="col-auto">
                        <i className={`fas ${icon} fa-2x`} style={{ color, opacity: 0.3 }}></i>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    </Col>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const cfg = {
        PENDING:  { bg: 'warning', label: '⏳ Pending' },
        APPROVED: { bg: 'success', label: '✅ Approved' },
        REJECTED: { bg: 'danger',  label: '❌ Rejected' },
    };
    const c = cfg[status] || { bg: 'secondary', label: status };
    return <Badge bg={c.bg} style={{ fontSize: 11 }}>{c.label}</Badge>;
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate  = useNavigate();

    const [registrations, setRegistrations] = useState([]);
    const [events,        setEvents]         = useState({});
    const [myTeams,       setMyTeams]        = useState([]);
    const [loading,       setLoading]        = useState(true);

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    useEffect(() => {
        (async () => {
            try {
                const [regs, evts, teams] = await Promise.all([
                    getMyRegistrations(),
                    getEvents(),
                    getMyTeams(),
                ]);
                setRegistrations(regs);
                setMyTeams(teams);

                const evtMap = {};
                evts.forEach(e => { 
                    const normalized = { ...e, id: e.id || e._id };
                    evtMap[normalized.id] = normalized; 
                });
                setEvents(evtMap);
            } catch (err) {
                console.error('Dashboard fetch error', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const total     = registrations.length;
    const approved  = registrations.filter(r => r.status === 'APPROVED').length;
    const pending   = registrations.filter(r => r.status === 'PENDING').length;
    const teamCount = myTeams.length;

    const recent = [...registrations]
        .sort((a, b) => new Date(b.registered_at || 0) - new Date(a.registered_at || 0))
        .slice(0, 5);

    return (
        <Container fluid>
            {/* ── Greeting ── */}
            <div className="mb-4 d-flex align-items-center gap-3">
                <div
                    style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, color: '#fff', fontWeight: 700, flexShrink: 0,
                    }}
                >
                    {user?.full_name?.[0] || '?'}
                </div>
                <div>
                    <h4 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>
                        {greeting()}, {user?.full_name?.split(' ')[0]}! 👋
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                        Here's a summary of your activity on Festora.
                    </p>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <Row className="mb-4">
                <StatCard label="Total Registered" value={total} icon="fa-clipboard-list" color="#4e73df" loading={loading} />
                <StatCard label="Approved" value={approved} icon="fa-check-circle" color="#1cc88a" loading={loading} />
                <StatCard label="Pending" value={pending} icon="fa-hourglass-half" color="#f6c23e" loading={loading} />
                <StatCard label="Teams Joined" value={teamCount} icon="fa-users" color="#36b9cc" loading={loading} />
            </Row>

            <Row className="g-3">
                {/* ── Recent Registrations ── */}
                <Col lg={8}>
                    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <Card.Header
                            className="d-flex justify-content-between align-items-center"
                            style={{
                                background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                                borderRadius: '14px 14px 0 0',
                                padding: '16px 20px',
                            }}
                        >
                            <span className="text-white fw-bold">📝 Recent Registrations</span>
                            <Button
                                size="sm"
                                variant="light"
                                className="rounded-pill"
                                style={{ fontSize: 12 }}
                                onClick={() => navigate('/student/registrations')}
                            >
                                View All
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {loading ? (
                                <div className="text-center py-4">
                                    <Spinner animation="border" variant="primary" />
                                </div>
                            ) : recent.length === 0 ? (
                                <div className="text-center py-5 text-muted">
                                    <div style={{ fontSize: 40 }}>📭</div>
                                    <div className="mt-2">No registrations yet.</div>
                                </div>
                            ) : (
                                <div>
                                    {recent.map(reg => {
                                        const evt = events[reg.event_id];
                                        return (
                                            <div
                                                key={reg.id}
                                                className="d-flex align-items-center justify-content-between px-4 py-3"
                                                style={{ borderBottom: '1px solid #f1f1f1' }}
                                            >
                                                <div>
                                                    <div className="fw-semibold" style={{ fontSize: 14 }}>
                                                        {evt?.title || 'Unknown Event'}
                                                    </div>
                                                    <small className="text-muted">
                                                        {evt?.category} • {evt?.event_type}
                                                    </small>
                                                </div>
                                                <StatusBadge status={reg.status} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* ── Quick Actions ── */}
                <Col lg={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
                        <Card.Header style={{
                            background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                            borderRadius: '14px 14px 0 0',
                            padding: '16px 20px',
                        }}>
                            <span className="text-white fw-bold">⚡ Quick Actions</span>
                        </Card.Header>
                        <Card.Body className="d-flex flex-column gap-2 p-3">
                            {[
                                { label: '🔍 Browse Events',      path: '/student/events' },
                                { label: '📋 My Registrations',   path: '/student/registrations' },
                                { label: '🏆 Event Results',      path: '/student/results' },
                                { label: '🎓 My Certificates',    path: '/student/certificates' },
                            ].map(item => (
                                <Button
                                    key={item.path}
                                    variant="outline-primary"
                                    className="rounded-pill text-start"
                                    style={{ fontSize: 13, borderColor: '#6a11cb', color: '#6a11cb' }}
                                    onClick={() => navigate(item.path)}
                                >
                                    {item.label}
                                </Button>
                            ))}

                            {/* Student info */}
                            <div className="mt-auto pt-3" style={{ borderTop: '1px solid #f1f1f1' }}>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>Registration No.</div>
                                <div className="fw-bold" style={{ fontSize: 14, color: '#6a11cb' }}>
                                    {user?.registration_number || '—'}
                                </div>
                                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Department</div>
                                <div className="fw-semibold" style={{ fontSize: 14 }}>
                                    {user?.department || '—'}
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default StudentDashboard;
