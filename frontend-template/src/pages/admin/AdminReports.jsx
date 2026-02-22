import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, exportParticipants, exportResults } from '../../api/reports';
import { getEvents } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const fmtMoney = (n) =>
    n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

// ─── Chart Component ──────────────────────────────────────────────────────────
const BudgetDonut = ({ data, totalAmount }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    return (
        <div className="text-center position-relative mx-auto" style={{ width: '180px', height: '180px' }}>
            <svg viewBox="0 0 100 100" className="w-100 h-100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f3f3" strokeWidth="10" />
                {data.map((item, index) => {
                    const percentage = totalAmount > 0 ? (item.amount / totalAmount) : 0;
                    const segmentLength = percentage * circumference;
                    const dashOffset = accumulatedOffset;
                    accumulatedOffset -= segmentLength;
                    if (percentage === 0) return null;
                    return (
                        <circle
                            key={index}
                            cx="50" cy="50" r={radius} fill="none"
                            stroke={item.color}
                            strokeWidth="10"
                            strokeDasharray={`${segmentLength} ${circumference}`}
                            strokeDashoffset={dashOffset}
                            transform="rotate(-90 50 50)"
                            style={{ transition: 'all 1s ease-in-out' }}
                        >
                            <animate
                                attributeName="stroke-dashoffset"
                                from={circumference}
                                to={dashOffset}
                                dur="1.5s"
                                fill="freeze"
                                calcMode="spline"
                                keySplines="0.4 0 0.2 1"
                                keyTimes="0 1"
                            />
                        </circle>
                    );
                })}
            </svg>
            <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ marginTop: '2px' }}>
                <div className="fw-bold" style={{ fontSize: '16px', lineHeight: 1 }}>
                    {totalAmount > 100000 ? `₹${(totalAmount/1000).toFixed(0)}k` : fmtMoney(totalAmount)}
                </div>
                <div className="text-muted" style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
            </div>
        </div>
    );
};

const AdminReports = () => {
    const [stats, setStats] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [statsData, eventsData] = await Promise.all([
                getDashboardStats(),
                getEvents()
            ]);
            setStats(statsData);
            setEvents(eventsData.map(e => ({ ...e, id: e.id || e._id })));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (eventId, type, filename) => {
        try {
            const blob = type === 'CSV' 
                ? await exportParticipants(eventId) 
                : await exportResults(eventId);
            
            // Check if the response is actually an error (JSON disguised as Blob)
            if (blob.type === 'application/json') {
                const text = await blob.text();
                const errorData = JSON.parse(text);
                throw new Error(errorData.detail || `Server returned error for ${type}`);
            }

            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.detail || err.message;
            alert(`Failed to export ${type}: ${errorMessage}`);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!stats) return null;

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">Reports Dashboard</h1>
            
            <Row>
                <Col xl={3} md={6} className="mb-4">
                    <Card className="border-left-primary shadow h-100 py-2 border-primary border-4 border-end-0 border-top-0 border-bottom-0">
                        <Card.Body>
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                        Total Events</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.events.total}</div>
                                </div>
                                <div className="col-auto">
                                    <i className="fas fa-calendar fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} md={6} className="mb-4">
                    <Card className="border-left-success shadow h-100 py-2 border-success border-4 border-end-0 border-top-0 border-bottom-0">
                        <Card.Body>
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Total Registrations</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.registrations.total}</div>
                                </div>
                                <div className="col-auto">
                                    <i className="fas fa-clipboard-list fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col xl={3} md={6} className="mb-4">
                    <Card className="border-left-info shadow h-100 py-2 border-info border-4 border-end-0 border-top-0 border-bottom-0">
                        <Card.Body>
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                                        Approved Participation</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">
                                        {stats.registrations.total > 0 ? ((stats.registrations.approved / stats.registrations.total) * 100).toFixed(1) : 0}%
                                    </div>
                                </div>
                                <div className="col-auto">
                                    <i className="fas fa-clipboard-check fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                 <Col xl={3} md={6} className="mb-4">
                    <Card className="border-left-warning shadow h-100 py-2 border-warning border-4 border-end-0 border-top-0 border-bottom-0">
                        <Card.Body>
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                        Budget Requested</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">₹{stats.finances.requested.toLocaleString()}</div>
                                </div>
                                <div className="col-auto">
                                    <i className="fas fa-rupee-sign fa-2x text-gray-300"></i>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                 <Col lg={12} className="mb-4">
                    <Card className="shadow mb-4 border-0">
                        <Card.Header className="py-3 bg-white border-0 d-flex justify-content-between align-items-center">
                            <h6 className="m-0 font-weight-bold text-primary">Event Reports & Exports</h6>
                        </Card.Header>
                        <Card.Body>
                            <Alert variant="info" className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                                <i className="mdi mdi-information-outline me-2"></i>
                                <strong>Note:</strong> PDF Results are only available for events with <strong>COMPLETED</strong> status and <strong>Locked Results</strong>. 
                                You can lock results in the <a href="#" onClick={(e) => { e.preventDefault(); navigate('/admin/scores'); }}>Score Management</a> section.
                            </Alert>
                            <Table hover responsive className="align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Event Title</th>
                                        <th>Status</th>
                                        <th className="text-center">Registrations</th>
                                        <th className="text-end">Actions / Exports</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center py-4 text-muted">No events available.</td>
                                        </tr>
                                    ) : (
                                        events.map(ev => (
                                            <tr key={ev.id}>
                                                <td className="fw-bold">{ev.title}</td>
                                                <td>
                                                    <Badge bg={ev.status === 'COMPLETED' ? 'secondary' : ev.status === 'ONGOING' ? 'danger' : 'warning'}>
                                                        {ev.status}
                                                    </Badge>
                                                </td>
                                                <td className="text-center">{ev.registration_count || 0}</td>
                                                <td className="text-end">
                                                    <div className="d-flex justify-content-end gap-2">
                                                        <Button 
                                                            variant="outline-primary" 
                                                            size="sm"
                                                            title="View Analytics"
                                                            onClick={() => navigate(`/admin/reports/events/${ev.id}`)}
                                                        >
                                                            <i className="mdi mdi-chart-line"></i>
                                                        </Button>
                                                        <Button 
                                                            variant="outline-success" 
                                                            size="sm"
                                                            title="Export Participants (CSV)"
                                                            onClick={() => handleDownload(ev.id, 'CSV', `participants_${(ev.title || 'event').replace(/\s+/g, '_')}.csv`)}
                                                        >
                                                            <i className="mdi mdi-account-group"></i> CSV
                                                        </Button>
                                                        <Button 
                                                            variant="outline-danger" 
                                                            size="sm"
                                                            title="Export Results (PDF)"
                                                            disabled={ev.is_result_locked !== true}
                                                            onClick={() => handleDownload(ev.id, 'PDF', `results_${(ev.title || 'event').replace(/\s+/g, '_')}.pdf`)}
                                                        >
                                                            <i className="mdi mdi-file-pdf-outline"></i> PDF
                                                        </Button>
                                                    </div>
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

            <Row>
                 <Col lg={7} className="mb-4">
                    <Card className="shadow mb-4 border-0">
                        <Card.Header className="py-3 bg-white border-0">
                            <h6 className="m-0 font-weight-bold text-primary">Global Budget Analysis</h6>
                        </Card.Header>
                        <Card.Body>
                            <Row className="align-items-center">
                                <Col md={5} className="text-center">
                                    <BudgetDonut 
                                        data={[
                                            { label: 'Approved', amount: stats.finances.approved_amount, color: '#1cc88a' },
                                            { label: 'Pending',  amount: stats.finances.pending_amount,  color: '#f6c23e' },
                                            { label: 'Rejected', amount: stats.finances.rejected_amount, color: '#e74a3b' },
                                        ]} 
                                        totalAmount={stats.finances.requested} 
                                    />
                                </Col>
                                <Col md={7}>
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small font-weight-bold">Approved Budget <i className="fas fa-circle text-success ml-1" style={{fontSize: 8}}></i></span>
                                            <span className="small font-weight-bold">₹{stats.finances.approved_amount.toLocaleString()}</span>
                                        </div>
                                        <div className="progress mb-3" style={{height: 8}}>
                                            <div className="progress-bar bg-success" role="progressbar" style={{width: `${(stats.finances.approved_amount / (stats.finances.requested || 1)) * 100}%`}}></div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small font-weight-bold">Pending Requests <i className="fas fa-circle text-warning ml-1" style={{fontSize: 8}}></i></span>
                                            <span className="small font-weight-bold">₹{stats.finances.pending_amount.toLocaleString()}</span>
                                        </div>
                                        <div className="progress mb-3" style={{height: 8}}>
                                            <div className="progress-bar bg-warning" role="progressbar" style={{width: `${(stats.finances.pending_amount / (stats.finances.requested || 1)) * 100}%`}}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small font-weight-bold">Rejected <i className="fas fa-circle text-danger ml-1" style={{fontSize: 8}}></i></span>
                                            <span className="small font-weight-bold">₹{stats.finances.rejected_amount.toLocaleString()}</span>
                                        </div>
                                        <div className="progress" style={{height: 8}}>
                                            <div className="progress-bar bg-danger" role="progressbar" style={{width: `${(stats.finances.rejected_amount / (stats.finances.requested || 1)) * 100}%`}}></div>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                 </Col>
                 
                 <Col lg={5} className="mb-4">
                     <Card className="shadow mb-4 border-0 h-100">
                        <Card.Header className="py-3 bg-white border-0 d-flex justify-content-between align-items-center">
                            <h6 className="m-0 font-weight-bold text-primary">Event Analytics</h6>
                             <Button size="sm" variant="primary" onClick={() => navigate('/admin/events')}>View All Events</Button>
                        </Card.Header>
                        <Card.Body className="d-flex flex-column justify-content-center">
                            <div className="text-center py-4">
                                <i className="fas fa-chart-line fa-3x text-gray-200 mb-3"></i>
                                <p className="text-muted">Detailed event-wise analytics including attendance and performance trends are available in the individual Event Management pages.</p>
                            </div>
                        </Card.Body>
                     </Card>
                 </Col>
            </Row>

        </Container>
    );
};

export default AdminReports;

