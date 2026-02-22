import React, { useContext, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// Keys are lowercase, matching backend UserRole enum values:
// "admin", "faculty", "event_coordinator", "judge", "student"
const MENU_CONFIG = {
    admin: [
        { title: 'Main', type: 'heading' },
        { label: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
        { title: 'Management', type: 'heading' },
        { label: 'Categories', icon: 'mdi-tag-multiple', path: '/admin/categories' },
        { label: 'Events', icon: 'mdi-calendar-star', path: '/admin/events' },
        { label: 'Participants', icon: 'mdi-account-group', path: '/admin/participants' },
        { label: 'Users', icon: 'mdi-account-multiple', path: '/admin/users' },
        { label: 'Audit Logs', icon: 'mdi-clipboard-list', path: '/admin/audit' },
        { title: 'Reports & Finance', type: 'heading' },
        { label: 'Reports',      icon: 'mdi-chart-bar',          path: '/admin/reports'      },
        { label: 'Budgets',      icon: 'mdi-cash-multiple',      path: '/admin/budgets'      },
        { label: 'Scores',       icon: 'mdi-star-circle',        path: '/admin/scores'       },
        { label: 'Results',      icon: 'mdi-trophy',             path: '/admin/results'      },
        { label: 'Certificates', icon: 'mdi-certificate-outline', path: '/admin/certificates' },
    ],
    faculty: [
        { title: 'Main', type: 'heading' },
        { label: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
        { title: 'My Work', type: 'heading' },
        { label: 'My Events', icon: 'mdi-calendar-check', path: '/faculty/dashboard' },
        { label: 'Budget Requests', icon: 'mdi-cash-multiple', path: '/faculty/budgets' },
    ],
    event_coordinator: [
        { title: 'Main', type: 'heading' },
        { label: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
        { title: 'Coordinator', type: 'heading' },
        { label: 'My Events', icon: 'mdi-calendar-edit', path: '/coordinator/dashboard' },
    ],
    judge: [
        { title: 'Main', type: 'heading' },
        { label: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
        { title: 'Judging', type: 'heading' },
        { label: 'Assigned Events', icon: 'mdi-gavel', path: '/judge/events' },
    ],
    student: [
        { title: 'Main', type: 'heading' },
        { label: 'Dashboard', icon: 'mdi-view-dashboard', path: '/dashboard' },
        { title: 'Events', type: 'heading' },
        { label: 'Browse Events', icon: 'mdi-calendar-search', path: '/student/events' },
        { label: 'My Registrations', icon: 'mdi-format-list-checks', path: '/student/registrations' },
        { label: 'My Certificates', icon: 'mdi-certificate', path: '/student/certificates' },
    ],
};

const Sidebar = () => {
    const { user } = useContext(AuthContext);

    // Guard until auth is resolved
    if (!user || !user.role) return null;

    // Role is already normalized to lowercase by AuthContext's normalizeRole()
    // But add one more safety strip here in case of any residual prefix
    const role = String(user.role).toLowerCase().trim().replace(/^userrole\./, '');
    const menuItems = MENU_CONFIG[role] || [];

    console.log('[Sidebar] user.role raw:', user.role, '| cleaned role:', role, '| items:', menuItems.length);

    // Re-init MetisMenu (only runs if Purple jQuery-based app.js is active)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.MetisMenu) {
            const el = document.getElementById('side-menu');
            if (el) {
                try { new window.MetisMenu(el); } catch (_) {}
            }
        }
    }, [role]);

    return (
        <div className="vertical-menu">
            <div data-simplebar className="h-100">
                <div id="sidebar-menu">
                    <ul className="metismenu list-unstyled" id="side-menu">

                        {/* Role menu items */}
                        {menuItems.map((item, idx) => {
                            if (item.type === 'heading') {
                                return <li key={idx} className="menu-title">{item.title}</li>;
                            }
                            return (
                                <li key={idx}>
                                    <NavLink
                                        to={item.path}
                                        className={({ isActive }) =>
                                            `waves-effect${isActive ? ' active' : ''}`
                                        }
                                    >
                                        <i className={`mdi ${item.icon}`}></i>
                                        <span>{item.label}</span>
                                    </NavLink>
                                </li>
                            );
                        })}

                        {/* Debug fallback — shows if no menu matched */}
                        {menuItems.length === 0 && (
                            <li>
                                <span className="menu-title text-warning" style={{ fontSize: '11px' }}>
                                    Unknown role: "{role}"
                                </span>
                            </li>
                        )}

                        {/* Profile — always shown */}
                        <li className="menu-title">Account</li>
                        <li>
                            <NavLink to="/profile" className="waves-effect">
                                <i className="mdi mdi-account-circle"></i>
                                <span>Profile</span>
                            </NavLink>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
