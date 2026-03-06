import React, { useState, useContext, useRef } from 'react';
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, message } from 'antd';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  TableOutlined,
  ProjectOutlined,
  TagsOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { DataContext } from '../context/DataContext';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { products, plans, modules, categories, deliveryData, users, logout, currentUser } = useContext(DataContext);
  const restoreInputRef = useRef(null);

  const menuItems = [
    {
      key: '/',
      icon: <AppstoreOutlined />,
      label: '仪表盘',
    },
    {
      key: '/products',
      icon: <UnorderedListOutlined />,
      label: '产品管理',
    },
    {
      key: '/matrix',
      icon: <TableOutlined />,
      label: '产品矩阵',
    },
    {
      key: '/planning',
      icon: <ProjectOutlined />,
      label: '产品规划',
    },
    {
      key: '/categories',
      icon: <TagsOutlined />,
      label: '品类管理',
    },
  ];

  if (currentUser?.role === 'admin') {
    menuItems.push({
      key: '/accounts',
      icon: <UserOutlined />,
      label: '账号管理',
    });
  }

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    logout();
    message.success('已退出登录');
    navigate('/login');
  };

  const userMenu = (
    <Menu
      items={[
        {
          key: 'profile',
          label: '个人中心',
        },
        {
          key: 'logout',
          label: '退出登录',
          icon: <LogoutOutlined />,
          onClick: handleLogout,
        },
      ]}
    />
  );

  // Determine breadcrumb based on path
  const getBreadcrumb = () => {
    const path = location.pathname;
    let title = '仪表盘概览';
    if (path.includes('delivery')) title = '投放数据管理';
    if (path.includes('products')) title = '产品列表管理';
    if (path.includes('matrix')) title = '市场定位矩阵';
    if (path.includes('planning')) title = '产品规划管理';
    if (path.includes('categories')) title = '产品品类管理';
    if (path.includes('accounts')) title = '账号权限管理';

    return (
      <Breadcrumb
        items={[
          { title: 'RESMO 瑞摩' },
          { title: title },
        ]}
      />
    );
  };

  const handleBackup = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Deep clone and sanitize data to ensure it's plain JSON
      const sanitize = (data) => {
        try {
          const raw = JSON.parse(JSON.stringify(data || []));
          return raw.map(item => {
            const newItem = { ...item };
            // Truncate long strings (especially base64 images) to avoid Excel limit (32767 chars)
            Object.keys(newItem).forEach(key => {
              if (typeof newItem[key] === 'string' && newItem[key].length > 32000) {
                 // If it's an image, replace with placeholder text
                 if (key === 'image' || key.toLowerCase().includes('img') || newItem[key].startsWith('data:image')) {
                   newItem[key] = '[图片太长无法导出]';
                 } else {
                   newItem[key] = newItem[key].substring(0, 32000) + '...[截断]';
                 }
              }
            });
            return newItem;
          });
        } catch (e) {
          console.error("Data sanitization failed:", e);
          return [];
        }
      };

      // Products Sheet
      const wsProducts = XLSX.utils.json_to_sheet(sanitize(products));
      XLSX.utils.book_append_sheet(wb, wsProducts, "产品列表");

      // Plans Sheet
      const wsPlans = XLSX.utils.json_to_sheet(sanitize(plans));
      XLSX.utils.book_append_sheet(wb, wsPlans, "产品规划");

      // Modules Sheet
      const wsModules = XLSX.utils.json_to_sheet(sanitize(modules));
      XLSX.utils.book_append_sheet(wb, wsModules, "一级模块");

      // Categories Sheet
      const wsCategories = XLSX.utils.json_to_sheet(sanitize(categories));
      XLSX.utils.book_append_sheet(wb, wsCategories, "二级品类");

      // Delivery Data Sheet
      const wsDelivery = XLSX.utils.json_to_sheet(sanitize(deliveryData || []));
      XLSX.utils.book_append_sheet(wb, wsDelivery, "投放数据");

      // Users Sheet
      const wsUsers = XLSX.utils.json_to_sheet(sanitize(users));
      XLSX.utils.book_append_sheet(wb, wsUsers, "用户账号");

      // Generate filename with timestamp
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `RESMO_Backup_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
      message.success('数据备份成功！');
    } catch (error) {
      console.error('Backup failed:', error);
      message.error(`备份失败: ${error.message}`);
    }
  };

  const handleRestoreClick = () => {
    restoreInputRef.current?.click();
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      const getSheet = (name) => {
        const ws = wb.Sheets?.[name];
        if (!ws) return null;
        return XLSX.utils.sheet_to_json(ws, { defval: '' });
      };

      const restoredProducts = getSheet('产品列表');
      const restoredPlans = getSheet('产品规划');
      const restoredModules = getSheet('一级模块');
      const restoredCategories = getSheet('二级品类');
      const restoredDelivery = getSheet('投放数据');

      const token = localStorage.getItem('resmo_token');
      if (!token) {
        message.error('请先登录管理员账号再导入');
        return;
      }

      const res = await fetch('/api/admin/restore', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          products: restoredProducts || [],
          plans: restoredPlans || [],
          modules: restoredModules || [],
          categories: restoredCategories || [],
          deliveryData: restoredDelivery || [],
        }),
      });

      if (!res.ok) {
        message.error('恢复失败，请确认文件为系统导出的备份');
        return;
      }

      message.success('数据已恢复到服务器，正在刷新页面');
      window.location.reload();
    } catch (error) {
      message.error('恢复失败，请确认文件为系统导出的备份');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        width={240} 
        theme="dark" 
        style={{ 
          background: '#002740' // Updated Deep Navy Background
        }}
      >
        <input
          ref={restoreInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleRestoreFile}
        />
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 gap-3 mb-2 pt-4">
          <div className="w-10 h-10 bg-[#0099FF] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
            <SettingOutlined style={{ fontSize: '22px', color: 'white' }} />
          </div>
          {!collapsed && <span className="text-white text-xl font-bold tracking-wide">RESMO瑞摩PMS</span>}
        </div>
        
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          className="custom-sidebar-menu" // Applied custom class
        />

        <div className="absolute bottom-8 left-0 w-full px-6 space-y-2">
           <div 
             onClick={handleBackup}
             className="text-[#8BB6CC] hover:text-white cursor-pointer flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all group"
           >
             <CloudDownloadOutlined style={{ fontSize: '16px' }} className="group-hover:text-green-400 transition-colors" /> 
             <span className="font-medium">一键备份数据</span>
           </div>

           {currentUser?.role === 'admin' && (
             <div 
               onClick={handleRestoreClick}
               className="text-[#8BB6CC] hover:text-white cursor-pointer flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all group"
             >
               <CloudUploadOutlined style={{ fontSize: '16px' }} className="group-hover:text-blue-400 transition-colors" /> 
               <span className="font-medium">导入恢复数据</span>
             </div>
           )}
           
           <div 
             onClick={handleLogout}
             className="text-[#8BB6CC] hover:text-white cursor-pointer flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-all"
           >
             <LogoutOutlined style={{ fontSize: '16px' }} /> 
             <span className="font-medium">退出登录</span>
           </div>
        </div>
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {getBreadcrumb()}
          </div>
          <div className="flex items-center gap-4">
            <Dropdown overlay={userMenu}>
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#f0f0f0', color: '#000' }} />
                <div className="flex flex-col text-right leading-tight">
                  <span className="font-bold text-sm">{currentUser?.username || 'admin'}</span>
                  <span className="text-xs text-blue-500">RESMO CORE</span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '24px 24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
