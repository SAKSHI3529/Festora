import React, { useEffect, useState, useContext } from 'react';
import { Container, Card, Button, Badge, Modal, Form, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getBudgets, createBudget } from '../../api/budgets';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const BudgetRequests = () => {
    const [budgets, setBudgets] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ event_id: '', requested_amount: '', description: '', justification: '' });
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [b, e] = await Promise.all([getBudgets(), getEvents()]);
            setBudgets(b);
            setEvents(e);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createBudget({
                ...formData,
                requested_amount: parseFloat(formData.requested_amount)
            });
            setShowModal(false);
            setFormData({ event_id: '', requested_amount: '', description: '', justification: '' });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to request budget");
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
             <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Budget Management</h1>
                <Button variant="primary" onClick={() => setShowModal(true)}>
                    <i className="fas fa-plus me-2"></i>New Request
                </Button>
            </div>
            
            <Card className="shadow-sm border-0">
                 <Table responsive hover className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Description</th>
                            <th>Event</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Approved</th>
                        </tr>
                    </thead>
                    <tbody>
                        {budgets.length === 0 ? (
                             <tr><td colSpan="5" className="text-center py-4">No budget requests found.</td></tr>
                        ) : (
                            budgets.map(b => {
                                const event = events.find(e => e.id === b.event_id);
                                return (
                                    <tr key={b.id}>
                                        <td>{b.description}</td>
                                        <td>{event ? event.title : b.event_id}</td>
                                        <td>₹{b.requested_amount}</td>
                                        <td>
                                            <Badge bg={b.status === 'APPROVED' ? 'success' : b.status === 'REJECTED' ? 'danger' : 'warning'}>
                                                {b.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            {b.approved_amount ? `₹${b.approved_amount}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                 </Table>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Request Budget</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Event</Form.Label>
                            <Form.Select 
                                required 
                                value={formData.event_id}
                                onChange={(e) => setFormData({...formData, event_id: e.target.value})}
                            >
                                <option value="">Select Event</option>
                                {events.filter(e => e.status === 'SCHEDULED').map(e => (
                                    <option key={e.id} value={e.id}>{e.title}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Amount (₹)</Form.Label>
                            <Form.Control 
                                type="number" 
                                required 
                                min="0"
                                value={formData.requested_amount}
                                onChange={(e) => setFormData({...formData, requested_amount: e.target.value})}
                            />
                        </Form.Group>
                         <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control 
                                type="text"
                                required 
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                             <Form.Label>Justification (Optional)</Form.Label>
                             <Form.Control 
                                as="textarea"
                                rows={3}
                                value={formData.justification}
                                onChange={(e) => setFormData({...formData, justification: e.target.value})}
                             />
                        </Form.Group>
                        <Button variant="primary" type="submit">Submit Request</Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default BudgetRequests;

