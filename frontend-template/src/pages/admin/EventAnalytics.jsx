import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Table } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventAnalytics, exportParticipants, exportResults } from '../../api/reports';
import LoadingSpinner from '../../components/LoadingSpinner';

const EventAnalytics = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const result = await getEventAnalytics(eventId);
            setData(result);
        } catch (err) {
            console.error(err);
            alert("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    const handleExportParticipants = async () => {
        try {
            const blob = await exportParticipants(eventId);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `participants_${eventId}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            alert("Export failed");
        }
    };

    const handleExportResults = async () => {
         try {
            const blob = await exportResults(eventId);
             const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `results_${eventId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            alert("Export failed. Results might not be locked.");
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Analytics: {data.event_title}</h1>
                <div>
                     <Button variant="outline-primary" className="me-2" onClick={handleExportParticipants}>
                        <i className="fas fa-download me-2"></i>Participants (CSV)
                    </Button>
                    <Button variant="outline-success" className="me-2" onClick={handleExportResults}>
                         <i className="fas fa-file-pdf me-2"></i>Results (PDF)
                    </Button>
                    <Button variant="outline-secondary" onClick={() => navigate(-1)}>Back</Button>
                </div>
            </div>

            <Row>
                <Col xl={3} md={6} className="mb-4">
                    <Card className="border-left-primary shadow h-100 py-2">
                        <Card.Body>
                            <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">Total Registrations</div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">{data.registrations.total}</div>
                        </Card.Body>
                    </Card>
                </Col>
                 <Col xl={3} md={6} className="mb-4">
                    <Card className="border-left-success shadow h-100 py-2">
                        <Card.Body>
                            <div className="text-xs font-weight-bold text-success text-uppercase mb-1">Marked Present</div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">{data.attendance.present} ({data.attendance.percentage}%)</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xl={3} md={6} className="mb-4">
                    <Card className="border-left-info shadow h-100 py-2">
                        <Card.Body>
                            <div className="text-xs font-weight-bold text-info text-uppercase mb-1">Avg Score</div>
                            <div className="h5 mb-0 font-weight-bold text-gray-800">{data.average_score}</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                <Col lg={6}>
                    <Card className="shadow mb-4">
                        <Card.Header className="py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Department Distribution</h6>
                        </Card.Header>
                        <Card.Body>
                             <Table size="sm">
                                <thead>
                                    <tr>
                                        <th>Department</th>
                                        <th>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.department_breakdown.map((d, i) => (
                                        <tr key={i}>
                                            <td>{d._id || "Unknown"}</td>
                                            <td>{d.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                             </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default EventAnalytics;

