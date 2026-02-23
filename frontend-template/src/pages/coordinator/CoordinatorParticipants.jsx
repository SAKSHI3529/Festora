import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Table, Button,
    Form, Alert, Badge, InputGroup, Spinner
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getEvents, getParticipants } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const CoordinatorParticipants = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingParticipants, setFetchingParticipants] = useState(false);
    const [error, setError] = useState(null);
    
    // Filters
    const [deptFilter, setDeptFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchEvents = async () => {
        try {
            const data = await getEvents();
            setEvents(data);
            if (data.length > 0) {
                setSelectedEventId(data[0].id || data[0]._id);
            }
        } catch (err) {
            setError('Failed to fetch assigned events');
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipants = async () => {
        if (!selectedEventId) return;
        setFetchingParticipants(true);
        try {
            const data = await getParticipants(selectedEventId);
            setParticipants(data);
        } catch (err) {
            setError('Failed to fetch participants');
        } finally {
            setFetchingParticipants(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        if (selectedEventId) {
            fetchParticipants();
        }
    }, [selectedEventId]);

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

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="mb-4">
                <h4 className="fw-bold mb-0">👥 Event Participants</h4>
                <p className="text-muted small">View participants for your assigned events (Read-only)</p>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-uppercase text-muted" style={{ letterSpacing: '0.5px', fontSize: '10px' }}>Select Event</Form.Label>
                                <Form.Select 
                                    className="border-0 bg-light rounded-pill px-3"
                                    style={{ fontSize: '14px' }}
                                    value={selectedEventId} 
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                >
                                    <option value="" disabled>Choose an event...</option>
                                    {events.map(e => (
                                        <option key={e.id || e._id} value={e.id || e._id}>{e.title}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-uppercase text-muted" style={{ letterSpacing: '0.5px', fontSize: '10px' }}>Filter Department</Form.Label>
                                <Form.Select 
                                    className="border-0 bg-light rounded-pill px-3"
                                    style={{ fontSize: '14px' }}
                                    value={deptFilter} 
                                    onChange={(e) => setDeptFilter(e.target.value)}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label className="small fw-bold text-uppercase text-muted" style={{ letterSpacing: '0.5px', fontSize: '10px' }}>Search</Form.Label>
                                <InputGroup className="bg-light rounded-pill overflow-hidden border-0">
                                    <InputGroup.Text className="bg-transparent border-0 ps-3">
                                        <i className="mdi mdi-magnify text-muted"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        className="bg-transparent border-0 ps-0"
                                        style={{ fontSize: '14px' }}
                                        placeholder="Name, Reg No, or Team..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr style={{ fontSize: '13px', color: '#6c757d' }}>
                                <th className="ps-4 py-3">Student Name</th>
                                <th className="py-3">Reg No</th>
                                <th className="py-3">Department</th>
                                <th className="py-3">Team/Solo</th>
                                <th className="py-3">Status</th>
                                <th className="py-3 pe-4 text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fetchingParticipants ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5">
                                        <Spinner animation="border" variant="primary" size="sm" />
                                        <div className="text-muted mt-2 small">Loading participants...</div>
                                    </td>
                                </tr>
                            ) : filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        {selectedEventId ? 'No participants found matching your criteria.' : 'Please select an event to view participants.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredParticipants.map((p, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f8f9fa' }}>
                                        <td className="ps-4">
                                            <div className="fw-bold" style={{ fontSize: '14px' }}>{p.student_name}</div>
                                            <div className="text-muted small" style={{ fontSize: '11px' }}>{p.email || '—'}</div>
                                        </td>
                                        <td><code className="bg-light px-2 py-1 rounded" style={{ fontSize: '12px' }}>{p.registration_number}</code></td>
                                        <td><span className="badge bg-soft-info text-info border-0 px-2 py-1" style={{ fontSize: '11px' }}>{p.department}</span></td>
                                        <td>
                                            {p.team_name ? (
                                                <span className="small"><i className="mdi mdi-account-group text-primary me-1"></i> {p.team_name}</span>
                                            ) : (
                                                <span className="text-muted small">Solo</span>
                                            )}
                                        </td>
                                        <td>
                                            <Badge bg={p.status === 'APPROVED' ? 'success' : 'warning'} className="px-3 py-1" style={{ fontSize: '10px', borderRadius: '10px' }}>
                                                {p.status}
                                            </Badge>
                                        </td>
                                        <td className="pe-4 text-end">
                                            <Button 
                                                variant="link" 
                                                className="text-primary p-0" 
                                                style={{ fontSize: '12px', textDecoration: 'none' }}
                                                onClick={() => navigate(`/coordinator/events/${selectedEventId}/participants`)}
                                            >
                                                Details <i className="mdi mdi-arrow-right ms-1"></i>
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default CoordinatorParticipants;
