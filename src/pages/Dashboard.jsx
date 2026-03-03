import React, { useContext } from 'react';
import { Card, Col, Row, Statistic, Tag, Table, List, Avatar } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { DataContext } from '../context/DataContext';

const Dashboard = () => {
  const { products, plans, modules } = useContext(DataContext);

  // 1. Calculate Statistics
  const totalOnSale = products.filter(p => p.status === '在售').length;
  const totalPlanning = plans.filter(p => p.status === '规划中').length;
  const totalSCore = products.filter(p => p.grade === 'S级' || p.grade === 'S').length; 
  const totalAssets = products.length + plans.length;

  // 2. Prepare Chart Data
  // Module Distribution (On Sale Products)
  const dataModule = modules.map((mod, index) => {
    // Generate colors dynamically or cycle through a palette
    const colors = ['#1890ff', '#13c2c2', '#722ed1', '#eb2f96', '#fa8c16', '#a0d911'];
    const color = colors[index % colors.length];
    
    return {
      name: mod.name,
      value: products.filter(p => p.status === '在售' && p.module === mod.name).length,
      color: color
    };
  }).filter(item => item.value > 0);

  // Lifecycle Status (All Products: Products + Plans)
  const onSaleCount = products.filter(p => p.status === '在售').length;
  const offShelfCount = products.filter(p => p.status === '下市').length;
  const planningCount = plans.filter(p => p.status === '规划中').length + products.filter(p => p.status === '规划中').length;

  const dataLifecycle = [
    { name: '规划中', value: planningCount },
    { name: '在售', value: onSaleCount },
    { name: '下市', value: offShelfCount },
  ];

  // Grading Distribution (On Sale Products)
  const sGradeCount = products.filter(p => p.status === '在售' && (p.grade === 'S级' || p.grade === 'S')).length;
  const aGradeCount = products.filter(p => p.status === '在售' && (p.grade === 'A级' || p.grade === 'A')).length;
  const bGradeCount = products.filter(p => p.status === '在售' && (p.grade === 'B级' || p.grade === 'B')).length;

  const dataGrading = [
    { name: 'S级', value: sGradeCount },
    { name: 'A级', value: aGradeCount },
    { name: 'B级', value: bGradeCount },
  ];

  // 3. Latest Products (Top 5 from Products list)
  const latestProducts = products.slice(0, 5);

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

      <Card title="最新产品动态" extra={<a href="#">查看全部</a>}>
        <Table 
          columns={columns} 
          dataSource={latestProducts} 
          pagination={false} 
          rowKey="key"
          locale={{ emptyText: '暂无产品数据' }}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
