import { useState, useEffect } from 'react';
import { Layout, Button, Modal, Form, Input, Select, message, Popconfirm, Collapse, Tag, Empty } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';

const { Header, Content } = Layout;
const { Option } = Select;
const { Panel } = Collapse;

const Stations = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [stations, setStations]   = useState([]);
  const [routes, setRoutes]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stRes, rtRes] = await Promise.all([api.get('/stations'), api.get('/routes')]);
      setStations(stRes.data);
      setRoutes(rtRes.data);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    form.setFieldsValue({ name: r.name, route_id: r.route_id, lat: r.lat, lng: r.lng, order_index: r.order_index });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await api.put(`/stations/${editing.station_id}`, values);
        message.success('تم تعديل الموقف');
      } else {
        await api.post('/stations', values);
        message.success('تم إضافة الموقف');
      }
      setModalOpen(false); fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/stations/${id}`);
      message.success('تم حذف الموقف'); fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const groupedByRoute = routes.map(route => ({
    ...route,
    stations: stations
      .filter(s => s.route_id === route.route_id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0 }}>📍 إدارة المواقف</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>إضافة موقف</Button>
        </Header>

        <Content style={{ margin: 24 }}>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}>جاري التحميل...</div> :
          routes.length === 0 ? <Empty description="لا يوجد خطوط — أضف خطاً أولاً" /> :
          <Collapse accordion>
            {groupedByRoute.map(route => (
              <Panel
                key={route.route_id}
                header={
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold' }}>
                      🚌 {route.route_name}
                    </span>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {route.stations.length} موقف
                    </Tag>
                  </div>
                }
              >
                {route.stations.length === 0
                  ? <Empty description="لا يوجد مواقف لهذا الخط" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  : route.stations.map((s, index) => (
                    <div key={s.station_id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', marginBottom: 8,
                      background: index % 2 === 0 ? '#f9f9f9' : '#fff',
                      borderRadius: 8, border: '1px solid #f0f0f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#1890ff', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 'bold'
                        }}>
                          {s.order_index || index + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{s.name}</div>
                          {s.lat && s.lng && (
                            <div style={{ fontSize: 11, color: '#999' }}>
                              <EnvironmentOutlined /> {s.lat}, {s.lng}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(s)} />
                        <Popconfirm title="تأكيد الحذف؟" onConfirm={() => handleDelete(s.station_id)} okText="نعم" cancelText="لا">
                          <Button icon={<DeleteOutlined />} size="small" danger />
                        </Popconfirm>
                      </div>
                    </div>
                  ))
                }
              </Panel>
            ))}
          </Collapse>
          }
        </Content>
      </Layout>

      <Modal
        title={editing ? 'تعديل موقف' : 'إضافة موقف جديد'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="حفظ" cancelText="إلغاء"
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item name="name" label="اسم الموقف" rules={[{ required: true, message: 'أدخل اسم الموقف' }]}>
            <Input placeholder="مثال: موقف الجامعة" />
          </Form.Item>
          <Form.Item name="route_id" label="الخط" rules={[{ required: true, message: 'اختر الخط' }]}>
            <Select placeholder="اختر الخط">
              {routes.map(r => <Option key={r.route_id} value={r.route_id}>{r.route_name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="order_index" label="الترتيب على الخط" rules={[{ required: true, message: 'أدخل الترتيب' }]}>
            <Input type="number" placeholder="مثال: 1" />
          </Form.Item>
          <Form.Item name="lat" label="خط العرض (Lat)">
            <Input placeholder="مثال: 33.5138" />
          </Form.Item>
          <Form.Item name="lng" label="خط الطول (Lng)">
            <Input placeholder="مثال: 36.2765" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Stations;