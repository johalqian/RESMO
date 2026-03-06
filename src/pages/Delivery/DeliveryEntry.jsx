import React, { useContext, useState } from 'react';
import { Card, Upload, Button, message, Space, Alert, Table } from 'antd';
import { InboxOutlined, UploadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { DataContext } from '../../context/DataContext';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { Dragger } = Upload;

const DeliveryEntry = ({ onSuccess }) => {
  const { addDeliveryData } = useContext(DataContext);
  const [previewData, setPreviewData] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON, starting from the data rows (usually skip header rows)
        // For the specific Excel in the images, we need to map columns carefully.
        // Assuming data starts from row 3 (index 2) or row 4 (index 3).
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Filter and map data
        const mapped = jsonData.slice(3) // Skip headers
          .filter(row => row[0] && dayjs(row[0]).isValid()) // Must have valid date
          .map(row => ({
            date: dayjs(row[0]).format('YYYY-MM-DD'),
            natural_visitors: Number(row[1] || 0),
            natural_add_cart: Number(row[2] || 0),
            natural_pay_buyers: Number(row[3] || 0),
            paid_visitors: Number(row[4] || 0),
            paid_add_cart: Number(row[5] || 0),
            paid_pay_buyers: Number(row[6] || 0),
            tmall_enter_shop: Number(row[7] || 0),
            tmall_add_cart: Number(row[8] || 0),
            tmall_buyers: Number(row[9] || 0),
            cost_exposure: Number(row[10] || 0),
            cost_tmall_enter: Number(row[11] || 0),
            rate_add_cart: Number(row[12] || 0),
            rate_pay_conversion: Number(row[13] || 0),
            amount_direct_pay: Number(row[14] || 0),
            jd_search_shop: Number(row[15] || 0),
            jd_search_buy: Number(row[16] || 0),
            jd_search_payers: Number(row[17] || 0),
            jd_search_amount: Number(row[18] || 0),
            total_visitors: Number(row[19] || 0),
            total_cost: Number(row[20] || 0),
          }));

        setPreviewData(mapped);
        message.success(`成功解析 ${mapped.length} 条记录`);
      } catch (err) {
        message.error('文件解析失败: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent automatic upload
  };

  const handleSave = async () => {
    if (previewData.length === 0) return;
    setLoading(true);
    try {
      await addDeliveryData(previewData);
      message.success('数据导入成功');
      setPreviewData([]);
      if (onSuccess) onSuccess();
    } catch (e) {
      message.error('保存失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 120 },
    { title: '自然访客', dataIndex: 'natural_visitors', key: 'natural_visitors', width: 80 },
    { title: '推广访客', dataIndex: 'paid_visitors', key: 'paid_visitors', width: 80 },
    { title: '聚光花费', dataIndex: 'cost_exposure', key: 'cost_exposure', width: 100 },
    { title: '总花费', dataIndex: 'total_cost', key: 'total_cost', width: 100 },
  ];

  return (
    <div className="space-y-6">
      <Alert
        message="导入说明"
        description="请上传包含投放数据的Excel文件。系统将自动解析第4行开始的数据，请确保列顺序与模板一致。"
        type="info"
        showIcon
      />
      
      <Card title="Excel 批量导入">
        <Dragger 
          accept=".xlsx, .xls"
          beforeUpload={handleFileUpload}
          showUploadList={false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此处上传</p>
          <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式文件</p>
        </Dragger>
      </Card>

      {previewData.length > 0 && (
        <Card 
          title={`预览数据 (${previewData.length} 条)`} 
          extra={
            <Space>
              <Button onClick={() => setPreviewData([])}>重置</Button>
              <Button 
                type="primary" 
                icon={<CloudUploadOutlined />} 
                loading={loading}
                onClick={handleSave}
              >
                确认导入
              </Button>
            </Space>
          }
        >
          <Table 
            columns={columns} 
            dataSource={previewData.slice(0, 10)} 
            rowKey="date" 
            pagination={false}
            footer={() => previewData.length > 10 ? `...以及另外 ${previewData.length - 10} 条数据` : null}
          />
        </Card>
      )}
    </div>
  );
};

export default DeliveryEntry;
