import React, { useEffect, useState } from 'react';
import { Container, Button, Table, Tabs, Tab } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventParticipants, approveRegistration, rejectRegistration } from '../../api/registrations';
import { getEventTeams, approveTeam, rejectTeam } from '../../api/teams';
import LoadingSpinner from '../../components/LoadingSpinner';

const Approvals = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const [regData, teamData] = await Promise.all([
                getEventParticipants(eventId),
                getEventTeams(eventId)
            ]);
            setRegistrations(regData);
            setTeams(teamData);
        } catch (err) {
            setError("Failed to load data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (type, id, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this?`)) return;
        try {
            if (type === 'registration') {
                if (action === 'approve') await approveRegistration(id);
                else await rejectRegistration(id);
            } else {
                if (action === 'approve') await approveTeam(id);
                else await rejectTeam(id);
            }
            fetchData(); // Refresh
        } catch (err) {
            alert(err.response?.data?.detail || "Action failed");
        }
    };

    if (loading) return <LoadingSpinner />;

    // Filter for Pending
    const pendingRegs = registrations.filter(r => r.status === 'PENDING' && !r.team_id); // Solo pending
    const pendingTeams = teams.filter(t => t.status === 'PENDING');

    return (
        <Container fluid>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Approvals</h1>
                <Button variant="outline-secondary" onClick={() => navigate(-1)}>Back</Button>
            </div>

            <Tabs defaultActiveKey="registrations" className="mb-3">
                <Tab eventKey="registrations" title={`Pending Registrations (${pendingRegs.length})`}>
                    <div className="table-responsive bg-white rounded shadow-sm">
                        <Table hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Participant</th>
                                    <th>Reg. No</th>
                                    <th>Department</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingRegs.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-4">No pending individual registrations.</td></tr>
                                ) : (
                                    pendingRegs.map(reg => (
                                        <tr key={reg.id}>
                                            <td>{reg.student_name}</td>
                                            <td>{reg.registration_number}</td>
                                            <td>{reg.department}</td>
                                            <td>
                                                <Button variant="success" size="sm" className="me-2" onClick={() => handleAction('registration', reg.id, 'approve')}>Approve</Button>
                                                <Button variant="danger" size="sm" onClick={() => handleAction('registration', reg.id, 'reject')}>Reject</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
                <Tab eventKey="teams" title={`Pending Teams (${pendingTeams.length})`}>
                    <div className="table-responsive bg-white rounded shadow-sm">
                        <Table hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Team Name</th>
                                    <th>Leader ID</th>
                                    <th>Member Count</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingTeams.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-4">No pending teams.</td></tr>
                                ) : (
                                    pendingTeams.map(team => (
                                        <tr key={team.id}>
                                            <td>{team.team_name}</td>
                                            <td>{team.leader_id}</td>
                                            <td>{team.member_ids.length}</td>
                                            <td>
                                                <Button variant="success" size="sm" className="me-2" onClick={() => handleAction('team', team.id, 'approve')}>Approve</Button>
                                                <Button variant="danger" size="sm" onClick={() => handleAction('team', team.id, 'reject')}>Reject</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Tab>
            </Tabs>
        </Container>
    );
};

export default Approvals;

