import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { DataContext } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../assets/logo.svg';

const Login = () => {
  const { login } = useContext(DataContext);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const ok = await login(values.username, values.password);
      if (ok) {
        message.success('登录成功');
        navigate('/');
        return;
      }
      message.error('用户名或密码错误');
    } catch (e) {
      const msg = e?.message ? `：${String(e.message).slice(0, 120)}` : '';
      message.error(`服务器连接失败或接口地址配置错误（请访问 /api/health 检查）${msg}`);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f0f2f5] flex-col gap-4">
      <Card className="w-96 shadow-lg rounded-xl">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={logoUrl} alt="RESMO Logo" className="h-28 mb-3 object-contain" />
          <div className="flex items-center gap-2 justify-center">
            <h1 className="text-lg font-bold text-gray-800">RESMO PMS</h1>
            <span className="text-gray-300">|</span>
            <p className="text-sm text-gray-500 font-medium m-0">产品管理系统</p>
          </div>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block className="h-10 rounded-lg">
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
