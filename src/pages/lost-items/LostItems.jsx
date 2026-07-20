import { useState, useEffect } from 'react';
import { Layout, Table, Tag, message, Popconfirm, Button, Badge } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;

const LostItems = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/lost-items');
      setItems(res.data);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/lost-items/${id}/status`, { status });
      message.success(
        status === 'found'    ? 'تم تحديد المفقود كموجود ✅' :
        status === 'returned' ? 'تم تحديد المفقود كمُسترجع ✅' : ''
      );
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/lost-items/${id}`);
      message.success('تم الحذف'); fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const exportExcel = () => {
    const data = items.map(i => ({
      'الباص':          i.bus?.plate_number || '—',
      'المُبلِّغ':      i.reporter?.username || '—',
      'هاتف المُبلِّغ': i.reporter?.phone || '—',
      'نوع المُبلِّغ':  i.reporter_type === 'passenger' ? 'راكب' : 'سائق',
      'الوصف':          i.description,
      'الحالة':         i.status === 'lost' || i.status === 'pending' ? 'جديد'
                      : i.status === 'found' ? 'موجود' : 'مُسترجع',
      'التاريخ':        dayjs(i.report_date).format('YYYY-MM-DD HH:mm'),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المفقودات');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf]), `مفقودات_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    message.success('تم تصدير المفقودات بنجاح');
  };

  const statusColors = {
    lost: 'red',
    pending: 'red',
    found: 'orange',
    returned: 'green'
  };

  const statusLabels = {
    lost: 'جديد',
    pending: 'جديد',
    found: 'موجود',
    returned: 'مُسترجع'
  };

  const pendingCount = items.filter(i =>
    i.status === 'pending' || i.status === 'lost'
  ).length;

  const columns = [
    { title: 'الباص', key: 'bus', render: (_, r) => r.bus?.plate_number || '—' },
    {
      title: 'المُبلِّغ', key: 'reporter',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{r.reporter?.username || '—'}</div>
          {r.reporter?.phone && (
            <div style={{ fontSize: 11, color: '#888' }}>📞 {r.reporter.phone}</div>
          )}
        </div>
      )
    },
    {
      title: 'نوع المُبلِّغ', dataIndex: 'reporter_type', key: 'reporter_type',
      render: t => (
        <Tag color={t === 'passenger' ? 'blue' : 'orange'}>
          {t === 'passenger' ? 'راكب' : 'سائق'}
        </Tag>
      )
    },
    { title: 'الوصف', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'الحالة', dataIndex: 'status', key: 'status',
      render: s => (
        <Tag color={statusColors[s] || 'red'}>
          {statusLabels[s] || 'جديد'}
        </Tag>
      )
    },
    {
      title: 'التاريخ', dataIndex: 'report_date', key: 'report_date',
      render: d => dayjs(d).format('YYYY-MM-DD')
    },
    {
      title: 'إجراءات', key: 'actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {(r.status === 'pending' || r.status === 'lost') && (
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleStatus(r.item_id, 'found')}
              style={{ borderColor: '#fa8c16', color: '#fa8c16' }}>
              تم العثور
            </Button>
          )}
          {r.status === 'found' && (
            <Popconfirm
              title="تأكيد إرجاع المفقود لصاحبه؟"
              onConfirm={() => handleStatus(r.item_id, 'returned')}
              okText="نعم"
              cancelText="لا">
              <Button icon={<CheckOutlined />} size="small" type="primary" ghost>
                تم الإرجاع
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="تأكيد الحذف؟"
            onConfirm={() => handleDelete(r.item_id)}
            okText="نعم"
            cancelText="لا">
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
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>🎒 المفقودات</h2>
            {pendingCount > 0 && (
              <Badge count={pendingCount} style={{ backgroundColor: '#ff4d4f' }} />
            )}
          </div>
          <Button icon={<DownloadOutlined />} onClick={exportExcel} type="primary" ghost>
            تصدير Excel
          </Button>
        </Header>
        <Content style={{ margin: 24 }}>
          <Table
            dataSource={items}
            columns={columns}
            rowKey="item_id"
            loading={loading}
            bordered
            size="middle"
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={8}>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    إجمالي: {items.length} —
                    <span style={{ color: '#ff4d4f' }}>
                      {' '}جديد: {items.filter(i =>
                        i.status === 'pending' || i.status === 'lost'
                      ).length}
                    </span> —
                    موجود: {items.filter(i => i.status === 'found').length} —
                    مُسترجع: {items.filter(i => i.status === 'returned').length}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default LostItems;
