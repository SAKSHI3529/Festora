import React, { useEffect, useState, useContext } from 'react';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';

const Profile = () => {
    const { user } = useContext(AuthContext);

    if (!user) return null;

    return (
        <Container>
            <h1 className="h3 mb-4 text-gray-800">My Profile</h1>
            <Row className="justify-content-center">
                <Col md={8}>
                    <Card className="shadow">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">User Details</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-3">
                                <Col sm={3} className="fw-bold">Full Name:</Col>
                                <Col sm={9}>{user.full_name}</Col>
                            </Row>
                            <Row className="mb-3">
                                <Col sm={3} className="fw-bold">Email:</Col>
                                <Col sm={9}>{user.email}</Col>
                            </Row>
                            <Row className="mb-3">
                                <Col sm={3} className="fw-bold">Role:</Col>
                                <Col sm={9}><Badge bg="secondary">{user.role}</Badge></Col>
                            </Row>
                            
                            {user.role === 'student' && (
                                <>
                                    <hr />
                                    <h6 className="text-muted mb-3">Student Information</h6>
                                    <Row className="mb-3">
                                        <Col sm={3} className="fw-bold">Reg. Number:</Col>
                                        <Col sm={9}>{user.registration_number}</Col>
                                    </Row>
                                    <Row className="mb-3">
                                        <Col sm={3} className="fw-bold">Department:</Col>
                                        <Col sm={9}>{user.department}</Col>
                                    </Row>
                                    <Row className="mb-3">
                                        <Col sm={3} className="fw-bold">Year:</Col>
                                        <Col sm={9}>{user.year}</Col>
                                    </Row>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Profile;

