import React, { useState, useContext, useRef, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, message, Modal, Badge, List, Button, Typography, Tag } from 'antd';
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
  BellOutlined,
  NotificationOutlined,
  SoundOutlined,
  ThunderboltOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { DataContext } from '../context/DataContext';
import logoUrl from '../assets/logo.svg';
import { SYSTEM_VERSION, CHANGELOG } from '../config/changelog';
import dayjs from 'dayjs';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { products, plans, modules, categories, deliveryData, users, logout, currentUser, updateMe, notifications, clearNotifications } = useContext(DataContext);
  const restoreInputRef = useRef(null);

  // Upgrade Modal State
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.lastSeenVersion !== SYSTEM_VERSION) {
      setUpgradeModalVisible(true);
    }
  }, [currentUser]);

  const handleCloseUpgradeModal = async () => {
    setUpgradeModalVisible(false);
    if (currentUser) {
      await updateMe({ lastSeenVersion: SYSTEM_VERSION });
    }
  };

  // Notification State
  const [notificationVisible, setNotificationVisible] = useState(false);
  const readNotifications = currentUser?.readNotifications || [];
  
  // Sort notifications by date desc
  const sortedNotifications = [...notifications].sort((a, b) => new Date(b.date) - new Date(a.date));
  const unreadCount = sortedNotifications.filter(n => !readNotifications.includes(n.id)).length;

  const handleMarkAsRead = async (id) => {
    if (!readNotifications.includes(id)) {
      await updateMe({ readNotifications: [...readNotifications, id] });
    }
  };

  const handleMarkAllRead = async () => {
    const allIds = sortedNotifications.map(n => n.id);
    await updateMe({ readNotifications: Array.from(new Set([...readNotifications, ...allIds])) });
    message.success('已全部标记为已读');
  };

  const handleClearAll = async () => {
    if (currentUser?.role === 'admin') {
      await clearNotifications();
      message.success('已清空所有系统通知');
    } else {
      // For non-admins, we just mark all as read since they can't delete global notifications
      handleMarkAllRead();
    }
  };

  // Notification polling (simulated real-time)
  useEffect(() => {
    // In a real app, this would use DataContext loadState or a specific endpoint
    // For now, DataContext loads on mount, we rely on page refresh or manual actions
    // Polling could be added here if needed: const timer = setInterval(loadState, 30000)
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'product': return <ThunderboltOutlined className="text-blue-500" />;
      case 'system': return <SettingOutlined className="text-red-500" />;
      case 'event': return <SoundOutlined className="text-orange-500" />;
      default: return <NotificationOutlined className="text-gray-500" />;
    }
  };

  const notificationMenu = (
    <div className="bg-white rounded-lg shadow-xl w-80 overflow-hidden border border-gray-100">
      <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
        <span className="font-bold text-gray-800">通知中心</span>
        <div className="flex gap-3">
          <span className="text-xs text-blue-500 cursor-pointer hover:text-blue-600" onClick={handleMarkAllRead}>全部已读</span>
          {currentUser?.role === 'admin' && (
            <span className="text-xs text-gray-400 cursor-pointer hover:text-red-500" onClick={handleClearAll}>清空</span>
          )}
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {sortedNotifications.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={sortedNotifications}
            renderItem={(item) => {
              const isRead = readNotifications.includes(item.id);
              return (
                <List.Item 
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!isRead ? 'bg-blue-50/30' : ''}`}
                  onClick={() => handleMarkAsRead(item.id)}
                >
                  <List.Item.Meta
                    avatar={
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isRead ? 'bg-gray-100 opacity-50' : 'bg-white shadow-sm'}`}>
                        {getNotificationIcon(item.type)}
                      </div>
                    }
                    title={
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-medium ${isRead ? 'text-gray-400' : 'text-gray-800'}`}>
                          {item.title}
                        </span>
                        {!isRead && <Badge dot color="red" />}
                      </div>
                    }
                    description={
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs line-clamp-2 ${isRead ? 'text-gray-400' : 'text-gray-500'}`}>
                          {item.content}
                        </span>
                        <span className="text-[10px] text-gray-400 mt-1">
                          {dayjs(item.date).format('MM-DD HH:mm')}
                        </span>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <div className="py-12 text-center text-gray-400 flex flex-col items-center">
            <BellOutlined style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }} />
            <span>暂无新通知</span>
          </div>
        )}
      </div>
    </div>
  );

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
        <div className="flex flex-col px-6 pt-6 pb-6 border-b border-white/5 mb-4 relative">
          <div className="flex items-center justify-start overflow-visible shrink-0 w-full h-12">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-[180px] h-[180px] max-w-none object-contain object-left drop-shadow-md absolute -left-2 top-[-52px]" 
              style={{ filter: 'brightness(0) invert(1)' }} 
            />
          </div>
          {!collapsed && <span className="text-gray-400 text-xs font-medium tracking-widest pl-2 mt-2">产品管理系统</span>}
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
          <div className="flex items-center gap-6">
            <Dropdown 
              overlay={notificationMenu} 
              trigger={['click']} 
              placement="bottomRight"
              open={notificationVisible}
              onOpenChange={setNotificationVisible}
            >
              <div className="cursor-pointer flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors relative">
                <Badge count={unreadCount} size="small" offset={[2, -2]}>
                  <BellOutlined style={{ fontSize: '18px', color: '#666' }} />
                </Badge>
              </div>
            </Dropdown>

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

      {/* System Upgrade Modal */}
      <Modal
        open={upgradeModalVisible}
        onCancel={handleCloseUpgradeModal}
        footer={[
          <Button key="close" type="primary" onClick={handleCloseUpgradeModal} className="w-full">
            我知道了，开始体验
          </Button>
        ]}
        width={600}
        closable={false}
        maskClosable={false}
        className="upgrade-modal"
        bodyStyle={{ padding: 0 }}
      >
        <div className="bg-[#002740] p-6 rounded-t-lg flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://file.302.ai/trae/1742463286551-789a4254f15d909562725e2439167232.png')] bg-cover bg-center mix-blend-overlay"></div>
          <div className="relative z-10 text-center">
            <Tag color="blue" className="mb-3 rounded-full px-3 py-1 border-none bg-blue-500/20 text-blue-100">
              {CHANGELOG.version}
            </Tag>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-wide">系统重磅升级</h2>
            <p className="text-gray-400 text-sm m-0">发布时间：{CHANGELOG.date}</p>
          </div>
        </div>
        
        <div className="p-6 max-h-[500px] overflow-y-auto">
          {CHANGELOG.new && CHANGELOG.new.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center font-bold text-xs">新</div>
                <h3 className="font-bold text-gray-800 m-0">新增功能</h3>
              </div>
              <ul className="list-disc pl-8 text-gray-600 space-y-2 text-sm">
                {CHANGELOG.new.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}

          {CHANGELOG.optimized && CHANGELOG.optimized.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">优</div>
                <h3 className="font-bold text-gray-800 m-0">体验优化</h3>
              </div>
              <ul className="list-disc pl-8 text-gray-600 space-y-2 text-sm">
                {CHANGELOG.optimized.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}

          {CHANGELOG.fixed && CHANGELOG.fixed.length > 0 && (
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">修</div>
                <h3 className="font-bold text-gray-800 m-0">问题修复</h3>
              </div>
              <ul className="list-disc pl-8 text-gray-600 space-y-2 text-sm">
                {CHANGELOG.fixed.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Modal>

    </Layout>
  );
};

export default MainLayout;
