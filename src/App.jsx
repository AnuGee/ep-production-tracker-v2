// src/App.jsx
import Log from "./pages/Log"; // ⬅️ ด้านบนสุด
import AdminUser from "./pages/AdminUser";
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./components/MainLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Warehouse from "./pages/Warehouse";
import Production from "./pages/Production";
import QC from "./pages/QC";
import Logistics from "./pages/Logistics";
import Account from "./pages/Account";
import Search from "./pages/Search";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ NEW
import { AuthProvider } from "./context/AuthContext";
import { useEffect } from "react";
import "./styles/Responsive.css";
import ReportsGuard from "./components/ReportsGuard";
import Reports from "./pages/Reports";

export default function App() {
  useEffect(() => {
  }, []);

return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* ✅ Public: ไม่ต้อง Login */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales", "Warehouse", "Production", "QC", "Account"]}>
                <MainLayout><Home /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales", "Warehouse", "Production", "QC", "Account"]}>
                <MainLayout><Dashboard /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<MainLayout><Login /></MainLayout>} />
          <Route path="/register" element={<MainLayout><Register /></MainLayout>} />

          {/* ✅ Protected: ต้อง Login และมีสิทธิ์ตาม Role */}
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales"]}>
                <MainLayout><Sales /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Warehouse"]}>
                <MainLayout><Warehouse /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/production"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Production"]}>
                <MainLayout><Production /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/qc"
            element={
              <ProtectedRoute allowedRoles={["Admin", "QC"]}>
                <MainLayout><QC /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logistics"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales"]}>
                <MainLayout><Logistics /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Account"]}>
                <MainLayout><Account /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <MainLayout><AdminUser /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales"]}>
                <MainLayout><Search /></MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ReportsGuard>
                <Reports />
              </ReportsGuard>
            }
          />
          <Route
  path="/log"
  element={
    <ProtectedRoute allowedRoles={["Admin"]}>
      <MainLayout><Log /></MainLayout>
    </ProtectedRoute>
  }
/>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
