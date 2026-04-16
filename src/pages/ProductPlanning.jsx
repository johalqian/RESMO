import React, { useState, useContext } from 'react';
import { Card, Button, Input, Tag, Select, Modal, Form, message, Tabs, Upload, DatePicker, Space, Dropdown, Menu, Popconfirm, Drawer, Timeline, Pagination } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, UploadOutlined, PictureOutlined, ImportOutlined, DownloadOutlined, FileImageOutlined, MoreOutlined, DeleteOutlined, EditOutlined, HistoryOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { DataContext } from '../context/DataContext';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const { Option } = Select;
const { TextArea } = Input;

const ProductPlanning = () => {
  const { plans, addPlan, addPlans, updatePlan, deletePlan, publishPlan, modules, categories, timelines, addTimeline, updateTimeline, deleteTimeline, currentUser } = useContext(DataContext);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form] = Form.useForm();
  const [previewImage, setPreviewImage] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [sortByLaunchDate, setSortByLaunchDate] = useState(false);
  
  // Timeline State
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [currentPlanForTimeline, setCurrentPlanForTimeline] = useState(null);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelineEditorVisible, setTimelineEditorVisible] = useState(false);
  const [editingTimelineItem, setEditingTimelineItem] = useState(null);
  const [timelineForm] = Form.useForm();
  const [editorContent, setEditorContent] = useState('');

  const hasTimelinePermission = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  const handleOk = async () => {
    if (savingPlan) return;
    setSavingPlan(true);
    try {
      const values = await form.validateFields();
      const planData = {
        name: values.name,
        desc: values.desc,
        date: values.launchDate ? values.launchDate.format('YYYY/MM/DD') : '待定',
        module: values.module,
        category: values.category,
        status: '规划中',
        price: values.price ? `¥${values.price}` : '¥0',
        image: values.image || 'https://via.placeholder.com/500x300',
        grade: values.grade
      };

      if (editingPlan) {
        await updatePlan({ ...editingPlan, ...planData });
        message.success('规划更新成功');
      } else {
        await addPlan({
          id: Date.now(),
          ...planData
        });
        message.success('规划添加成功');
      }

      setIsModalVisible(false);
      setEditingPlan(null);
      form.resetFields();
      setPreviewImage('');
    } catch (e) {
      if (e?.errorFields) return;
      message.error(`保存失败：${e?.message || '请稍后重试'}`);
    } finally {
      setSavingPlan(false);
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setPreviewImage(plan.image);
    form.setFieldsValue({
      name: plan.name,
      code: plan.code,
      module: plan.module,
      category: plan.category,
      price: plan.price ? plan.price.replace('¥', '') : '',
      grade: plan.grade,
      priceLevel: plan.priceLevel,
      desc: plan.desc,
      image: plan.image,
      launchDate: (plan.date && plan.date !== '待定') ? dayjs(plan.date, 'YYYY/MM/DD') : null
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    setDeletingPlanId(id);
    try {
      await deletePlan(id);
      message.success('规划已删除');
    } catch (e) {
      message.error(`删除失败：${e?.message || '请稍后重试'}`);
    } finally {
      setDeletingPlanId(null);
    }
  };

  const confirmDeletePlan = (plan) => {
    Modal.confirm({
      title: '确认删除该规划？',
      content: `产品「${plan?.name || '未命名'}」删除后不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      centered: true,
      onOk: () => handleDelete(plan.id),
    });
  };

  const handlePublish = async (plan) => {
    const newProduct = {
      key: Date.now().toString(),
      name: plan.name,
      code: plan.code,
      module: plan.module,
      category: plan.category,
      status: '在售',
      price: plan.price ? plan.price.replace('¥', '') : '',
      grade: plan.grade,
      priceLevel: plan.priceLevel,
      desc: plan.desc,
      image: plan.image
    };

    try {
      await publishPlan(plan.id, newProduct);
      message.success('产品发布上市成功，已移动到产品管理');
    } catch (e) {
      if (e?.message === 'plan_not_found') {
        message.error('发布失败：该规划在服务器不存在，已为您刷新最新数据，请重试');
        return;
      }
      message.error(`发布失败：${e?.message || '未知错误'}`);
    }
  };

  const showModal = () => {
    setEditingPlan(null);
    form.resetFields();
    setPreviewImage('');
    setIsModalVisible(true);
  };

  const beforeUpload = (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 800;
        if (width > max || height > max) {
          if (width > height) { height = Math.round(height * max / width); width = max; }
          else { width = Math.round(width * max / height); height = max; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPreviewImage(dataUrl);
        form.setFieldsValue({ image: dataUrl });
      };
    };
    return false;
  };

  // Safe fallbacks
  const safePlans = Array.isArray(plans) ? plans : [];
  const safeModules = Array.isArray(modules) ? modules : [];
  const safeCategories = Array.isArray(categories) ? categories : [];

  const filteredPlans = safePlans.filter(plan => {
    if (activeTab === 'all') return true;
    return plan.module === activeTab;
  });

  const getLaunchTimestamp = (plan) => {
    if (!plan?.date || plan.date === '待定') return -Infinity;
    const parsed = dayjs(plan.date, ['YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY/M/D'], true);
    return parsed.isValid() ? parsed.valueOf() : -Infinity;
  };

  // Group plans by category
  const plansByCategory = {};
  if (filteredPlans.length > 0) {
    filteredPlans.forEach(plan => {
      const category = plan.category || '未分类';
      if (!plansByCategory[category]) {
        plansByCategory[category] = [];
      }
      plansByCategory[category].push(plan);
    });
  }

  const categoryEntries = Object.entries(plansByCategory);
  const getPlanMonthKey = (plan) => {
    if (!plan?.date || plan.date === '待定') return '待定';
    const parsed = dayjs(plan.date, ['YYYY/MM/DD', 'YYYY-MM-DD', 'YYYY/M/D'], true);
    return parsed.isValid() ? parsed.format('YYYY/MM') : '待定';
  };

  const timelineEntries = [...filteredPlans]
    .sort((a, b) => getLaunchTimestamp(b) - getLaunchTimestamp(a))
    .reduce((acc, plan) => {
      const monthKey = getPlanMonthKey(plan);
      const last = acc[acc.length - 1];
      if (!last || last[0] !== monthKey) {
        acc.push([monthKey, [plan]]);
      } else {
        last[1].push(plan);
      }
      return acc;
    }, []);

  // Dynamic tabs based on modules
  const tabItems = [
    { key: 'all', label: '全部规划' },
    ...safeModules.map(m => ({
      key: m.name,
      label: `${m.name}规划`
    }))
  ];

  // Get categories for current selected module in form
  const currentModule = Form.useWatch('module', form);
  const availableCategories = safeCategories.filter(c => c.module === currentModule);

  // Excel Import Handler
  const handleExcelImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          message.warning('导入的文件没有数据');
          return;
        }

        const newPlans = [];
        let successCount = 0;
        
        jsonData.forEach(item => {
          if (item['产品名称'] && item['所属模块']) {
            const newPlan = {
              id: Date.now() + Math.random(),
              name: item['产品名称'],
              code: item['型号'] || '',
              module: item['所属模块'],
              category: item['产品品类'] || '',
              status: '规划中',
              price: item['预估价格'] ? `¥${item['预估价格']}` : '¥0',
              grade: item['分级'] || 'B级',
              priceLevel: item['价格级'] || '中端',
              desc: item['规划描述'] || '',
              image: item['图片URL'] || 'https://via.placeholder.com/500x300',
              date: item['预估上市时间'] || '待定'
            };
            newPlans.push(newPlan);
            successCount++;
          }
        });

        if (newPlans.length > 0) {
          addPlans(newPlans);
          message.success(`成功导入 ${successCount} 条规划数据`);
        } else {
          message.warning('未找到有效数据，请检查必填字段');
        }
      } catch (error) {
        console.error('Import error:', error);
        message.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent auto upload
  };

  // Download Template Handler
  const handleDownloadTemplate = () => {
    // Create validation sheet for dropdowns
    const wb = XLSX.utils.book_new();
    
    // 1. Data Sheet
    const templateData = [
      {
        '产品名称': '示例规划产品',
        '型号': 'P-001',
        '所属模块': '卫浴', // Should match dropdown
        '产品品类': '恒温花洒', // Should match dropdown
        '预估价格': '1599',
        '分级': 'A级', // Dropdown: S级, A级, B级
        '价格级': '中端', // Dropdown: 高端, 中端, 入门
        '预估上市时间': '2026/12/31',
        '规划描述': '填写产品核心卖点',
        '图片URL': ''
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Add Data Validation Instructions (Since fully programmatic data validation in xlsx js style is complex/limited for some formats, we add a guide sheet or comments)
    // We will add a second sheet with valid options for reference.
    const validOptions = [
      { '字段': '所属模块', '选项': safeModules.map(m => m.name).join(', ') },
      { '字段': '分级', '选项': 'S级, A级, B级' },
      { '字段': '价格级', '选项': '高端, 中端, 入门' },
      { '字段': '产品品类', '选项': '请参考各模块下的已有品类' }
    ];
    const wsOptions = XLSX.utils.json_to_sheet(validOptions);

    XLSX.utils.book_append_sheet(wb, ws, "规划导入模板");
    XLSX.utils.book_append_sheet(wb, wsOptions, "填写规范(参考)");

    XLSX.writeFile(wb, "产品规划导入模板.xlsx");
  };

  // Timeline Handlers
  const openTimelineEditor = (item = null) => {
    setEditingTimelineItem(item);
    if (item) {
      setEditorContent(item.content);
    } else {
      setEditorContent('');
    }
    setTimelineEditorVisible(true);
  };

  const handleSaveTimeline = async () => {
    if (!editorContent || editorContent.trim() === '<p><br></p>') {
      message.error('动态内容不能为空');
      return;
    }

    const now = new Date().toISOString();
    
    try {
      if (editingTimelineItem) {
        await updateTimeline({
          ...editingTimelineItem,
          planName: currentPlanForTimeline?.name || editingTimelineItem.planName,
          content: editorContent,
          updatedAt: now,
          updatedBy: currentUser?.username || '未知用户'
        });
        message.success('动态更新成功');
      } else {
        await addTimeline({
          id: Date.now().toString(),
          planId: currentPlanForTimeline.id,
          planName: currentPlanForTimeline.name,
          content: editorContent,
          createdAt: now,
          createdBy: currentUser?.username || '未知用户',
          updatedAt: now
        });
        message.success('动态添加成功');
      }
      
      setTimelineEditorVisible(false);
      setEditingTimelineItem(null);
      setEditorContent('');
    } catch (e) {
      message.error(`保存失败：${e?.message || '请稍后重试'}`);
    }
  };

  const handleDeleteTimeline = (id) => {
    deleteTimeline(id);
    message.success('动态已删除');
  };

  const currentPlanTimelines = (Array.isArray(timelines) ? timelines : [])
    .filter(t => t.planId === currentPlanForTimeline?.id)
    .filter(t => {
      if (!timelineSearch) return true;
      const searchLower = timelineSearch.toLowerCase();
      return (
        t.content.toLowerCase().includes(searchLower) ||
        t.createdBy.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const renderPlanCard = (plan) => (
    <div
      key={plan.id}
      className="group relative bg-white rounded-xl p-4 h-[300px] flex flex-col shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer"
      onClick={() => handleEdit(plan)}
    >
      <div className="relative z-20 flex flex-col pointer-events-none">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{plan.module}</span>
          <Tag color={plan.grade === 'S级' ? 'gold' : 'default'} className="mr-0 border-none px-1.5 py-0 rounded text-[9px] font-bold bg-gray-50 text-gray-500 group-hover:bg-gray-100 transition-colors">
            {plan.grade}
          </Tag>
        </div>

        <h3 className="text-base font-bold text-gray-900 leading-snug mb-1 line-clamp-1 tracking-tight" title={plan.name}>
          {plan.name}
        </h3>

        <p className="text-xs text-gray-400 font-medium line-clamp-2 mb-2 leading-relaxed h-8">
          {plan.desc || '暂无描述'}
        </p>

        <div className="text-[10px] text-gray-400 font-medium">
          <span>{plan.price}</span>
          {plan.date && plan.date !== '待定' && (
            <>
              <span className="mx-1">·</span>
              <span>{plan.date} 上市</span>
            </>
          )}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[150px] flex items-end justify-center pb-4 z-10 transition-transform duration-500 ease-out group-hover:scale-105">
        {plan.image ? (
          <img
            src={plan.image}
            className="h-full max-w-[90%] object-contain"
            alt={plan.name}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('bg-gray-50');
              e.target.parentElement.innerHTML = '<span class="text-gray-300 text-2xl"><svg viewBox="64 64 896 896" focusable="false" data-icon="picture" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M928 160H96c-17.7 0-32 14.3-32 32v640c0 17.7 14.3 32 32 32h832c17.7 0 32-14.3 32-32V192c0-17.7-14.3-32-32-32zM338 720l152-198 152 198H338zm528 48H158V232h708v536zm-648-48l184-240 160 206 128-166 176 248H218z"></path></svg></span>';
              e.target.parentElement.classList.add('items-center');
            }}
          />
        ) : (
          <div className="h-full w-full bg-gray-50 flex items-center justify-center text-gray-300">
            <PictureOutlined style={{ fontSize: '32px' }} />
          </div>
        )}
      </div>

      <div className="absolute top-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Dropdown
          overlay={
            <Menu>
              <Menu.Item key="timeline" icon={<HistoryOutlined />} onClick={(e) => { e.domEvent.stopPropagation(); setCurrentPlanForTimeline(plan); setIsTimelineVisible(true); }}>
                产品动态
              </Menu.Item>
              <Menu.Item key="edit" icon={<EditOutlined />} onClick={(e) => { e.domEvent.stopPropagation(); handleEdit(plan); }}>
                编辑
              </Menu.Item>
              <Menu.Item key="publish" icon={<ImportOutlined />} onClick={(e) => { e.domEvent.stopPropagation(); }}>
                <Popconfirm
                  title="确定要发布这个产品吗？"
                  description="发布后将移动到产品管理列表，并标记为在售状态。"
                  onConfirm={(e) => { e?.stopPropagation(); handlePublish(plan); }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="确定发布"
                  cancelText="取消"
                >
                  发布上市
                </Popconfirm>
              </Menu.Item>
              <Menu.Item
                key="delete"
                icon={<DeleteOutlined />}
                danger
                disabled={deletingPlanId === plan.id}
                onClick={(e) => {
                  e.domEvent.stopPropagation();
                  confirmDeletePlan(plan);
                }}
              >
                {deletingPlanId === plan.id ? '删除中...' : '删除'}
              </Menu.Item>
            </Menu>
          }
          trigger={['click']}
        >
          <div
            className="w-8 h-8 flex items-center justify-center bg-gray-100/80 backdrop-blur-sm rounded-full hover:bg-gray-200 cursor-pointer text-gray-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreOutlined />
          </div>
        </Dropdown>
      </div>
    </div>
  );

  return (
    <div className="bg-[#f5f5f7] p-6 rounded-lg min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-2xl font-bold">产品规划</h1>
           <p className="text-gray-500">管理处于规划阶段的产品，准备发布到市场</p>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
          <Upload beforeUpload={handleExcelImport} showUploadList={false} accept=".xlsx, .xls">
            <Button icon={<ImportOutlined />}>Excel 导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>新增规划</Button>
        </Space>
      </div>

      <div className="mb-6">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          type="card"
        />
      </div>

      <div className="flex gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
        <Input 
          placeholder="搜索规划产品..." 
          prefix={<SearchOutlined className="text-gray-400" />} 
          className="w-96"
        />
        <Select defaultValue="all" style={{ width: 150 }}>
          <Option value="all">所有模块</Option>
          {safeModules.map(m => (
            <Option key={m.name} value={m.name}>{m.name}</Option>
          ))}
        </Select>
        <Button icon={<FilterOutlined />} />
        <Button
          icon={<SortAscendingOutlined />}
          type={sortByLaunchDate ? 'primary' : 'default'}
          onClick={() => setSortByLaunchDate((prev) => !prev)}
        >
          {sortByLaunchDate ? '按时间排序中' : '按时间排序'}
        </Button>
      </div>

      <div className="space-y-8">
        {filteredPlans.length > 0 ? (
          sortByLaunchDate ? (
            <div className="space-y-6">
              <div className="bg-white border border-purple-100 rounded-xl px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center gap-3 overflow-x-auto">
                  {timelineEntries.map(([monthKey, items]) => (
                    <div key={monthKey} className="flex items-center gap-3 shrink-0">
                      <div className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold">
                        {monthKey === '待定' ? '待定' : `${monthKey} 上市`}
                      </div>
                      <span className="text-[11px] text-gray-400">{items.length} 款</span>
                      <div className="w-6 h-px bg-purple-200"></div>
                    </div>
                  ))}
                </div>
              </div>

              {timelineEntries.map(([monthKey, items]) => (
                <div key={monthKey} className="relative pl-6">
                  <div className="absolute left-[7px] top-2 bottom-0 w-px bg-purple-100"></div>
                  <div className="absolute left-0 top-2 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-purple-100"></div>
                  <div className="mb-4 flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-800">{monthKey === '待定' ? '待定上市' : `${monthKey} 计划上市`}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {items.map(renderPlanCard)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            categoryEntries.map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
                  <h3 className="text-lg font-bold text-gray-800">{category}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {items.map(renderPlanCard)}
                </div>
              </div>
            ))
          )
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
             <PictureOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
             <p>暂无规划产品</p>
             <Button type="primary" className="mt-4" onClick={showModal}>立即添加</Button>
          </div>
        )}
      </div>

      <Modal
        title={<div className="text-lg font-bold mb-6">{editingPlan ? '编辑规划' : '新增规划'}</div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={720}
        className="rounded-xl overflow-hidden"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleOk}
          initialValues={{ 
            grade: 'B级', 
            priceLevel: '中端' 
          }}
        >
          <div className="flex gap-8">
            {/* Left Column - Form Fields */}
            <div className="flex-1 grid grid-cols-2 gap-x-4">
              <Form.Item label="产品名称" name="name" rules={[{ required: true }]}>
                <Input placeholder="请输入产品名称" />
              </Form.Item>
              <Form.Item label="型号" name="code">
                <Input placeholder="请输入产品型号" />
              </Form.Item>

              <Form.Item label="所属模块" name="module" rules={[{ required: true }]}>
                <Select placeholder="请选择模块" onChange={() => form.setFieldsValue({ category: undefined })}>
              {safeModules.map(m => (
                <Option key={m.id} value={m.name}>{m.name}</Option>
              ))}
            </Select>
              </Form.Item>
              <Form.Item label="产品品类" name="category" rules={[{ required: true }]}>
                <Select placeholder="请选择品类">
                  {availableCategories.map(c => (
                    <Option key={c.name} value={c.name}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="价格级" name="priceLevel">
                <Select>
                  <Option value="高端">高端</Option>
                  <Option value="中端">中端</Option>
                  <Option value="入门">入门</Option>
                </Select>
              </Form.Item>
              <Form.Item label="预估价格" name="price">
                <Input prefix="¥" placeholder="0" />
              </Form.Item>

              <Form.Item label="预估上市时间" name="launchDate" className="col-span-2">
                <DatePicker className="w-full" placeholder="选择日期" />
              </Form.Item>

              <Form.Item label="分级 (S/A/B)" name="grade" className="col-span-2">
                <Select>
                  <Option value="S级">S级</Option>
                  <Option value="A级">A级</Option>
                  <Option value="B级">B级</Option>
                </Select>
              </Form.Item>

              <Form.Item label="规划描述" name="desc" className="col-span-2">
                <TextArea rows={3} placeholder="简要描述规划产品的核心卖点..." />
              </Form.Item>
            </div>

            {/* Right Column - Image Upload */}
            <div className="w-64">
              <Form.Item name="image" hidden>
                <Input />
              </Form.Item>
              <Form.Item label="预览图">
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="图片 URL" 
                      value={previewImage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPreviewImage(val);
                        form.setFieldsValue({ image: val });
                      }} 
                    />
                    <Upload beforeUpload={beforeUpload} showUploadList={false}>
                      <Button icon={<UploadOutlined />} className="text-purple-500 bg-purple-50 border-purple-200">上传</Button>
                    </Upload>
                  </div>
                  <div className="text-xs text-gray-400">
                    建议尺寸 800x800，大小不超过 2MB
                  </div>
                </div>
              
                <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 flex flex-col items-center justify-center bg-gray-50 text-gray-400 overflow-hidden relative">
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover relative z-10" onError={(e) => {e.target.style.display='none';}} />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
                    <PictureOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                    <span className="text-xs">暂无预览图</span>
                  </div>
                </div>
              </Form.Item>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 border-t pt-4">
            <Button size="large" className="bg-gray-100 border-none text-gray-600 hover:bg-gray-200 w-32" onClick={() => setIsModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" size="large" className="w-32 bg-purple-600 hover:bg-purple-500 border-none" htmlType="submit" loading={savingPlan}>
              {editingPlan ? '保存修改' : '确认添加'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Timeline Drawer */}
      <Drawer
        title={
          <div className="flex justify-between items-center pr-8">
            <span className="font-bold text-lg">产品动态 - {currentPlanForTimeline?.name}</span>
            {hasTimelinePermission && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openTimelineEditor()}>
                新增动态
              </Button>
            )}
          </div>
        }
        width={600}
        placement="right"
        onClose={() => setIsTimelineVisible(false)}
        open={isTimelineVisible}
        className="timeline-drawer"
      >
        <div className="mb-6">
          <Input 
            placeholder="搜索动态内容或创建人..." 
            prefix={<SearchOutlined className="text-gray-400" />}
            value={timelineSearch}
            onChange={(e) => setTimelineSearch(e.target.value)}
            allowClear
          />
        </div>

        {currentPlanTimelines.length > 0 ? (
          <Timeline
            mode="left"
            items={currentPlanTimelines.map(item => ({
              color: 'blue',
              children: (
                <div className="bg-gray-50 p-4 rounded-lg relative group border border-gray-100 mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-800">{item.createdBy}</span>
                      <span className="text-xs text-gray-400">{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}</span>
                    </div>
                    {hasTimelinePermission && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openTimelineEditor(item)} />
                        <Popconfirm
                          title="确定要删除这条动态吗？"
                          onConfirm={() => handleDeleteTimeline(item.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </div>
                    )}
                  </div>
                  <div 
                    className="text-gray-600 prose prose-sm max-w-none mt-2"
                    dangerouslySetInnerHTML={{ __html: item.content }}
                  />
                  {item.updatedAt !== item.createdAt && (
                    <div className="text-[10px] text-gray-400 mt-2 text-right">
                      (最后修改于 {dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')})
                    </div>
                  )}
                </div>
              ),
            }))}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <HistoryOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <p>暂无产品动态记录</p>
          </div>
        )}
      </Drawer>

      {/* Timeline Editor Modal */}
      <Modal
        title={editingTimelineItem ? '编辑产品动态' : '新增产品动态'}
        open={timelineEditorVisible}
        onCancel={() => {
          setTimelineEditorVisible(false);
          setEditorContent('');
        }}
        onOk={handleSaveTimeline}
        width={600}
        destroyOnClose
        okText="保存"
        cancelText="取消"
      >
        <div className="mt-4 mb-8">
          <ReactQuill 
            theme="snow" 
            value={editorContent} 
            onChange={setEditorContent} 
            style={{ height: '200px', marginBottom: '40px' }}
            modules={{
              toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
              ],
            }}
          />
        </div>
      </Modal>

    </div>
  );
};

export default ProductPlanning;
