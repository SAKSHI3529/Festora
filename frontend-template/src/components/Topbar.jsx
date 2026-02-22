import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Topbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [showUserDropdown, setShowUserDropdown] = React.useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSidebarToggle = () => {
        document.body.classList.toggle('sidebar-enable');
        if (window.innerWidth >= 992) {
            document.body.classList.toggle('vertical-collpsed');
        }
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const closeDropdown = (e) => {
            if (!e.target.closest('.user-dropdown-container')) {
                setShowUserDropdown(false);
            }
        };
        document.addEventListener('mousedown', closeDropdown);
        return () => document.removeEventListener('mousedown', closeDropdown);
    }, []);

    return (
        <header id="page-topbar">
            <div className="navbar-header">
                <div className="d-flex">
                    {/* LOGO */}
                    <div className="navbar-brand-box">
                        <Link to="/dashboard" className="logo logo-dark">
                            <span className="logo-sm">
                                <i className="mdi mdi-trophy-outline" style={{ fontSize: '24px', color: '#7a5af8' }}></i>
                            </span>
                            <span className="logo-lg">
                                <span style={{ fontSize: '20px', fontWeight: 700, color: '#7a5af8', letterSpacing: '1px' }}>
                                    🏆 Festora
                                </span>
                            </span>
                        </Link>
                        <Link to="/dashboard" className="logo logo-light">
                            <span className="logo-sm">
                                <i className="mdi mdi-trophy-outline" style={{ fontSize: '24px', color: '#fff' }}></i>
                            </span>
                            <span className="logo-lg">
                                <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '1px' }}>
                                    🏆 Festora
                                </span>
                            </span>
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm px-3 font-size-24 header-item waves-effect"
                        id="vertical-menu-btn"
                        onClick={handleSidebarToggle}
                    >
                        <i className="mdi mdi-menu"></i>
                    </button>
                </div>

                <div className="d-flex">
                    {/* User Dropdown */}
                    <div className="dropdown d-inline-block user-dropdown-container">
                        <button
                            type="button"
                            className="btn header-item waves-effect d-flex align-items-center"
                            id="page-header-user-dropdown"
                            onClick={() => setShowUserDropdown(!showUserDropdown)}
                        >
                            <span className="d-none d-xl-inline-block ms-1 me-2 text-start">
                                <strong>{user?.full_name || user?.email}</strong>
                                <small className="d-block text-muted" style={{ fontSize: '10px' }}>
                                    {user?.role?.replace('_', ' ')?.toUpperCase()}
                                </small>
                            </span>
                            <i className="mdi mdi-account-circle font-size-24 align-middle"></i>
                            <i className="mdi mdi-chevron-down d-none d-xl-inline-block"></i>
                        </button>
                        <div className={`dropdown-menu dropdown-menu-end shadow ${showUserDropdown ? 'show' : ''}`} 
                             style={{ position: 'absolute', right: 0, left: 'auto' }}>
                            <Link className="dropdown-item" to="/profile" onClick={() => setShowUserDropdown(false)}>
                                <i className="mdi mdi-account-circle font-size-17 text-muted align-middle me-1"></i> Profile
                            </Link>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item text-danger" onClick={handleLogout}>
                                <i className="mdi mdi-power font-size-17 text-danger align-middle me-1"></i>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Topbar;
