import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const PrivateRoute = () => {
    const { isAuthenticated, loading } = useAuth();
    const location = useLocation();
    if (loading) return <p role="status">Checking your session…</p>;
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
};

export default PrivateRoute;
