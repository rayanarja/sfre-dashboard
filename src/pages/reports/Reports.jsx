import { useState, useEffect } from 'react';
import { Layout, Table, Tag, message, Popconfirm, Button, Badge } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, CheckOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;

const Reports = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports');
      setReports(res.data);
    } catch { message.error('خطأ في جلب البيانات'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/reports/${id}/status`, { status });
      message.success(status === 'reviewed' ? 'تم تحديد التقرير كمقروء' : 'تم تحديد التقرير كمحلول ✅');
      fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reports/${id}`);
      message.success('تم حذف التقرير'); fetchData();
    } catch { message.error('حدث خطأ'); }
  };

  const exportExcel = () => {
    const data = reports.map(r => ({
      'المستخدم':  r.user?.username || '—',
      'هاتف المستخدم': r.user?.phone || '—',
      'الباص':     r.bus?.plate_number || '—',
      'التفاصيل':  r.description,
      'الحالة':    r.status === 'pending' ? 'جديد' : r.status === 'reviewed' ? 'مقروء' : 'محلول',
      'التاريخ':   dayjs(r.created_at).format('YYYY-MM-DD HH:mm'),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'البلاغات');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf]), `البلاغات${dayjs().format('YYYY-MM-DD')}.xlsx`);
    message.success('تم تصدير البلاغات بنجاح');
  };

  const statColors  = { pending: 'red', reviewed: 'orange', resolved: 'green' };
  const statLabels  = { pending: 'جديد', reviewed: 'مقروء', resolved: 'محلول' };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  const columns = [
    { title: 'المستخدم', key: 'user',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{r.user?.username || '—'}</div>
          {r.user?.phone && <div style={{ fontSize: 11, color: '#888' }}>📞 {r.user.phone}</div>}
        </div>
      )
    },
    { title: 'الباص', key: 'bus', render: (_, r) => r.bus?.plate_number || '—' },
    { title: 'التفاصيل', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'الحالة', dataIndex: 'status', key: 'status',
      render: s => <Tag color={statColors[s]}>{statLabels[s]}</Tag> },
    { title: 'التاريخ', dataIndex: 'created_at', key: 'created_at',
      render: d => dayjs(d).format('YYYY-MM-DD') },
    {
      title: 'إجراءات', key: 'actions',
      render: (_, r) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {r.status === 'pending' && (
            <Button icon={<EyeOutlined />} size="small"
              onClick={() => handleStatus(r.report_id, 'reviewed')}
              style={{ borderColor: '#fa8c16', color: '#fa8c16' }}>
              قراءة
            </Button>
          )}
          {r.status === 'reviewed' && (
            <Button icon={<CheckOutlined />} size="small" type="primary" ghost
              onClick={() => handleStatus(r.report_id, 'resolved')}>
              حلّ
            </Button>
          )}
          <Popconfirm title="تأكيد الحذف؟" onConfirm={() => handleDelete(r.report_id)} okText="نعم" cancelText="لا">
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0 }}>📊 البلاغات</h2>
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
            dataSource={reports} columns={columns}
            rowKey="report_id" loading={loading} bordered size="middle"
            rowClassName={r => r.status === 'pending' ? 'ant-table-row-pending' : ''}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell colSpan={6}>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    إجمالي: {reports.length} —
                    <span style={{ color: '#ff4d4f' }}> جديد: {reports.filter(r => r.status === 'pending').length}</span> —
                    مقروء: {reports.filter(r => r.status === 'reviewed').length} —
                    محلول: {reports.filter(r => r.status === 'resolved').length}
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

export default Reports;
