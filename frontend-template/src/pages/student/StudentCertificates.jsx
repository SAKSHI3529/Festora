import React, { useEffect, useState } from 'react';
import { Container, Card, Alert, Table } from 'react-bootstrap';
import { getMyCertificates } from '../../api/certificates';
import LoadingSpinner from '../../components/LoadingSpinner';

const StudentCertificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getMyCertificates();
            setCertificates(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">My Certificates</h1>

            {certificates.length === 0 ? (
                <Alert variant="info">You haven't earned any certificates yet.</Alert>
            ) : (
                <Card className="shadow-sm border-0">
                    <Table responsive hover className="mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Event</th>
                                <th>Type</th>
                                <th>Rank</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {certificates.map(c => (
                                <tr key={c.id}>
                                    {/* Backend certificate object doesn't have event title directly populated usually. 
                                        But schema might? Let's check schema/model.
                                        Schema has 'event_id'. No lookup in `get_my_certificates`.
                                        We might need to fetch event title separately or just show ID.
                                        Or update backend to lookup event title.
                                        For now, just showing ID or "Event". 
                                        Actually, let's fix backend to include Event Title if easy, or ignore.
                                    */}
                                    <td>Event #{c.event_id.substr(-4)}</td> 
                                    <td>{c.certificate_type}</td>
                                    <td>{c.rank || '-'}</td>
                                    <td>
                                        <a href={`${API_URL}${c.certificate_url}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
                                            Download PDF
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            )}
        </Container>
    );
};

export default StudentCertificates;

