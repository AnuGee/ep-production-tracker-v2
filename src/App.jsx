// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import ReportsGuard from "./components/ReportsGuard";
import { AuthProvider } from "./context/AuthContext";

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
import Reports from "./pages/Reports";
import Log from "./pages/Log";
import AdminUser from "./pages/AdminUser";

import "./styles/Responsive.css";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 🧩 Home / Dashboard (ตอนนี้ยังเป็น protected ตามโค้ดเดิมของคุณ) */}
          <Route
            path="/"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "Admin",
                  "Sales",
                  "Warehouse",
                  "Production",
                  "QC",
                  "Account",
                ]}
              >
                <MainLayout>
                  <Home />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "Admin",
                  "Sales",
                  "Warehouse",
                  "Production",
                  "QC",
                  "Account",
                ]}
              >
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* 🔐 Auth */}
          <Route
            path="/login"
            element={
              <MainLayout>
                <Login />
              </MainLayout>
            }
          />
          <Route
            path="/register"
            element={
              <MainLayout>
                <Register />
              </MainLayout>
            }
          />

          {/* 🏢 Department pages */}
          <Route
            path="/sales"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales"]}>
                <MainLayout>
                  <Sales />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/warehouse"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Warehouse"]}>
                <MainLayout>
                  <Warehouse />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/production"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Production"]}>
                <MainLayout>
                  <Production />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/qc"
            element={
              <ProtectedRoute allowedRoles={["Admin", "QC"]}>
                <MainLayout>
                  <QC />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/logistics"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales"]}>
                <MainLayout>
                  <Logistics />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/account"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Account"]}>
                <MainLayout>
                  <Account />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* 🔎 Search */}
          <Route
            path="/search"
            element={
              <ProtectedRoute allowedRoles={["Admin", "Sales"]}>
                <MainLayout>
                  <Search />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* 👑 Admin manage users */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <MainLayout>
                  <AdminUser />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* 📈 Reports (เฉพาะ 2 email ตาม ReportsGuard) */}
          <Route
            path="/reports"
            element={
              <ReportsGuard>
                <MainLayout>
                  <Reports />
                </MainLayout>
              </ReportsGuard>
            }
          />

          {/* 📝 Log */}
          <Route
            path="/log"
            element={
              <ProtectedRoute allowedRoles={["Admin"]}>
                <MainLayout>
                  <Log />
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
