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
  const [timelines, setTimelines] = useState([]);
  const [notifications, setNotifications] = useState([]);

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
    // Add a timestamp to bypass any local or intermediary caching during load
    const data = await apiFetch(`/api/state?t=${Date.now()}`);
    setProducts(Array.isArray(data.products) ? data.products : []);
    setPlans(Array.isArray(data.plans) ? data.plans : []);
    setModules(Array.isArray(data.modules) ? data.modules : []);
    setCategories(Array.isArray(data.categories) ? data.categories : []);
    setTimelines(Array.isArray(data.timelines) ? data.timelines : []);
    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
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
    try {
      const res = await apiFetch('/api/state', {
        method: 'PUT',
        body: JSON.stringify(next),
      });
      // Force reload state from backend to ensure frontend is 100% in sync with KV store
      await loadState();
    } catch (e) {
      console.error("Save state failed:", e);
      if (e.status === 413) {
        console.warn("Payload too large! Data might not be saved.");
      }
    }
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

  const publishPlan = async (planId, newProduct) => {
    let nextProducts;
    let nextPlans;

    // Use functional updates to ensure we are working with the absolute latest state
    setProducts(prevProducts => {
      nextProducts = [newProduct, ...prevProducts];
      return nextProducts;
    });

    setPlans(prevPlans => {
      nextPlans = prevPlans.filter((item) => item.id !== planId);
      return nextPlans;
    });

    // We must wait for the next event loop tick to ensure the closure variables 
    // nextProducts and nextPlans are populated by the set state callbacks
    await new Promise(resolve => setTimeout(resolve, 0));

    // Fallback just in case the async update didn't populate them immediately
    if (!nextProducts) nextProducts = [newProduct, ...products];
    if (!nextPlans) nextPlans = plans.filter((item) => item.id !== planId);

    await saveState({ 
      products: nextProducts, 
      plans: nextPlans 
    });
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

  // Timeline Actions
  const addTimeline = async (timeline) => {
    let next;
    setTimelines(prev => {
      next = [timeline, ...prev];
      return next;
    });
    await saveState({ timelines: next });
  };

  const updateTimeline = async (updatedTimeline) => {
    let next;
    setTimelines(prev => {
      next = prev.map((item) => (item.id === updatedTimeline.id ? updatedTimeline : item));
      return next;
    });
    await saveState({ timelines: next });
  };

  const deleteTimeline = async (id) => {
    let next;
    setTimelines(prev => {
      next = prev.filter((item) => item.id !== id);
      return next;
    });
    await saveState({ timelines: next });
  };

  // Notification Actions
  const addNotification = async (notification) => {
    let next;
    setNotifications(prev => {
      next = [notification, ...prev];
      return next;
    });
    await saveState({ notifications: next });
  };

  const clearNotifications = async () => {
    setNotifications([]);
    await saveState({ notifications: [] });
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

  const updateMe = async (updates) => {
    const data = await apiFetch('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setCurrentUser(data.user);
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
    setTimelines([]);
    setNotifications([]);
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
        publishPlan,
        modules,
        addModule,
        deleteModule,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        timelines,
        addTimeline,
        updateTimeline,
        deleteTimeline,
        notifications,
        addNotification,
        clearNotifications,
        deliveryData,
        loadDeliveryData,
        addDeliveryData,
        updateDeliveryItem,
        deleteDeliveryItem,
        users,
        addUser,
        updateUser,
        updateMe,
        deleteUser,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
