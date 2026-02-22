import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Table, Button,
    Form, Alert, Badge, InputGroup
} from 'react-bootstrap';
import { getEvents, getParticipants } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const AdminParticipants = () => {
    const [events, setEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Filters
    const [deptFilter, setDeptFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchEvents = async () => {
        try {
            const data = await getEvents();
            setEvents(data);
            if (data.length > 0) {
                setSelectedEventId(data[0].id);
            }
        } catch (err) {
            setError('Failed to fetch events');
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipants = async () => {
        if (!selectedEventId) return;
        setLoading(true);
        try {
            const data = await getParticipants(selectedEventId, deptFilter || null);
            setParticipants(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to fetch participants');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        if (selectedEventId) {
            fetchParticipants();
        }
    }, [selectedEventId, deptFilter]);

    const filteredParticipants = participants.filter(p => {
        const search = searchTerm.toLowerCase();
        return (
            (p.student_name || '').toLowerCase().includes(search) ||
            (p.registration_number || '').toLowerCase().includes(search) ||
            (p.team_name || '').toLowerCase().includes(search) ||
            (p.department || '').toLowerCase().includes(search)
        );
    });

    const exportToCSV = () => {
        if (filteredParticipants.length === 0) return;
        
        const headers = ["Student Name", "Reg No", "Department", "Team Name", "Status"];
        const rows = filteredParticipants.map(p => [
            p.student_name,
            p.registration_number,
            p.department,
            p.team_name || 'Solo',
            p.status
        ]);
        
        const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        const eventName = events.find(e => e.id === selectedEventId)?.title || 'Event';
        link.setAttribute("download", `${eventName}_Participants.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    if (loading && events.length === 0) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4 text-nowrap flex-wrap gap-2">
                <div>
                    <h4 className="fw-bold mb-0">👥 Event Participants</h4>
                    <p className="text-muted small mb-0">View and export participant lists</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-success" onClick={exportToCSV} disabled={filteredParticipants.length === 0}>
                        <i className="mdi mdi-export mr-1"></i> Export CSV
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '15px' }}>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Select Event</Form.Label>
                                <Form.Select 
                                    value={selectedEventId} 
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                >
                                    {events.map(e => (
                                        <option key={e.id} value={e.id}>{e.title}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Filter Department</Form.Label>
                                <Form.Select 
                                    value={deptFilter} 
                                    onChange={(e) => setDeptFilter(e.target.value)}
                                >
                                    <option value="">All Departments</option>
                                    <option value="CSE">CSE</option>
                                    <option value="ECE">ECE</option>
                                    <option value="MECH">MECH</option>
                                    <option value="CIVIL">CIVIL</option>
                                    <option value="MBA">MBA</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Search Participant</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text className="bg-white border-end-0">
                                        <i className="mdi mdi-magnify text-muted"></i>
                                    </InputGroup.Text>
                                    <Form.Control
                                        className="border-start-0"
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
                <Card.Body>
                    <Table hover responsive className="mb-0 align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Student Name</th>
                                <th>Reg No</th>
                                <th>Department</th>
                                <th>Team/Solo</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-4">
                                        <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                        <span className="ms-2">Loading participants...</span>
                                    </td>
                                </tr>
                            ) : filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-4 text-muted">
                                        No participants found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredParticipants.map((p, idx) => (
                                    <tr key={idx}>
                                        <td>
                                            <div className="fw-bold">{p.student_name}</div>
                                            <div className="text-muted small">{p.email || ''}</div>
                                        </td>
                                        <td><code>{p.registration_number}</code></td>
                                        <td><Badge bg="light" className="text-dark">{p.department}</Badge></td>
                                        <td>
                                            {p.team_name ? (
                                                <span><i className="mdi mdi-account-group mr-1"></i> {p.team_name}</span>
                                            ) : (
                                                <span className="text-muted">Solo</span>
                                            )}
                                        </td>
                                        <td>
                                            <Badge bg={p.status === 'APPROVED' ? 'success' : 'warning'}>
                                                {p.status}
                                            </Badge>
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

export default AdminParticipants;
