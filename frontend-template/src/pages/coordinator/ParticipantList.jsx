import React, { useEffect, useState } from 'react';
import { Container, Button, Badge, Table } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { getParticipants } from '../../api/events';
import LoadingSpinner from '../../components/LoadingSpinner';

const ParticipantList = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [eventId]);

    const fetchData = async () => {
        try {
            const data = await getParticipants(eventId);
            setParticipants(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <Container fluid>
             <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 text-gray-800">Participants</h1>
                <Button variant="outline-secondary" onClick={() => navigate(-1)}>Back</Button>
            </div>
            
            <div className="table-responsive bg-white rounded shadow-sm">
                 <Table hover className="mb-0">
                    <thead className="table-light">
                         <tr>
                            <th>Name</th>
                            <th>Reg. No</th>
                            <th>Status</th>
                            <th>Team</th>
                         </tr>
                    </thead>
                    <tbody>
                        {participants.map((p, i) => (
                            <tr key={i}>
                                <td>{p.student_name}</td>
                                <td>{p.registration_number}</td>
                                <td><Badge bg={p.status === 'APPROVED' ? 'success' : 'warning'}>{p.status}</Badge></td>
                                <td>{p.team_name || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                 </Table>
            </div>
        </Container>
    );
};

export default ParticipantList;

