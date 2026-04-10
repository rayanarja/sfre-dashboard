import { useState, useEffect } from 'react';
import { Layout, Table, Button, Modal, Form, Input, InputNumber, Tag, message, Popconfirm, Card, Row, Col, Statistic } from 'antd';
import { PlusOutlined, DeleteOutlined, DollarOutlined, ShopOutlined, EditOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;

const POS = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [posList, setPosList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [rechargeModal, setRechargeModal] = useState(false);
  const [transModal, setTransModal] = useState(false);
  const [selectedPOS, setSelectedPOS] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();
  const [rechargeForm] = Form.useForm();
const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pos');
      setPosList(res.data);

      // حساب إجمالي الشحنات (المبالغ يلي دفعها البائعين)
      let totalRech = 0;
      for (const pos of res.data) {
        try {
          const tRes = await api.get(`/pos/transactions/${pos.pos_id}`);
          const recharges = tRes.data.filter(t => t.type === 'recharge');
          totalRech += recharges.reduce((s, t) => s + (t.amount || 0), 0);
        } catch {}
      }
      setTotalRecharges(totalRech);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const totalBalance = posList.reduce((sum, p) => sum + (p.balance || 0), 0);
  const [totalRecharges, setTotalRecharges] = useState(0);
  const activeCount = posList.filter(p => p.is_active).length;

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await api.put(`/pos/${editingId}`, { name: values.name, owner_name: values.owner_name, phone: values.phone, lat: values.lat, lng: values.lng });
        message.success('تم التعديل ✅');
      } else {
        await api.post('/pos', values);
        message.success('تم إضافة نقطة البيع ✅');
      }
      setModalOpen(false);
      setEditingId(null);
      form.resetFields();
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleRecharge = async (values) => {
    try {
      await api.post(`/pos/${selectedPOS.pos_id}/recharge`, { amount: values.amount });
      message.success(`تم شحن ${values.amount.toLocaleString()} ل.س ✅`);
      setRechargeModal(false);
      rechargeForm.resetFields();
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/pos/${id}`);
      message.success('تم الحذف');
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const showTransactions = async (pos) => {
    setSelectedPOS(pos);
    try {
      const res = await api.get(`/pos/transactions/${pos.pos_id}`);
      setTransactions(res.data);
      setTransModal(true);
    } catch { message.error('خطأ'); }
  };

  const formatPrice = (price) => {
    if (!price) return '0 ل.س';
    return `${Number(price).toLocaleString()} ل.س`;
  };

  const columns = [
    { title: 'اسم المحل', dataIndex: 'name', key: 'name', render: (t) => <strong>{t}</strong> },
    { title: 'صاحب المحل', dataIndex: 'owner_name', key: 'owner_name' },
    { title: 'الهاتف', dataIndex: 'phone', key: 'phone' },
    { title: 'الإيميل', dataIndex: 'email', key: 'email' },
    {
      title: 'الرصيد', dataIndex: 'balance', key: 'balance',
      render: (v) => <span style={{ fontWeight: 'bold', color: v > 0 ? '#52c41a' : '#ff4d4f' }}>{formatPrice(v)}</span>
    },
    {
      title: 'الحالة', dataIndex: 'is_active', key: 'is_active',
      render: (v) => <Tag color={v ? 'green' : 'red'}>{v ? 'نشط' : 'معطّل'}</Tag>
    },
    {
      title: 'تاريخ الإنشاء', dataIndex: 'created_at', key: 'created_at',
      render: (d) => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'إجراءات', key: 'actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button size="small" type="primary" icon={<DollarOutlined />}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
            onClick={() => { setSelectedPOS(r); rechargeForm.resetFields(); setRechargeModal(true); }}>
            شحن رصيد
          </Button>
          <Button size="small" onClick={() => showTransactions(r)}>المعاملات</Button>
          <Button size="small" icon={<EditOutlined />}
            onClick={() => {
              setEditingId(r.pos_id);
              form.setFieldsValue({ name: r.name, owner_name: r.owner_name, phone: r.phone, email: r.email, lat: r.lat, lng: r.lng });
              setModalOpen(true);
            }} />
          <Popconfirm title="تأكيد الحذف؟" onConfirm={() => handleDelete(r.pos_id)} okText="نعم" cancelText="لا">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      )
    },
  ];

  const transColumns = [
    {
      title: 'النوع', dataIndex: 'type', key: 'type',
      render: (t) => <Tag color={t === 'recharge' ? 'green' : 'blue'}>{t === 'recharge' ? 'شحن رصيد' : 'بيع اشتراك'}</Tag>
    },
    {
      title: 'المبلغ', dataIndex: 'amount', key: 'amount',
      render: (v, r) => <span style={{ fontWeight: 'bold', color: r.type === 'recharge' ? '#52c41a' : '#ff4d4f' }}>
        {r.type === 'recharge' ? '+' : '-'}{formatPrice(v)}
      </span>
    },
    { title: 'الوصف', dataIndex: 'description', key: 'description' },
    { title: 'التاريخ', dataIndex: 'created_at', key: 'created_at', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm') },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>🏪 نقاط البيع</h2>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true); }}>
            إضافة نقطة بيع
          </Button>
        </Header>

        <Content style={{ margin: 24 }}>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={8}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="إجمالي نقاط البيع" value={posList.length} prefix={<ShopOutlined />} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="نقاط نشطة" value={activeCount} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
            <Col xs={8}>
              <Card size="small" style={{ borderRadius: 10 }}>
                <Statistic title="إجمالي الإيرادات" value={formatPrice(totalRecharges)} valueStyle={{ color: '#52c41a' }} />
              </Card>
            </Col>
          </Row>

          <Table dataSource={posList} columns={columns} rowKey="pos_id" loading={loading} bordered size="middle" />
        </Content>
      </Layout>

      {/* مودال إضافة/تعديل */}
      <Modal title={editingId ? '✏️ تعديل نقطة البيع' : '➕ إضافة نقطة بيع'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingId(null); }} onOk={() => form.submit()} okText="حفظ" cancelText="إلغاء">
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="اسم المحل" rules={[{ required: true, message: 'مطلوب' }]}>
            <Input placeholder="مثال: سوبر ماركت الأمانة" />
          </Form.Item>
          <Form.Item name="owner_name" label="اسم صاحب المحل" rules={[{ required: true, message: 'مطلوب' }]}>
            <Input placeholder="مثال: أحمد" />
          </Form.Item>
          <Form.Item name="phone" label="رقم الهاتف (لتسجيل الدخول)" rules={[{ required: true, message: 'مطلوب' }]}>
            <Input placeholder="09xxxxxxxx" />
          </Form.Item>
          <Form.Item name="email" label="الإيميل (اختياري)">
            <Input placeholder="shop@email.com" />
          </Form.Item>
          {!editingId && (
            <Form.Item name="password" label="كلمة المرور المؤقتة" rules={[{ required: true, message: 'مطلوب' }]}>
              <Input.Password placeholder="كلمة مرور مؤقتة — السمّان بيغيرها" />
            </Form.Item>
          )}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lat" label="خط العرض (اختياري)">
                <InputNumber style={{ width: '100%' }} placeholder="33.5102" step={0.0001} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lng" label="خط الطول (اختياري)">
                <InputNumber style={{ width: '100%' }} placeholder="36.2913" step={0.0001} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* مودال شحن رصيد */}
      <Modal title={`💰 شحن رصيد — ${selectedPOS?.name || ''}`} open={rechargeModal}
        onCancel={() => setRechargeModal(false)} onOk={() => rechargeForm.submit()} okText="شحن" cancelText="إلغاء">
        <div style={{ background: '#f6ffed', padding: 12, borderRadius: 8, marginBottom: 16, border: '1px solid #b7eb8f' }}>
          <span>الرصيد الحالي: </span>
          <strong style={{ color: '#52c41a' }}>{formatPrice(selectedPOS?.balance)}</strong>
        </div>
        <Form form={rechargeForm} layout="vertical" onFinish={handleRecharge}>
          <Form.Item name="amount" label="المبلغ (ل.س)" rules={[{ required: true, message: 'أدخل المبلغ' }]}>
            <InputNumber style={{ width: '100%' }} min={1000} step={10000} placeholder="مثال: 500000"
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
        </Form>
      </Modal>

      {/* مودال المعاملات */}
      <Modal title={`📋 معاملات — ${selectedPOS?.name || ''}`} open={transModal}
        onCancel={() => setTransModal(false)} footer={null} width={700}>
        <Table dataSource={transactions} columns={transColumns} rowKey="transaction_id" size="small" pagination={{ pageSize: 10 }} />
      </Modal>
    </Layout>
  );
};

export default POS;