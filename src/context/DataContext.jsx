import React, { createContext, useState, useEffect } from 'react';

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  // Initialize state from localStorage or default values
  const [products, setProducts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [modules, setModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deliveryData, setDeliveryData] = useState([]);
  const [users, setUsers] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const getToken = () => localStorage.getItem('resmo_token');
  const setToken = (t) => localStorage.setItem('resmo_token', t);
  const clearToken = () => localStorage.removeItem('resmo_token');
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';

  const apiFetch = async (url, options = {}) => {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${apiBase}${url}`, { ...options, headers });
    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      let msg = raw;
      try {
        const data = raw ? JSON.parse(raw) : null;
        if (data && typeof data === 'object') {
          msg = data?.message ? String(data.message) : JSON.stringify(data);
        }
      } catch {}
      const err = new Error(msg || 'request_failed');
      err.status = res.status;
      throw err;
    }
    return res.json();
  };

  const loadState = async () => {
    const data = await apiFetch('/api/state');
    setProducts(Array.isArray(data.products) ? data.products : []);
    setPlans(Array.isArray(data.plans) ? data.plans : []);
    setModules(Array.isArray(data.modules) ? data.modules : []);
    setCategories(Array.isArray(data.categories) ? data.categories : []);
    setDeliveryData(Array.isArray(data.deliveryData) ? data.deliveryData : []);
  };

  const loadUsers = async () => {
    if (currentUser?.role !== 'admin') {
      setUsers([]);
      return;
    }
    const data = await apiFetch('/api/users');
    setUsers(Array.isArray(data.users) ? data.users : []);
  };

  const saveState = async (next) => {
    // Optimistic UI update already happened via setProducts/setModules etc.
    // Here we send ONLY the fields that changed, or the full state if needed.
    // Ideally, the backend should support partial updates (PATCH) or we send the full snapshot.
    // Current backend implementation expects a full snapshot on PUT.
    // Race condition warning: 'next' is constructed from closure state in the calling function.
    // We must ensure the calling function had the latest state.
    await apiFetch('/api/state', {
      method: 'PUT',
      body: JSON.stringify(next),
    });
  };

  useEffect(() => {
    const bootstrap = async () => {
      setAuthLoading(true);
      const token = getToken();
      if (!token) {
        setCurrentUser(null);
        setAuthLoading(false);
        return;
      }
      try {
        const me = await apiFetch('/api/auth/me');
        setCurrentUser(me.user || null);
        await loadState();
      } catch {
        clearToken();
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUsers([]);
      return;
    }
    loadUsers().catch(() => {});
  }, [currentUser?.id, currentUser?.role]);


  // Product Actions
  const addProduct = async (product) => {
    const next = [product, ...products];
    setProducts(next);
    await saveState({ products: next });
  };

  const addProducts = async (newProducts) => {
    const next = [...newProducts, ...products];
    setProducts(next);
    await saveState({ products: next });
  };

  const updateProduct = async (updatedProduct) => {
    const next = products.map((item) => (item.key === updatedProduct.key ? updatedProduct : item));
    setProducts(next);
    await saveState({ products: next });
  };

  const deleteProduct = async (key) => {
    const next = products.filter((item) => item.key !== key);
    setProducts(next);
    await saveState({ products: next });
  };

  // Plan Actions
  const addPlan = async (plan) => {
    const next = [plan, ...plans];
    setPlans(next);
    await saveState({ plans: next });
  };

  const addPlans = async (newPlans) => {
    const next = [...newPlans, ...plans];
    setPlans(next);
    await saveState({ plans: next });
  };

  const updatePlan = async (updatedPlan) => {
    const next = plans.map((item) => (item.id === updatedPlan.id ? updatedPlan : item));
    setPlans(next);
    await saveState({ plans: next });
  };

  const deletePlan = async (id) => {
    const next = plans.filter((item) => item.id !== id);
    setPlans(next);
    await saveState({ plans: next });
  };

  // Module Actions
  const addModule = async (moduleName) => {
    const newModule = { name: moduleName, id: Date.now().toString() };
    const nextModules = [...modules, newModule];
    setModules(nextModules);
    await saveState({ modules: nextModules });
  };

  const deleteModule = async (moduleName) => {
    const nextModules = modules.filter((m) => m.name !== moduleName);
    const nextCategories = categories.filter((c) => c.module !== moduleName);
    setModules(nextModules);
    setCategories(nextCategories);
    await saveState({ modules: nextModules, categories: nextCategories });
  };

  // Category Actions
  const addCategory = async (moduleName, category) => {
    const newCat = { ...category, module: moduleName };
    const next = [...categories, newCat];
    setCategories(next);
    await saveState({ categories: next });
  };

  const updateCategory = async (oldModule, oldName, newModule, newName) => {
    const next = categories.map((cat) => {
      if (cat.module === oldModule && cat.name === oldName) {
        return { ...cat, module: newModule, name: newName };
      }
      return cat;
    });
    setCategories(next);
    await saveState({ categories: next });
  };

  const deleteCategory = async (moduleName, categoryName) => {
    const next = categories.filter(
      (cat) => !(cat.module === moduleName && cat.name === categoryName)
    );
    setCategories(next);
    await saveState({ categories: next });
  };

  // Delivery Data Actions
  const loadDeliveryData = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const data = await apiFetch(`/api/delivery?${query}`);
    setDeliveryData(Array.isArray(data.data) ? data.data : []);
    return data.data;
  };

  const addDeliveryData = async (items) => {
    const data = await apiFetch('/api/delivery', {
      method: 'POST',
      body: JSON.stringify(items),
    });
    // Optimistic update or reload?
    // Since backend sorts and adds fields, better to reload or merge carefully.
    // For simplicity, let's merge the returned new items.
    const newItems = Array.isArray(data.data) ? data.data : [data.data];
    setDeliveryData((prev) => {
      const combined = [...newItems, ...prev];
      combined.sort((a, b) => (a.date > b.date ? -1 : 1));
      return combined;
    });
  };

  const updateDeliveryItem = async (id, updates) => {
    const data = await apiFetch(`/api/delivery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setDeliveryData((prev) => prev.map((item) => (item.id === id ? data.data : item)));
  };

  const deleteDeliveryItem = async (id) => {
    await apiFetch(`/api/delivery/${id}`, { method: 'DELETE' });
    setDeliveryData((prev) => prev.filter((item) => item.id !== id));
  };

  // User Actions
  const addUser = async (user) => {
    const data = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        username: user.username,
        password: user.password,
        role: user.role,
      }),
    });
    setUsers((prev) => [data.user, ...prev]);
  };

  const updateUser = async (updatedUser) => {
    const data = await apiFetch(`/api/users/${updatedUser.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        username: updatedUser.username,
        password: updatedUser.password,
        role: updatedUser.role,
      }),
    });
    setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
  };

  const deleteUser = async (id) => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Auth Methods
  const login = async (username, password) => {
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      setCurrentUser(data.user);
      await loadState();
      return true;
    } catch (e) {
      if (e?.status === 401) return false;
      throw e;
    }
  };

  const logout = () => {
    clearToken();
    setCurrentUser(null);
    setProducts([]);
    setPlans([]);
    setModules([]);
    setCategories([]);
    setUsers([]);
  };

  return (
    <DataContext.Provider
      value={{
        currentUser,
        authLoading,
        login,
        logout,
        products,
        addProduct,
        addProducts,
        updateProduct,
        deleteProduct,
        plans,
        addPlan,
        addPlans,
        updatePlan,
        deletePlan,
        modules,
        addModule,
        deleteModule,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        deliveryData,
        loadDeliveryData,
        addDeliveryData,
        updateDeliveryItem,
        deleteDeliveryItem,
        users,
        addUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
