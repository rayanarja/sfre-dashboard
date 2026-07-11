import { useState, useEffect } from 'react';
import { Layout, Table, Tag, message, Popconfirm, Button, Modal, Form, Input } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;

const Drivers = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [drivers, setDrivers]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/drivers');
      setDrivers(res.data);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      username: record.user?.username,
      email: record.user?.email,
      phone: record.user?.phone,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await api.put(`/drivers/${editing.driver_id}`, values);
        message.success('تم تعديل السائق');
      } else {
        await api.post('/drivers', values);
        message.success('تم إضافة السائق بنجاح');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/drivers/${id}`);
      message.success('تم حذف السائق');
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const getTodayShifts = (driver) => {
    if (!driver.shifts || driver.shifts.length === 0) return [];
    const today = dayjs().format('YYYY-MM-DD');
    return driver.shifts.filter(s =>
      dayjs(s.date).format('YYYY-MM-DD') === today
    );
  };

  const columns = [
    { title: 'الاسم',   key: 'name',  render: (_, r) => r.user?.username || '—' },
    { title: 'الإيميل', key: 'email', render: (_, r) => r.user?.email    || '—' },
    { title: 'الهاتف',  key: 'phone', render: (_, r) => r.user?.phone    || '—' },
    {
      title: 'ورديات اليوم', key: 'shifts',
      render: (_, r) => {
        const shifts = getTodayShifts(r);
        if (shifts.length === 0) return <Tag color="default">لا يوجد اليوم</Tag>;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {shifts.map(s => (
              <div key={s.shift_id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag color={s.shift_type === 'صباحي' ? 'orange' : 'blue'}>{s.shift_type}</Tag>
                <span style={{ fontSize: 12, color: '#888' }}>{s.start_time} ← {s.end_time}</span>
                {s.bus && <Tag color="green">{s.bus.plate_number}</Tag>}
              </div>
            ))}
          </div>
        );
      }
    },
    {
      title: 'إجراءات', key: 'actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <Popconfirm title="تأكيد الحذف؟" onConfirm={() => handleDelete(r.driver_id)} okText="نعم" cancelText="لا">
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </div>
      )
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>👤 إدارة السائقين</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>إضافة سائق</Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Table dataSource={drivers} columns={columns} rowKey="driver_id" loading={loading} bordered size="middle" />
        </Content>
      </Layout>

      <Modal
        title={editing ? 'تعديل سائق' : 'إضافة سائق جديد'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'حفظ' : 'إضافة'}
        cancelText="إلغاء"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="username" label="اسم السائق" rules={[{ required: true, message: 'مطلوب' }, { min: 2, message: 'على الأقل حرفين' }]}>
            <Input placeholder="مثال: ريان أحمد" />
          </Form.Item>
          <Form.Item name="email" label="البريد الإلكتروني" rules={[{ required: true, message: 'مطلوب' }, { type: 'email', message: 'إيميل غير صحيح' }]}>
            <Input placeholder="driver@bus.com" />
          </Form.Item>
          {!editing && (
            <Form.Item name="password" label="كلمة المرور المؤقتة" rules={[{ required: true, message: 'مطلوب' }, { min: 6, message: 'على الأقل 6 أحرف' }]}>
              <Input.Password placeholder="أدخل كلمة مرور مؤقتة للسائق" />
            </Form.Item>
          )}
          <Form.Item
            name="phone"
            label="رقم الهاتف السوري"
            rules={[{
              required: true,
              validator: (_, value) => {
                if (!value) return Promise.reject('رقم الهاتف مطلوب');
                const cleaned = value.replace(/[\s\-()]/g, '');
                const patterns = [/^09\d{8}$/, /^\+9639\d{8}$/, /^009639\d{8}$/, /^9639\d{8}$/];
                if (patterns.some(p => p.test(cleaned))) return Promise.resolve();
                return Promise.reject('رقم سوري غير صحيح — مثال: 0912345678');
              }
            }]}
          >
            <Input placeholder="09xxxxxxxx" style={{ direction: 'ltr', textAlign: 'left' }} maxLength={14} />
          </Form.Item>

        </Form>
      
      </Modal>
    </Layout>
  );
};

export default Drivers;