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

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon, gradient, loading }) => (
    <Card className="border-0 shadow-sm h-100" style={{ borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: gradient, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', top: -24, right: -24,
                width: 100, height: 100, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
            }} />
            <div style={{ fontSize: 32 }}>{icon}</div>
            <div className="text-white fw-bold mt-2" style={{ fontSize: 32, lineHeight: 1 }}>
                {loading ? <Spinner size="sm" animation="border" /> : value}
            </div>
            <div className="text-white-50 mt-1" style={{ fontSize: 13 }}>{label}</div>
        </div>
    </Card>
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
    const statusCfg = {
        SCHEDULED: { color: '#6a11cb', label: '🗓 Scheduled' },
        ONGOING:   { color: '#11998e', label: '🔴 Live'      },
        COMPLETED: { color: '#6c757d', label: '✅ Done'       },
    };
    const sc = statusCfg[event.status] || { color: '#6c757d', label: event.status };

    return (
        <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden', transition: 'transform .15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            {/* Gradient header */}
            <div style={{
                background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                padding: '18px 20px',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: -20, right: -20,
                    width: 90, height: 90, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                }} />
                <div className="d-flex justify-content-between align-items-start">
                    <div className="text-white fw-bold" style={{ fontSize: 15 }}>{event.title}</div>
                    <Badge
                        style={{ background: sc.color, fontSize: 11, fontWeight: 600, flexShrink: 0 }}
                        className="ms-2"
                    >
                        {sc.label}
                    </Badge>
                </div>
                <div className="text-white-50 mt-1" style={{ fontSize: 12 }}>
                    {event.category} · {event.event_type}
                </div>
            </div>

            <Card.Body className="d-flex flex-column p-3">
                <div className="text-muted mb-3" style={{ fontSize: 12 }}>
                    📅 {new Date(event.event_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                    &nbsp; 📍 {event.location}
                </div>

                <div className="d-grid gap-2 mt-auto">
                    <Button
                        size="sm" className="rounded-pill"
                        style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)', border: 'none', fontSize: 12 }}
                        onClick={() => navigate(`/faculty/approvals/${event.id}`)}
                    >
                        📋 Approvals & Registrations
                    </Button>
                    <Button
                        size="sm" variant="outline-success" className="rounded-pill" style={{ fontSize: 12 }}
                        onClick={() => navigate(`/faculty/attendance/${event.id}`)}
                    >
                        📍 Attendance
                    </Button>
                    <Button
                        size="sm" variant="outline-primary" className="rounded-pill" style={{ fontSize: 12 }}
                        onClick={() => onViewParticipants(event)}
                    >
                        👥 View Participants
                    </Button>
                    <Button
                        size="sm" variant="outline-dark" className="rounded-pill" style={{ fontSize: 12 }}
                        onClick={() => navigate(`/events/${event.id}`)}
                    >
                         🔗 View Full Details
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
            <Row className="mb-4 g-3">
                <Col xs={6} xl={3}>
                    <StatCard label="Assigned Events"  value={events.length}    icon="📅" gradient="linear-gradient(135deg,#6a11cb,#2575fc)" loading={loading} />
                </Col>
                <Col xs={6} xl={3}>
                    <StatCard label="Pending Approvals" value={pendingRegs}     icon="⏳" gradient="linear-gradient(135deg,#f093fb,#f5576c)" loading={loading} />
                </Col>
                <Col xs={6} xl={3}>
                    <StatCard label="Approved"          value={approvedRegs}    icon="✅" gradient="linear-gradient(135deg,#11998e,#38ef7d)" loading={loading} />
                </Col>
                <Col xs={6} xl={3}>
                    <StatCard label="Pending Budgets"   value={pendingBudgets}  icon="💰" gradient="linear-gradient(135deg,#fa709a,#fee140)" loading={loading} />
                </Col>
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
