import { useState, useEffect } from 'react';
import { Layout, Table, Button, Modal, Form, Input, Select, Tag, message, Popconfirm, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, DisconnectOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';

const { Header, Content } = Layout;
const { Option } = Select;

const RoutesPage = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [routes, setRoutes]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form] = Form.useForm();
  const [linkForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/routes');
      setRoutes(res.data);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // إنشاء/تعديل خط
  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (r) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true); };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await api.put(`/routes/${editing.route_id}`, values);
        message.success('تم تعديل الخط');
      } else {
        await api.post('/routes', values);
        message.success('تم إضافة الخط');
      }
      setModalOpen(false); fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/routes/${id}`);
      message.success('تم حذف الخط'); fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'حدث خطأ'); }
  };

  // ربط خطين
  const handleLink = async (values) => {
    try {
      await api.post('/routes/link', values);
      message.success('تم ربط الخطين بنجاح ✅');
      setLinkModalOpen(false);
      linkForm.resetFields();
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'حدث خطأ'); }
  };

  // فك ربط
  const handleUnlink = async (id) => {
    try {
      await api.delete(`/routes/${id}/unlink`);
      message.success('تم فك الربط');
      fetchData();
    } catch (err) { message.error(err.response?.data?.message || 'حدث خطأ'); }
  };

  // جيب اسم الخط المعاكس
  const getPairName = (pairId) => {
    if (!pairId) return null;
    const pair = routes.find(r => r.route_id === pairId);
    return pair?.route_name || `#${pairId}`;
  };

  // الخطوط غير المرتبطة (للربط)
  const unlinkedRoutes = routes.filter(r => !r.pair_route_id);

  const columns = [
    {
      title: 'اسم الخط', dataIndex: 'route_name', key: 'route_name',
      render: (name, r) => (
        <span>
          {name}
          {r.route_name?.includes('ذهاب') && <Tag color="blue" style={{ marginRight: 8 }}>ذهاب →</Tag>}
          {r.route_name?.includes('إياب') && <Tag color="orange" style={{ marginRight: 8 }}>← إياب</Tag>}
        </span>
      ),
    },
    { title: 'الوصف', dataIndex: 'description', key: 'description', render: d => d || '—' },
    {
      title: 'الخط المعاكس', key: 'pair',
      render: (_, r) => r.pair_route_id ? (
        <Tag color="green" icon={<LinkOutlined />}>
          {getPairName(r.pair_route_id)}
        </Tag>
      ) : (
        <Tag color="default">غير مرتبط</Tag>
      ),
    },
    { title: 'المواقف', key: 'stations', render: (_, r) => <Tag>{r.stations?.length || 0} موقف</Tag> },
    { title: 'الباصات', key: 'buses', render: (_, r) => <Tag color="blue">{r.buses?.length || 0} باص</Tag> },
    {
      title: 'إجراءات', key: 'actions',
      render: (_, r) => (
        <span style={{ display: 'flex', gap: 4 }}>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          {r.pair_route_id ? (
            <Popconfirm title="فك ربط هالخط عن الخط المعاكس؟" onConfirm={() => handleUnlink(r.route_id)} okText="فك" cancelText="لا">
              <Button icon={<DisconnectOutlined />} size="small" style={{ color: '#fa8c16' }} />
            </Popconfirm>
          ) : null}
          <Popconfirm title="تأكيد الحذف؟ رح ينحذف الخط مع كل مواقفو" onConfirm={() => handleDelete(r.route_id)} okText="نعم" cancelText="لا">
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>🗺️ إدارة الخطوط</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button icon={<LinkOutlined />} onClick={() => { linkForm.resetFields(); setLinkModalOpen(true); }}
              disabled={unlinkedRoutes.length < 2}>
              ربط خطين (ذهاب ↔ إياب)
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>إضافة خط</Button>
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
            message="كيف تضيف خط جديد؟"
            description={
              <div style={{ fontSize: 13 }}>
                <b>1.</b> أضف خط الذهاب (مثال: "حلب الجديدة — ذهاب") ← أضف مواقفو بالترتيب من البداية للنهاية<br/>
                <b>2.</b> أضف خط الإياب (مثال: "حلب الجديدة — إياب") ← أضف مواقفو بالترتيب المعاكس<br/>
                <b>3.</b> اضغط "ربط خطين" واختر الذهاب والإياب ← الباص رح يتبدل بينهم تلقائياً<br/>
                <b>4.</b> حط الباص على خط <b>الذهاب</b> — لما يوصل آخر موقف بيتحول للإياب لحالو
              </div>
            }
          />
          <Table dataSource={routes} columns={columns} rowKey="route_id" loading={loading} bordered size="middle" />
        </Content>
      </Layout>

      {/* Modal إضافة/تعديل خط */}
      <Modal title={editing ? 'تعديل خط' : 'إضافة خط جديد'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} okText="حفظ" cancelText="إلغاء">
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="route_name" label="اسم الخط" rules={[{ required: true, message: 'أدخل اسم الخط' }]}>
            <Input placeholder="مثال: حلب الجديدة — ذهاب" />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <Input.TextArea placeholder="وصف الخط..." rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal ربط خطين */}
      <Modal
        title="🔗 ربط خطين (ذهاب ↔ إياب)"
        open={linkModalOpen}
        onCancel={() => setLinkModalOpen(false)}
        onOk={() => linkForm.submit()}
        okText="ربط الخطين"
        cancelText="إلغاء"
      >
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="اختر خط الذهاب وخط الإياب — بعد الربط الباص بيتبدل بينهم تلقائياً لما يوصل آخر موقف" />
        <Form form={linkForm} onFinish={handleLink} layout="vertical">
          <Form.Item name="route1_id" label="خط الذهاب" rules={[{ required: true, message: 'اختر خط الذهاب' }]}>
            <Select placeholder="اختر خط الذهاب">
              {unlinkedRoutes.map(r => (
                <Option key={r.route_id} value={r.route_id}>
                  {r.route_name} ({r.stations?.length || 0} موقف)
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="route2_id" label="خط الإياب" rules={[{ required: true, message: 'اختر خط الإياب' }]}>
            <Select placeholder="اختر خط الإياب">
              {unlinkedRoutes.map(r => (
                <Option key={r.route_id} value={r.route_id}>
                  {r.route_name} ({r.stations?.length || 0} موقف)
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default RoutesPage;