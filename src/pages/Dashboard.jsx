import React, { useContext, useState } from 'react';
import { Card, Col, Row, Statistic, Tag, Table, List, Avatar, Typography, Drawer, Button } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, HistoryOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { DataContext } from '../context/DataContext';
import dayjs from 'dayjs';

const { Paragraph } = Typography;

const Dashboard = () => {
  const { products, plans, modules, timelines } = useContext(DataContext);

  // Timeline Drawer State
  const [timelineDrawerVisible, setTimelineDrawerVisible] = useState(false);

  // Safe fallbacks
  const safeProducts = Array.isArray(products) ? products : [];
  const safePlans = Array.isArray(plans) ? plans : [];
  const safeModules = Array.isArray(modules) ? modules : [];
  const safeTimelines = Array.isArray(timelines) ? timelines : [];

  const getTimelinePlanName = (item) => {
    if (item?.planName) return item.planName;
    const matchedPlan = safePlans.find((p) => String(p.id) === String(item?.planId));
    if (matchedPlan?.name) return matchedPlan.name;
    return '未命名产品';
  };

  // 1. Calculate Statistics
  const totalOnSale = safeProducts.filter(p => p.status === '在售').length;
  const totalPlanning = safePlans.filter(p => p.status === '规划中').length;
  const totalSCore = safeProducts.filter(p => p.grade === 'S级' || p.grade === 'S').length; 
  const totalAssets = safeProducts.length + safePlans.length;

  // 2. Prepare Chart Data
  // Module Distribution (On Sale Products)
  const dataModule = safeModules.map((mod, index) => {
    // Generate colors dynamically or cycle through a palette
    const colors = ['#1890ff', '#13c2c2', '#722ed1', '#eb2f96', '#fa8c16', '#a0d911'];
    const color = colors[index % colors.length];
    
    return {
      name: mod.name,
      value: safeProducts.filter(p => p.status === '在售' && p.module === mod.name).length,
      color: color
    };
  }).filter(item => item.value > 0);

  // Lifecycle Status (All Products: Products + Plans)
  const onSaleCount = safeProducts.filter(p => p.status === '在售').length;
  const offShelfCount = safeProducts.filter(p => p.status === '下市').length;
  const planningCount = safePlans.filter(p => p.status === '规划中').length + safeProducts.filter(p => p.status === '规划中').length;

  const dataLifecycle = [
    { name: '规划中', value: planningCount },
    { name: '在售', value: onSaleCount },
    { name: '下市', value: offShelfCount },
  ];

  // Grading Distribution (On Sale Products)
  const sGradeCount = safeProducts.filter(p => p.status === '在售' && (p.grade === 'S级' || p.grade === 'S')).length;
  const aGradeCount = safeProducts.filter(p => p.status === '在售' && (p.grade === 'A级' || p.grade === 'A')).length;
  const bGradeCount = safeProducts.filter(p => p.status === '在售' && (p.grade === 'B级' || p.grade === 'B')).length;

  const dataGrading = [
    { name: 'S级', value: sGradeCount },
    { name: 'A级', value: aGradeCount },
    { name: 'B级', value: bGradeCount },
  ];

  // 3. Latest Products (Top 5 from Products list)
  const latestProducts = safeProducts.slice(0, 5);

  const columns = [
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 shrink-0">
            <img src={record.image} alt={text} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold">{text}</span>
            <span className="text-xs text-gray-500">{record.code}</span>
          </div>
        </div>
      )
    },
    {
      title: '模块 / 品类',
      key: 'module',
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="text-blue-500 font-bold">{record.module}</span>
          <span>{record.category}</span>
        </div>
      )
    },
    {
      title: '分级',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade) => {
        let color = 'blue';
        if (grade === 'S级' || grade === 'S') color = 'gold';
        if (grade === 'A级' || grade === 'A') color = 'blue';
        if (grade === 'B级' || grade === 'B') color = 'cyan';
        return <Tag color={color}>{grade}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span className={status === '在售' ? 'text-green-600' : 'text-gray-500'}>{status}</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span className="text-gray-500 font-medium">在售产品</span>}
              value={totalOnSale}
              valueStyle={{ fontSize: '48px', fontWeight: 'bold', color: '#1890ff' }}
              suffix={<span className="text-sm text-gray-400 font-normal ml-2">实时统计</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span className="text-gray-500 font-medium">规划储备</span>}
              value={totalPlanning}
              valueStyle={{ fontSize: '48px', fontWeight: 'bold', color: '#722ed1' }}
              suffix={<span className="text-sm text-gray-400 font-normal ml-2">实时统计</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span className="text-gray-500 font-medium">S级核心</span>}
              value={totalSCore}
              valueStyle={{ fontSize: '48px', fontWeight: 'bold', color: '#faad14' }}
              suffix={<span className="text-sm text-gray-400 font-normal ml-2">实时统计</span>}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={<span className="text-gray-500 font-medium">总资产数</span>}
              value={totalAssets}
              valueStyle={{ fontSize: '48px', fontWeight: 'bold', color: '#595959' }}
              suffix={<span className="text-sm text-gray-400 font-normal ml-2">实时统计</span>}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={8}>
          <Card title="模块分布 | 在售产品统计" className="h-full">
             <div className="h-64 flex items-center justify-center">
               <ResponsiveContainer width="100%" height="100%">
                 {dataModule.length > 0 ? (
                   <PieChart>
                      <Pie
                        data={dataModule}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dataModule.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                   </PieChart>
                 ) : (
                   <div className="text-gray-400">暂无数据</div>
                 )}
               </ResponsiveContainer>
             </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="生命周期状态 | 全量产品统计" className="h-full">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={dataLifecycle} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={50} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" barSize={20} radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="产品分级分布 | 在售分级统计" className="h-full">
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={dataGrading} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} />
                   <YAxis hide />
                   <Tooltip />
                   <Bar dataKey="value" fill="#0088FE" barSize={30} radius={[10, 10, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={16}>
          <Card title="最新上架产品" extra={<a href="/products">查看全部</a>}>
            <Table 
              columns={columns} 
              dataSource={latestProducts} 
              pagination={false} 
              rowKey="key"
              locale={{ emptyText: '暂无产品数据' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card 
            title="最新产品动态" 
            extra={<a href="#" onClick={(e) => { e.preventDefault(); setTimelineDrawerVisible(true); }}>查看全部</a>}
            className="h-full"
            bodyStyle={{ padding: '0 24px' }}
          >
            <List
              itemLayout="vertical"
              dataSource={[...safeTimelines].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)}
              locale={{ emptyText: '暂无最新动态' }}
              renderItem={item => (
                <List.Item className="py-4 border-b border-gray-100 last:border-0">
                  <List.Item.Meta
                    title={
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 text-sm">{getTimelinePlanName(item)}</span>
                        <span className="text-xs text-gray-400">{dayjs(item.createdAt).format('MM-DD HH:mm')}</span>
                      </div>
                    }
                    description={
                      <div className="mt-1">
                        <Paragraph ellipsis={{ rows: 2 }} className="text-sm text-gray-500 m-0" style={{ marginBottom: 0 }}>
                          <div dangerouslySetInnerHTML={{ __html: item.content }} className="prose prose-sm max-w-none line-clamp-2 [&>img]:hidden" />
                        </Paragraph>
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                          <Avatar size="small" className="bg-blue-50 text-blue-500">{item.createdBy?.charAt(0)?.toUpperCase() || 'U'}</Avatar>
                          <span>{item.createdBy}</span>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Global Timeline Drawer */}
      <Drawer
        title={<div className="font-bold text-lg">全系统产品动态</div>}
        width={600}
        placement="right"
        onClose={() => setTimelineDrawerVisible(false)}
        open={timelineDrawerVisible}
      >
        {safeTimelines.length > 0 ? (
          <List
            itemLayout="vertical"
            dataSource={[...safeTimelines].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))}
            renderItem={item => (
              <List.Item className="bg-gray-50 mb-4 p-4 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-800 text-base">{getTimelinePlanName(item)}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 font-medium">{item.createdBy}</span>
                      <span className="text-xs text-gray-400">{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                    </div>
                  </div>
                </div>
                <div 
                  className="text-gray-600 prose prose-sm max-w-none bg-white p-4 rounded border border-gray-100"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />
              </List.Item>
            )}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <HistoryOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <p>暂无产品动态记录</p>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default Dashboard;
