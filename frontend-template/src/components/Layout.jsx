import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import ErrorBoundary from './ErrorBoundary';

const Layout = () => {
    return (
        <div id="layout-wrapper">
            <Topbar />
            <Sidebar />

            {/* ============================================================== */}
            {/* Start right Content here */}
            {/* ============================================================== */}
            <div className="main-content">
                <div className="page-content">
                    <div className="container-fluid">
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </div>
                </div>

                {/* Footer */}
                <footer className="footer">
                    <div className="container-fluid">
                        <div className="row">
                            <div className="col-sm-6">
                                {new Date().getFullYear()} &copy; Festora
                            </div>
                            <div className="col-sm-6 text-right d-none d-sm-block">
                                College Fest Management System
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Layout;
