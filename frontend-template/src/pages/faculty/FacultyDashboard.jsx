import React, { useEffect, useState, useContext } from 'react';
import {
    Container, Row, Col, Card, Badge, Button, Modal,
    Table, Form, Spinner, Alert
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents, getParticipants } from '../../api/events';
import { getEventParticipants } from '../../api/registrations';
import { getBudgets } from '../../api/budgets';
import { AuthContext } from '../../context/AuthContext';

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

// ─── Participants Modal ────────────────────────────────────────────────────────
const ParticipantsModal = ({ show, onHide, event }) => {
    const [participants, setParticipants] = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [search,       setSearch]       = useState('');
    const [filterDept,   setFilterDept]   = useState('ALL');

    useEffect(() => {
        if (!show || !event) return;
        setLoading(true);
        setSearch('');
        setFilterDept('ALL');
        getEventParticipants(event.id)
            .then(data => setParticipants(data))
            .catch(() => setParticipants([]))
            .finally(() => setLoading(false));
    }, [show, event]);

    const departments = [...new Set(participants.map(p => p.department).filter(Boolean))];

    const displayed = participants.filter(p => {
        const matchSearch = !search.trim() ||
            (p.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.registration_number || '').toLowerCase().includes(search.toLowerCase());
        const matchDept = filterDept === 'ALL' || p.department === filterDept;
        return matchSearch && matchDept;
    });

    const StatusBadge = ({ status }) => {
        const cfg = { PENDING: ['warning','⏳'], APPROVED: ['success','✅'], REJECTED: ['danger','❌'] };
        const [bg, icon] = cfg[status] || ['secondary', '?'];
        return <Badge bg={bg} pill style={{ fontSize: 10 }}>{icon} {status}</Badge>;
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)', borderRadius: '8px 8px 0 0' }}>
                <Modal.Title className="text-white" style={{ fontSize: 16 }}>
                    👥 Participants — {event?.title}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="p-3 border-bottom d-flex gap-2 flex-wrap">
                    <Form.Control
                        placeholder="🔍 Search by name or reg. no…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        size="sm"
                        className="rounded-pill border-0 bg-light"
                        style={{ maxWidth: 260, fontSize: 13 }}
                    />
                    <Form.Select
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        size="sm"
                        className="rounded-pill border-0 bg-light"
                        style={{ maxWidth: 200, fontSize: 13 }}
                    >
                        <option value="ALL">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </Form.Select>
                    <Badge bg="secondary" className="align-self-center" style={{ fontSize: 11 }}>
                        {displayed.length} / {participants.length}
                    </Badge>
                </div>

                {loading ? (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" />
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                        <div style={{ fontSize: 40 }}>📭</div>
                        <div className="mt-2">No participants found.</div>
                    </div>
                ) : (
                    <Table responsive hover className="mb-0 align-middle">
                        <thead style={{ background: '#f8f9fc' }}>
                            <tr>
                                <th style={{ paddingLeft: 20, fontSize: 13 }}>Participant</th>
                                <th style={{ fontSize: 13 }}>Reg. No</th>
                                <th style={{ fontSize: 13 }}>Department</th>
                                <th style={{ fontSize: 13 }}>Team</th>
                                <th style={{ fontSize: 13 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                    <td style={{ paddingLeft: 20, fontSize: 13, fontWeight: 600 }}>
                                        {p.student_name || '—'}
                                    </td>
                                    <td><small className="text-muted">{p.registration_number || '—'}</small></td>
                                    <td><small>{p.department || '—'}</small></td>
                                    <td>
                                        {p.team_name
                                            ? <Badge bg="info" style={{ fontSize: 10 }}>👥 {p.team_name}</Badge>
                                            : <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                                        }
                                    </td>
                                    <td><StatusBadge status={p.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Modal.Body>
            <Modal.Footer style={{ borderTop: '1px solid #f1f1f1' }}>
                <Button variant="outline-secondary" className="rounded-pill" size="sm" onClick={onHide}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

// ─── Event Card ────────────────────────────────────────────────────────────────
const EventCard = ({ event, onViewParticipants, navigate }) => {
    const gradient = CATEGORY_GRADIENTS[event.category] || CATEGORY_GRADIENTS['General'];
    const statusCfg = STATUS_CONFIG[event.status] || STATUS_CONFIG['SCHEDULED'];

    const fmt = (dateStr) => dateStr
        ? new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

    return (
        <Card className="h-100 border-0 shadow-sm overflow-hidden"
            style={{ borderRadius: 14 }}>
            {/* Background image / gradient hero */}
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
                <div className="d-flex justify-content-between align-items-start">
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
                <div className="text-muted mb-3" style={{ fontSize: 12 }}>
                    📅 {fmt(event.event_date)} &nbsp; 📍 {event.location}
                </div>

                <div className="d-grid gap-2 mt-auto">
                    <Button
                        size="sm" className="rounded-pill"
                        style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)', border: 'none', fontSize: 11 }}
                        onClick={() => navigate(`/faculty/approvals/${event.id}`)}
                    >
                        📋 Approvals
                    </Button>
                    <div className="d-flex gap-2">
                        <Button
                            size="sm" variant="outline-success" className="rounded-pill w-100" style={{ fontSize: 11 }}
                            onClick={() => navigate(`/faculty/attendance/${event.id}`)}
                        >
                            📍 Attendance
                        </Button>
                        <Button
                            size="sm" variant="outline-primary" className="rounded-pill w-100" style={{ fontSize: 11 }}
                            onClick={() => onViewParticipants(event)}
                        >
                            👥 Participants
                        </Button>
                    </div>
                    <Button
                        size="sm" variant="outline-dark" className="rounded-pill" style={{ fontSize: 11 }}
                        onClick={() => navigate(`/events/${event.id}`)}
                    >
                         🔗 Full Details
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const FacultyDashboard = () => {
    const { user }  = useContext(AuthContext);
    const navigate  = useNavigate();

    const [events,        setEvents]        = useState([]);
    const [allRegs,       setAllRegs]       = useState([]); // all regs across events
    const [budgets,       setBudgets]       = useState([]);
    const [loading,       setLoading]       = useState(true);
    const [error,         setError]         = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showParticipants, setShowParticipants] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eventsData, budgetsData] = await Promise.all([
                getEvents(),
                getBudgets().catch(() => []),
            ]);
            setEvents(eventsData.map(e => ({ ...e, id: e.id || e._id })));
            setBudgets(budgetsData);

            // Fetch participants for all events to count pending regs
            const regArrays = await Promise.all(
                eventsData.map(e => getEventParticipants(e.id || e._id).catch(() => []))
            );
            setAllRegs(regArrays.flat());
        } catch (err) {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    const pendingRegs   = allRegs.filter(r => r.status === 'PENDING').length;
    const approvedRegs  = allRegs.filter(r => r.status === 'APPROVED').length;
    const pendingBudgets = budgets.filter(b => b.status === 'PENDING').length;

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const handleViewParticipants = (event) => {
        setSelectedEvent(event);
        setShowParticipants(true);
    };

    return (
        <Container fluid>
            {/* ── Greeting ── */}
            <div className="mb-4 d-flex align-items-center gap-3">
                <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#fff', fontWeight: 700, flexShrink: 0,
                }}>
                    {user?.full_name?.[0] || 'F'}
                </div>
                <div>
                    <h4 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>
                        {greeting()}, {user?.full_name?.split(' ')[0]}! 👋
                    </h4>
                    <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                        Faculty Dashboard — manage approvals, attendance and budgets.
                    </p>
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            {/* ── Stat Cards ── */}
            <Row className="mb-4">
                <StatCard label="Assigned Events"  value={events.length}    icon="fa-calendar-check" color="#4e73df" loading={loading} />
                <StatCard label="Pending Approvals" value={pendingRegs}     icon="fa-user-clock" color="#f6c23e" loading={loading} />
                <StatCard label="Approved Students" value={approvedRegs}    icon="fa-user-check" color="#1cc88a" loading={loading} />
                <StatCard label="Pending Budgets"   value={pendingBudgets}  icon="fa-wallet" color="#e74a3b" loading={loading} />
            </Row>

            {/* ── Quick Actions ── */}
            <div className="d-flex gap-2 mb-4 flex-wrap">
                <Button
                    className="rounded-pill"
                    style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)', border: 'none', fontSize: 13 }}
                    onClick={() => navigate('/faculty/budgets')}
                >
                    💰 Manage Budgets
                </Button>
            </div>

            {/* ── Events Grid ── */}
            <div className="mb-3">
                <h5 className="fw-bold" style={{ color: '#1a1a2e' }}>📅 My Assigned Events</h5>
            </div>

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : events.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: 14 }}>
                    <Card.Body>
                        <div style={{ fontSize: 56 }}>📭</div>
                        <h5 className="mt-3 text-muted fw-semibold">No Events Assigned</h5>
                        <p className="text-muted" style={{ fontSize: 14 }}>
                            You have no events assigned to you yet.
                        </p>
                    </Card.Body>
                </Card>
            ) : (
                <Row className="g-3">
                    {events.map(event => (
                        <Col key={event.id} md={6} xl={4}>
                            <EventCard
                                event={event}
                                navigate={navigate}
                                onViewParticipants={handleViewParticipants}
                            />
                        </Col>
                    ))}
                </Row>
            )}

            {/* ── Participants Modal (Phase 3) ── */}
            <ParticipantsModal
                show={showParticipants}
                onHide={() => setShowParticipants(false)}
                event={selectedEvent}
            />
        </Container>
    );
};

export default FacultyDashboard;
