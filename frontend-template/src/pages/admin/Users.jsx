import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Badge, Modal, Form, Table, Nav } from 'react-bootstrap';
import { getUsers, createUser, deleteUser } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('student');
    const [showModal, setShowModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'student',
        registration_number: '',
        department: '',
        year: ''
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (err) {
            console.error("Error fetching users:", err);
            alert("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            // Clean up data based on role
            const payload = { ...formData };
            if (payload.role !== 'student') {
                delete payload.registration_number;
                delete payload.department;
                delete payload.year;
            } else {
                 // Ensure year is integer
                 payload.year = parseInt(payload.year);
            }

            await createUser(payload);
            setShowModal(false);
            setFormData({
                full_name: '',
                email: '',
                password: '',
                role: 'student',
                registration_number: '',
                department: '',
                year: ''
            });
            fetchUsers(); // Refresh list
            alert("User created successfully!");
        } catch (err) {
            console.error(err);
             alert(err.response?.data?.detail || "Failed to create user");
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`Are you sure you want to delete "${userName}"? This action cannot be undone.`)) return;
        try {
            await deleteUser(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to delete user');
        }
    };

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">User Management</h1>
                <Button variant="primary" onClick={() => setShowModal(true)}>
                    <i className="fas fa-plus me-2"></i> Add User
                </Button>
            </div>

            {/* Role Tabs */}
            <Nav variant="tabs" className="mb-3" activeKey={activeTab} onSelect={setActiveTab}>
                <Nav.Item><Nav.Link eventKey="student">🎓 Students</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="faculty">👩‍🏫 Faculty</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="event_coordinator">📋 Coordinators</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="judge">⚖️ Judges</Nav.Link></Nav.Item>
            </Nav>

            <div className="table-responsive bg-white p-3 rounded shadow-sm">
                {(() => {
                    const tabUsers = users.filter(u => u.role === activeTab);
                    const isStudent = activeTab === 'student';
                    return (
                        <Table hover>
                            <thead className="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    {isStudent && <th>Reg. No</th>}
                                    {isStudent && <th>Department</th>}
                                    {isStudent && <th>Year</th>}
                                    <th style={{ width: '100px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tabUsers.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.full_name}</td>
                                        <td>{user.email}</td>
                                        {isStudent && <td>{user.registration_number || '-'}</td>}
                                        {isStudent && <td>{user.department || '-'}</td>}
                                        {isStudent && <td>{user.year || '-'}</td>}
                                        <td>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleDelete(user.id, user.full_name)}
                                            >
                                                <i className="mdi mdi-delete"></i> Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {tabUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={isStudent ? 6 : 3} className="text-center text-muted py-4">
                                            No {activeTab.replace('_', ' ')}s found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    );
                })()}
            </div>

            {/* Create User Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Create New User</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Full Name</Form.Label>
                                    <Form.Control name="full_name" value={formData.full_name} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control type="email" name="email" value={formData.email} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Password</Form.Label>
                                    <Form.Control type="password" name="password" value={formData.password} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Role</Form.Label>
                                    <Form.Select name="role" value={formData.role} onChange={handleInputChange}>
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty</option>
                                        <option value="event_coordinator">Event Coordinator</option>
                                        <option value="judge">Judge</option>
                                        <option value="admin">Admin</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        {formData.role === 'student' && (
                            <Row>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Reg. Number</Form.Label>
                                        <Form.Control name="registration_number" value={formData.registration_number} onChange={handleInputChange} required />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Department</Form.Label>
                                        <Form.Control name="department" value={formData.department} onChange={handleInputChange} required />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Year</Form.Label>
                                        <Form.Control type="number" name="year" value={formData.year} onChange={handleInputChange} required />
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                        <Button variant="primary" type="submit" disabled={submitLoading}>
                            {submitLoading ? 'Creating...' : 'Create User'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default Users;

