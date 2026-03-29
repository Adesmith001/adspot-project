import { useEffect } from "react";
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import { store } from "./store";
import { useAppDispatch } from "./hooks/useRedux";
import { initializeAuth } from "./store/authSlice";

// Pages - Public
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Listings from "./pages/Listings";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

// Pages - Dashboards
import OwnerDashboard from "./pages/OwnerDashboard";
import AdvertiserDashboard from "./pages/AdvertiserDashboard";

// Pages - Owner
import CreateListing from "./pages/owner/CreateListing";
import EditListing from "./pages/owner/EditListing";
import MyListings from "./pages/owner/MyListings";
import OwnerBookings from "./pages/owner/OwnerBookings";

// Pages - Advertiser
import MyCampaigns from "./pages/advertiser/MyCampaigns";
import BrowseBillboards from "./pages/advertiser/BrowseBillboards";
import Payments from "./pages/advertiser/Payments";

// Pages - Shared
import BillboardDetails from "./pages/shared/BillboardDetails";

// Pages - Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import ListingVerification from "./pages/admin/ListingVerification";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminReports from "./pages/admin/AdminReports";

// Components
import ProtectedRoute from "./components/auth/ProtectedRoute";

function RootLayout() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <>
      <Outlet />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#0a0a0a",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            borderRadius: "0.75rem",
            padding: "1rem",
          },
          success: {
            iconTheme: {
              primary: "#003c30",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public Routes
      { path: "/", element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      { path: "/listings", element: <Listings /> },
      { path: "/terms-of-service", element: <TermsOfService /> },
      { path: "/privacy-policy", element: <PrivacyPolicy /> },
      { path: "/billboards/:id", element: <BillboardDetails /> },

      // Owner Dashboard Routes
      {
        path: "/dashboard/owner",
        element: (
          <ProtectedRoute requiredRole="owner">
            <OwnerDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/owner/create",
        element: (
          <ProtectedRoute requiredRole="owner">
            <CreateListing />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/owner/listings",
        element: (
          <ProtectedRoute requiredRole="owner">
            <MyListings />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/owner/edit/:id",
        element: (
          <ProtectedRoute requiredRole="owner">
            <EditListing />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/owner/bookings",
        element: (
          <ProtectedRoute requiredRole="owner">
            <OwnerBookings />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/owner/*",
        element: (
          <ProtectedRoute requiredRole="owner">
            <Navigate to="/dashboard/owner" replace />
          </ProtectedRoute>
        ),
      },

      // Advertiser Dashboard Routes
      {
        path: "/dashboard/advertiser",
        element: (
          <ProtectedRoute requiredRole="advertiser">
            <AdvertiserDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/advertiser/browse",
        element: (
          <ProtectedRoute requiredRole="advertiser">
            <BrowseBillboards />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/advertiser/campaigns",
        element: (
          <ProtectedRoute requiredRole="advertiser">
            <MyCampaigns />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/advertiser/bookings",
        element: (
          <ProtectedRoute requiredRole="advertiser">
            <Navigate to="/dashboard/advertiser/campaigns" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/advertiser/payments",
        element: (
          <ProtectedRoute requiredRole="advertiser">
            <Payments />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/advertiser/map",
        element: (
          <ProtectedRoute requiredRole="advertiser">
            <BrowseBillboards />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/advertiser/*",
        element: (
          <ProtectedRoute requiredRole="advertiser">
            <Navigate to="/dashboard/advertiser" replace />
          </ProtectedRoute>
        ),
      },

      // Admin Dashboard Routes
      {
        path: "/dashboard/admin",
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/admin/users",
        element: (
          <ProtectedRoute requiredRole="admin">
            <UserManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/admin/listings",
        element: (
          <ProtectedRoute requiredRole="admin">
            <ListingVerification />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/admin/transactions",
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminTransactions />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/admin/bookings",
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminBookings />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/admin/reports",
        element: (
          <ProtectedRoute requiredRole="admin">
            <AdminReports />
          </ProtectedRoute>
        ),
      },
      {
        path: "/dashboard/admin/*",
        element: (
          <ProtectedRoute requiredRole="admin">
            <Navigate to="/dashboard/admin" replace />
          </ProtectedRoute>
        ),
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}

export default App;
