import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Table, Button,
    Form, Alert, Badge, InputGroup, Spinner, Modal
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEvent, getParticipants, getAttendance, getEventResults, markAttendance } from '../../api/events';
import { getTeam } from '../../api/registrations';
import LoadingSpinner from '../../components/LoadingSpinner';

const ParticipantList = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [markingId, setMarkingId] = useState(null);
    const [error, setError] = useState(null);
    
    // Team Modal
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamLoading, setTeamLoading] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('');

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ev, parts, att] = await Promise.all([
                getEvent(eventId),
                getParticipants(eventId),
                getAttendance(eventId)
            ]);
            setEvent(ev);
            setParticipants(parts);
            setAttendance(att);
        } catch (err) {
            setError('Failed to load event data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async (studentId) => {
        setMarkingId(studentId);
        try {
            const newRecord = await markAttendance(eventId, studentId, 'PRESENT');
            setAttendance(prev => [...prev, newRecord]);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to mark attendance');
        } finally {
            setMarkingId(null);
        }
    };

    const handleViewTeam = async (teamId) => {
        if (!teamId) return;
        setTeamLoading(true);
        setShowTeamModal(true);
        try {
            const teamData = await getTeam(teamId);
            setSelectedTeam(teamData);
        } catch (err) {
            console.error('Failed to load team details', err);
        } finally {
            setTeamLoading(false);
        }
    };

    const filteredParticipants = participants.filter(p => {
        const search = searchTerm.toLowerCase();
        const matchesSearch = (
            (p.student_name || '').toLowerCase().includes(search) ||
            (p.registration_number || '').toLowerCase().includes(search) ||
            (p.team_name || '').toLowerCase().includes(search)
        );
        const matchesDept = !deptFilter || p.department === deptFilter;
        return matchesSearch && matchesDept;
    });

    const departments = [...new Set(participants.map(p => p.department).filter(Boolean))];
    
    // Attendance Stats
    const totalRegistered = participants.filter(p => p.status === 'APPROVED').length;
    const totalPresent = attendance.filter(a => a.status === 'PRESENT').length;
    const totalAbsent = totalRegistered - totalPresent;
    const attendancePercent = totalRegistered > 0 ? ((totalPresent / totalRegistered) * 100).toFixed(1) : 0;

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">Event: {event?.title}</h4>
                    <p className="text-muted small mb-0">Participant management and visibility</p>
                </div>
                <div className="d-flex gap-2">
                    {event?.status === 'COMPLETED' && event?.is_result_locked && (
                        <Button variant="outline-primary" className="rounded-pill" onClick={() => navigate(`/student/results/${eventId}`)}>
                            🏆 View Results
                        </Button>
                    )}
                    <Button variant="outline-secondary" className="rounded-pill" onClick={() => navigate(-1)}>
                        <i className="mdi mdi-arrow-left"></i> Back
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Attendance Summary (Phase 3) - Standardized UI */}
            <Row className="mb-4 g-3">
                {[
                    { title: 'Total Registered', count: totalRegistered, icon: 'fa-users', color: '#4e73df' },
                    { title: 'Total Present',    count: totalPresent,    icon: 'fa-check-circle', color: '#1cc88a' },
                    { title: 'Total Absent',     count: totalAbsent,     icon: 'fa-times-circle', color: '#e74a3b' },
                    { title: 'Attendance %',    count: `${attendancePercent}%`, icon: 'fa-percentage', color: '#f6c23e' },
                ].map((s, idx) => (
                    <Col md={3} key={idx}>
                        <Card className="shadow-sm h-100 py-3 border-0"
                            style={{ borderLeft: `4px solid ${s.color}`, borderRadius: 12 }}>
                            <Card.Body className="py-2">
                                <Row className="align-items-center g-0">
                                    <Col>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: s.color, textTransform: 'uppercase', letterSpacing: 1 }}>
                                            {s.title}
                                        </div>
                                        <div className="h5 mb-0 fw-bold text-gray-800 mt-1">{s.count}</div>
                                    </Col>
                                    <Col xs="auto">
                                        <i className={`fas ${s.icon} fa-2x`} style={{ color: '#eaecf4' }}></i>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Select 
                                className="border-0 bg-light rounded-pill px-3"
                                value={deptFilter} 
                                onChange={(e) => setDeptFilter(e.target.value)}
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </Form.Select>
                        </Col>
                        <Col md={8}>
                            <InputGroup className="bg-light rounded-pill overflow-hidden border-0">
                                <InputGroup.Text className="bg-transparent border-0 ps-3">
                                    <i className="mdi mdi-magnify text-muted"></i>
                                </InputGroup.Text>
                                <Form.Control 
                                    className="bg-transparent border-0 ps-0"
                                    placeholder="Search by name, reg no or team..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm overflow-hidden" style={{ borderRadius: 14 }}>
                <Table hover responsive className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr style={{ fontSize: '13px', color: '#6c757d' }}>
                            <th className="ps-4 py-3">Participant</th>
                            <th className="py-3">Reg. No</th>
                            <th className="py-3">Department</th>
                            <th className="py-3">Team</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 pe-4 text-end">Attendance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredParticipants.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-5 text-muted">No participants found.</td>
                            </tr>
                        ) : (
                            filteredParticipants.map((p, i) => {
                                const isPresent = attendance.some(a => a.student_id === p.student_id && a.status === 'PRESENT');
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8f9fa' }}>
                                        <td className="ps-4">
                                            <div className="fw-bold">{p.student_name}</div>
                                        </td>
                                        <td><code>{p.registration_number}</code></td>
                                        <td><Badge bg="light" className="text-dark fw-normal">{p.department}</Badge></td>
                                        <td>
                                            {p.team_name ? (
                                                <Button 
                                                    variant="link" 
                                                    className="p-0 text-decoration-none small fw-bold"
                                                    onClick={() => handleViewTeam(p.team_id)}
                                                >
                                                    <i className="mdi mdi-account-group me-1"></i> {p.team_name}
                                                </Button>
                                            ) : (
                                                <span className="text-muted small">Solo</span>
                                            )}
                                        </td>
                                        <td>
                                            <Badge bg={p.status === 'APPROVED' ? 'success' : 'warning'} className="px-3" pill style={{ fontSize: '10px' }}>
                                                {p.status}
                                            </Badge>
                                        </td>
                                        <td className="pe-4 text-end">
                                            {attendance.some(a => a.student_id === p.student_id) ? (
                                                isPresent ? (
                                                    <Badge bg="soft-success" className="text-success border-0"><i className="mdi mdi-check-circle me-1"></i> Present</Badge>
                                                ) : (
                                                    <Badge bg="soft-danger" className="text-danger border-0"><i className="mdi mdi-close-circle me-1"></i> Absent</Badge>
                                                )
                                            ) : (
                                                <Button 
                                                    variant="success" 
                                                    size="sm" 
                                                    className="rounded-pill px-3"
                                                    style={{ fontSize: '10px' }}
                                                    disabled={markingId === p.student_id || p.status !== 'APPROVED'}
                                                    onClick={() => handleMarkAttendance(p.student_id)}
                                                >
                                                    {markingId === p.student_id ? '...' : 'Mark Present'}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Team Details Modal (Phase 2) */}
            <Modal show={showTeamModal} onHide={() => setShowTeamModal(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="h5 fw-bold">Team Details</Modal.Title>
                </Modal.Header>
                <Modal.Body className="pt-0">
                    {teamLoading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="primary" size="sm" />
                        </div>
                    ) : selectedTeam ? (
                        <div>
                            <div className="mb-3 p-3 bg-light rounded" style={{ borderLeft: '4px solid #4e73df' }}>
                                <div className="small text-muted text-uppercase mb-1" style={{ fontSize: '10px', fontWeight: 800 }}>Team Name</div>
                                <div className="h5 mb-0 fw-bold">{selectedTeam.team_name}</div>
                            </div>
                            
                            <h6 className="fw-bold mb-3 small text-muted text-uppercase">Members</h6>
                            <div className="list-group list-group-flush">
                                {selectedTeam.members?.map((m, idx) => (
                                    <div key={idx} className="list-group-item px-0 py-2 border-light d-flex justify-content-between align-items-center">
                                        <div>
                                            <div className="fw-bold small">{m.full_name}</div>
                                            <div className="text-muted" style={{ fontSize: '11px' }}>{m.registration_number}</div>
                                        </div>
                                        {m.id === selectedTeam.leader_id && (
                                            <Badge bg="soft-warning" className="text-warning border-0" style={{ fontSize: '10px' }}>
                                                <i className="mdi mdi-crown me-1"></i> Team Leader
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-muted small">Failed to load team details.</div>
                    )}
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="light" className="rounded-pill px-4" onClick={() => setShowTeamModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ParticipantList;

