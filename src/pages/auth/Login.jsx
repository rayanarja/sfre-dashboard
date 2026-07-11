import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      const res = await api.post('/auth/login', values);
      if (res.data.user.role !== 'admin') {
        message.error('هذه اللوحة مخصصة للمدير فقط!');
        return;
      }
      login(res.data.user, res.data.token);

      if (res.data.user.must_change_password) {
        message.warning('يجب أن تغيّر كلمة المرور المؤقتة');
        navigate('/change-password');
      } else {
        message.success('تم تسجيل الدخول بنجاح');
        navigate('/');
      }
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ في تسجيل الدخول');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)'
    }}>
      <Card style={{ width: 400, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🚌</div>
          <h2 style={{ margin: 0 }}>لوحة إدارة الباصات</h2>
          <p style={{ color: '#888' }}>تسجيل دخول المدير</p>
        </div>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="email" label="البريد الإلكتروني"
            rules={[{ required: true, message: 'أدخل البريد الإلكتروني' }]}>
            <Input prefix={<UserOutlined />} placeholder="أدخل البريد الإلكتروني" size="large"/>
          </Form.Item>
          <Form.Item name="password" label="كلمة المرور"
            rules={[{ required: true, message: 'أدخل كلمة المرور' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="أدخل كلمة المرور" size="large"/>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              تسجيل الدخول
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;