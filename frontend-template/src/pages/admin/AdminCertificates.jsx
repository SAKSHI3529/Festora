import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Card, Badge, Button, Table,
    Alert, Form
} from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getEvents      = () => api.get('/events').then(r => r.data);
const getCertificates = (eventId) => api.get(`/certificates/events/${eventId}`).then(r => r.data);
const generateCerts  = (eventId) => api.post(`/certificates/events/${eventId}/generate`).then(r => r.data);

const TYPE_CFG = {
    WINNER:        { bg: 'warning', text: 'dark', icon: '🏆' },
    PARTICIPATION: { bg: 'info',    text: 'white', icon: '🎓' },
};

const RANK_LABEL = { 1: '🥇 1st', 2: '🥈 2nd', 3: '🥉 3rd' };

const AdminCertificates = () => {
    const navigate       = useNavigate();
    const [searchParams] = useSearchParams();
    const preselect      = searchParams.get('eventId');

    const [events,     setEvents]     = useState([]);
    const [selectedId, setSelectedId] = useState(preselect || '');
    const [certs,      setCerts]      = useState([]);
    const [loading,    setLoading]    = useState(false);
    const [evLoading,  setEvLoading]  = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error,      setError]      = useState(null);
    const [msg,        setMsg]        = useState(null);

    // Load events
    useEffect(() => {
        getEvents()
            .then(d => {
                const norm = d.map(e => ({ ...e, id: e.id || e._id || '' }));
                setEvents(norm);
                if (preselect) fetchCerts(preselect);
            })
            .catch(() => {})
            .finally(() => setEvLoading(false));
    }, []);

    const fetchCerts = async (eventId) => {
        if (!eventId) return;
        setLoading(true);
        setError(null);
        setCerts([]);
        try {
            const data = await getCertificates(eventId);
            setCerts(data.map(c => ({ ...c, id: c.id || c._id || '' })));
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load certificates.');
        } finally {
            setLoading(false);
        }
    };

    const handleEventChange = (id) => {
        setSelectedId(id);
        setMsg(null);
        if (id) fetchCerts(id);
        else setCerts([]);
    };

    const handleGenerate = async () => {
        if (!selectedEvent) return;
        if (!window.confirm(
            `Generate certificates for "${selectedEvent.title}"?\n\nThis will create Winner (top 3) and Participation certificates. This action cannot be repeated.`
        )) return;
        setGenerating(true);
        setMsg(null);
        try {
            const res = await generateCerts(selectedId);
            setMsg({ type: 'success', text: res.message || 'Certificates generated successfully!' });
            await fetchCerts(selectedId);
        } catch (err) {
            setMsg({ type: 'danger', text: err.response?.data?.detail || 'Generation failed.' });
        } finally {
            setGenerating(false);
        }
    };

    const selectedEvent = events.find(e => e.id === selectedId);
    const isLocked      = selectedEvent?.is_result_locked;
    const isCompleted   = selectedEvent?.status === 'COMPLETED';
    const canGenerate   = isCompleted && isLocked && certs.length === 0;

    const winners       = certs.filter(c => c.certificate_type === 'WINNER');
    const participation = certs.filter(c => c.certificate_type === 'PARTICIPATION');

    return (
        <Container fluid>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">🎓 Certificate Management</h4>
                    <small className="text-muted">Generate and view certificates for completed events</small>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/scores')}>
                    ← Score Management
                </Button>
            </div>

            {/* Event Selector */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="align-items-end g-3">
                        <Col md={5}>
                            <Form.Label className="fw-semibold">Select Event</Form.Label>
                            {evLoading ? (
                                <div className="text-muted">Loading events…</div>
                            ) : (
                                <Form.Select
                                    value={selectedId}
                                    onChange={e => handleEventChange(e.target.value)}
                                >
                                    <option value="">— Choose an event —</option>
                                    {events.map(ev => (
                                        <option key={ev.id} value={ev.id}>
                                            {ev.title} [{ev.status}]{ev.is_result_locked ? ' 🔒' : ''}
                                        </option>
                                    ))}
                                </Form.Select>
                            )}
                        </Col>
                        {selectedEvent && (
                            <Col md="auto" className="d-flex gap-2 align-items-center flex-wrap">
                                {!isCompleted && (
                                    <Badge bg="secondary">Not Completed</Badge>
                                )}
                                {isCompleted && !isLocked && (
                                    <Badge bg="warning" text="dark">🔓 Results Not Locked</Badge>
                                )}
                                {isLocked && certs.length > 0 && (
                                    <Badge bg="success">✅ {certs.length} Certificates Generated</Badge>
                                )}
                                <Button
                                    variant="primary"
                                    disabled={!canGenerate || generating}
                                    onClick={handleGenerate}
                                >
                                    {generating
                                        ? '⏳ Generating…'
                                        : certs.length > 0
                                            ? '✅ Already Generated'
                                            : '🎓 Generate Certificates'}
                                </Button>
                            </Col>
                        )}
                    </Row>

                    {/* Guards */}
                    {selectedEvent && !isCompleted && (
                        <Alert variant="info" className="mt-3 mb-0">
                            Event must be <strong>COMPLETED</strong> to generate certificates.
                        </Alert>
                    )}
                    {selectedEvent && isCompleted && !isLocked && (
                        <Alert variant="warning" className="mt-3 mb-0">
                            Results must be <strong>locked</strong> before generating certificates.
                            Go to <a href="/admin/results" style={{ textDecoration: 'underline' }}>Results</a> to lock them.
                        </Alert>
                    )}
                </Card.Body>
            </Card>

            {msg && (
                <Alert variant={msg.type} dismissible onClose={() => setMsg(null)}>
                    {msg.text}
                </Alert>
            )}
            {error && <Alert variant="danger">{error}</Alert>}

            {/* Certificates */}
            {loading && <LoadingSpinner />}

            {!loading && selectedId && certs.length > 0 && (
                <>
                    {/* Summary */}
                    <Row className="g-3 mb-4">
                        <Col xs={6} md={3}>
                            <Card className="border-0 shadow-sm text-center py-3" style={{ borderRadius: 12 }}>
                                <div className="h4 fw-bold mb-0" style={{ color: '#f59e0b' }}>{winners.length}</div>
                                <div className="text-muted" style={{ fontSize: 12 }}>🏆 Winner Certs</div>
                            </Card>
                        </Col>
                        <Col xs={6} md={3}>
                            <Card className="border-0 shadow-sm text-center py-3" style={{ borderRadius: 12 }}>
                                <div className="h4 fw-bold mb-0" style={{ color: '#6366f1' }}>{participation.length}</div>
                                <div className="text-muted" style={{ fontSize: 12 }}>🎓 Participation Certs</div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Table */}
                    <div className="bg-white rounded shadow-sm p-3">
                        <Table hover responsive className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Student</th>
                                    <th>Type</th>
                                    <th>Rank</th>
                                    <th>Download</th>
                                </tr>
                            </thead>
                            <tbody>
                                {certs.map(cert => {
                                    const tCfg = TYPE_CFG[cert.certificate_type] || TYPE_CFG['PARTICIPATION'];
                                    return (
                                        <tr key={cert.id}>
                                            <td className="fw-semibold">
                                                {cert.student_name || cert.student_id}
                                            </td>
                                            <td>
                                                <Badge bg={tCfg.bg} text={tCfg.text}>
                                                    {tCfg.icon} {cert.certificate_type}
                                                </Badge>
                                            </td>
                                            <td>
                                                {cert.rank
                                                    ? <span className="fw-bold">{RANK_LABEL[cert.rank] || `#${cert.rank}`}</span>
                                                    : <span className="text-muted">—</span>}
                                            </td>
                                            <td>
                                                <a
                                                    href={`${API_BASE}${cert.certificate_url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-sm btn-outline-primary"
                                                >
                                                    ⬇ Download PDF
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                </>
            )}

            {!loading && selectedId && certs.length === 0 && !error && isLocked && (
                <div className="text-center py-5 text-muted">
                    <div style={{ fontSize: 64 }}>📄</div>
                    <p>No certificates generated yet. Click "Generate Certificates" above.</p>
                </div>
            )}

            {!selectedId && (
                <div className="text-center py-5 text-muted">
                    <div style={{ fontSize: 64 }}>🎓</div>
                    <p>Select a completed, locked event to manage certificates.</p>
                </div>
            )}
        </Container>
    );
};

export default AdminCertificates;
