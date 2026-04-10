import { useState } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const ChangePassword = () => {
  const { user, login } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        user_id: user.id,
        old_password: values.oldPassword,
        new_password: values.newPassword,
      });
      message.success('تم تغيير كلمة المرور بنجاح ✅');

      // حدّث بيانات المستخدم — شيل must_change_password
      const updatedUser = { ...user, must_change_password: false };
      login(updatedUser, localStorage.getItem('token'));

      // حوّل للصفحة الرئيسية بعد ثانية
      setTimeout(() => { window.location.href = '/'; }, 1000);
    } catch (err) {
      message.error(err.response?.data?.message || 'كلمة المرور القديمة غلط');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)'
    }}>
      <Card style={{ width: 440, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: '#fff7e6', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 12
          }}>
            <SafetyOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
          </div>
          <h2 style={{ margin: 0 }}>غيّر كلمة المرور</h2>
          <p style={{ color: '#888', margin: '8px 0 0' }}>لازم تغيّر كلمة المرور المؤقتة قبل المتابعة</p>
        </div>

        <Alert
          type="warning" showIcon
          message="كلمة المرور الحالية مؤقتة — اختر كلمة مرور قوية وآمنة"
          style={{ marginBottom: 20, borderRadius: 8 }}
        />

        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item name="oldPassword" label="كلمة المرور الحالية (المؤقتة)"
            rules={[{ required: true, message: 'مطلوب' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="كلمة المرور المؤقتة" size="large" />
          </Form.Item>
          <Form.Item name="newPassword" label="كلمة المرور الجديدة"
            rules={[
              { required: true, message: 'مطلوب' },
              { min: 6, message: 'على الأقل 6 أحرف' }
            ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="اختر كلمة مرور قوية" size="large" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="تأكيد كلمة المرور الجديدة"
            rules={[{ required: true, message: 'مطلوب' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="أعد كتابة كلمة المرور" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}
              style={{ background: '#fa8c16', borderColor: '#fa8c16' }}>
              تغيير كلمة المرور والمتابعة
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ChangePassword;