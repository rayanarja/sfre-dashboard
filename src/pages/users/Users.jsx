import { useState, useEffect } from 'react';
import { Layout, Table, Tag, message, Popconfirm, Button, Input, Modal, Form, Select, DatePicker } from 'antd';
import { DeleteOutlined, SearchOutlined, PlusOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Option } = Select;

const Users = () => {
  const [collapsed, setCollapsed]     = useState(false);
  const [users, setUsers]             = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [search, setSearch]           = useState('');
  const [modalOpen, setModalOpen]     = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, subsRes] = await Promise.all([
        api.get('/users'),
        api.get('/subscriptions'),
      ]);
      const passengers = usersRes.data.filter(u => u.role === 'passenger');
      const now = new Date();
      const withSubs = passengers.map(u => {
        const sub = subsRes.data.find(s =>
          (
            String(s.user_id) === String(u.user_id) ||
            s.family_members?.some(member =>
              String(member.user_id ?? member.user?.user_id) === String(u.user_id)
            )
          ) &&
          new Date(s.end_date) >= now &&
          new Date(s.start_date) <= now
        );
        const isFamilyMember = sub
          ? String(sub.user_id) !== String(u.user_id)
          : false;
        return { ...u, activeSub: sub || null, isFamilyMember };
      });
      setUsers(withSubs);
      setFiltered(withSubs);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    const q = val.toLowerCase();
    setFiltered(users.filter(u =>
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.includes(q)
    ));
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('تم حذف المستخدم');
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const openSubModal = (user) => {
    setSelectedUser(user);
    form.resetFields();
    setModalOpen(true);
  };

  const handleAddSub = async (values) => {
    try {
      const typedays = { daily: 1, weekly: 7, monthly: 30 };
      const start = values.start_date.toDate();
      const end   = new Date(start);
      end.setDate(end.getDate() + typedays[values.subscription_type]);

      await api.post('/subscriptions', {
        user_id:           selectedUser.user_id,
        subscription_type: values.subscription_type,
        start_date:        start,
        end_date:          end,
        number_of_trips:   0,
      });
      message.success('تم إضافة الاشتراك بنجاح');
      setModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const typeLabel = { daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' };

  const columns = [
    { title: 'الاسم',   dataIndex: 'username', key: 'username' },
    { title: 'الإيميل', dataIndex: 'email',    key: 'email' },
    { title: 'الهاتف',  dataIndex: 'phone',    key: 'phone', render: p => p || '—' },
    { title: 'تاريخ التسجيل', dataIndex: 'registration_date', key: 'reg',
      render: d => dayjs(d).format('YYYY-MM-DD') },
    {
      title: 'الاشتراك', key: 'sub',
      render: (_, r) => {
        if (!r.activeSub) return <Tag color="red">لا يوجد اشتراك</Tag>;
        const subscriptionLabel = r.activeSub.plan?.name
          || typeLabel[r.activeSub.subscription_type]
          || 'اشتراك فعال';
        return (
          <div>
            <Tag color={r.isFamilyMember ? 'purple' : 'green'}>
              {subscriptionLabel}{r.isFamilyMember ? ' (عضو عائلة)' : ''}
            </Tag>
            <span style={{ fontSize: 11, color: '#888', marginRight: 4 }}>
              ينتهي: {dayjs(r.activeSub.end_date).format('YYYY-MM-DD')}
            </span>
          </div>
        );
      }
    },
    {
      title: 'إجراءات', key: 'actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {!r.activeSub && (
            <Button
              icon={<PlusOutlined />} size="small" type="primary"
              onClick={() => openSubModal(r)}
            >
              اشتراك
            </Button>
          )}
          <Popconfirm title="تأكيد حذف المستخدم؟" onConfirm={() => handleDelete(r.user_id)} okText="نعم" cancelText="لا">
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
          <h2 style={{ margin: 0 }}>👥 المستخدمون</h2>
          <Input
            placeholder="بحث باسم أو بريد إلكتروني أو هاتف..."
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            allowClear
          />
        </Header>
        <Content style={{ margin: 24 }}>
          <Table
            dataSource={filtered} columns={columns}
            rowKey="user_id" loading={loading} bordered size="middle"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={6}>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    إجمالي الركاب: {users.length} —
                    مشتركون: {users.filter(u => u.activeSub).length} —
                    غير مشتركين: {users.filter(u => !u.activeSub).length}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Content>
      </Layout>

      <Modal
        title={`إضافة اشتراك — ${selectedUser?.username}`}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="إضافة" cancelText="إلغاء"
      >
        <Form form={form} layout="vertical" onFinish={handleAddSub}>
          <Form.Item name="subscription_type" label="نوع الاشتراك" rules={[{ required: true, message: 'مطلوب' }]}>
            <Select placeholder="اختر النوع">
              <Option value="daily">يومي — يوم واحد</Option>
              <Option value="weekly">أسبوعي — 7 أيام</Option>
              <Option value="monthly">شهري — 30 يوم</Option>
            </Select>
          </Form.Item>
          <Form.Item name="start_date" label="تاريخ البداية" rules={[{ required: true, message: 'مطلوب' }]}>
            <DatePicker style={{ width: '100%' }} placeholder="اختر التاريخ" />
          </Form.Item>
        </Form>
        <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#096dd9', marginTop: 8 }}>
          💡 تاريخ الانتهاء يُحسب تلقائياً حسب نوع الاشتراك
        </div>
      </Modal>
    </Layout>
  );
};

export default Users;
