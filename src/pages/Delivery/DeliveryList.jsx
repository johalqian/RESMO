import React, { useContext, useState } from 'react';
import { Table, DatePicker, Button, Input, Space, Popconfirm, message } from 'antd';
import { SearchOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { DataContext } from '../../context/DataContext';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const DeliveryList = () => {
  const { deliveryData, deleteDeliveryItem, currentUser } = useContext(DataContext);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState(null);

  const handleDelete = async (id) => {
    try {
      await deleteDeliveryItem(id);
      message.success('删除成功');
    } catch (e) {
      message.error('删除失败: ' + e.message);
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => ({
      ...item,
      // Map complex objects or ensure flat structure matches what we want in Excel
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveryData");
    XLSX.writeFile(wb, `DeliveryData_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  // Filter logic
  const filteredData = deliveryData.filter(item => {
    // Date filter
    if (dateRange) {
      const start = dateRange[0].startOf('day');
      const end = dateRange[1].endOf('day');
      const itemDate = dayjs(item.date);
      if (itemDate.isBefore(start) || itemDate.isAfter(end)) return false;
    }
    return true;
  });

  const columns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => (a.date > b.date ? 1 : -1),
    },
    {
      title: '自然流量',
      children: [
        { title: '访客数', dataIndex: 'natural_visitors', key: 'natural_visitors', width: 80 },
        { title: '加购数', dataIndex: 'natural_add_cart', key: 'natural_add_cart', width: 80 },
        { title: '支付买家数', dataIndex: 'natural_pay_buyers', key: 'natural_pay_buyers', width: 100 },
      ]
    },
    {
      title: '推广流量',
      children: [
        { title: '访客数', dataIndex: 'paid_visitors', key: 'paid_visitors', width: 80 },
        { title: '加购数', dataIndex: 'paid_add_cart', key: 'paid_add_cart', width: 80 },
        { title: '支付买家数', dataIndex: 'paid_pay_buyers', key: 'paid_pay_buyers', width: 100 },
      ]
    },
    {
      title: '天猫品牌词',
      children: [
        { title: '进店数', dataIndex: 'tmall_enter_shop', key: 'tmall_enter_shop', width: 80 },
        { title: '累计加购数', dataIndex: 'tmall_add_cart', key: 'tmall_add_cart', width: 100 },
        { title: '累计支付买家数', dataIndex: 'tmall_buyers', key: 'tmall_buyers', width: 120 },
      ]
    },
    {
      title: '成本与花费',
      children: [
        { title: '曝光花费', dataIndex: 'cost_exposure', key: 'cost_exposure', width: 100, render: (val) => val?.toFixed(2) },
        { title: '天猫进店成本', dataIndex: 'cost_tmall_enter', key: 'cost_tmall_enter', width: 120, render: (val) => val?.toFixed(2) },
      ]
    },
    {
      title: '转化指标',
      children: [
        { title: '加购率', dataIndex: 'rate_add_cart', key: 'rate_add_cart', width: 100, render: (val) => (val * 100).toFixed(2) + '%' },
        { title: '支付转化率', dataIndex: 'rate_pay_conversion', key: 'rate_pay_conversion', width: 100, render: (val) => (val * 100).toFixed(2) + '%' },
        { title: '直接支付金额', dataIndex: 'amount_direct_pay', key: 'amount_direct_pay', width: 120, render: (val) => val?.toFixed(2) },
      ]
    },
    {
      title: '京东搜索词',
      children: [
        { title: '进店数', dataIndex: 'jd_search_shop', key: 'jd_search_shop', width: 80 },
        { title: '购数', dataIndex: 'jd_search_buy', key: 'jd_search_buy', width: 80 },
        { title: '成交金额', dataIndex: 'jd_search_amount', key: 'jd_search_amount', width: 100, render: (val) => val?.toFixed(2) },
      ]
    },
    {
      title: '汇总',
      children: [
        { title: '总访客数', dataIndex: 'total_visitors', key: 'total_visitors', width: 100 },
        { title: '总成本', dataIndex: 'total_cost', key: 'total_cost', width: 100, render: (val) => val?.toFixed(2) },
      ]
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 100,
      render: (_, record) => (
        <Space size="middle">
          {(currentUser?.role === 'admin' || currentUser?.role === 'editor') && (
            <Popconfirm title="确定删除吗?" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Space>
          <RangePicker onChange={setDateRange} />
          <Button icon={<SearchOutlined />} onClick={() => {}}>搜索</Button>
        </Space>
        <Button icon={<DownloadOutlined />} onClick={handleExport}>导出Excel</Button>
      </div>
      <Table 
        columns={columns} 
        dataSource={filteredData} 
        rowKey="id" 
        scroll={{ x: 2000 }}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default DeliveryList;
