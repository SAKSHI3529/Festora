import React, { useEffect, useState } from 'react';
import { Container, Button, Alert, Table } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventCertificates, generateCertificates } from '../../api/certificates';
import { getEvent } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const CertificateManager = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [msg, setMsg] = useState(null);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const [evt, certs] = await Promise.all([
                getEvent(eventId),
                getEventCertificates(eventId)
            ]);
            setEvent(evt);
            setCertificates(certs);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!window.confirm("This will generate certificates for all eligible participants. Continue?")) return;
        setGenerating(true);
        try {
            const res = await generateCertificates(eventId);
            setMsg({ type: 'success', text: res.message });
            fetchData();
        } catch (err) {
            setMsg({ type: 'danger', text: err.response?.data?.detail || "Generation failed" });
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Certificates: {event.title}</h1>
                <Button variant="outline-secondary" onClick={() => navigate(-1)}>Back</Button>
            </div>

            {msg && <Alert variant={msg.type} dismissible onClose={() => setMsg(null)}>{msg.text}</Alert>}

            {!event.is_result_locked ? (
                 <Alert variant="warning">Results must be locked before generating certificates.</Alert>
            ) : (
                <div className="mb-4">
                    <Button 
                        variant="primary" 
                        onClick={handleGenerate} 
                        disabled={generating || certificates.length > 0}
                    >
                        {generating ? "Generating..." : certificates.length > 0 ? "Certificates Generated" : "Generate Certificates"}
                    </Button>
                    {certificates.length > 0 && <span className="ms-3 text-success">Certificates have been generated.</span>}
                </div>
            )}

            <div className="table-responsive bg-white rounded shadow-sm">
                <Table hover className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Student ID</th>
                            <th>Type</th>
                            <th>Rank</th>
                            <th>Download</th>
                        </tr>
                    </thead>
                    <tbody>
                        {certificates.length === 0 ? (
                            <tr><td colSpan="4" className="text-center py-4">No certificates generated yet.</td></tr>
                        ) : (
                            certificates.map(c => (
                                <tr key={c.id}>
                                    <td>{c.student_id}</td>
                                    <td>{c.certificate_type}</td>
                                    <td>{c.rank || '-'}</td>
                                    <td>
                                        <a href={`${API_URL}${c.certificate_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                            Download
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
};

export default CertificateManager;

