import React, { useEffect, useState } from 'react';
import {
    Container, Card, Row, Col, Badge, Button, Table,
    Alert, Spinner, ProgressBar, Form
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getParticipants, markAttendance, getAttendance } from '../../api/events';
import { getEvents } from '../../api/events';

// ─── Summary Bar ──────────────────────────────────────────────────────────────
const SummaryBar = ({ total, present, absent }) => {
    const notMarked   = total - present - absent;
    const presentPct  = total > 0 ? Math.round((present / total) * 100) : 0;
    const absentPct   = total > 0 ? Math.round((absent  / total) * 100) : 0;

    return (
        <Row className="mb-4 g-3">
            {[
                { label: 'Total',      val: total,     icon: '📋', grad: 'linear-gradient(135deg,#6a11cb,#2575fc)' },
                { label: 'Present',    val: present,   icon: '✅', grad: 'linear-gradient(135deg,#11998e,#38ef7d)' },
                { label: 'Absent',     val: absent,    icon: '❌', grad: 'linear-gradient(135deg,#f5576c,#f093fb)' },
                { label: 'Not Marked', val: notMarked, icon: '❓', grad: 'linear-gradient(135deg,#fa709a,#fee140)' },
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

            {/* Progress bar */}
            <Col xs={12}>
                <Card className="border-0 shadow-sm" style={{ borderRadius: 12 }}>
                    <Card.Body className="py-3 px-4">
                        <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}>
                            <span className="text-success fw-semibold">Present: {presentPct}%</span>
                            <span className="text-danger fw-semibold">Absent: {absentPct}%</span>
                        </div>
                        <ProgressBar style={{ height: 10, borderRadius: 10 }}>
                            <ProgressBar variant="success" now={presentPct} key={1} />
                            <ProgressBar variant="danger"  now={absentPct}  key={2} />
                        </ProgressBar>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Attendance = () => {
    const { eventId } = useParams();
    const navigate    = useNavigate();

    const [participants,   setParticipants]   = useState([]);
    const [attendanceLog,  setAttendanceLog]  = useState({}); // { student_id: 'PRESENT'|'ABSENT' }
    const [eventTitle,     setEventTitle]     = useState('');
    const [loading,        setLoading]        = useState(true);
    const [markingId,      setMarkingId]      = useState(null); // currently being saved
    const [alert,          setAlert]          = useState(null);
    const [searchTerm,     setSearchTerm]     = useState('');
    const [filterDept,     setFilterDept]     = useState('ALL');

    useEffect(() => { fetchData(); }, [eventId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [parts, atts, eventsData] = await Promise.all([
                getParticipants(eventId),
                getAttendance(eventId),
                getEvents(),
            ]);

            // Only APPROVED participants
            const approved = parts.filter(p => p.status === 'APPROVED');
            setParticipants(approved);

            // Map attendance: key by student_id
            const log = {};
            atts.forEach(a => { log[a.student_id] = a.status; });
            setAttendanceLog(log);

            const evt = eventsData.map(e => ({ ...e, id: e.id || e._id })).find(e => e.id === eventId);
            setEventTitle(evt?.title || 'Event');
        } catch (err) {
            setAlert({ variant: 'danger', msg: 'Failed to load attendance data.' });
        } finally {
            setLoading(false);
        }
    };

    const handleMark = async (studentId, status) => {
        setMarkingId(studentId);
        // Optimistic update
        setAttendanceLog(prev => ({ ...prev, [studentId]: status }));
        try {
            await markAttendance(eventId, studentId, status);
        } catch (err) {
            // Revert on failure
            setAttendanceLog(prev => {
                const next = { ...prev };
                delete next[studentId];
                return next;
            });
            setAlert({ variant: 'danger', msg: 'Failed to save attendance. Please try again.' });
        } finally {
            setMarkingId(null);
        }
    };

    const handleMarkAll = async (status) => {
        const pending = participants.filter(p => !attendanceLog[p.student_id]);
        if (pending.length === 0) {
            setAlert({ variant: 'info', msg: 'All participants already have attendance marked.' });
            return;
        }
        for (const p of pending) {
            await handleMark(p.student_id, status);
        }
        setAlert({ variant: 'success', msg: `Marked ${pending.length} participants as ${status}.` });
    };

    if (loading) return (
        <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
            <Spinner animation="border" variant="primary" />
        </Container>
    );

    // Stats
    const total   = participants.length;
    const present = participants.filter(p => attendanceLog[p.student_id] === 'PRESENT').length;
    const absent  = participants.filter(p => attendanceLog[p.student_id] === 'ABSENT').length;

    // Filter helpers
    const departments = [...new Set(participants.map(p => p.department).filter(Boolean))];

    const displayed = participants.filter(p => {
        const matchSearch = !searchTerm.trim() ||
            (p.student_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.registration_number || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchDept = filterDept === 'ALL' || p.department === filterDept;
        return matchSearch && matchDept;
    });

    return (
        <Container fluid>
            {/* ── Header ── */}
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                <div>
                    <h4 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>📍 Attendance</h4>
                    <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                        <span className="fw-semibold" style={{ color: '#6a11cb' }}>{eventTitle}</span>
                        &nbsp;— Mark attendance for approved participants
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <Button
                        size="sm" className="rounded-pill"
                        style={{ background: '#11998e', border: 'none', fontSize: 12 }}
                        onClick={() => handleMarkAll('PRESENT')}
                    >
                        ✅ Mark All Present
                    </Button>
                    <Button
                        size="sm" variant="outline-secondary" className="rounded-pill"
                        style={{ fontSize: 12 }}
                        onClick={() => navigate(-1)}
                    >
                        ← Back
                    </Button>
                </div>
            </div>

            {/* ── Alert ── */}
            {alert && (
                <Alert variant={alert.variant} dismissible className="mb-3" onClose={() => setAlert(null)}>
                    {alert.msg}
                </Alert>
            )}

            {/* ── Summary Cards + Progress ── */}
            <SummaryBar total={total} present={present} absent={absent} />

            {/* ── Filters ── */}
            <Row className="mb-3 g-2">
                <Col md={4}>
                    <Form.Control
                        placeholder="🔍 Search by name or reg. no…"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="rounded-pill border-0 shadow-sm"
                        style={{ fontSize: 13 }}
                    />
                </Col>
                <Col md={3}>
                    <Form.Select
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                        className="rounded-pill border-0 shadow-sm"
                        style={{ fontSize: 13 }}
                    >
                        <option value="ALL">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </Form.Select>
                </Col>
            </Row>

            {/* ── Table ── */}
            {participants.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: 14 }}>
                    <Card.Body>
                        <div style={{ fontSize: 56 }}>📭</div>
                        <h5 className="mt-3 text-muted fw-semibold">No approved participants</h5>
                        <p className="text-muted" style={{ fontSize: 14 }}>
                            Approve registrations first from the Approvals page.
                        </p>
                    </Card.Body>
                </Card>
            ) : (
                <Card className="border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
                    <Table responsive hover className="mb-0 align-middle">
                        <thead style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)' }}>
                            <tr>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0, paddingLeft: 20 }}>Participant</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Reg. No</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Department</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Attendance</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Mark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map(p => {
                                const status    = attendanceLog[p.student_id];
                                const isMarking = markingId === p.student_id;

                                const rowStyle = status === 'PRESENT'
                                    ? { background: '#f0fff4', borderLeft: '4px solid #28a745' }
                                    : status === 'ABSENT'
                                        ? { background: '#fff5f5', borderLeft: '4px solid #dc3545' }
                                        : {};

                                return (
                                    <tr key={p.id || p.student_id} style={{ ...rowStyle, borderBottom: '1px solid #f5f5f5' }}>
                                        <td style={{ paddingLeft: 20, fontWeight: 600, fontSize: 14 }}>
                                            {p.student_name || '—'}
                                            {p.team_name && (
                                                <div>
                                                    <small className="text-muted">👥 {p.team_name}</small>
                                                </div>
                                            )}
                                        </td>
                                        <td><small className="text-muted">{p.registration_number || '—'}</small></td>
                                        <td><small>{p.department || '—'}</small></td>
                                        <td>
                                            {status === 'PRESENT' ? (
                                                <Badge bg="success" style={{ fontSize: 11 }}>✅ Present</Badge>
                                            ) : status === 'ABSENT' ? (
                                                <Badge bg="danger" style={{ fontSize: 11 }}>❌ Absent</Badge>
                                            ) : (
                                                <Badge bg="secondary" style={{ fontSize: 11, opacity: 0.7 }}>Not Marked</Badge>
                                            )}
                                        </td>
                                        <td>
                                            {isMarking ? (
                                                <Spinner size="sm" animation="border" variant="primary" />
                                            ) : (
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="rounded-pill px-3"
                                                        style={{
                                                            fontSize: 12,
                                                            background: status === 'PRESENT' ? '#28a745' : 'transparent',
                                                            border: '2px solid #28a745',
                                                            color: status === 'PRESENT' ? '#fff' : '#28a745',
                                                            fontWeight: 700,
                                                        }}
                                                        onClick={() => handleMark(p.student_id, 'PRESENT')}
                                                    >
                                                        P
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="rounded-pill px-3"
                                                        style={{
                                                            fontSize: 12,
                                                            background: status === 'ABSENT' ? '#dc3545' : 'transparent',
                                                            border: '2px solid #dc3545',
                                                            color: status === 'ABSENT' ? '#fff' : '#dc3545',
                                                            fontWeight: 700,
                                                        }}
                                                        onClick={() => handleMark(p.student_id, 'ABSENT')}
                                                    >
                                                        A
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Card>
            )}
        </Container>
    );
};

export default Attendance;
