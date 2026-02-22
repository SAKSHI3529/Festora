import React, { useEffect, useState, useContext } from 'react';
import {
    Container, Card, Button, Badge, Alert, Table, Spinner, Collapse
} from 'react-bootstrap';
import { getMyRegistrations, cancelRegistration, getMyTeams } from '../../api/registrations';
import { getEvents, getAttendance } from '../../api/events';
import { getTeam } from '../../api/teams';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const StatusBadge = ({ status }) => {
    const cfg = {
        PENDING:  { bg: 'warning',   label: '⏳ Pending'  },
        APPROVED: { bg: 'success',   label: '✅ Approved' },
        REJECTED: { bg: 'danger',    label: '❌ Rejected' },
    };
    const c = cfg[status] || { bg: 'secondary', label: status };
    return <Badge bg={c.bg} style={{ fontSize: 11 }}>{c.label}</Badge>;
};

const AttendanceBadge = ({ status }) => {
    if (!status) return <Badge bg="light" text="dark" style={{ fontSize: 11 }}>Not Marked</Badge>;
    return status === 'present'
        ? <Badge bg="success" style={{ fontSize: 11 }}>✅ Present</Badge>
        : <Badge bg="danger"  style={{ fontSize: 11 }}>❌ Absent</Badge>;
};

// ─── Team Detail Panel ────────────────────────────────────────────────────────
const TeamPanel = ({ team, userId }) => {
    if (!team) return null;
    const isLeader = team.leader_id === userId;
    return (
        <div
            className="p-3 rounded-3 mt-2"
            style={{ background: '#f3f0ff', border: '1px solid #d8d0f5', fontSize: 13 }}
        >
            <div className="d-flex align-items-center gap-2 mb-2">
                <span style={{ fontWeight: 700, color: '#5b21b6' }}>{team.team_name}</span>
                <StatusBadge status={team.status} />
                {isLeader && <Badge style={{ background: '#7c3aed', fontSize: 10 }}>👑 Leader</Badge>}
            </div>
            <div className="text-muted" style={{ fontSize: 12 }}>
                {team.member_ids?.length || 0} member{team.member_ids?.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const MyRegistrations = () => {
    const { user } = useContext(AuthContext);

    const [registrations, setRegistrations] = useState([]);
    const [events,        setEvents]         = useState({});
    const [teams,         setTeams]          = useState({});
    const [myTeams,       setMyTeams]        = useState([]);
    const [attendance,    setAttendance]     = useState({}); // { eventId: status | null }
    const [loading,       setLoading]        = useState(true);
    const [error,         setError]          = useState(null);
    const [successMsg,    setSuccessMsg]     = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [regData, eventsData, teamsData] = await Promise.all([
                getMyRegistrations(),
                getEvents(),
                getMyTeams(),
            ]);

            setRegistrations(regData);
            setMyTeams(teamsData);

            // Build events map
            const eventsMap = {};
            eventsData.forEach(e => { eventsMap[e.id] = e; });
            setEvents(eventsMap);

            // Fetch team details for group regs
            const uniqueTeamIds = [...new Set(regData.filter(r => r.team_id).map(r => r.team_id))];
            if (uniqueTeamIds.length > 0) {
                const fetched = await Promise.all(uniqueTeamIds.map(id => getTeam(id).catch(() => null)));
                const teamsMap = {};
                fetched.forEach(t => { if (t) teamsMap[t.id] = t; });
                setTeams(teamsMap);
            }

            // Fetch attendance for completed/ongoing events
            const completedEventIds = [...new Set(
                regData
                    .map(r => r.event_id)
                    .filter(id => {
                        const e = eventsMap[id];
                        return e && (e.status === 'COMPLETED' || e.status === 'ONGOING');
                    })
            )];

            const attMap = {};
            await Promise.all(completedEventIds.map(async (eventId) => {
                try {
                    const records = await getAttendance(eventId);
                    const myRecord = records.find(a => a.student_id === user.id);
                    attMap[eventId] = myRecord ? myRecord.status : null;
                } catch {
                    attMap[eventId] = null;
                }
            }));
            setAttendance(attMap);

        } catch (err) {
            console.error('Failed to fetch data', err);
        } finally {
            setLoading(false);
        }
    };

    // Determine if current user is leader of the team linked to a registration
    const isLeaderOfReg = (reg) => {
        if (!reg.team_id) return false;
        const team = myTeams.find(t => t.id === reg.team_id);
        return team ? team.leader_id === user.id : false;
    };

    const handleCancel = async (reg) => {
        const isGroup = !!reg.team_id;
        const msg = isGroup
            ? '⚠️ You are the team leader. This will cancel the ENTIRE team registration. Proceed?'
            : 'Cancel your registration for this event?';
        if (!window.confirm(msg)) return;
        try {
            await cancelRegistration(reg.id);
            setSuccessMsg(isGroup ? 'Team registration cancelled.' : 'Registration cancelled.');
            fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Cancellation failed.');
        }
    };

    const getStatusBadgeColor = (status) => {
        if (status === 'PENDING')  return 'warning';
        if (status === 'APPROVED') return 'success';
        if (status === 'REJECTED') return 'danger';
        return 'secondary';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            {/* Header */}
            <div className="mb-4 d-flex align-items-center justify-content-between">
                <div>
                    <h4 className="fw-bold mb-1" style={{ color: '#1a1a2e' }}>📋 My Registrations</h4>
                    <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                        Track all your event registrations, team details and attendance.
                    </p>
                </div>
                <Badge
                    style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)', fontSize: 13, padding: '8px 14px' }}
                >
                    {registrations.length} Registration{registrations.length !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
                    {error}
                </Alert>
            )}
            {successMsg && (
                <Alert variant="success" dismissible onClose={() => setSuccessMsg(null)} className="mb-3">
                    {successMsg}
                </Alert>
            )}

            {registrations.length === 0 ? (
                <Card className="border-0 shadow-sm text-center py-5" style={{ borderRadius: 14 }}>
                    <Card.Body>
                        <div style={{ fontSize: 56 }}>📭</div>
                        <h5 className="mt-3 text-muted fw-semibold">No Registrations Yet</h5>
                        <p className="text-muted" style={{ fontSize: 14 }}>
                            Browse events and register to see them here.
                        </p>
                    </Card.Body>
                </Card>
            ) : (
                <Card className="border-0 shadow-sm" style={{ borderRadius: 14, overflow: 'hidden' }}>
                    <Table responsive hover className="mb-0 align-middle">
                        <thead style={{ background: 'linear-gradient(135deg,#6a11cb,#2575fc)' }}>
                            <tr>
                                <th style={{ color: '#fff', paddingLeft: 20, fontWeight: 600, border: 0 }}>Event</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Date</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Type</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Status</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Attendance</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Team / Details</th>
                                <th style={{ color: '#fff', fontWeight: 600, border: 0 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.map(reg => {
                                const event  = events[reg.event_id];
                                const team   = reg.team_id ? teams[reg.team_id] : null;
                                const att    = event ? attendance[reg.event_id] : undefined;
                                const showAtt = event && (event.status === 'COMPLETED' || event.status === 'ONGOING');
                                const isPending = reg.status === 'PENDING';
                                const isGroup   = !!reg.team_id;
                                const canCancel = isPending && (isGroup ? isLeaderOfReg(reg) : true);

                                return (
                                    <tr key={reg.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                        {/* Event */}
                                        <td style={{ paddingLeft: 20, paddingTop: 14, paddingBottom: 14 }}>
                                            <div className="fw-semibold" style={{ fontSize: 14 }}>
                                                {event?.title || 'Unknown Event'}
                                            </div>
                                            {event && (
                                                <small className="text-muted">{event.location} · {event.category}</small>
                                            )}
                                        </td>

                                        {/* Date */}
                                        <td>
                                            <span style={{ fontSize: 13 }}>
                                                {event ? fmt(event.event_date) : '—'}
                                            </span>
                                        </td>

                                        {/* Type */}
                                        <td>
                                            {event && (
                                                <Badge
                                                    bg={event.event_type === 'SOLO' ? 'info' : 'primary'}
                                                    style={{ fontSize: 11 }}
                                                >
                                                    {event.event_type}
                                                </Badge>
                                            )}
                                        </td>

                                        {/* Registration Status */}
                                        <td><StatusBadge status={reg.status} /></td>

                                        {/* Attendance (Phase 2) */}
                                        <td>
                                            {showAtt
                                                ? <AttendanceBadge status={att} />
                                                : <span className="text-muted" style={{ fontSize: 12 }}>—</span>
                                            }
                                        </td>

                                        {/* Team / Details (Phase 4) */}
                                        <td style={{ minWidth: 180 }}>
                                            {team ? (
                                                <TeamPanel team={team} userId={user.id} />
                                            ) : (
                                                <span className="text-muted" style={{ fontSize: 12 }}>
                                                    Individual
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions (Phase 6) */}
                                        <td>
                                            <div className="d-flex flex-column gap-1">
                                                {canCancel && (
                                                    <Button
                                                        variant="outline-danger"
                                                        size="sm"
                                                        className="rounded-pill"
                                                        style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                                                        onClick={() => handleCancel(reg)}
                                                    >
                                                        {isGroup ? '🚫 Cancel Team' : 'Cancel'}
                                                    </Button>
                                                )}
                                                {isPending && isGroup && !isLeaderOfReg(reg) && (
                                                    <span className="text-muted" style={{ fontSize: 11 }}>
                                                        Leader only
                                                    </span>
                                                )}
                                                {event?.status === 'COMPLETED' && reg.status === 'APPROVED' && (
                                                    <Button
                                                        size="sm"
                                                        className="rounded-pill"
                                                        style={{
                                                            fontSize: 11,
                                                            background: 'linear-gradient(135deg,#6a11cb,#2575fc)',
                                                            border: 'none',
                                                        }}
                                                        onClick={() => window.location.href = `/student/results`}
                                                    >
                                                        🏆 Results
                                                    </Button>
                                                )}
                                            </div>
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

export default MyRegistrations;
