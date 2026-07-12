import { useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Tabs,
  Empty,
  Space,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';

const { Header, Content } = Layout;
const { Option } = Select;

const DIRECTIONS = {
  outbound: 'ذهاب',
  inbound: 'إياب',
};

const stationIdOf = (station) => station.station_id ?? station.station?.station_id ?? station.id;
const stationOrderOf = (station, index) => station.station_order ?? station.order_index ?? index + 1;

const getStationName = (routeStation, allStations) => {
  if (routeStation.station?.name) return routeStation.station.name;
  if (routeStation.station_name) return routeStation.station_name;
  const stationId = routeStation.station_id;
  const station = allStations.find((item) => stationIdOf(item) === stationId);
  return station?.name || `#${stationId}`;
};

const normalizeDirectionStations = (route, direction) => {
  const direct = route?.[direction];
  if (Array.isArray(direct)) return direct;

  const routeStations = route?.route_stations;
  if (Array.isArray(routeStations)) {
    return routeStations.filter((station) => station.direction === direction);
  }

  const stations = route?.stations;
  if (!Array.isArray(stations)) return [];

  const filtered = stations.filter((station) => station.direction === direction);
  if (filtered.length) return filtered;

  return direction === 'outbound' ? stations : [];
};

const toStationPayload = (stations) => (
  stations.map((station, index) => ({
    station_id: station.station_id,
    station_order: index + 1,
  }))
);

const RoutesPage = () => {
  const [collapsed] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [savingStations, setSavingStations] = useState(false);
  const [activeDirection, setActiveDirection] = useState('outbound');
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [directionStations, setDirectionStations] = useState({
    outbound: [],
    inbound: [],
  });
  const [form] = Form.useForm();
  const [detailsForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routesRes, stationsRes] = await Promise.all([
        api.get('/routes'),
        api.get('/stations'),
      ]);
      const nextRoutes = Array.isArray(routesRes.data) ? routesRes.data : [];
      setRoutes(nextRoutes);
      setStations(Array.isArray(stationsRes.data) ? stationsRes.data : []);
      return nextRoutes;
    } catch (err) {
      message.error(err.response?.data?.message || 'خطأ في جلب البيانات');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tableRoutes = useMemo(() => routes, [routes]);

  const hydrateRouteDetails = (route) => {
    setEditing(route);
    detailsForm.setFieldsValue({
      route_name: route.route_name,
      description: route.description,
    });
    setDirectionStations({
      outbound: normalizeDirectionStations(route, 'outbound')
        .map((station, index) => ({
          station_id: stationIdOf(station),
          station_order: stationOrderOf(station, index),
          station: station.station,
        }))
        .sort((a, b) => a.station_order - b.station_order),
      inbound: normalizeDirectionStations(route, 'inbound')
        .map((station, index) => ({
          station_id: stationIdOf(station),
          station_order: stationOrderOf(station, index),
          station: station.station,
        }))
        .sort((a, b) => a.station_order - b.station_order),
    });
    setActiveDirection('outbound');
    setSelectedStationId(null);
    setDetailsOpen(true);
  };

  const openAdd = () => {
    form.resetFields();
    setRouteModalOpen(true);
  };

  const openDetails = async (route) => {
    try {
      const res = await api.get(`/routes/${route.route_id}`);
      hydrateRouteDetails(res.data || route);
    } catch {
      hydrateRouteDetails(route);
    }
  };

  const handleCreateRoute = async (values) => {
    try {
      const res = await api.post('/routes', values);
      message.success('تم إضافة الخط');
      setRouteModalOpen(false);
      const nextRoutes = await fetchData();
      const createdRoute = res.data?.route_id
        ? res.data
        : nextRoutes.find((route) => route.route_name === values.route_name);
      if (createdRoute) hydrateRouteDetails(createdRoute);
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/routes/${id}`);
      message.success('تم حذف الخط');
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.message || 'حدث خطأ');
    }
  };

  const addStationToDirection = () => {
    if (!selectedStationId) return;
    setDirectionStations((current) => {
      const list = current[activeDirection];
      if (list.some((station) => station.station_id === selectedStationId)) {
        message.warning('الموقف موجود مسبقاً ضمن هذا الاتجاه');
        return current;
      }

      return {
        ...current,
        [activeDirection]: [
          ...list,
          {
            station_id: selectedStationId,
            station_order: list.length + 1,
          },
        ],
      };
    });
    setSelectedStationId(null);
  };

  const removeStationFromDirection = (direction, index) => {
    setDirectionStations((current) => ({
      ...current,
      [direction]: current[direction]
        .filter((_, itemIndex) => itemIndex !== index)
        .map((station, itemIndex) => ({ ...station, station_order: itemIndex + 1 })),
    }));
  };

  const copyOutboundReverse = () => {
    setDirectionStations((current) => ({
      ...current,
      inbound: [...current.outbound]
        .reverse()
        .map((station, index) => ({ ...station, station_order: index + 1 })),
    }));
    setActiveDirection('inbound');
    message.success('تم نسخ الذهاب بالعكس إلى الإياب');
  };

  const moveStation = (direction, fromIndex, toIndex) => {
    setDirectionStations((current) => {
      const next = [...current[direction]];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return {
        ...current,
        [direction]: next.map((station, index) => ({ ...station, station_order: index + 1 })),
      };
    });
  };

  const saveDetails = async () => {
    if (!editing?.route_id) return;
    setSavingStations(true);
    try {
      const values = await detailsForm.validateFields();
      await api.put(`/routes/${editing.route_id}`, values);
      await api.put(`/routes/${editing.route_id}/stations`, {
        outbound: toStationPayload(directionStations.outbound),
        inbound: toStationPayload(directionStations.inbound),
      });
      message.success('تم حفظ الخط واتجاهاته');
      setDetailsOpen(false);
      fetchData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.response?.data?.message || 'تعذر حفظ مواقف الخط');
    } finally {
      setSavingStations(false);
    }
  };

  const renderDirectionEditor = (direction) => (
    <div>
      <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
        <Select
          value={selectedStationId}
          onChange={setSelectedStationId}
          placeholder="اختر موقف"
          showSearch
          optionFilterProp="children"
          style={{ width: '100%' }}
        >
          {stations.map((station) => (
            <Option key={stationIdOf(station)} value={stationIdOf(station)}>
              {station.name}
            </Option>
          ))}
        </Select>
        <Button type="primary" icon={<PlusOutlined />} onClick={addStationToDirection}>
          إضافة موقف
        </Button>
      </Space.Compact>

      {directionStations[direction].length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {directionStations[direction].map((station, index) => (
            <div
              key={`${direction}-${station.station_id}-${index}`}
              draggable
              onDragStart={() => setDragState({ direction, index })}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragState?.direction === direction) moveStation(direction, dragState.index, index);
                setDragState(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                background: '#fff',
                cursor: 'grab',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MenuOutlined style={{ color: '#8c8c8c' }} />
                <Tag color={direction === 'outbound' ? 'blue' : 'orange'}>{index + 1}</Tag>
                <strong>{getStationName(station, stations)}</strong>
              </div>
              <Button
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={() => removeStationFromDirection(direction, index)}
              />
            </div>
          ))}
        </div>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={`لا توجد مواقف ${DIRECTIONS[direction]} بعد`} />
      )}
    </div>
  );

  const columns = [
    {
      title: 'اسم الخط',
      dataIndex: 'route_name',
      key: 'route_name',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'مواقف الذهاب',
      key: 'outbound',
      render: (_, route) => <Tag color="blue">{normalizeDirectionStations(route, 'outbound').length} موقف</Tag>,
    },
    {
      title: 'مواقف الإياب',
      key: 'inbound',
      render: (_, route) => <Tag color="orange">{normalizeDirectionStations(route, 'inbound').length} موقف</Tag>,
    },
    {
      title: 'الباصات',
      key: 'buses',
      render: (_, route) => <Tag color="green">{route.buses?.length || 0} باص</Tag>,
    },
    {
      title: 'إجراءات',
      key: 'actions',
      render: (_, route) => (
        <span style={{ display: 'flex', gap: 6 }}>
          <Button icon={<EditOutlined />} size="small" onClick={() => openDetails(route)}>
            تعديل
          </Button>
          <Popconfirm
            title="تأكيد الحذف؟"
            description="سيتم حذف الخط ومواقف الاتجاهات المرتبطة به."
            onConfirm={() => handleDelete(route.route_id)}
            okText="نعم"
            cancelText="لا"
          >
            <Button icon={<DeleteOutlined />} size="small" danger>
              حذف
            </Button>
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
          <h2 style={{ margin: 0 }}>إدارة الخطوط</h2>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            إضافة خط
          </Button>
        </Header>

        <Content style={{ margin: 24 }}>
          <Table
            dataSource={tableRoutes}
            columns={columns}
            rowKey="route_id"
            loading={loading}
            bordered
            size="middle"
          />
        </Content>
      </Layout>

      <Modal
        title="إضافة خط جديد"
        open={routeModalOpen}
        onCancel={() => setRouteModalOpen(false)}
        onOk={() => form.submit()}
        okText="حفظ"
        cancelText="إلغاء"
      >
        <Form form={form} onFinish={handleCreateRoute} layout="vertical">
          <Form.Item
            name="route_name"
            label="اسم الخط"
            rules={[{ required: true, message: 'أدخل اسم الخط' }]}
          >
            <Input placeholder="مثال: حلب الجديدة جنوبي" />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <Input.TextArea placeholder="اختياري" rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editing ? `تعديل الخط: ${editing.route_name}` : 'تعديل الخط'}
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        onOk={saveDetails}
        okText="حفظ"
        cancelText="إلغاء"
        width={760}
        confirmLoading={savingStations}
      >
        <Form form={detailsForm} layout="vertical" style={{ marginBottom: 12 }}>
          <Form.Item
            name="route_name"
            label="اسم الخط"
            rules={[{ required: true, message: 'أدخل اسم الخط' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="الوصف">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <Button icon={<CopyOutlined />} onClick={copyOutboundReverse}>
            نسخ الذهاب بالعكس إلى الإياب
          </Button>
        </div>

        <Tabs
          activeKey={activeDirection}
          onChange={setActiveDirection}
          items={[
            {
              key: 'outbound',
              label: 'ذهاب',
              children: renderDirectionEditor('outbound'),
            },
            {
              key: 'inbound',
              label: 'إياب',
              children: renderDirectionEditor('inbound'),
            },
          ]}
        />

        <Button
          icon={<SaveOutlined />}
          type="primary"
          block
          loading={savingStations}
          onClick={saveDetails}
          style={{ marginTop: 12 }}
        >
          حفظ ترتيب الاتجاهين
        </Button>
      </Modal>
    </Layout>
  );
};

export default RoutesPage;
