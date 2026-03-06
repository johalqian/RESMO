import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import ProductMatrix from './pages/ProductMatrix';
import ProductPlanning from './pages/ProductPlanning';
import CategoryManagement from './pages/CategoryManagement';
import Login from './pages/Login';
import AccountManagement from './pages/AccountManagement';
import DeliveryLayout from './pages/Delivery';

import { DataProvider, DataContext } from './context/DataContext';

const ProtectedRoute = ({ children }) => {
  const { currentUser, authLoading } = useContext(DataContext);
  if (authLoading) return null;
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const { currentUser, authLoading } = useContext(DataContext);
  if (authLoading) return null;
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  if (currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProductList />} />
        <Route path="matrix" element={<ProductMatrix />} />
        <Route path="planning" element={<ProductPlanning />} />
        <Route path="categories" element={<CategoryManagement />} />
        <Route path="delivery" element={<DeliveryLayout />} />
        <Route path="accounts" element={
          <AdminRoute>
            <AccountManagement />
          </AdminRoute>
        } />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  );
}

export default App;
