import { useState, useEffect } from 'react';
import { Layout, Table, Button, Modal, Form, Input, Tag, message, Popconfirm, Badge, Tabs } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;

const Notifications = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const filtered = res.data.filter(n => n.type === 'admin' || (n.type === 'general' && n.sender_type === 'admin'));
      setNotifs(filtered);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const categorize = (n) => {
    const msg = n.message || '';
    if (msg.includes('بدأ العمل') || msg.includes('أنهى العمل')) return 'activity';
    if (msg.includes('عطل') || msg.includes('🔧')) return 'breakdown';
    if (msg.includes('يتأخر') || msg.includes('تأخير')) return 'delay';
    if (msg.includes('باص إضافي') || msg.includes('ممتلئ')) return 'extra';
    if (msg.includes('مفقود') || msg.includes('العثور') || msg.includes('🔍')) return 'lost';
    if (n.sender_type === 'admin') return 'admin';
    return 'other';
  };

  const getFiltered = () => {
    if (activeTab === 'all') return notifs;
    if (activeTab === 'unread') return notifs.filter(n => !n.is_read);
    return notifs.filter(n => categorize(n) === activeTab);
  };

  const countByCategory = (cat) => {
    if (cat === 'all') return notifs.length;
    if (cat === 'unread') return notifs.filter(n => !n.is_read).length;
    return notifs.filter(n => categorize(n) === cat).length;
  };

  const handleSubmit = async (values) => {
    try {
      await api.post('/notifications', { message: values.message, sender_type: 'admin', sender_id: null, type: 'general' });
      message.success('تم إرسال الإشعار للجميع ✅');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const handleRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const handleReadAll = async () => {
    try {
      const unread = notifs.filter(n => !n.is_read);
      await Promise.all(unread.map(n => api.put(`/notifications/${n.notification_id}/read`)));
      message.success('تم قراءة الكل');
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/notifications/${id}`); message.success('تم الحذف'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const getCategoryTag = (n) => {
    const cat = categorize(n);
    switch (cat) {
      case 'activity': return <Tag color="green">بدء/إنهاء عمل</Tag>;
      case 'breakdown': return <Tag color="red">عطل</Tag>;
      case 'delay': return <Tag color="orange">تأخير</Tag>;
      case 'extra': return <Tag color="blue">طلب باص</Tag>;
      case 'lost': return <Tag color="purple">مفقودات</Tag>;
      case 'admin': return <Tag color="cyan">من الأدمن</Tag>;
      default: return <Tag>أخرى</Tag>;
    }
  };

  const columns = [
    {
      title: 'الرسالة', dataIndex: 'message', key: 'message',
      render: (text, r) => (
        <span style={{ fontWeight: !r.is_read ? 'bold' : 'normal' }}>{text}</span>
      )
    },
    { title: 'التصنيف', key: 'cat', render: (_, r) => getCategoryTag(r), width: 120 },
    { title: 'الحالة', key: 'is_read', width: 80,
      render: (_, r) => {
        if (r.sender_type === 'admin') return <Tag color="blue">مُرسَل</Tag>;
        return <Tag color={r.is_read ? 'default' : 'red'}>{r.is_read ? 'مقروء' : 'جديد'}</Tag>;
      }
    },
    {
      title: 'التاريخ', dataIndex: 'created_at', key: 'created_at', width: 160,
      render: d => dayjs(d).format('YYYY-MM-DD HH:mm')
    },
    {
      title: 'إجراءات', key: 'actions', width: 140,
        render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {!r.is_read && r.sender_type !== 'admin' && (
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleRead(r.notification_id)}
              style={{ borderColor: '#fa8c16', color: '#fa8c16' }}>قراءة</Button>
          )}
          <Popconfirm title="تأكيد الحذف؟" onConfirm={() => handleDelete(r.notification_id)} okText="نعم" cancelText="لا">
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </div>
      )
    },
  ];

  const unreadCount = notifs.filter(n => !n.is_read).length;

const tabItems = [
    { key: 'all', label: `الكل (${countByCategory('all')})` },
    { key: 'unread', label: <span style={{ color: '#ff4d4f' }}>غير مقروء ({countByCategory('unread')})</span> },
    { key: 'delay', label: `⏰ تأخير (${countByCategory('delay')})` },
    { key: 'extra', label: `🚌 طلب باص (${countByCategory('extra')})` },
    { key: 'admin', label: `📢 من الأدمن (${countByCategory('admin')})` },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{
          background: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>🔔 الإشعارات</h2>
            {unreadCount > 0 && <Badge count={unreadCount} style={{ backgroundColor: '#ff4d4f' }} />}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <Button icon={<CheckOutlined />} onClick={handleReadAll}>قراءة الكل</Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
              إرسال إشعار عام
            </Button>
          </div>
        </Header>

        <Content style={{ margin: 24 }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          <Table
            dataSource={getFiltered()}
            columns={columns}
            rowKey="notification_id"
            loading={loading}
            bordered
            size="middle"
            rowClassName={r => !r.is_read ? 'ant-table-row-selected' : ''}
          />
        </Content>
      </Layout>

      <Modal
        title="📢 إرسال إشعار عام للركاب"
        open={modalOpen} onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()} okText="إرسال" cancelText="إلغاء"
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="message" label="نص الإشعار" rules={[{ required: true, message: 'أدخل نص الإشعار' }]}>
            <Input.TextArea rows={4} placeholder="مثال: سيتغير مسار الخط رقم 5 اعتباراً من الغد" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Notifications;