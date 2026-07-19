import { useState, useEffect } from 'react';
import { Layout, Table, Button, Modal, Form, Select, Tag, message, Popconfirm, Card, Row, Col, Statistic, Input, List, Avatar, Tooltip, Tabs, InputNumber, Switch } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, TeamOutlined, UserAddOutlined, CrownOutlined, RocketOutlined, ThunderboltOutlined, HeartOutlined, AppstoreOutlined, CreditCardOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;
const { Option } = Select;

const Subscriptions = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [subs, setSubs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [familyModal, setFamilyModal] = useState(null);
  const [familyEmail, setFamilyEmail] = useState('');
  const [form] = Form.useForm();
  const [planForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, planRes, userRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/subscription-plans'),
        api.get('/users'),
      ]);
      setSubs(Array.isArray(subRes.data) ? subRes.data : []);
      setPlans(Array.isArray(planRes.data) ? planRes.data : []);
      setUsers(Array.isArray(userRes.data) ? userRes.data.filter(u => u.role === 'passenger') : []);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // ═══════════ Subscriptions ═══════════
  const handleSubmit = async (values) => {
    try {
      await api.post('/subscriptions', { user_id: values.user_id, plan_id: values.plan_id });
      message.success('تم إنشاء الاشتراك بنجاح');
      setModalOpen(false); fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/subscriptions/${id}`); message.success('تم حذف الاشتراك'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const handleCancel = async (id) => {
    try { await api.put(`/subscriptions/${id}/cancel`); message.success('تم إلغاء الاشتراك'); fetchData(); }
    catch { message.error('حدث خطأ'); }
  };

  const handleAddFamily = async () => {
    if (!familyEmail) return message.warning('أدخل البريد الإلكتروني للعضو');
    try {
      await api.post(`/subscriptions/${familyModal.subscription_id}/family`, { email: familyEmail });
      message.success('تم إضافة العضو'); setFamilyEmail(''); fetchData();
      const updated = await api.get(`/subscriptions/${familyModal.subscription_id}`);
      setFamilyModal(updated.data);
    } catch (err) { message.error(err.response?.data?.message || 'حدث خطأ'); }
  };

  const handleRemoveFamily = async (memberId) => {
    try {
      await api.delete(`/subscriptions/family/${memberId}`); message.success('تم إزالة العضو'); fetchData();
      const updated = await api.get(`/subscriptions/${familyModal.subscription_id}`);
      setFamilyModal(updated.data);
    } catch { message.error('حدث خطأ'); }
  };

  const openAddPlan = () => { setEditingPlan(null); planForm.resetFields(); planForm.setFieldsValue({ max_users: 1, duration_days: 30, is_active: true }); setPlanModalOpen(true); };
  const openEditPlan = (p) => { setEditingPlan(p); planForm.setFieldsValue(p); setPlanModalOpen(true); };

  const handlePlanSubmit = async (values) => {
    try {
      if (editingPlan) {
        await api.put(`/subscription-plans/${editingPlan.plan_id}`, values);
        message.success('تم تعديل الخطة');
      } else {
        await api.post('/subscription-plans', values);
        message.success('تم إضافة الخطة ✅');
      }
      setPlanModalOpen(false); fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'حدث خطأ'); }
  };

  const handleDeletePlan = async (id) => {
    try { await api.delete(`/subscription-plans/${id}`); message.success('تم حذف الخطة'); fetchData(); }
    catch (err) { message.error(err.response?.data?.message || 'لا يمكن حذف خطة مرتبطة باشتراكات'); }
  };

  const isActive = (sub) => sub.status === 'active' && new Date(sub.end_date) >= new Date();
  const getStatusTag = (sub) => {
    if (sub.status === 'cancelled') return <Tag color="default">ملغي</Tag>;
    return isActive(sub) ? <Tag color="green">نشط ✅</Tag> : <Tag color="red">منتهي ❌</Tag>;
  };
  const getTripProgress = (sub) => {
    const pct = sub.trips_limit > 0 ? Math.round((sub.trips_used / sub.trips_limit) * 100) : 0;
    const color = pct >= 90 ? '#ff4d4f' : pct >= 70 ? '#faad14' : '#52c41a';
    return (
      <div style={{ minWidth: 120 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span>{sub.trips_used}</span><span style={{ color: '#999' }}>/ {sub.trips_limit}</span>
        </div>
        <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3 }}>
          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3 }} />
        </div>
      </div>
    );
  };

  const planIcons = { 'أساسي': <RocketOutlined />, 'قياسي': <ThunderboltOutlined />, 'متقدم': <CrownOutlined />, 'عائلي': <HeartOutlined /> };

  const subColumns = [
    { title: 'المستخدم', key: 'user', render: (_, r) => r.user?.username || '—' },
    { title: 'الخطة', key: 'plan', render: (_, r) => r.plan ? <Tag icon={planIcons[r.plan.name]} color={r.plan.max_users > 1 ? 'purple' : 'blue'}>{r.plan.name}</Tag> : <Tag>قديم</Tag> },
    { title: 'الرحلات', key: 'trips', render: (_, r) => getTripProgress(r) },
    { title: 'البداية', dataIndex: 'start_date', render: d => dayjs(d).format('YYYY-MM-DD') },
    { title: 'النهاية', dataIndex: 'end_date', render: d => dayjs(d).format('YYYY-MM-DD') },
    { title: 'الحالة', key: 'status', render: (_, r) => getStatusTag(r) },
    { title: 'المستخدمين', key: 'users', align: 'center', render: (_, r) => r.max_users > 1 ? <Tooltip title="إدارة أعضاء العائلة"><Button size="small" icon={<TeamOutlined />} onClick={() => setFamilyModal(r)}>{(r.family_members?.length || 0) + 1}/{r.max_users}</Button></Tooltip> : <Tag>فردي</Tag> },
    { title: 'إجراءات', key: 'actions', render: (_, r) => (
      <div style={{ display: 'flex', gap: 6 }}>
        {isActive(r) && <Popconfirm title="إلغاء الاشتراك؟" onConfirm={() => handleCancel(r.subscription_id)} okText="نعم" cancelText="لا"><Button size="small">إلغاء</Button></Popconfirm>}
        <Popconfirm title="حذف نهائياً؟" onConfirm={() => handleDelete(r.subscription_id)} okText="نعم" cancelText="لا"><Button icon={<DeleteOutlined />} size="small" danger /></Popconfirm>
      </div>
    )},
  ];

  const planColumns = [
    { title: 'الاسم', dataIndex: 'name', render: (name) => <Tag icon={planIcons[name]} color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{name}</Tag> },
    { title: 'عدد الرحلات', dataIndex: 'trip_limit', render: v => <b>{v}</b> },
    { title: 'السعر', dataIndex: 'price', render: v => <span style={{ color: '#00897B', fontWeight: 'bold' }}>{v?.toLocaleString()} ل.س</span> },
    { title: 'المدة (يوم)', dataIndex: 'duration_days' },
    { title: 'عدد المستخدمين', dataIndex: 'max_users', render: v => v > 1 ? <Tag color="purple">{v} مستخدمين (عائلي)</Tag> : <Tag>فردي</Tag> },
    { title: 'الحالة', dataIndex: 'is_active', render: v => v ? <Tag color="green">مفعّل</Tag> : <Tag color="red">معطّل</Tag> },
    { title: 'الوصف', dataIndex: 'description', render: d => d || '—' },
    { title: 'إجراءات', key: 'actions', render: (_, r) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <Button icon={<EditOutlined />} size="small" onClick={() => openEditPlan(r)} />
        <Popconfirm title="حذف الخطة؟" onConfirm={() => handleDeletePlan(r.plan_id)} okText="نعم" cancelText="لا">
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      </div>
    )},
  ];

  const activeSubs = subs.filter(s => isActive(s));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>💳 إدارة الاشتراكات</h2>
        </Header>
        <Content style={{ margin: 24 }}>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}><Card><Statistic title="إجمالي الاشتراكات" value={subs.length} /></Card></Col>
            <Col span={6}><Card><Statistic title="اشتراكات نشطة" value={activeSubs.length} valueStyle={{ color: '#3f8600' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="خطط الاشتراك" value={plans.length} valueStyle={{ color: '#1890ff' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="إجمالي الرحلات المستخدمة" value={subs.reduce((s, x) => s + (x.trips_used || 0), 0)} /></Card></Col>
          </Row>

          <Tabs defaultActiveKey="plans" items={[
            {
              key: 'plans',
              label: <span><AppstoreOutlined /> خطط الاشتراك</span>,
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAddPlan}>إضافة خطة جديدة</Button>
                  </div>
                  <Table dataSource={plans} columns={planColumns} rowKey="plan_id" loading={loading} bordered size="middle" />
                </>
              ),
            },
            {
              key: 'subs',
              label: <span><CreditCardOutlined /> الاشتراكات</span>,
              children: (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>اشتراك جديد</Button>
                  </div>
                  <Table dataSource={subs} columns={subColumns} rowKey="subscription_id" loading={loading} bordered size="middle" />
                </>
              ),
            },
          ]} />
        </Content>
      </Layout>

  
      <Modal title="إنشاء اشتراك جديد" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="إنشاء" cancelText="إلغاء">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="user_id" label="الراكب" rules={[{ required: true, message: 'اختر الراكب' }]}>
            <Select placeholder="اختر راكب" showSearch optionFilterProp="children">
              {users.map(u => <Option key={u.user_id} value={u.user_id}>{u.username} — {u.email}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="plan_id" label="الخطة" rules={[{ required: true, message: 'اختر الخطة' }]}>
            <Select placeholder="اختر خطة الاشتراك">
              {plans.map(p => (
                <Option key={p.plan_id} value={p.plan_id}>
                  {p.name} — {p.trip_limit} رحلة — {p.price?.toLocaleString()} ل.س {p.max_users > 1 ? `(${p.max_users} مستخدمين)` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>


      <Modal title={editingPlan ? 'تعديل خطة' : 'إضافة خطة جديدة'} open={planModalOpen} onCancel={() => setPlanModalOpen(false)} onOk={() => planForm.submit()} okText="حفظ" cancelText="إلغاء" width={520}>
        <Form form={planForm} layout="vertical" onFinish={handlePlanSubmit}>
          <Form.Item name="name" label="اسم الخطة" rules={[{ required: true, message: 'أدخل اسم الخطة' }]}>
            <Input placeholder="مثال: أساسي، قياسي، عائلي" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="trip_limit" label="عدد الرحلات" rules={[{ required: true, message: 'مطلوب' }]}>
                <InputNumber min={1} max={9999} style={{ width: '100%' }} placeholder="50" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="price" label="السعر (ل.س)" rules={[{ required: true, message: 'مطلوب' }]}>
                <InputNumber min={0} style={{ width: '100%' }} placeholder="25000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="duration_days" label="مدة الصلاحية (يوم)">
                <InputNumber min={1} max={365} style={{ width: '100%' }} placeholder="30" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="max_users" label="عدد المستخدمين" tooltip="1 = فردي، أكثر = عائلي">
                <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="1" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="الوصف">
            <Input placeholder="وصف اختياري للخطة" />
          </Form.Item>
          <Form.Item name="is_active" label="مفعّل" valuePropName="checked">
            <Switch checkedChildren="مفعّل" unCheckedChildren="معطّل" />
          </Form.Item>
        </Form>
      </Modal>

     
      <Modal title={<><TeamOutlined /> إدارة أعضاء العائلة</>} open={!!familyModal} onCancel={() => { setFamilyModal(null); setFamilyEmail(''); }} footer={null} width={500}>
        {familyModal && (
          <>
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>صاحب الاشتراك: {familyModal.user?.username}</div>
              <div style={{ fontSize: 12, color: '#666' }}>الحد الأقصى: {familyModal.max_users} — المضاف: {(familyModal.family_members?.length || 0) + 1}</div>
            </div>
            <List
              dataSource={familyModal.family_members || []}
              locale={{ emptyText: 'لا يوجد أعضاء مضافين' }}
              renderItem={(item) => (
                <List.Item actions={[<Popconfirm title="إزالة؟" onConfirm={() => handleRemoveFamily(item.member_id)} okText="نعم" cancelText="لا"><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>]}>
                  <List.Item.Meta avatar={<Avatar style={{ background: '#7c3aed' }}>{item.user?.username?.[0]}</Avatar>} title={item.user?.username} description={item.user?.email} />
                </List.Item>
              )}
            />
            {(familyModal.family_members?.length || 0) + 1 < familyModal.max_users && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <Input placeholder="إيميل العضو الجديد" value={familyEmail} onChange={e => setFamilyEmail(e.target.value)} onPressEnter={handleAddFamily} />
                <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddFamily}>إضافة</Button>
              </div>
            )}
          </>
        )}
      </Modal>
    </Layout>
  );
};

export default Subscriptions;