import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed. Check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="account-pages my-5 pt-sm-5">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-md-8 col-lg-6 col-xl-5">
                        <div className="card overflow-hidden">
                            <div className="bg-soft-primary">
                                <div className="row">
                                    <div className="col-7">
                                        <div className="text-primary p-4">
                                            <h5 className="text-primary">Welcome Back!</h5>
                                            <p>Sign in to continue to Festora.</p>
                                        </div>
                                    </div>
                                    <div className="col-5 align-self-end">
                                        <div className="text-center pt-4 pb-2">
                                            <span style={{ fontSize: '64px' }}>🏆</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body pt-0">
                                <div className="p-2">
                                    {error && (
                                        <div className="alert alert-danger" role="alert">
                                            {error}
                                        </div>
                                    )}
                                    <form className="form-horizontal mt-4" onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label htmlFor="email">Email</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                id="email"
                                                placeholder="Enter email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="password">Password</label>
                                            <input
                                                type="password"
                                                className="form-control"
                                                id="password"
                                                placeholder="Enter password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group row mt-4">
                                            <div className="col-12">
                                                <button
                                                    className="btn btn-primary btn-block waves-effect waves-light"
                                                    type="submit"
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <>
                                                            <i className="mdi mdi-loading mdi-spin mr-2"></i>
                                                            Signing in...
                                                        </>
                                                    ) : (
                                                        'Log In'
                                                    )}
                                                </button>

                                                <div className="mt-3 p-2 bg-light rounded" style={{ fontSize: '11px' }}>
                                                    <p className="mb-1 fw-bold text-muted">🔑 Test Credentials</p>
                                                    <table className="table table-sm table-bordered mb-0" style={{ fontSize: '10px' }}>
                                                        <thead className="table-secondary">
                                                            <tr><th>Role</th><th>Email</th><th>Password</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr><td>Admin</td><td>admin@festora.com</td><td>Admin@123</td></tr>
                                                            <tr><td>Faculty</td><td>faculty1@festora.com</td><td>Faculty@123</td></tr>
                                                            <tr><td>Coordinator</td><td>coordinator1@festora.com</td><td>Coordinator@123</td></tr>
                                                            <tr><td>Judge</td><td>judge1@festora.com</td><td>Judge@123</td></tr>
                                                            <tr><td>Student</td><td>student1@festora.com</td><td>Student@123</td></tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 text-center">
                            <p>© {new Date().getFullYear()} Festora — College Fest Management System</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

