import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Table, Button,
    Modal, Form, Alert, Badge
} from 'react-bootstrap';
import { 
    getCategories, createCategory, 
    updateCategory, deleteCategory 
} from '../../api/categories';
import LoadingSpinner from '../../components/LoadingSpinner';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('CREATE'); // CREATE or EDIT
    const [selectedCat, setSelectedCat] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (mode, cat = null) => {
        setModalMode(mode);
        setSelectedCat(cat);
        setFormData(cat ? { name: cat.name, description: cat.description || '' } : { name: '', description: '' });
        setActionError(null);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setActionError(null);
        try {
            if (modalMode === 'CREATE') {
                await createCategory(formData);
            } else {
                await updateCategory(selectedCat.id, formData);
            }
            setShowModal(false);
            fetchData();
        } catch (err) {
            setActionError(err.response?.data?.detail || 'Operation failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (cat) => {
        if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
        try {
            await deleteCategory(cat.id);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || 'Delete failed');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">🏷️ Event Categories</h4>
                    <p className="text-muted small mb-0">Manage global categories for events</p>
                </div>
                <Button variant="primary" onClick={() => handleOpenModal('CREATE')}>
                    <i className="mdi mdi-plus mr-1"></i> Add Category
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row>
                <Col lg={12}>
                    <Card className="border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                        <Card.Body>
                            <Table hover responsive className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Category Name</th>
                                        <th>Description</th>
                                        <th>Created At</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center py-4 text-muted">
                                                No categories found. Click "Add Category" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        categories.map((cat) => (
                                            <tr key={cat.id}>
                                                <td className="fw-bold text-primary">{cat.name}</td>
                                                <td style={{ maxWidth: '300px' }} className="text-truncate">
                                                    {cat.description || <span className="text-muted italic">No description</span>}
                                                </td>
                                                <td>{new Date(cat.created_at).toLocaleDateString()}</td>
                                                <td className="text-end">
                                                    <Button 
                                                        variant="outline-info" 
                                                        size="sm" 
                                                        className="mr-2"
                                                        onClick={() => handleOpenModal('EDIT', cat)}
                                                    >
                                                        <i className="mdi mdi-pencil"></i>
                                                    </Button>
                                                    <Button 
                                                        variant="outline-danger" 
                                                        size="sm"
                                                        onClick={() => handleDelete(cat)}
                                                    >
                                                        <i className="mdi mdi-delete"></i>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Form onSubmit={handleSubmit}>
                    <Modal.Header closeButton className="border-0 pb-0">
                        <Modal.Title className="fw-bold">
                            {modalMode === 'CREATE' ? 'Add New Category' : 'Edit Category'}
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="pt-3">
                        {actionError && <Alert variant="danger">{actionError}</Alert>}
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Category Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g. Technical, Cultural"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Description (Optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="What kind of events fall under this?"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer className="border-0 pt-0">
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={actionLoading}>
                            {actionLoading ? 'Saving...' : 'Save Category'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default Categories;
