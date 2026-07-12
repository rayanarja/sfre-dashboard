import { useEffect, useState } from 'react';
import { Layout, Table, Button, Modal, Form, Input, Select, Tag, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ToolOutlined, CheckCircleOutlined, QrcodeOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';

const { Header, Content } = Layout;
const { Option } = Select;

const directionLabels = {
  outbound: 'ذهاب',
  inbound: 'إياب',
};

const getRouteName = (bus, routes) => {
  if (bus.route?.route_name) return bus.route.route_name;
  const route = routes.find((item) => item.route_id === bus.route_id);
  return route?.route_name || null;
};

const Buses = () => {
  const [collapsed] = useState(false);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [statusForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [busRes, routeRes] = await Promise.allSettled([
        api.get('/buses'),
        api.get('/routes'),
      ]);

      if (busRes.status === 'fulfilled' && Array.isArray(busRes.value.data)) {
        setBuses(busRes.value.data);
      } else {
        setBuses([]);
        message.error('تعذر جلب بيانات الباصات');
      }

      if (routeRes.status === 'fulfilled' && Array.isArray(routeRes.value.data)) {
        setRoutes(routeRes.value.data);
      } else {
        setRoutes([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => { setEditing(null); form.resetFields(); setAddModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    form.setFieldsValue({
      plate_number: r.plate_number,
      route_id: r.route_id,
      direction: r.direction || 'outbound',
    });
    setAddModal(true);
  };
  const openStatus = (r) => {
    setEditing(r);
    statusForm.setFieldsValue({
      current_status: r.current_status === 'maintenance' ? 'inactive' : 'maintenance',
    });
    setStatusModal(true);
  };

  const printQR = (bus) => {
    const qrData = `BUS-${bus.bus_id}-${bus.plate_number}`;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>QR باص ${bus.plate_number}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              margin: 0;
              background: #fff;
            }
            .container {
              text-align: center;
              padding: 40px;
              border: 2px solid #eee;
              border-radius: 16px;
            }
            h1 { font-size: 28px; margin-bottom: 4px; color: #1a1a2e; }
            .subtitle { color: #888; font-size: 14px; margin-bottom: 24px; }
            img { border-radius: 8px; }
            .qr-data {
              margin-top: 16px;
              font-size: 12px;
              color: #aaa;
              letter-spacing: 2px;
            }
            .footer {
              margin-top: 24px;
              font-size: 13px;
              color: #1976D2;
              font-weight: bold;
            }
            @media print {
              body { margin: 0; }
              .container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚌 باص ${bus.plate_number}</h1>
            <p class="subtitle">امسح الرمز عند الصعود للباص</p>
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}&color=1976D2"
              width="300"
              height="300"
            />
            <p class="qr-data">${qrData}</p>
            <p class="footer">SFRE - نظام إدارة الباصات الذكي</p>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => window.print(), 500);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await api.put(`/buses/${editing.bus_id}`, values);
        message.success('تم تعديل الباص');
      } else {
        await api.post('/buses', {
          ...values,
          direction: values.direction || 'outbound',
          current_status: 'inactive',
        });
        message.success('تم إضافة الباص - الحالة: غير نشط حتى يبدأ السائق');
      }
      setAddModal(false);
      fetchData();
    } catch {
      message.error('حدث خطأ');
    }
  };

  const handleStatusUpdate = async (values) => {
    try {
      await api.put(`/buses/${editing.bus_id}`, { current_status: values.current_status });
      message.success('تم تحديث حالة الباص');
      setStatusModal(false);
      fetchData();
    } catch {
      message.error('حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/buses/${id}`);
      message.success('تم حذف الباص');
      fetchData();
    } catch {
      message.error('حدث خطأ');
    }
  };

  const statusColors = { active: 'green', inactive: 'default', maintenance: 'orange', breakdown: 'red' };
  const statusLabels = { active: 'نشط', inactive: 'غير نشط', maintenance: 'صيانة', breakdown: 'عطل' };

  const columns = [
    {
      title: 'رقم اللوحة',
      dataIndex: 'plate_number',
      key: 'plate_number',
      render: p => <strong>{p}</strong>,
    },
    {
      title: 'الخط',
      key: 'route',
      render: (_, r) => getRouteName(r, routes) || <Tag color="default">بدون خط</Tag>,
    },
    {
      title: 'الاتجاه',
      dataIndex: 'direction',
      key: 'direction',
      render: direction => <Tag color={direction === 'inbound' ? 'orange' : 'blue'}>{directionLabels[direction] || '-'}</Tag>,
    },
    {
      title: 'الحالة',
      dataIndex: 'current_status',
      key: 'status',
      render: s => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEdit(r)}
          />
          <Button
            size="small"
            icon={<ToolOutlined />}
            onClick={() => openStatus(r)}
            style={{ borderColor: '#fa8c16', color: '#fa8c16' }}
            disabled={r.current_status === 'active'}
          >
            صيانة
          </Button>
          <Button
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => printQR(r)}
            style={{ borderColor: '#1976D2', color: '#1976D2' }}
          >
            QR
          </Button>
          <Popconfirm
            title="تأكيد الحذف؟"
            onConfirm={() => handleDelete(r.bus_id)}
            okText="نعم"
            cancelText="لا"
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} />
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ margin: 0 }}>🚌 إدارة الباصات</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة باص
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Table
            dataSource={buses}
            columns={columns}
            rowKey="bus_id"
            loading={loading}
            bordered
            size="middle"
          />
        </Content>
      </Layout>

      <Modal
        title={editing ? 'تعديل باص' : 'إضافة باص جديد'}
        open={addModal}
        onCancel={() => setAddModal(false)}
        onOk={() => form.submit()}
        okText="حفظ"
        cancelText="إلغاء"
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="plate_number"
            label="رقم اللوحة"
            rules={[{ required: true, message: 'أدخل رقم اللوحة' }]}
          >
            <Input placeholder="مثال: 111" />
          </Form.Item>
          <Form.Item name="route_id" label="الخط">
            <Select placeholder="اختر الخط" allowClear>
              {routes.map(r => (
                <Option key={r.route_id} value={r.route_id}>{r.route_name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="direction" label="الاتجاه" initialValue="outbound">
            <Select placeholder="اختر الاتجاه">
              <Option value="outbound">ذهاب</Option>
              <Option value="inbound">إياب</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`🔧 صيانة الباص - ${editing?.plate_number}`}
        open={statusModal}
        onCancel={() => setStatusModal(false)}
        onOk={() => statusForm.submit()}
        okText="تأكيد"
        cancelText="إلغاء"
      >
        <Form form={statusForm} onFinish={handleStatusUpdate}>
          <Form.Item name="current_status" hidden><Input /></Form.Item>
        </Form>
        {editing?.current_status === 'maintenance' ? (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <CheckCircleOutlined style={{ fontSize: 40, color: '#52c41a' }} />
            <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8 }}>
              إخراج الباص من الصيانة
            </div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              حالة الباص ستصبح "غير نشط" حتى يبدأ السائق
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <ToolOutlined style={{ fontSize: 40, color: '#fa8c16' }} />
            <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8 }}>
              إدخال الباص للصيانة
            </div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              الباص سوف يكون غير متاح حتى تنتهي الصيانة
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default Buses;
