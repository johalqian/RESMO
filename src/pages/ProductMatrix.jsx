import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { Button, Tag, Empty, Modal, Form, Input, Select, message, Upload } from 'antd';
import { AppstoreOutlined, PictureOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { DataContext } from '../context/DataContext';
import html2canvas from 'html2canvas';

// Safe Component Wrapper to catch render errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ProductMatrix Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center text-red-500 border border-red-200 bg-red-50 rounded-lg">
          <h2 className="text-lg font-bold mb-2">页面渲染出错</h2>
          <p className="text-sm font-mono bg-white p-2 rounded border border-red-100 inline-block text-left mb-4">
            {this.state.error?.toString()}
          </p>
          <div>
             <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const { Option } = Select;
const { TextArea } = Input;

const ProductImage = ({ src }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-200 z-0 bg-gray-50">
        <PictureOutlined style={{ fontSize: '24px' }} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      className="w-full h-full object-cover relative z-10" 
      onError={() => setHasError(true)}
    />
  );
};

const ProductMatrixContent = () => {
  const context = useContext(DataContext);
  const matrixRef = useRef(null);
  
  // Safe Access to Context Data
  const products = Array.isArray(context?.products) ? context.products : [];
  const plans = Array.isArray(context?.plans) ? context.plans : [];
  const modules = Array.isArray(context?.modules) ? context.modules : [];
  const categories = Array.isArray(context?.categories) ? context.categories : [];
  const updateProduct = context?.updateProduct || (() => {});

  const [activeModule, setActiveModule] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [previewImage, setPreviewImage] = useState('');

  const handleExportImage = async () => {
    if (!matrixRef.current) return;
    try {
      const canvas = await html2canvas(matrixRef.current, {
        useCORS: true,
        scale: 2, // Better quality
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `产品矩阵_${activeModule || '全部'}_${new Date().toLocaleDateString()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      message.success('图片导出成功');
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出图片失败');
    }
  };

  // 1. Get all available module names (Safe)
  const allModuleNames = useMemo(() => {
    try {
      const productModules = products
        .filter(p => p && typeof p === 'object' && p.module)
        .map(p => String(p.module));
      
      const systemModules = modules
        .filter(m => m && m.name)
        .map(m => String(m.name));
        
      return [...new Set([...systemModules, ...productModules])].filter(Boolean);
    } catch (e) {
      console.error("Error calculating modules:", e);
      return [];
    }
  }, [products, modules]);

  // 2. Set default active module
  useEffect(() => {
    if (allModuleNames.length > 0 && (!activeModule || !allModuleNames.includes(activeModule))) {
      setActiveModule(allModuleNames[0]);
    }
  }, [allModuleNames, activeModule]);

  // 3. Advanced Grouping: Group by Category -> Group by Price (Safe)
  const groupedProducts = useMemo(() => {
    try {
      if (!activeModule) return [];

      // Step A: Filter by module (Safely)
      const moduleProducts = products.filter(p => 
        p && 
        typeof p === 'object' && 
        String(p.module) === activeModule && 
        p.status === '在售'
      ).map(p => ({ ...p, isPlan: false }));

      const modulePlans = plans.filter(p => 
        p && 
        typeof p === 'object' && 
        String(p.module) === activeModule &&
        p.status === '规划中'
      ).map(p => ({ ...p, isPlan: true }));
      
      const allItems = [...moduleProducts, ...modulePlans];

      // Step B: Group by Category
      const byCategory = {};
      allItems.forEach(product => {
        const cat = product.category ? String(product.category) : '未分类';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(product);
      });

      // Step C: Build Structure
      const finalStructure = Object.entries(byCategory).map(([catName, items]) => {
        const priceGroups = {};
        
        items.forEach(item => {
          // SAFE PARSE: Ensure item.price is treated as string
          const priceStr = item.price ? String(item.price) : '0'; 
          // Extract numeric value safely
          const priceVal = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
          
          if (!priceGroups[priceVal]) priceGroups[priceVal] = [];
          priceGroups[priceVal].push(item);
        });

        // Sort price groups ascending
        const sortedPriceGroups = Object.entries(priceGroups)
          .sort(([pA], [pB]) => parseFloat(pA) - parseFloat(pB))
          .map(([_, groupItems]) => {
            // Sort items within price group: active products first, then plans
            return groupItems.sort((a, b) => (a.isPlan === b.isPlan ? 0 : a.isPlan ? 1 : -1));
          });

        return {
          category: catName,
          count: items.length,
          priceGroups: sortedPriceGroups
        };
      });

      return finalStructure;
    } catch (e) {
      console.error("Grouping error:", e);
      return [];
    }
  }, [products, plans, activeModule]);

  // Handle Edit
  const handleEdit = (product) => {
    if (!product) return;
    setEditingProduct(product);
    setPreviewImage(product.image);
    form.setFieldsValue({
      name: product.name,
      code: product.code,
      module: product.module,
      category: product.category,
      status: product.status,
      price: product.price ? String(product.price).replace('¥', '') : '',
      grade: product.grade,
      priceLevel: product.priceLevel,
      desc: product.desc,
      image: product.image
    });
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      const productData = {
        ...editingProduct,
        name: values.name,
        code: values.code,
        module: values.module,
        category: values.category,
        status: values.status,
        price: values.price ? `¥${values.price}` : '¥0',
        grade: values.grade,
        priceLevel: values.priceLevel,
        desc: values.desc,
        image: values.image || ''
      };
      updateProduct(productData);
      message.success('产品信息已更新');
      setIsModalVisible(false);
      setEditingProduct(null);
    });
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

  // Render Single Card (Safe)
  const renderProductCard = (product) => {
    if (!product) return null;
    
    try {
      const displayName = String(product.name || '未命名');
      const displayCode = String(product.code || '');
      const displayPrice = String(product.price || '¥0');
      const formattedPrice = displayPrice.startsWith('¥') ? displayPrice : `¥${displayPrice}`;
      const displayGrade = String(product.grade || '');
      const imageUrl = product.image || '';
      const isPlan = !!product.isPlan;

      return (
        <div 
          key={product.key || product.id || Math.random()}
          className={`bg-white border border-gray-100 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 w-32 shrink-0 relative group z-10 cursor-pointer ${isPlan ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}
          onClick={() => !isPlan && handleEdit(product)}
        >
          <div className="absolute -top-2 -right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
             <Tag color={displayGrade === 'S级' || displayGrade === 'S' ? 'gold' : 'blue'} className="mr-0 scale-75 origin-top-right shadow-sm">{displayGrade}</Tag>
          </div>
          
          {isPlan && (
            <div className="absolute top-1 left-1 z-20">
              <Tag color="purple" className="mr-0 scale-75 origin-top-left shadow-sm border-none">规划</Tag>
            </div>
          )}

          <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center relative">
            <ProductImage src={imageUrl} />
          </div>
          
          <div className="flex flex-col gap-0.5 text-center">
            <div className="text-xs font-bold truncate text-gray-800 w-full" title={displayName}>{displayName}</div>
            <div className="text-[10px] text-gray-400 truncate w-full">{displayCode}</div>
            <div className="text-blue-600 font-bold text-xs mt-0.5">{formattedPrice}</div>
          </div>
        </div>
      );
    } catch (err) {
      console.error("Card Render Error:", err);
      return <div className="w-32 h-32 bg-red-50 text-red-500 text-xs flex items-center justify-center">Error</div>;
    }
  };

  if (!context) return <div className="p-10 text-center text-gray-400">Loading Context...</div>;

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">产品矩阵图</h1>
          <p className="text-gray-500">分品类价格定位分布视图</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExportImage}
            className="mr-2"
          >
            导出图片
          </Button>
          {allModuleNames.map(name => (
            <Button 
              key={name}
              type={activeModule === name ? 'primary' : 'default'}
              icon={<AppstoreOutlined />}
              onClick={() => setActiveModule(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-8" ref={matrixRef}>
        {groupedProducts.length > 0 ? (
          groupedProducts.map((groupData) => (
            <div key={groupData.category} className="bg-gray-50/30 rounded-xl p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-gray-800">{groupData.category}</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{groupData.count} 款产品</span>
              </div>

              <div className="relative pt-6">
                {/* Flexible Container (No Scroll, Wrap Content) */}
                <div className="flex flex-wrap items-end gap-8 pb-8 pt-4 px-4 relative z-10">
                  {groupData.priceGroups.map((priceGroup, idx) => (
                    <div key={idx} className="flex flex-col-reverse gap-4 items-center">
                      {/* Vertical Stack for Same Price */}
                      <div className="flex flex-col-reverse gap-4">
                        {priceGroup.map(product => renderProductCard(product))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-20 rounded-2xl border border-dashed border-gray-200">
            <Empty description={activeModule ? `模块 [${activeModule}] 下暂无在售产品` : "暂无模块数据"} />
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        title={<div className="text-lg font-bold mb-6">编辑产品</div>}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleOk}>
          <div className="flex gap-8">
            <div className="flex-1 grid grid-cols-2 gap-x-4">
              <Form.Item label="产品名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item label="型号" name="code"><Input /></Form.Item>
              <Form.Item label="所属模块" name="module" rules={[{ required: true }]}>
                <Select onChange={() => form.setFieldsValue({ category: undefined })}>
                  {modules.map(m => <Option key={m.name} value={m.name}>{m.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item label="产品品类" name="category" rules={[{ required: true }]}>
                <Select>
                  {categories.filter(c => c.module === form.getFieldValue('module')).map(c => <Option key={c.name} value={c.name}>{c.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item label="状态" name="status"><Select><Option value="在售">在售</Option><Option value="规划中">规划中</Option><Option value="下市">下市</Option></Select></Form.Item>
              <Form.Item label="产品价格" name="price"><Input prefix="¥" /></Form.Item>
              <Form.Item label="分级" name="grade"><Select><Option value="S级">S级</Option><Option value="A级">A级</Option><Option value="B级">B级</Option></Select></Form.Item>
              <Form.Item label="价格级" name="priceLevel"><Select><Option value="高端">高端</Option><Option value="中端">中端</Option><Option value="入门">入门</Option></Select></Form.Item>
              <Form.Item label="描述" name="desc" className="col-span-2"><TextArea rows={3} /></Form.Item>
            </div>
            <div className="w-64">
              <Form.Item label="预览图" name="image">
                <div className="flex gap-2 mb-2">
                  <Input value={previewImage} onChange={(e) => { setPreviewImage(e.target.value); form.setFieldsValue({ image: e.target.value }); }} />
                  <Upload beforeUpload={beforeUpload} showUploadList={false}><Button icon={<UploadOutlined />}>上传</Button></Upload>
                </div>
              </Form.Item>
              <div className="border-2 border-dashed border-gray-200 rounded-lg h-48 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                {previewImage ? (
                  <img src={previewImage} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <div className="w-full h-full flex items-center justify-center absolute inset-0 bg-gray-50" style={{ display: previewImage ? 'none' : 'flex' }}>
                   <PictureOutlined className="text-3xl text-gray-300" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8 border-t pt-4">
            <Button onClick={() => setIsModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit">保存修改</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

const ProductMatrix = () => (
  <ErrorBoundary>
    <ProductMatrixContent />
  </ErrorBoundary>
);

export default ProductMatrix;
