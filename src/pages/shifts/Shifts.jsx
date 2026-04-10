import { useState, useEffect } from 'react';
import { Layout, Table, Button, Modal, Form, Input, Select, Tag, message, Popconfirm, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Option } = Select;

const Shifts = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [shifts, setShifts]       = useState([]);
  const [drivers, setDrivers]     = useState([]);
  const [buses, setBuses]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [shRes, drRes, buRes] = await Promise.all([
        api.get('/shifts'),
        api.get('/drivers'),
        api.get('/buses'),
      ]);
      setShifts(shRes.data);
      setDrivers(drRes.data);
      setBuses(buRes.data);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    form.setFieldsValue({
      driver_id:  r.driver_id,
      bus_id:     r.bus_id,
      shift_type: r.shift_type,
      start_time: r.start_time,
      end_time:   r.end_time,
      status:     r.status,
      date:       dayjs(r.date),
    });
    setModalOpen(true);
  };

const handleSubmit = async (values) => {
  try {
    const data = { ...values, date: values.date?.toISOString() };
    if (editing) {
      await api.put(`/shifts/${editing.shift_id}`, data);
      message.success('تم تعديل الوردية');
    } else {
      await api.post('/shifts', data);
      message.success('تم إضافة الوردية');
    }
    setModalOpen(false); fetchData();
  } catch (err) {
    message.error(err.response?.data?.message || 'حدث خطأ');
  }
};

  const handleDelete = async (id) => {
    try {
      await api.delete(`/shifts/${id}`);
      message.success('تم حذف الوردية'); fetchData();
    } catch { message.error('حدث خطأ'); }
  };
  
  const columns = [
    { title: 'السائق', key: 'driver', render: (_, r) => r.driver?.user?.username || '—' },
    { title: 'الباص', key: 'bus', render: (_, r) => r.bus?.plate_number || '—' },
    { title: 'نوع الوردية', dataIndex: 'shift_type', key: 'shift_type',
      render: t => <Tag color="purple">{t}</Tag> },
    { title: 'التاريخ', dataIndex: 'date', key: 'date',
      render: d => dayjs(d).format('YYYY-MM-DD') },
    { title: 'من', dataIndex: 'start_time', key: 'start_time' },
    { title: 'إلى', dataIndex: 'end_time', key: 'end_time' },
    {
      title: 'الحالة', dataIndex: 'status', key: 'status',
      render: (s) => {
        const map = {
          'active': { color: 'green', text: 'نشطة' },
          'scheduled': { color: 'blue', text: 'مجدولة' },
          'completed': { color: 'default', text: 'منتهية' },
          'paused': { color: 'orange', text: 'متوقف مؤقتاً' },
        };
        const item = map[s] || { color: 'default', text: s };
        return <Tag color={item.color}>{item.text}</Tag>;
      }
    },
    {
      title: 'بدأ فعلياً', dataIndex: 'actual_start', key: 'actual_start',
      render: (v) => v ? <Tag color="green">{new Date(v).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</Tag> : '—'
    },
    {
      title: 'انتهى فعلياً', dataIndex: 'actual_end', key: 'actual_end',
      render: (v) => v ? <Tag color="red">{new Date(v).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}</Tag> : '—'
    },
    { title: 'إجراءات', key: 'actions', render: (_, r) => (
      <span>
        <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} style={{ marginLeft: 8 }}/>
        <Popconfirm title="تأكيد الحذف؟" onConfirm={() => handleDelete(r.shift_id)} okText="نعم" cancelText="لا">
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      </span>
    )},
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>🕐 إدارة الورديات</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>إضافة وردية</Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Table dataSource={shifts} columns={columns} rowKey="shift_id" loading={loading} bordered size="middle"/>
        </Content>
      </Layout>

      <Modal title={editing ? 'تعديل وردية' : 'إضافة وردية جديدة'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="حفظ" cancelText="إلغاء">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="driver_id" label="السائق" rules={[{ required: true, message: 'اختر السائق' }]}>
            <Select placeholder="اختر سائق">
              {drivers.map(d => <Option key={d.driver_id} value={d.driver_id}>{d.user?.username || d.driver_id}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="bus_id" label="الباص" rules={[{ required: true, message: 'اختر الباص' }]}>
            <Select placeholder="اختر باص">
              {buses.map(b => <Option key={b.bus_id} value={b.bus_id}>{b.plate_number}</Option>)}
            </Select>
          </Form.Item>
        <Form.Item name="shift_type" label="نوع الوردية" rules={[{ required: true, message: 'اختر النوع' }]}>
            <Select placeholder="اختر النوع" onChange={(val) => {
                if (val === 'صباحي') {
                    form.setFieldsValue({ start_time: '07:00', end_time: '15:00' });
                } else if (val === 'مسائي') {
                    form.setFieldsValue({ start_time: '15:00', end_time: '23:00' });
                }
            }}>
            <Option value="صباحي">صباحي 🌅</Option>
            <Option value="مسائي">مسائي 🌆</Option>
            </Select>
        </Form.Item>
          <Form.Item name="date" label="التاريخ" rules={[{ required: true, message: 'اختر التاريخ' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="start_time" label="وقت البداية" rules={[{ required: true, message: 'أدخل وقت البداية' }]}>
            <Input placeholder="مثال: 06:00" />
          </Form.Item>
          <Form.Item name="end_time" label="وقت النهاية" rules={[{ required: true, message: 'أدخل وقت النهاية' }]}>
            <Input placeholder="مثال: 14:00" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Shifts;