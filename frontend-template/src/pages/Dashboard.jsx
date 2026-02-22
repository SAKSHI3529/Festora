import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AdminDashboard from './admin/Dashboard';
import StudentDashboard from './student/StudentDashboard';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Role-based redirect for non-student, non-admin roles
    useEffect(() => {
        if (!user) return;
        const role = user.role?.toLowerCase();
        if (role === 'faculty') navigate('/faculty/dashboard', { replace: true });
        else if (role === 'event_coordinator') navigate('/coordinator/dashboard', { replace: true });
        else if (role === 'judge') navigate('/judge/events', { replace: true });
        // Students now stay on /dashboard and see StudentDashboard
    }, [user]);

    // Student gets the rich dashboard
    if (user?.role?.toLowerCase() === 'student') {
        return <StudentDashboard />;
    }

    // Admin sees the rich admin dashboard with event cards
    if (user?.role?.toLowerCase() === 'admin') {
        return <AdminDashboard />;
    }

    // Fallback while redirect is in-flight for other roles
    return (
        <div className="row">
            <div className="col-12">
                <div className="card">
                    <div className="card-body text-center py-5">
                        <div style={{ fontSize: '64px' }}>🏆</div>
                        <h3 className="mt-3">Welcome, {user?.full_name}!</h3>
                        <p className="text-muted">Redirecting you to your dashboard...</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
