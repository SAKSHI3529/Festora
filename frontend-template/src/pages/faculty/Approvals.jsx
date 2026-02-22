import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Badge, Button, Table,
    Tab, Tabs, Modal, Alert, Spinner, Form
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventParticipants, approveRegistration, rejectRegistration } from '../../api/registrations';
import { getEventTeams, approveTeam, rejectTeam } from '../../api/teams';
import { getEvents } from '../../api/events';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const cfg = {
        PENDING:  { bg: 'warning',   label: '⏳ Pending'  },
        APPROVED: { bg: 'success',   label: '✅ Approved' },
        REJECTED: { bg: 'danger',    label: '❌ Rejected' },
    };
    const c = cfg[status] || { bg: 'secondary', label: status };
    return <Badge bg={c.bg} pill style={{ fontSize: 11 }}>{c.label}</Badge>;
};

const CountBadge = ({ count, variant = 'warning' }) => (
    <Badge bg={variant} pill className="ms-2" style={{ fontSize: 11 }}>{count}</Badge>
);

// ─── Confirmation Modal ────────────────────────────────────────────────────────
const ConfirmModal = ({ show, onHide, onConfirm, action, name, loading }) => (
    <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton style={{ borderBottom: '2px solid #f1f1f1' }}>
            <Modal.Title style={{ fontSize: 17 }}>
                {action === 'approve' ? '✅ Confirm Approval' : '❌ Confirm Rejection'}
            </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4 text-center">
            <div style={{ fontSize: 40, marginBottom: 12 }}>
                {action === 'approve' ? '🎉' : '🚫'}
            </div>
            <p style={{ fontSize: 15 }}>
                Are you sure you want to <strong>{action}</strong>
                {name ? <> &nbsp;<em>"{name}"</em></> : ' this'}?
            </p>
            {action === 'reject' && (
                <p className="text-muted" style={{ fontSize: 12 }}>
                    This action cannot be undone. The participant will be notified.
                </p>
            )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '2px solid #f1f1f1' }}>
            <Button variant="outline-secondary" className="rounded-pill" onClick={onHide} disabled={loading}>
                Cancel
            </Button>
            <Button
                variant={action === 'approve' ? 'success' : 'danger'}
                className="rounded-pill px-4"
                onClick={onConfirm}
                disabled={loading}
            >
                {loading ? <Spinner size="sm" animation="border" /> : (
                    action === 'approve' ? '✅ Approve' : '❌ Reject'
                )}
            </Button>
        </Modal.Footer>
    </Modal>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const Approvals = () => {
    const { eventId } = useParams();
    const navigate    = useNavigate();

    const [participants, setParticipants] = useState([]);
    const [teams,        setTeams]         = useState([]);
    const [eventTitle,   setEventTitle]    = useState('');
    const [loading,      setLoading]       = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [alert,        setAlert]         = useState(null);
    const [searchTerm,   setSearchTerm]    = useState('');

    // Confirmation modal state
    const [confirm, setConfirm] = useState({ show: false, type: '', id: '', action: '', name: '' });

    useEffect(() => { fetchData(); }, [eventId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [partData, teamData, eventsData] = await Promise.all([
                getEventParticipants(eventId),
                getEventTeams(eventId),
                getEvents(),
            ]);
            setParticipants(partData);
            setTeams(teamData);
            const evt = eventsData.map(e => ({ ...e, id: e.id || e._id })).find(e => e.id === eventId);
            setEventTitle(evt?.title || 'Event');
        } catch (err) {
            setAlert({ variant: 'danger', msg: 'Failed to load data. Please refresh.' });
        } finally {
            setLoading(false);
        }
    };

    const openConfirm = (type, id, action, name) => {
        setConfirm({ show: true, type, id, action, name });
    };

    const handleConfirm = async () => {
        const { type, id, action } = confirm;
        setActionLoading(true);
        try {
            if (type === 'registration') {
                if (action === 'approve') await approveRegistration(id);
                else await rejectRegistration(id);
            } else if (type === 'team') {
                if (action === 'approve') await approveTeam(id);
                else await rejectTeam(id);
            }
            setAlert({ variant: 'success', msg: `Successfully ${action}d!` });
            setConfirm({ show: false });
            fetchData();
        } catch (err) {
            setAlert({ variant: 'danger', msg: err.response?.data?.detail || 'Action failed.' });
            setConfirm({ show: false });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
            <Spinner animation="border" variant="primary" />
        </Container>
    );

    // Derive lists
    const soloRegs  = participants.filter(p => p.status === 'PENDING' && !p.team_id);
    const groupRegs = participants.filter(p => p.status === 'PENDING' && p.team_id);
    const allRegs   = participants; // for showing all statuses
    const pendingTeams = teams.filter(t => t.status === 'PENDING');

    // Search filter helper
    const searched = (list) => searchTerm.trim()
        ? list.filter(p =>
            (p.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.registration_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.department || '').toLowerCase().includes(searchTerm.toLowerCase())
          )
        : list;

    // Table header style
    const thStyle = { color: '#fff', fontWeight: 600, border: 0, padding: '13px 16px', background: 'transparent' };

    const RegistrationTable = ({ regs, emptyMsg, mode = 'solo' }) => (
        <Table responsive hover className="mb-0 align-middle">
            <thead style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)' }}>
                <tr>
                    <th style={thStyle}>Student</th>
                    <th style={thStyle}>Reg. No</th>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>{mode === 'group' ? 'Team Name' : 'Type'}</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Actions</th>
                </tr>
            </thead>
            <tbody>
                {searched(regs).length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                            <div style={{ fontSize: 36 }}>📭</div>
                            <div className="mt-2">{emptyMsg}</div>
                        </td>
                    </tr>
                ) : searched(regs).map(reg => (
                    <tr key={reg.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ paddingLeft: 16, fontWeight: 600, fontSize: 14 }}>
                            {reg.student_name || '—'}
                        </td>
                        <td><small className="text-muted">{reg.registration_number || '—'}</small></td>
                        <td><small>{reg.department || '—'}</small></td>
                        <td>
                            {mode === 'group' ? (
                                <Badge bg="primary" style={{ fontSize: 11 }}>
                                    👥 {reg.team_name || 'Group'}
                                </Badge>
                            ) : (
                                <Badge bg={reg.team_id ? 'primary' : 'info'} style={{ fontSize: 11 }}>
                                    {reg.team_id ? '👥 Group' : '👤 Solo'}
                                </Badge>
                            )}
                        </td>
                        <td><StatusBadge status={reg.status} /></td>
                        <td>
                            {reg.status === 'PENDING' ? (
                                <div className="d-flex gap-2">
                                    <Button
                                        variant="success" size="sm" className="rounded-pill px-3"
                                        onClick={() => {
                                            if (reg.team_id) {
                                                openConfirm('team', reg.team_id, 'approve', `Team "${reg.team_name}"`);
                                            } else {
                                                openConfirm('registration', reg.id, 'approve', reg.student_name);
                                            }
                                        }}
                                    >✅ Approve</Button>
                                    <Button
                                        variant="outline-danger" size="sm" className="rounded-pill px-3"
                                        onClick={() => {
                                            if (reg.team_id) {
                                                openConfirm('team', reg.team_id, 'reject', `Team "${reg.team_name}"`);
                                            } else {
                                                openConfirm('registration', reg.id, 'reject', reg.student_name);
                                            }
                                        }}
                                    >❌ Reject</Button>
                                </div>
                            ) : (
                                <span className="text-muted" style={{ fontSize: 12 }}>No action needed</span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    );

    return (
        <Container fluid>
            {/* ── Header ── */}
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                <div>
                    <h4 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>📋 Approvals</h4>
                    <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                        <span className="fw-semibold" style={{ color: '#6a11cb' }}>{eventTitle}</span>
                        &nbsp;— Manage registrations and team approvals
                    </p>
                </div>
                <Button variant="outline-secondary" className="rounded-pill" size="sm" onClick={() => navigate(-1)}>
                    ← Back
                </Button>
            </div>

            {/* ── Alert ── */}
            {alert && (
                <Alert
                    variant={alert.variant} dismissible className="mb-3"
                    onClose={() => setAlert(null)}
                >
                    {alert.msg}
                </Alert>
            )}

            {/* ── Search bar ── */}
            <Row className="mb-3">
                <Col md={5}>
                    <Form.Control
                        placeholder="🔍 Search by name, reg. no or department…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="rounded-pill border-0 shadow-sm"
                        style={{ fontSize: 13 }}
                    />
                </Col>
            </Row>

            {/* ── Stats row ── */}
            <Row className="mb-4 g-3">
                {[
                    { label: 'Solo Pending',  val: soloRegs.length,    icon: '👤', grad: 'linear-gradient(135deg,#6a11cb,#2575fc)' },
                    { label: 'Group Pending', val: groupRegs.length,   icon: '👥', grad: 'linear-gradient(135deg,#f093fb,#f5576c)' },
                    { label: 'Teams Pending', val: pendingTeams.length, icon: '🏷',  grad: 'linear-gradient(135deg,#fa709a,#fee140)' },
                    { label: 'Total Regs',    val: allRegs.length,     icon: '📋', grad: 'linear-gradient(135deg,#11998e,#38ef7d)' },
                ].map(s => (
                    <Col xs={6} lg={3} key={s.label}>
                        <Card className="border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
                            <div style={{ background: s.grad, padding: '14px 18px' }}>
                                <div style={{ fontSize: 26 }}>{s.icon}</div>
                                <div className="text-white fw-bold mt-1" style={{ fontSize: 26 }}>{s.val}</div>
                                <div className="text-white-50" style={{ fontSize: 12 }}>{s.label}</div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* ── Tabs ── */}
            <Card className="border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
                <Tabs defaultActiveKey="solo" className="px-3 pt-2" style={{ borderBottom: '2px solid #f1f1f1' }}>
                    {/* Solo Registrations */}
                    <Tab
                        eventKey="solo"
                        title={<>👤 Solo Registrations <CountBadge count={soloRegs.length} /></>}
                    >
                        <RegistrationTable regs={soloRegs} emptyMsg="No pending solo registrations." />
                    </Tab>

                    {/* Group Registrations */}
                    <Tab
                        eventKey="group"
                        title={<>👥 Group Registrations <CountBadge count={groupRegs.length} /></>}
                    >
                        <RegistrationTable regs={groupRegs} emptyMsg="No pending group registrations." mode="group" />
                    </Tab>

                    {/* Teams */}
                    <Tab
                        eventKey="teams"
                        title={<>🏷 Teams <CountBadge count={pendingTeams.length} /></>}
                    >
                        <Table responsive hover className="mb-0 align-middle">
                            <thead style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)' }}>
                                <tr>
                                    <th style={thStyle}>Team Name</th>
                                    <th style={thStyle}>Leader</th>
                                    <th style={thStyle}>Members</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingTeams.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-5 text-muted">
                                            <div style={{ fontSize: 36 }}>📭</div>
                                            <div className="mt-2">No pending teams.</div>
                                        </td>
                                    </tr>
                                ) : pendingTeams.map(team => (
                                    <tr key={team.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ paddingLeft: 16, fontWeight: 600, fontSize: 14 }}>
                                            {team.team_name}
                                        </td>
                                        <td>
                                            <small className="text-muted">{team.leader_name || team.leader_id}</small>
                                        </td>
                                        <td>
                                            <Badge bg="info" pill>{team.member_ids?.length || 0} members</Badge>
                                        </td>
                                        <td><StatusBadge status={team.status} /></td>
                                        <td>
                                            <div className="d-flex gap-2">
                                                <Button
                                                    variant="success" size="sm" className="rounded-pill px-3"
                                                    onClick={() => openConfirm('team', team.id, 'approve', team.team_name)}
                                                >✅ Approve</Button>
                                                <Button
                                                    variant="outline-danger" size="sm" className="rounded-pill px-3"
                                                    onClick={() => openConfirm('team', team.id, 'reject', team.team_name)}
                                                >❌ Reject</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Tab>

                    {/* All Registrations (audit view) */}
                    <Tab eventKey="all" title={<>📄 All <CountBadge count={allRegs.length} variant="secondary" /></>}>
                        <RegistrationTable regs={allRegs} emptyMsg="No registrations for this event." />
                    </Tab>
                </Tabs>
            </Card>

            {/* ── Confirmation Modal ── */}
            <ConfirmModal
                show={confirm.show}
                onHide={() => setConfirm({ show: false })}
                onConfirm={handleConfirm}
                action={confirm.action}
                name={confirm.name}
                loading={actionLoading}
            />
        </Container>
    );
};

export default Approvals;
