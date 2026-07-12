import { useEffect, useState } from 'react';
import { Layout, Button, Modal, Form, Input, message, Popconfirm, Table } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';

const { Header, Content } = Layout;

const Stations = () => {
  const [collapsed] = useState(false);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stations');
      setStations(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ في جلب المواقف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (station) => {
    setEditing(station);
    form.setFieldsValue({
      name: station.name,
      lat: station.lat,
      lng: station.lng,
    });
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
      setModalOpen(false);
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/stations/${id}`);
      message.success('تم حذف الموقف');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const columns = [
    {
      title: 'اسم الموقف',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'الموقع',
      key: 'location',
      render: (_, station) => (
        station.lat && station.lng
          ? <span><EnvironmentOutlined /> {station.lat}, {station.lng}</span>
          : 'بدون إحداثيات'
      ),
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, station) => (
        <span style={{ display: 'flex', gap: 8 }}>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(station)} />
          <Popconfirm
            title="تأكيد الحذف؟"
            description="إذا كان الموقف مستخدماً ضمن خط، قد يمنع الباك حذفه."
            onConfirm={() => handleDelete(station.station_id)}
            okText="نعم"
            cancelText="لا"
          >
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
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ margin: 0 }}>📍 إدارة المواقف</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة موقف
          </Button>
        </Header>

        <Content style={{ margin: 24 }}>
          <Table
            dataSource={stations}
            columns={columns}
            rowKey="station_id"
            loading={loading}
            bordered
            size="middle"
          />
        </Content>
      </Layout>

      <Modal
        title={editing ? 'تعديل موقف' : 'إضافة موقف جديد'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="حفظ"
        cancelText="إلغاء"
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="name"
            label="اسم الموقف"
            rules={[{ required: true, message: 'أدخل اسم الموقف' }]}
          >
            <Input placeholder="مثال: موقف الجامعة" />
          </Form.Item>
          <Form.Item name="lat" label="خط العرض (Lat)">
            <Input placeholder="مثال: 36.2012" />
          </Form.Item>
          <Form.Item name="lng" label="خط الطول (Lng)">
            <Input placeholder="مثال: 37.1343" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Stations;
