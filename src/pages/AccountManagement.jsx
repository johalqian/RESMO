import React, { useState, useContext } from 'react';
import { Table, Button, Input, Modal, Form, Radio, Tag, Avatar, Space, message, Popconfirm } from 'antd';
import { PlusOutlined, UserOutlined, SafetyCertificateOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { DataContext } from '../context/DataContext';

const AccountManagement = () => {
  const { users, addUser, updateUser, deleteUser } = useContext(DataContext);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      role: record.role,
    });
    setIsModalVisible(true);
  };

  const handleDelete = (key) => {
    deleteUser(key).then(() => {
      message.success('账号已删除');
    }).catch(() => {
      message.error('删除失败');
    });
  };

  const columns = [
    {
      title: '用户信息',
      dataIndex: 'username',
      key: 'username',
      render: (text) => (
        <div className="flex items-center gap-3">
          <Avatar icon={<UserOutlined />} className="bg-blue-50 text-blue-500" />
          <span className="font-bold">{text}</span>
        </div>
      ),
    },
    {
      title: '权限角色',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        let color = 'default';
        let text = '查看者';
        let icon = <SafetyCertificateOutlined />;
        
        if (role === 'admin') {
          color = 'blue';
          text = '管理员';
        } else if (role === 'editor') {
          color = 'cyan';
          text = '编辑';
        }

        return (
          <Tag color={color} icon={icon} className="px-3 py-1 rounded-full border-none">
            {text}
          </Tag>
        );
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      className: 'text-gray-500',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="确定要删除这个账号吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
            disabled={record.role === 'admin' || String(record.username || '').toLowerCase() === 'admin'}
          >
            <Button type="text" danger icon={<DeleteOutlined />} disabled={record.role === 'admin' || String(record.username || '').toLowerCase() === 'admin'} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleOk = () => {
    form.validateFields().then(values => {
      const safeUsername = values.username.trim();
      const safeUsernameKey = safeUsername.toLowerCase();
      
      const isDuplicate = users.some(u => 
        String(u.username || '').trim().toLowerCase() === safeUsernameKey && 
        (!editingUser || u.id !== editingUser.id)
      );

      if (isDuplicate) {
        message.error('该用户名已存在，请使用其他用户名');
        return;
      }

      if (editingUser) {
        const updatedUser = { 
          ...editingUser, 
          username: safeUsername, 
          role: values.role 
        };
        if (values.password && values.password.trim() !== '') {
          updatedUser.password = values.password.trim();
        }
        updateUser(updatedUser).then(() => {
          message.success('账号更新成功');
        }).catch(() => {
          message.error('账号更新失败');
        });
      } else {
        const newUser = {
          username: safeUsername,
          password: values.password ? values.password.trim() : '',
          role: values.role,
        };
        addUser(newUser).then(() => {
          message.success('账号添加成功');
        }).catch((e) => {
          message.error(e?.status === 409 ? '该用户名已存在，请使用其他用户名' : '账号添加失败');
        });
      }
      setIsModalVisible(false);
      setEditingUser(null);
      form.resetFields();
    }).catch(info => {
      console.log('Validate Failed:', info);
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  return (
    <div className="bg-white p-6 rounded-lg min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">账号管理</h1>
          <p className="text-gray-500 text-sm">管理系统访问权限及用户信息</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => {
          setEditingUser(null);
          form.resetFields();
          setIsModalVisible(true);
        }}>新增账号</Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="id"
        pagination={false} 
        className="border border-gray-100 rounded-lg"
      />

      <Modal
        title={<div className="text-lg font-bold mb-6">{editingUser ? '编辑账号' : '新增账号'}</div>}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={480}
        className="rounded-xl overflow-hidden"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleOk}
          initialValues={{ role: 'viewer' }}
        >
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="请输入登录用户名" size="large" className="bg-gray-50 border-gray-200" />
          </Form.Item>

          <Form.Item 
            label={editingUser ? "重置密码" : "密码"} 
            name="password" 
            rules={[{ required: !editingUser, message: '请输入登录密码' }]}
          >
            <Input.Password 
              placeholder={editingUser ? "若不修改请留空" : "请输入登录密码"} 
              size="large" 
              className="bg-gray-50 border-gray-200" 
            />
          </Form.Item>

          <Form.Item label="权限角色" name="role">
            <Radio.Group className="w-full flex flex-col gap-3">
              <Radio value="admin" className="w-full border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 transition-colors [&.ant-radio-wrapper-checked]:border-blue-500 [&.ant-radio-wrapper-checked]:bg-blue-50">
                <div className="flex items-center gap-2">
                  <SafetyCertificateOutlined /> 管理员
                </div>
              </Radio>
              <Radio value="editor" className="w-full border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 transition-colors [&.ant-radio-wrapper-checked]:border-blue-500 [&.ant-radio-wrapper-checked]:bg-blue-50">
                <div className="flex items-center gap-2">
                  <SafetyCertificateOutlined /> 编辑
                </div>
              </Radio>
              <Radio value="viewer" className="w-full border border-gray-200 rounded-lg p-3 hover:border-blue-500 hover:bg-blue-50 transition-colors [&.ant-radio-wrapper-checked]:border-blue-500 [&.ant-radio-wrapper-checked]:bg-blue-50">
                <div className="flex items-center gap-2">
                  <SafetyCertificateOutlined /> 查看者
                </div>
              </Radio>
            </Radio.Group>
          </Form.Item>

          <div className="flex gap-4 mt-8">
            <Button size="large" className="flex-1 bg-gray-100 border-none text-gray-600 hover:bg-gray-200" onClick={handleCancel}>
              取消
            </Button>
            <Button type="primary" size="large" className="flex-1" htmlType="submit">
              {editingUser ? '确认修改' : '确认添加'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default AccountManagement;
