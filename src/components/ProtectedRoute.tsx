import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { user, isLoading, checkPermission } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Check permissions for the current route
    // Using location.pathname
    const hasPermission = checkPermission(location.pathname);

    if (!hasPermission) {
        // Redirect to dashboard (or a "forbidden" page)
        // If the user tries to go to Dashboard ('/') and somehow fails permission, this could loop, 
        // but Dashboard is always set to true in checkPermission.
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
