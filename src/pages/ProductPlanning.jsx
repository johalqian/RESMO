import React, { useState, useContext } from 'react';
import { Card, Button, Input, Tag, Select, Modal, Form, message, Tabs, Upload, DatePicker, Space, Dropdown, Menu, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, UploadOutlined, PictureOutlined, ImportOutlined, DownloadOutlined, FileImageOutlined, MoreOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { DataContext } from '../context/DataContext';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { TextArea } = Input;

const ProductPlanning = () => {
  const { plans, addPlan, addPlans, updatePlan, deletePlan, addProduct, modules, categories } = useContext(DataContext);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [form] = Form.useForm();
  const [previewImage, setPreviewImage] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const handleOk = () => {
    form.validateFields().then(values => {
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
        updatePlan({ ...editingPlan, ...planData });
        message.success('规划更新成功');
      } else {
        addPlan({
          id: Date.now(),
          ...planData
        });
        message.success('规划添加成功');
      }

      setIsModalVisible(false);
      setEditingPlan(null);
      form.resetFields();
      setPreviewImage('');
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
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

  const handleDelete = (id) => {
    deletePlan(id);
    message.success('规划已删除');
  };

  const handlePublish = (plan) => {
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
    
    addProduct(newProduct);
    deletePlan(plan.id);
    message.success('产品发布上市成功，已移动到产品管理');
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
    reader.onload = () => {
      setPreviewImage(reader.result);
      form.setFieldsValue({ image: reader.result });
    };
    return false;
  };

  const filteredPlans = plans.filter(plan => {
    if (activeTab === 'all') return true;
    return plan.module === activeTab;
  });

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

  // Dynamic tabs based on modules
  const tabItems = [
    { key: 'all', label: '全部规划' },
    ...modules.map(m => ({
      key: m.name,
      label: `${m.name}规划`
    }))
  ];

  // Get categories for current selected module in form
  const currentModule = Form.useWatch('module', form);
  const availableCategories = categories.filter(c => c.module === currentModule);

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
      { '字段': '所属模块', '选项': modules.map(m => m.name).join(', ') },
      { '字段': '分级', '选项': 'S级, A级, B级' },
      { '字段': '价格级', '选项': '高端, 中端, 入门' },
      { '字段': '产品品类', '选项': '请参考各模块下的已有品类' }
    ];
    const wsOptions = XLSX.utils.json_to_sheet(validOptions);

    XLSX.utils.book_append_sheet(wb, ws, "规划导入模板");
    XLSX.utils.book_append_sheet(wb, wsOptions, "填写规范(参考)");

    XLSX.writeFile(wb, "产品规划导入模板.xlsx");
  };

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
          {modules.map(m => (
            <Option key={m.name} value={m.name}>{m.name}</Option>
          ))}
        </Select>
        <Button icon={<FilterOutlined />} />
      </div>

      <div className="space-y-8">
        {filteredPlans.length > 0 ? (
          Object.entries(plansByCategory).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-4 w-1 bg-purple-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-800">{category}</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map(plan => (
                  <div 
                    key={plan.id}
                    className="group relative bg-white rounded-xl p-4 h-[300px] flex flex-col shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer"
                    onClick={() => handleEdit(plan)}
                  >
                    {/* Content Layer - Top */}
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

                    {/* Image Layer - Bottom */}
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

                    {/* Actions Layer - Top Right (Hover) */}
                    <div className="absolute top-6 right-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                       <Dropdown 
                          overlay={
                            <Menu>
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
                              <Menu.Item key="delete" icon={<DeleteOutlined />} danger onClick={(e) => e.domEvent.stopPropagation()}>
                                <Popconfirm
                                  title="确定要删除这个规划吗？"
                                  onConfirm={(e) => { e?.stopPropagation(); handleDelete(plan.id); }}
                                  onCancel={(e) => e?.stopPropagation()}
                                  okText="确定"
                                  cancelText="取消"
                                >
                                  删除
                                </Popconfirm>
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
                ))}
              </div>
            </div>
          ))
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
                <Select placeholder="选择模块" onChange={() => form.setFieldsValue({ category: undefined })}>
                  {modules.map(m => (
                    <Option key={m.name} value={m.name}>{m.name}</Option>
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
            <Button type="primary" size="large" className="w-32 bg-purple-600 hover:bg-purple-500 border-none" htmlType="submit" onClick={handleOk}>
              {editingPlan ? '保存修改' : '确认添加'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductPlanning;
