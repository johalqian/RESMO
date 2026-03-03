import React, { useState, useContext } from 'react';
import { Table, Tag, Input, Select, Button, Avatar, Modal, Form, message, Dropdown, Menu, Popconfirm, Upload, Space } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, MoreOutlined, UploadOutlined, PictureOutlined, EditOutlined, DeleteOutlined, ImportOutlined, DownloadOutlined, FileImageOutlined } from '@ant-design/icons';
import { DataContext } from '../context/DataContext';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { TextArea } = Input;

const ProductImage = ({ src }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
        <FileImageOutlined style={{ fontSize: '20px' }} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt="product" 
      className="w-full h-full object-cover" 
      onError={() => setHasError(true)}
    />
  );
};

const ProductList = () => {
  const { products, addProduct, addProducts, updateProduct, deleteProduct, modules, categories } = useContext(DataContext);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [previewImage, setPreviewImage] = useState('');
  
  // State for filtering
  const [filterModule, setFilterModule] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [pageSize, setPageSize] = useState(5);

  const handleDelete = (key) => {
    deleteProduct(key);
    message.success('产品已删除');
  };

  const handleEdit = (record) => {
    setEditingProduct(record);
    setPreviewImage(record.image);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      module: record.module,
      category: record.category,
      status: record.status,
      price: record.price,
      grade: record.grade === 'S' ? 'S级' : (record.grade === 'A' ? 'A级' : (record.grade === 'B' ? 'B级' : record.grade)),
      priceLevel: record.priceLevel,
      desc: record.desc,
      image: record.image
    });
    setIsModalVisible(true);
  };

  const columns = [
    {
      title: '产品预览',
      dataIndex: 'image',
      key: 'image',
      render: (src) => (
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center bg-gray-50 relative">
          <ProductImage src={src} />
        </div>
      )
    },
    {
      title: '产品名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex flex-col">
          <span className="font-bold text-lg">{text}</span>
          <span className="text-gray-400 text-xs">{record.desc}</span>
        </div>
      )
    },
    {
      title: '品类',
      key: 'category',
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="text-blue-500 font-bold">{record.module}</span>
          <span className="text-gray-500">{record.category}</span>
        </div>
      )
    },
    {
      title: '分级',
      dataIndex: 'grade',
      key: 'grade',
      render: (grade) => {
        let color = 'default';
        if (grade === 'S' || grade === 'S级') color = 'gold';
        if (grade === 'A' || grade === 'A级') color = 'blue';
        return <Tag color={color}>{grade}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === '在售' ? 'processing' : 'default'}>{status}</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const menu = (
          <Menu>
            <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              编辑
            </Menu.Item>
            <Menu.Item key="delete" icon={<DeleteOutlined />} danger>
              <Popconfirm
                title="确定要删除这个产品吗？"
                onConfirm={() => handleDelete(record.key)}
                okText="确定"
                cancelText="取消"
              >
                删除
              </Popconfirm>
            </Menu.Item>
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={['click']}>
             <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        );
      }
    }
  ];

  const handleOk = () => {
    form.validateFields().then(values => {
      const productData = {
        name: values.name,
        code: values.code,
        desc: values.desc,
        module: values.module,
        category: values.category,
        grade: values.grade,
        status: values.status,
        image: values.image || 'https://via.placeholder.com/100',
        price: values.price,
        priceLevel: values.priceLevel
      };

      if (editingProduct) {
        // Update existing
        updateProduct({ key: editingProduct.key, ...productData });
        message.success('产品更新成功');
      } else {
        // Create new
        const newProduct = {
          key: Date.now().toString(),
          ...productData
        };
        addProduct(newProduct);
        message.success('产品添加成功');
      }
      
      setIsModalVisible(false);
      setEditingProduct(null);
      form.resetFields();
      setPreviewImage('');
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
    setPreviewImage('');
  };

  const beforeUpload = (file) => {
    // 1. Check file size (limit to 2MB)
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片必须小于 2MB!');
      return Upload.LIST_IGNORE;
    }

    // 2. Check format
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件!');
      return Upload.LIST_IGNORE;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        // 3. Compress Image Logic
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Max width/height limit
        const MAX_SIZE = 800;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.7 quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        setPreviewImage(compressedDataUrl);
        form.setFieldsValue({ image: compressedDataUrl });
        message.success('图片上传并压缩成功');
      };
    };
    return false;
  };

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

        const newProducts = [];
        let successCount = 0;
        
        jsonData.forEach(item => {
          // Basic validation and mapping
          if (item['产品名称'] && item['所属模块']) {
            const newProduct = {
              key: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: item['产品名称'],
              code: item['型号'] || '',
              module: item['所属模块'],
              category: item['产品品类'] || '',
              status: item['状态'] || '在售',
              price: item['产品价格'] || '',
              grade: item['分级'] || 'B级',
              priceLevel: item['价格级'] || '中端',
              desc: item['产品描述'] || '',
              image: item['图片URL'] || 'https://via.placeholder.com/100'
            };
            newProducts.push(newProduct);
            successCount++;
          }
        });

        if (newProducts.length > 0) {
          addProducts(newProducts);
          message.success(`成功导入 ${successCount} 条产品数据`);
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
    const templateData = [
      {
        '产品名称': '示例产品',
        '型号': 'EX-001',
        '所属模块': '卫浴',
        '产品品类': '恒温花洒',
        '状态': '在售',
        '产品价格': '¥1299',
        '分级': 'A级',
        '价格级': '中端',
        '产品描述': '这是一个导入示例，请严格按照此格式填写',
        '图片URL': ''
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "导入模板");
    XLSX.writeFile(wb, "产品导入模板.xlsx");
  };

  // Dynamic filter logic
  const filteredProducts = products.filter(p => {
    if (filterModule !== 'all' && p.module !== filterModule) return false;
    // Category filtering logic can be added here if needed, currently only module filter is connected
    return true;
  });

  // Get categories for current selected module in form
  const currentModule = Form.useWatch('module', form);
  const availableCategories = categories.filter(c => c.module === currentModule);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">产品管理</h1>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
          <Upload beforeUpload={handleExcelImport} showUploadList={false} accept=".xlsx, .xls">
            <Button icon={<ImportOutlined />}>Excel 导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingProduct(null);
            form.resetFields();
            setPreviewImage('');
            setIsModalVisible(true);
          }}>新增产品</Button>
        </Space>
      </div>

      <div className="flex gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
        <Input 
          placeholder="搜索产品名称..." 
          prefix={<SearchOutlined className="text-gray-400" />} 
          style={{ width: 300 }} 
        />
        <Select defaultValue="all" style={{ width: 120 }} onChange={setFilterModule}>
          <Option value="all">所有模块</Option>
          {modules.map(m => (
            <Option key={m.name} value={m.name}>{m.name}</Option>
          ))}
        </Select>
        <Select defaultValue="all" style={{ width: 120 }}>
          <Option value="all">所有品类</Option>
          {/* We could dynamically populate this based on filterModule too */}
        </Select>
        <Select defaultValue="all" style={{ width: 120 }}>
          <Option value="all">所有状态</Option>
          <Option value="onsale">在售</Option>
          <Option value="planning">规划中</Option>
        </Select>
        <Button icon={<FilterOutlined />} />
      </div>

      <Table 
        columns={columns} 
        dataSource={filteredProducts} 
        pagination={{ 
          pageSize: pageSize,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50', '100'],
          onShowSizeChange: (current, size) => setPageSize(size),
          onChange: (page, size) => setPageSize(size)
        }}
        locale={{ emptyText: '暂无产品数据，请点击“新增产品”添加' }}
      />

      <Modal
        title={<div className="text-lg font-bold mb-6">{editingProduct ? '编辑产品' : '新增产品'}</div>}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={800}
        className="rounded-xl overflow-hidden"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleOk}
          initialValues={{ 
            status: '在售', 
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

              <Form.Item label="状态" name="status">
                <Select>
                  <Option value="在售">在售</Option>
                  <Option value="规划中">规划中</Option>
                  <Option value="下市">下市</Option>
                </Select>
              </Form.Item>
              <Form.Item label="产品价格" name="price">
                <Input prefix="¥" placeholder="0" />
              </Form.Item>

              <Form.Item label="分级 (S/A/B)" name="grade">
                <Select>
                  <Option value="S级">S级</Option>
                  <Option value="A级">A级</Option>
                  <Option value="B级">B级</Option>
                </Select>
              </Form.Item>
              <Form.Item label="价格级" name="priceLevel">
                <Select>
                  <Option value="高端">高端</Option>
                  <Option value="中端">中端</Option>
                  <Option value="入门">入门</Option>
                </Select>
              </Form.Item>

              <Form.Item label="产品描述" name="desc" className="col-span-2">
                <TextArea rows={3} placeholder="简要描述产品特点..." />
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
                      <Button icon={<UploadOutlined />} className="text-blue-500 bg-blue-50 border-blue-200">上传</Button>
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
            <Button size="large" className="bg-gray-100 border-none text-gray-600 hover:bg-gray-200 w-32" onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" size="large" className="w-32" htmlType="submit" onClick={handleOk}>
              {editingProduct ? '保存修改' : '确认添加'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductList;
