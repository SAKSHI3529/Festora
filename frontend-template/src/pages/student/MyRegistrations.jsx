import React, { useEffect, useState, useContext } from 'react';
import { Container, Card, Button, Badge, Alert, Table } from 'react-bootstrap';
import { getMyRegistrations, cancelRegistration } from '../../api/registrations';
import { getEvents } from '../../api/events';
import { getTeam } from '../../api/teams';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const MyRegistrations = () => {
    const { user } = useContext(AuthContext);
    const [registrations, setRegistrations] = useState([]);
    const [events, setEvents] = useState({});
    const [teams, setTeams] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch registrations and events
            const [regData, eventsData] = await Promise.all([
                getMyRegistrations(),
                getEvents()
            ]);

            setRegistrations(regData);

            // Create events map
            const eventsMap = {};
            eventsData.forEach(e => eventsMap[e.id] = e);
            setEvents(eventsMap);

            // Fetch teams for group registrations
            const teamIds = regData
                .filter(r => r.team_id)
                .map(r => r.team_id);
            
            const uniqueTeamIds = [...new Set(teamIds)];
            
            // Only fetch if we have unique teams
            if (uniqueTeamIds.length > 0) {
                 const teamPromises = uniqueTeamIds.map(id => getTeam(id).catch(e => null));
                 const teamsData = await Promise.all(teamPromises);
                 
                 const teamsMap = {};
                 teamsData.forEach(t => {
                     if (t) teamsMap[t.id] = t;
                 });
                 setTeams(teamsMap);
            }

        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (regId) => {
        if (!window.confirm("Are you sure you want to cancel?")) return;
        try {
            await cancelRegistration(regId);
            fetchData(); // Refresh
        } catch (err) {
            alert(err.response?.data?.detail || "Cancellation failed");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING': return 'warning';
            case 'APPROVED': return 'success';
            case 'REJECTED': return 'danger';
            default: return 'secondary';
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
            <h1 className="h3 mb-4 text-gray-800">My Registrations</h1>

            {registrations.length === 0 ? (
                <Alert variant="info">You have not registered for any events yet.</Alert>
            ) : (
                <Card className="shadow-sm border-0">
                    <Table responsive hover className="mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Event</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Team / Details</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.map(reg => {
                                const event = events[reg.event_id];
                                const team = reg.team_id ? teams[reg.team_id] : null;
                                const isPending = reg.status === 'PENDING';
                                
                                return (
                                    <tr key={reg.id}>
                                        <td>
                                            <div className="fw-bold">{event ? event.title : 'Unknown Event'}</div>
                                            {event && <small className="text-muted">{event.location}</small>}
                                        </td>
                                        <td>
                                            {event ? new Date(event.event_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td>
                                            {event && <Badge bg={event.event_type === 'SOLO' ? 'info' : 'primary'}>{event.event_type}</Badge>}
                                        </td>
                                        <td>
                                            <Badge bg={getStatusBadge(reg.status)}>{reg.status}</Badge>
                                        </td>
                                        <td>
                                            {team ? (
                                                <div>
                                                    <strong>{team.team_name}</strong>
                                                    <div className="small text-muted">
                                                        Leader: {team.leader_id === user.id ? 'You' : team.leader_id}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted small">Individual</span>
                                            )}
                                        </td>
                                        <td>
                                            {isPending && (
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm" 
                                                    onClick={() => handleCancel(reg.id)}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                            {/* Add View Result / Certificate logic here later */}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </Card>
            )}
        </Container>
    );
};

export default MyRegistrations;

