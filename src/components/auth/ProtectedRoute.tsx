import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useRedux';
import { selectIsAuthenticated, selectAuthLoading, selectUser } from '@/store/authSlice';
import type { UserRole } from '@/types/user.types';

interface ProtectedRouteProps {
    children: React.ReactElement;
    /** If provided, the user must have this role to access the route. */
    requiredRole?: UserRole | UserRole[];
}

const ROLE_HOME: Record<UserRole, string> = {
    owner: '/dashboard/owner',
    advertiser: '/dashboard/advertiser',
    admin: '/dashboard/admin',
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const loading = useAppSelector(selectAuthLoading);
    const user = useAppSelector(selectUser);
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    <p className="mt-4 text-neutral-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Not logged in → send to login, preserving the attempted path
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged in but wrong role → redirect to their own dashboard
    if (requiredRole) {
        const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowed.includes(user.role)) {
            return <Navigate to={ROLE_HOME[user.role]} replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
