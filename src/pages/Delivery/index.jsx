import React, { useState } from 'react';
import { Tabs } from 'antd';
import DeliveryDashboard from './DeliveryDashboard';
import DeliveryList from './DeliveryList';
import DeliveryEntry from './DeliveryEntry';
import { BarChartOutlined, TableOutlined, PlusCircleOutlined } from '@ant-design/icons';

const DeliveryLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const items = [
    {
      key: 'dashboard',
      label: (
        <span>
          <BarChartOutlined />
          数据看板
        </span>
      ),
      children: <DeliveryDashboard />,
    },
    {
      key: 'list',
      label: (
        <span>
          <TableOutlined />
          数据查询
        </span>
      ),
      children: <DeliveryList />,
    },
    {
      key: 'entry',
      label: (
        <span>
          <PlusCircleOutlined />
          数据录入
        </span>
      ),
      children: <DeliveryEntry onSuccess={() => setActiveTab('list')} />,
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">投放数据管理</h1>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </div>
  );
};

export default DeliveryLayout;
