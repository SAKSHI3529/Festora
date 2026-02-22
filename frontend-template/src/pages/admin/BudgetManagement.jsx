import React, { useEffect, useState } from 'react';
import {
    Container, Row, Col, Table, Badge, Button,
    Form, Modal, Alert, Card
} from 'react-bootstrap';
import api from '../../api/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

// ─── API helpers ─────────────────────────────────────────────────────────────
const getBudgets      = () => api.get('/budgets').then(r => r.data);

const approveBudget   = (id, approved_amount) =>
    api.put(`/budgets/${id}/approve`, { approved_amount }).then(r => r.data);
const rejectBudget    = (id) =>
    api.put(`/budgets/${id}/reject`).then(r => r.data);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_BADGE = {
    PENDING:  { bg: 'warning',   text: 'dark',  label: '⏳ Pending'  },
    APPROVED: { bg: 'success',   text: 'white', label: '✅ Approved' },
    REJECTED: { bg: 'danger',    text: 'white', label: '❌ Rejected' },
};

const fmt = (dateStr) =>
    dateStr
        ? new Date(dateStr).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
          })
        : '—';

const fmtMoney = (n) =>
    n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

// ─── Component ────────────────────────────────────────────────────────────────
const BudgetManagement = () => {
    const [budgets,     setBudgets]     = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);

    // Filters
    const [statusFilter,  setStatusFilter]  = useState('PENDING');
    const [searchTerm,    setSearchTerm]    = useState('');

    // Approve modal state
    const [approveModal,      setApproveModal]      = useState(false);
    const [selectedBudget,    setSelectedBudget]    = useState(null);
    const [approvedAmount,    setApprovedAmount]    = useState('');
    const [actionLoading,     setActionLoading]     = useState(false);
    const [actionMsg,         setActionMsg]         = useState(null);

    // ── Load data ───────────────────────────────────────────────────────────
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const raw = await getBudgets();
            // The backend now enriches each budget with event_title and requester_name,
            // and explicitly sets id = str(_id), so no client-side lookup needed.
            const normalized = raw.map(b => ({
                ...b,
                id: b.id || b._id || '',
            }));
            console.log('[Budget] sample:', normalized[0]);
            setBudgets(normalized);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load budgets.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Use server-enriched fields directly — no client-side ID lookups needed
    const getEventTitle = (budget) => budget.event_title || budget.event_id || '—';
    const getUserName   = (budget) => budget.requester_name || budget.requested_by || '—';
    const getApproverName = (budget) => budget.approver_name || budget.approved_by || '—';

    // ── Filtered list ───────────────────────────────────────────────────────
    const filtered = budgets.filter(b => {
        const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
        const title = (b.event_title || b.event_id || '').toLowerCase();
        const matchSearch = !searchTerm || title.includes(searchTerm.toLowerCase());
        return matchStatus && matchSearch;
    });

    // ── Summary counts ──────────────────────────────────────────────────────
    const counts = {
        ALL:      budgets.length,
        PENDING:  budgets.filter(b => b.status === 'PENDING').length,
        APPROVED: budgets.filter(b => b.status === 'APPROVED').length,
        REJECTED: budgets.filter(b => b.status === 'REJECTED').length,
    };

    // ── Approve ─────────────────────────────────────────────────────────────
    const openApprove = (budget) => {
        setSelectedBudget(budget);
        setApprovedAmount(String(budget.requested_amount));
        setApproveModal(true);
        setActionMsg(null);
    };

    const submitApprove = async () => {
        const amt = parseFloat(approvedAmount);
        if (isNaN(amt) || amt <= 0) {
            setActionMsg({ type: 'danger', text: 'Please enter a valid approved amount.' });
            return;
        }
        if (amt > selectedBudget.requested_amount) {
            setActionMsg({ type: 'danger', text: 'Approved amount cannot exceed requested amount.' });
            return;
        }
        setActionLoading(true);
        try {
            await approveBudget(selectedBudget.id, amt);
            setApproveModal(false);
            await loadData();  // reload all to get fresh enriched data
        } catch (err) {
            setActionMsg({ type: 'danger', text: err.response?.data?.detail || 'Approval failed.' });
        } finally {
            setActionLoading(false);
        }
    };

    // ── Reject ──────────────────────────────────────────────────────────────
    const handleReject = async (budget) => {
        if (!window.confirm(`Reject budget request for "${getEventTitle(budget)}"?`)) return;
        try {
            await rejectBudget(budget.id);
            await loadData();  // reload all to get fresh enriched data
        } catch (err) {
            alert(err.response?.data?.detail || 'Rejection failed.');
        }
    };


    // ── Render ──────────────────────────────────────────────────────────────
    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">💰 Budget Approval</h4>
                    <small className="text-muted">Review and approve faculty budget requests</small>
                </div>
                <Button variant="outline-secondary" size="sm" onClick={loadData}>
                    🔄 Refresh
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Summary Cards */}
            <Row className="g-3 mb-4">
                {[
                    { label: 'Total Requested', value: budgets.reduce((acc, b) => acc + b.requested_amount, 0), color: '#6366f1', icon: 'mdi-cash-multiple' },
                    { label: 'Total Pending',   value: budgets.filter(b => b.status === 'PENDING').reduce((acc, b) => acc + b.requested_amount, 0),  color: '#f59e0b', icon: 'mdi-clock-outline' },
                    { label: 'Total Approved',  value: budgets.filter(b => b.status === 'APPROVED').reduce((acc, b) => acc + (b.approved_amount || 0), 0), color: '#10b981', icon: 'mdi-check-circle-outline' },
                ].map(({ label, value, color, icon }) => (
                    <Col xs={12} md={4} key={label}>
                        <Card className="border-0 shadow-sm py-2 px-3 h-100" style={{ borderRadius: 12, borderLeft: `5px solid ${color}` }}>
                            <div className="d-flex align-items-center">
                                <div className="rounded-circle p-3 me-3" style={{ backgroundColor: color + '15', color: color }}>
                                    <i className={`mdi ${icon} h4 mb-0`}></i>
                                </div>
                                <div>
                                    <div className="text-muted small fw-bold text-uppercase mb-0">{label}</div>
                                    <div className="h4 fw-bold mb-0">{fmtMoney(value)}</div>
                                </div>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row className="g-3 mb-4">
                {[
                    { label: 'All Requests',    key: 'ALL',      count: counts.ALL,      color: '#6366f1' },
                    { label: 'Pending',  key: 'PENDING',  count: counts.PENDING,  color: '#f59e0b' },
                    { label: 'Approved', key: 'APPROVED', count: counts.APPROVED, color: '#10b981' },
                    { label: 'Rejected', key: 'REJECTED', count: counts.REJECTED, color: '#ef4444' },
                ].map(({ label, key, count, color }) => (
                    <Col xs={6} md={3} key={key}>
                        <Card
                            className="border-0 shadow-sm text-center py-2"
                            style={{
                                cursor: 'pointer',
                                borderBottom: statusFilter === key ? `3px solid ${color}` : 'none',
                                borderRadius: 12,
                                transition: 'all 0.2s ease',
                                backgroundColor: statusFilter === key ? color + '05' : 'white'
                            }}
                            onClick={() => setStatusFilter(key)}
                        >
                            <div className="h5 fw-bold mb-0" style={{ color }}>{count}</div>
                            <div className="text-muted small">{label}</div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Filter Bar */}
            <Row className="g-2 mb-3">
                <Col md={4}>
                    <Form.Control
                        placeholder="🔍 Search by event name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </Col>
                <Col md={3}>
                    <Form.Select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </Form.Select>
                </Col>
            </Row>

            {/* Table */}
            <div className="bg-white rounded shadow-sm p-3">
                <Table hover responsive className="mb-0">
                    <thead className="table-light">
                        <tr>
                            <th>Event</th>
                            <th>Requested By</th>
                            <th>Description</th>
                            <th>Requested</th>
                            <th>Approved</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th style={{ width: 160 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center text-muted py-5">
                                    No budget requests found.
                                </td>
                            </tr>
                        ) : filtered.map(budget => {
                            const cfg = STATUS_BADGE[budget.status] || STATUS_BADGE['PENDING'];
                            return (
                                <tr key={budget.id}>
                                    <td className="fw-semibold">{getEventTitle(budget)}</td>
                                    <td>{getUserName(budget)}</td>
                                    <td style={{ maxWidth: 200, fontSize: 13 }}>
                                        <span title={budget.description}>
                                            {budget.description?.length > 60
                                                ? budget.description.slice(0, 60) + '…'
                                                : budget.description}
                                        </span>
                                    </td>
                                    <td className="fw-semibold text-danger">
                                        {fmtMoney(budget.requested_amount)}
                                    </td>
                                    <td className="fw-semibold text-success">
                                        {budget.status === 'APPROVED'
                                            ? fmtMoney(budget.approved_amount)
                                            : '—'}
                                    </td>
                                    <td style={{ fontSize: 13 }}>{fmt(budget.requested_at)}</td>
                                    <td>
                                        <Badge bg={cfg.bg} text={cfg.text}>
                                            {cfg.label}
                                        </Badge>
                                    </td>
                                    <td>
                                        {budget.status === 'PENDING' ? (
                                            <div className="d-flex gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="success"
                                                    onClick={() => openApprove(budget)}
                                                >
                                                    ✓ Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => handleReject(budget)}
                                                >
                                                    ✗ Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: 12 }}>
                                                {budget.status === 'APPROVED'
                                                    ? `By: ${getApproverName(budget)}`
                                                    : 'No action needed'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </div>

            {/* Approve Modal */}
            <Modal show={approveModal} onHide={() => setApproveModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>✅ Approve Budget Request</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {actionMsg && (
                        <Alert variant={actionMsg.type} className="mb-3">
                            {actionMsg.text}
                        </Alert>
                    )}
                    {selectedBudget && (
                        <>
                            <p className="mb-1">
                                <strong>Event:</strong> {getEventTitle(selectedBudget)}
                            </p>
                            <p className="mb-1">
                                <strong>Requested By:</strong> {getUserName(selectedBudget)}
                            </p>
                            <p className="mb-1">
                                <strong>Description:</strong> {selectedBudget.description}
                            </p>
                            {selectedBudget.justification && (
                                <p className="mb-3">
                                    <strong>Justification:</strong> {selectedBudget.justification}
                                </p>
                            )}
                            <Form.Group>
                                <Form.Label>
                                    Approved Amount
                                    <span className="text-muted ms-1" style={{ fontSize: 12 }}>
                                        (max: {fmtMoney(selectedBudget.requested_amount)})
                                    </span>
                                </Form.Label>
                                <Form.Control
                                    type="number"
                                    value={approvedAmount}
                                    onChange={e => setApprovedAmount(e.target.value)}
                                    min={1}
                                    max={selectedBudget.requested_amount}
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setApproveModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={submitApprove} disabled={actionLoading}>
                        {actionLoading ? 'Approving…' : '✅ Confirm Approve'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default BudgetManagement;
