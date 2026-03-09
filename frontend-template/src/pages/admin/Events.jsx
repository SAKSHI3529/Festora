import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Button, Badge, Modal, Form, Table } from 'react-bootstrap';
import { getEvents, createEvent, updateEvent, deleteEvent, uploadRulebook } from '../../api/events';
import { getCategories } from '../../api/categories';
import { getUsers } from '../../api/admin';
import LoadingSpinner from '../../components/LoadingSpinner';

const Events = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Dropdown Data
    const [facultyList, setFacultyList] = useState([]);
    const [coordinatorList, setCoordinatorList] = useState([]);
    const [judgeList, setJudgeList] = useState([]);
    const [categoryList, setCategoryList] = useState([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        event_date: '',
        location: '',
        event_type: 'SOLO',
        min_participants: 1,
        max_participants: 100,
        max_team_size: 1,
        registration_deadline: '',
        faculty_coordinator_id: '',
        event_coordinator_ids: [],
        judge_ids: [],
        category: 'General',
        time_slot: '',
        status: 'SCHEDULED'
    });

    const [rulebookFile, setRulebookFile] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [eventsData, usersData, categoriesData] = await Promise.all([getEvents(), getUsers(), getCategories()]);
            setEvents(eventsData.map(e => ({ ...e, id: e.id || e._id })));
            
            setFacultyList(usersData.filter(u => u.role === 'faculty'));
            setCoordinatorList(usersData.filter(u => u.role === 'event_coordinator'));
            setJudgeList(usersData.filter(u => u.role === 'judge'));
            setCategoryList(categoriesData);
            
        } catch (err) {
            console.error("Error fetching data", err);
            alert("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleMultiSelectChange = (e) => {
        const { name, options } = e.target;
        const selectedValues = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selectedValues.push(options[i].value);
            }
        }
        setFormData({ ...formData, [name]: selectedValues });
    };

    const handleFileChange = (e) => {
        setRulebookFile(e.target.files[0]);
    };

    const formatTimeTo12hr = (time24) => {
        if (!time24) return '';
        const [hours, minutes] = time24.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const parse12hrTo24hr = (time12) => {
        if (!time12) return '';
        const match = time12.match(/^(0?[1-9]|1[0-2]):([0-5][0-9])\s?(AM|PM)$/i);
        if (!match) return '';
        let [_, h, m, ampm] = match;
        h = parseInt(h);
        if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
        if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
        return `${h.toString().padStart(2, '0')}:${m}`;
    };

    const openCreateModal = () => {
        setIsEdit(false);
        setFormData({
            title: '',
            description: '',
            event_date: '',
            location: '',
            event_type: 'SOLO',
            min_participants: 1,
            max_participants: 100,
            max_team_size: 1,
            registration_deadline: '',
            faculty_coordinator_id: '',
            event_coordinator_ids: [],
            judge_ids: [],
            category: 'General',
            time_slot: '',
            status: 'SCHEDULED' // Default
        });
        setRulebookFile(null);
        setStartTime('');
        setEndTime('');
        setShowModal(true);
    };

    const openEditModal = (event) => {
        setIsEdit(true);
        setCurrentId(event.id);
        
        // Parse time_slot (e.g. "10:00 AM - 01:00 PM")
        if (event.time_slot) {
            const parts = event.time_slot.split(' - ');
            if (parts.length === 2) {
                setStartTime(parse12hrTo24hr(parts[0]));
                setEndTime(parse12hrTo24hr(parts[1]));
            }
        } else {
            setStartTime('');
            setEndTime('');
        }

        setFormData({
            ...event,
            event_date: event.event_date ? event.event_date.split('T')[0] : '',
            registration_deadline: event.registration_deadline ? event.registration_deadline.split('T')[0] : '',
        });
        setRulebookFile(null);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        try {
            // Fix types
            const payload = { ...formData };
            payload.min_participants = parseInt(payload.min_participants);
            payload.max_participants = parseInt(payload.max_participants);
            payload.max_team_size = parseInt(payload.max_team_size);

            // Ensure dates are ISO
            if (payload.event_date) payload.event_date = new Date(payload.event_date).toISOString();
            if (payload.registration_deadline) payload.registration_deadline = new Date(payload.registration_deadline).toISOString();

            // Format Time Slot from pickers
            if (startTime && endTime) {
                payload.time_slot = `${formatTimeTo12hr(startTime)} - ${formatTimeTo12hr(endTime)}`;
            } else {
                payload.time_slot = formData.time_slot; // Fallback to raw string if only partially filled
            }

            let response;
            if (isEdit) {
                response = await updateEvent(currentId, payload);
            } else {
                response = await createEvent(payload);
            }
            
            // Handle Rulebook Upload
            if (rulebookFile) {
                await uploadRulebook(response.id, rulebookFile);
            }

            setShowModal(false);
            fetchData();
            alert(`Event ${isEdit ? 'updated' : 'created'} successfully!`);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Operation failed");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            try {
                await deleteEvent(id);
                fetchData();
            } catch (err) {
                console.error(err);
                alert("Failed to delete event");
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Events Management</h1>
                <Button variant="primary" onClick={openCreateModal}>
                    <i className="fas fa-plus me-2"></i> Create Event
                </Button>
            </div>

            <div className="table-responsive bg-white p-3 rounded shadow-sm">
                <Table hover>
                    <thead className="table-light">
                        <tr>
                            <th>Title</th>
                            <th>Date</th>
                            <th>Time Slot</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Coordinator</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map(event => (
                            <tr key={event.id}>
                                <td>{event.title}</td>
                                <td>{new Date(event.event_date).toLocaleDateString()}</td>
                                <td>{event.time_slot || 'N/A'}</td>
                                <td><Badge bg="secondary">{event.event_type}</Badge></td>
                                <td>
                                    <Badge bg={
                                        event.status === 'SCHEDULED' ? 'primary' :
                                        event.status === 'ONGOING' ? 'warning' :
                                        event.status === 'COMPLETED' ? 'success' : 'secondary'
                                    }>
                                        {event.status}
                                    </Badge>
                                </td>
                                <td>
                                    {/* Ideally we map ID to Name here, but for now we just show ID or look it up */}
                                    {event.faculty_coordinator_id && (
                                        <small>{facultyList.find(f => f.id === event.faculty_coordinator_id)?.full_name || 'Unknown'}</small>
                                    )}
                                </td>
                                <td>
                                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEditModal(event)}>
                                        Edit
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(event.id)}>
                                        Delete
                                    </Button>
                                    {event.rulebook_url && (
                                        <a href={`http://localhost:8000${event.rulebook_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info ms-2">
                                            Rulebook
                                        </a>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>

            {/* Event Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
                <Modal.Header closeButton>
                    <Modal.Title>{isEdit ? 'Edit Event' : 'Create Event'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Title *</Form.Label>
                                    <Form.Control name="title" value={formData.title} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Category *</Form.Label>
                                    <Form.Select name="category" value={formData.category} onChange={handleInputChange} required>
                                        <option value="">Select Category</option>
                                        {categoryList.map(cat => (
                                            <option key={cat.id || cat._id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleInputChange} />
                        </Form.Group>

                        <Row>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Event Date *</Form.Label>
                                    <Form.Control type="date" name="event_date" value={formData.event_date} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Reg. Deadline *</Form.Label>
                                    <Form.Control type="date" name="registration_deadline" value={formData.registration_deadline} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Location *</Form.Label>
                                    <Form.Control name="location" value={formData.location} onChange={handleInputChange} required />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Start Time</Form.Label>
                                    <Form.Control type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>End Time</Form.Label>
                                    <Form.Control type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select name="event_type" value={formData.event_type} onChange={handleInputChange}>
                                        <option value="SOLO">Solo</option>
                                        <option value="GROUP">Group</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Max Team Size</Form.Label>
                                    <Form.Control type="number" name="max_team_size" value={formData.max_team_size} onChange={handleInputChange} disabled={formData.event_type === 'SOLO'} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Min Participants</Form.Label>
                                    <Form.Control type="number" name="min_participants" value={formData.min_participants} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Max Participants</Form.Label>
                                    <Form.Control type="number" name="max_participants" value={formData.max_participants} onChange={handleInputChange} />
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <Row>
                             <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Faculty Coordinator *</Form.Label>
                                    <Form.Select name="faculty_coordinator_id" value={formData.faculty_coordinator_id} onChange={handleInputChange} required>
                                        <option value="">Select Faculty</option>
                                        {facultyList.map(f => (
                                            <option key={f.id} value={f.id}>{f.full_name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Event Coordinators (Hold Ctrl to select multiple)</Form.Label>
                                    <Form.Select multiple name="event_coordinator_ids" value={formData.event_coordinator_ids} onChange={handleMultiSelectChange} style={{ height: '100px' }}>
                                        {coordinatorList.map(c => (
                                            <option key={c.id} value={c.id}>{c.full_name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Judges (Hold Ctrl to select multiple)</Form.Label>
                                    <Form.Select multiple name="judge_ids" value={formData.judge_ids} onChange={handleMultiSelectChange} style={{ height: '100px' }}>
                                        {judgeList.map(j => (
                                            <option key={j.id} value={j.id}>{j.full_name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Status - shown on edit especially */}
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="SCHEDULED">Scheduled</option>
                                        <option value="ONGOING">Ongoing</option>
                                        <option value="COMPLETED">Completed</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Rulebook (PDF)</Form.Label>
                            <Form.Control type="file" accept="application/pdf" onChange={handleFileChange} />
                            <Form.Text className="text-muted">Upload to replace existing rulebook.</Form.Text>
                        </Form.Group>

                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={submitLoading}>
                            {submitLoading ? 'Saving...' : 'Save Event'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default Events;

