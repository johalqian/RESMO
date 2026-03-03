import React, { useState, useContext } from 'react';
import { Button, Modal, Form, Input, Radio, message, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, ExperimentOutlined, TagsOutlined, FolderAddOutlined } from '@ant-design/icons';
import { DataContext } from '../context/DataContext';

const CategoryManagement = () => {
  const { modules, addModule, deleteModule, categories, addCategory, updateCategory, deleteCategory } = useContext(DataContext);
  
  // State for Category Modal
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // { module: string, name: string }
  
  // State for Module Modal
  const [isModuleModalVisible, setIsModuleModalVisible] = useState(false);

  const [form] = Form.useForm();
  const [moduleForm] = Form.useForm();

  // --- Category Actions ---
  const showCategoryModal = () => {
    setEditingCategory(null);
    form.resetFields();
    setIsCategoryModalVisible(true);
  };

  const handleEditCategory = (moduleName, categoryName) => {
    setEditingCategory({ module: moduleName, name: categoryName });
    form.setFieldsValue({
      module: moduleName,
      name: categoryName
    });
    setIsCategoryModalVisible(true);
  };

  const handleDeleteCategory = (moduleName, categoryName) => {
    deleteCategory(moduleName, categoryName);
    message.success('品类已删除');
  };

  const handleCategoryOk = () => {
    form.validateFields().then(values => {
      const newCategory = { name: values.name, count: 0 }; 
      
      if (editingCategory) {
        updateCategory(editingCategory.module, editingCategory.name, values.module, values.name);
        message.success('品类更新成功');
      } else {
        addCategory(values.module, newCategory);
        message.success('品类添加成功');
      }
      
      setIsCategoryModalVisible(false);
      setEditingCategory(null);
      form.resetFields();
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  // --- Module Actions ---
  const showModuleModal = () => {
    moduleForm.resetFields();
    setIsModuleModalVisible(true);
  };

  const handleModuleOk = () => {
    moduleForm.validateFields().then(values => {
      // Check if exists
      if (modules.some(m => m.name === values.name)) {
        message.error('该模块已存在');
        return;
      }
      addModule(values.name);
      message.success('模块添加成功');
      setIsModuleModalVisible(false);
      moduleForm.resetFields();
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  const handleDeleteModule = (moduleName) => {
    // Check if has categories
    const hasCats = categories.some(c => c.module === moduleName);
    if (hasCats) {
      message.warning('该模块下还有品类，无法删除。请先清空品类。');
      return;
    }
    deleteModule(moduleName);
    message.success('模块已删除');
  };

  return (
    <div className="bg-white p-6 rounded-lg min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">产品品类管理</h1>
          <p className="text-gray-500 text-sm">定义卫浴和净水模块下的具体产品分类</p>
        </div>
        <div className="flex gap-3">
          <Button icon={<FolderAddOutlined />} size="large" onClick={showModuleModal}>新增模块</Button>
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={showCategoryModal}>新增品类</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {modules.map(mod => {
          const modCategories = categories.filter(c => c.module === mod.name);
          const isSystemModule = mod.id === 'bathroom' || mod.id === 'water'; // Keep 'bathroom' and 'water' somewhat special if we want different icons, or just treat all same.
          // Let's use dynamic icons or generic icons for new modules.
          let icon = <AppstoreOutlined style={{ fontSize: '20px' }} />;
          let colorClass = 'text-blue-500 bg-blue-50';
          let hoverClass = 'hover:bg-blue-50';
          let iconColorClass = 'text-blue-400';

          if (mod.id === 'water') {
            icon = <ExperimentOutlined style={{ fontSize: '20px' }} />;
            colorClass = 'text-cyan-500 bg-cyan-50';
            hoverClass = 'hover:bg-cyan-50';
            iconColorClass = 'text-cyan-400';
          } else if (!isSystemModule) {
             // Generic style for custom modules
             icon = <AppstoreOutlined style={{ fontSize: '20px' }} />;
             colorClass = 'text-purple-500 bg-purple-50';
             hoverClass = 'hover:bg-purple-50';
             iconColorClass = 'text-purple-400';
          }

          return (
            <div key={mod.name} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative group/card">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
                     {icon}
                   </div>
                   <span className="font-bold text-lg text-gray-800">{mod.name}模块品类</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">{modCategories.length} 个分类</span>
                    {!isSystemModule && (
                      <Popconfirm title="确定删除该模块？" onConfirm={() => handleDeleteModule(mod.name)}>
                        <Button type="text" danger size="small" icon={<DeleteOutlined />} className="opacity-0 group-hover/card:opacity-100 transition-opacity"/>
                      </Popconfirm>
                    )}
                 </div>
              </div>
              
              <div className="space-y-3">
                {modCategories.map((item, index) => (
                  <div key={index} className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg group ${hoverClass} transition-colors cursor-pointer`}>
                    <div className="flex items-center gap-3">
                      <TagsOutlined className={iconColorClass} />
                      <span className="font-bold text-gray-700">{item.name}</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                       <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEditCategory(mod.name, item.name)} />
                       <Popconfirm
                          title="确定要删除这个品类吗？"
                          onConfirm={() => handleDeleteCategory(mod.name, item.name)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                       </Popconfirm>
                    </div>
                  </div>
                ))}
                {modCategories.length === 0 && (
                  <div className="text-center text-gray-400 py-4">暂无分类</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Modal */}
      <Modal
        title={<div className="text-lg font-bold mb-6">{editingCategory ? '编辑品类' : '新增品类'}</div>}
        open={isCategoryModalVisible}
        onCancel={() => setIsCategoryModalVisible(false)}
        footer={null}
        width={480}
        className="rounded-xl overflow-hidden"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCategoryOk}
        >
          <Form.Item label="所属模块" name="module" rules={[{ required: true, message: '请选择所属模块' }]}>
            <Select placeholder="请选择模块" size="large">
              {modules.map(m => (
                <Select.Option key={m.name} value={m.name}>{m.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="品类名称" name="name" rules={[{ required: true, message: '请输入品类名称' }]}>
            <Input placeholder="如：花洒、马桶、净水器等" size="large" className="bg-gray-50 border-gray-200" />
          </Form.Item>

          <div className="flex gap-4 mt-8">
            <Button size="large" className="flex-1 bg-gray-100 border-none text-gray-600 hover:bg-gray-200" onClick={() => setIsCategoryModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" size="large" className="flex-1" htmlType="submit" onClick={handleCategoryOk}>
              {editingCategory ? '确认修改' : '确认添加'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Module Modal */}
      <Modal
        title={<div className="text-lg font-bold mb-6">新增模块</div>}
        open={isModuleModalVisible}
        onCancel={() => setIsModuleModalVisible(false)}
        footer={null}
        width={480}
        className="rounded-xl overflow-hidden"
      >
        <Form
          form={moduleForm}
          layout="vertical"
          onFinish={handleModuleOk}
        >
          <Form.Item label="模块名称" name="name" rules={[{ required: true, message: '请输入模块名称' }]}>
            <Input placeholder="如：厨电、照明等" size="large" className="bg-gray-50 border-gray-200" />
          </Form.Item>

          <div className="flex gap-4 mt-8">
            <Button size="large" className="flex-1 bg-gray-100 border-none text-gray-600 hover:bg-gray-200" onClick={() => setIsModuleModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" size="large" className="flex-1" htmlType="submit" onClick={handleModuleOk}>
              确认添加
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default CategoryManagement;
