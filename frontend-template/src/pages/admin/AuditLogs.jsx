import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Table } from 'react-bootstrap';
import { getAuditLogs } from '../../api/audit';
import LoadingSpinner from '../../components/LoadingSpinner';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [filters, setFilters] = useState({
        action: '',
        module: '',
        user: '', // Search by user string (client side for now if ID not known)
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, logs]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Ideally we pass filters to backend. For now, let's fetch all and filter client side 
            // for fields not supported by backend completely or for smoother UX on small datasets.
            // Backend supports module and user_id. 
            const data = await getAuditLogs(); 
            // Note: If data is huge, we MUST implement server-side pagination/filtering.
            // Assuming reasonable size for now.
            setLogs(data);
        } catch (err) {
            console.error("Failed to fetch audit logs", err);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = logs;

        if (filters.action) {
            result = result.filter(log => log.action === filters.action);
        }
        if (filters.module) {
            result = result.filter(log => log.module === filters.module);
        }
        if (filters.user) {
            // Simple check if user_id or future user_name matches
            // Backend returns user_id. If we want name we need to join or fetch users.
            // For now, search by ID or description content
            const term = filters.user.toLowerCase();
            result = result.filter(log => 
                log.user_id.toLowerCase().includes(term) || 
                log.description.toLowerCase().includes(term)
            );
        }
        if (filters.startDate) {
            result = result.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59);
            result = result.filter(log => new Date(log.timestamp) <= end);
        }

        // Sort by newest first
        result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setFilteredLogs(result);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({ ...filters, [name]: value });
    };

    const getActionBadge = (action) => {
        switch (action) {
            case 'CREATE': return 'success';
            case 'UPDATE': return 'primary';
            case 'DELETE': return 'danger';
            case 'APPROVE': return 'success';
            case 'REJECT': return 'danger';
            case 'LOGIN': return 'dark';
            case 'SUBMIT': return 'info';
            case 'LOCK': return 'warning';
            case 'GENERATE': return 'secondary';
            default: return 'secondary';
        }
    };

    if (loading && logs.length === 0) return <LoadingSpinner />;

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">System Audit Logs</h1>

            <Card className="mb-4 shadow-sm border-0">
                <Card.Body>
                    <Row>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">Action</Form.Label>
                                <Form.Select name="action" value={filters.action} onChange={handleFilterChange} size="sm">
                                    <option value="">All Actions</option>
                                    <option value="CREATE">Create</option>
                                    <option value="UPDATE">Update</option>
                                    <option value="DELETE">Delete</option>
                                    <option value="APPROVE">Approve</option>
                                    <option value="REJECT">Reject</option>
                                    <option value="LOGIN">Login</option>
                                    <option value="SUBMIT">Submit</option>
                                    <option value="LOCK">Lock</option>
                                    <option value="GENERATE">Generate</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">Module</Form.Label>
                                <Form.Select name="module" value={filters.module} onChange={handleFilterChange} size="sm">
                                    <option value="">All Modules</option>
                                    <option value="AUTH">Auth</option>
                                    <option value="EVENTS">Events</option>
                                    <option value="REGISTRATIONS">Registrations</option>
                                    <option value="TEAMS">Teams</option>
                                    <option value="SCORES">Scores</option>
                                    <option value="BUDGETS">Budgets</option>
                                    <option value="CERTIFICATES">Certificates</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">Search (User/Desc)</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    name="user" 
                                    placeholder="Keyword..." 
                                    value={filters.user} 
                                    onChange={handleFilterChange} 
                                    size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">Start Date</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    name="startDate" 
                                    value={filters.startDate} 
                                    onChange={handleFilterChange} 
                                    size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group className="mb-2">
                                <Form.Label className="small fw-bold">End Date</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    name="endDate" 
                                    value={filters.endDate} 
                                    onChange={handleFilterChange} 
                                    size="sm"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={1} className="d-flex align-items-end mb-2">
                             <Button variant="outline-secondary" size="sm" onClick={() => setFilters({ action: '', module: '', user: '', startDate: '', endDate: '' })}>
                                Clear
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <div className="table-responsive bg-white rounded shadow-sm">
                <Table hover size="sm" className="mb-0">
                    <thead className="table-light sticky-top">
                        <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>Module</th>
                            <th>User ID / Role</th>
                            <th>Description</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log.id || log._id}>
                                <td className="small text-nowrap">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td>
                                    <Badge bg={getActionBadge(log.action)}>{log.action}</Badge>
                                </td>
                                <td><Badge bg="light" text="dark" className="border">{log.module}</Badge></td>
                                <td>
                                    <div className="small fw-bold">{log.user_id}</div>
                                    <div className="text-muted x-small" style={{ fontSize: '0.75rem' }}>{log.user_role}</div>
                                </td>
                                <td className="text-break">{log.description}</td>
                                <td className="small text-muted">{log.ip_address || '-'}</td>
                            </tr>
                        ))}
                         {filteredLogs.length === 0 && (
                            <tr>
                                <td colSpan="6" className="text-center py-4">No logs found matching criteria.</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
            
            <div className="mt-2 text-muted small text-end">
                Showing {filteredLogs.length} records
            </div>
        </Container>
    );
};

export default AuditLogs;

