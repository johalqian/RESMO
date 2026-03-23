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
    <div
      className="flex items-center justify-center min-h-screen flex-col gap-4 bg-center bg-cover bg-no-repeat"
      style={{ backgroundImage: "linear-gradient(rgba(0,39,64,0.35), rgba(0,39,64,0.35)), url('/assets/BG.png')" }}
    >
      <Card className="w-[460px] max-w-[92vw] shadow-2xl rounded-2xl border border-white/60 bg-white/90 backdrop-blur-sm">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="h-[200px] flex items-center justify-center mb-4">
            <img src={logoUrl} alt="RESMO Logo" className="h-[200px] object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-widest m-0">产品管理系统</h1>
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
