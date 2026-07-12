import { useState, useEffect } from 'react';
import { Layout, Row, Col, Card, Table, Tag, Empty } from 'antd';
import {
  CarOutlined, UserOutlined, ApartmentOutlined, EnvironmentOutlined,
  CheckCircleOutlined, WarningOutlined, ToolOutlined, CloseCircleOutlined,
  ScheduleOutlined, CreditCardOutlined, RiseOutlined, TeamOutlined
} from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import dayjs from 'dayjs';

const { Header, Content } = Layout;

const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState({
    buses: 0, drivers: 0, routes: 0, stations: 0,
    active: 0, inactive: 0, maintenance: 0, breakdown: 0, todayShifts: 0,
    totalPassengers: 0, activeSubs: 0, totalTripsToday: 0, totalTripsAll: 0,
  });
  const [reports, setReports] = useState([]);
  const [issues, setIssues]   = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          busRes,
          driverRes,
          routeRes,
          stationRes,
          shiftRes,
          reportRes,
          issueRes,
          userRes,
          subRes,
        ] = await Promise.allSettled([
          api.get('/buses'),
          api.get('/drivers'),
          api.get('/routes'),
          api.get('/stations'),
          api.get('/shifts'),
          api.get('/reports'),
          api.get('/issues'),
          api.get('/users'),
          api.get('/subscriptions'),
        ]);

        const dataOf = (result) => (
          result.status === 'fulfilled' && Array.isArray(result.value.data)
            ? result.value.data
            : []
        );

        const buses = dataOf(busRes);
        const drivers = dataOf(driverRes);
        const routes = dataOf(routeRes);
        const stations = dataOf(stationRes);
        const shifts = dataOf(shiftRes);
        const reportsData = dataOf(reportRes);
        const issuesData = dataOf(issueRes);
        const users = dataOf(userRes);
        const subs = dataOf(subRes);
        const today = dayjs().format('YYYY-MM-DD');

        const activeSubs = subs.filter(s => s.status === 'active' && new Date(s.end_date) >= new Date());
        const totalTripsAll = subs.reduce((sum, s) => sum + (s.trips_used || 0), 0);

        setStats({
          buses: buses.length, drivers: drivers.length,
          routes: routes.length, stations: stations.length,
          active:      buses.filter(b => b.current_status === 'active').length,
          inactive:    buses.filter(b => b.current_status === 'inactive').length,
          maintenance: buses.filter(b => b.current_status === 'maintenance').length,
          breakdown:   buses.filter(b => b.current_status === 'breakdown').length,
          todayShifts: shifts.filter(s =>
            dayjs(s.date).format('YYYY-MM-DD') === today && s.status === 'active').length,
          totalPassengers: users.filter(u => u.role === 'passenger').length,
          activeSubs: activeSubs.length,
          totalTripsAll,
        });
        setReports(reportsData.filter(r => dayjs(r.created_at).format('YYYY-MM-DD') === today).slice(0, 5));
        setIssues(issuesData.filter(i => dayjs(i.created_at).format('YYYY-MM-DD') === today).slice(0, 5));
      } catch (err) { console.error(err); }
    };
    fetchData();
  }, []);

  const statCard = (label, value, icon, color, bg) => (
    <Card style={{ borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', background: bg, border: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color }}>{value}</div>
        </div>
        <div style={{ fontSize: 28, color }}>{icon}</div>
      </div>
    </Card>
  );

  const busStatCard = (label, value, icon, color) => (
    <div style={{
      padding: '12px 16px', borderRadius: 8, border: `1px solid ${color}30`,
      background: `${color}08`, display: 'flex', alignItems: 'center', gap: 12
    }}>
      <div style={{ fontSize: 20, color }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: '#999' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 'bold', color }}>{value}</div>
      </div>
    </div>
  );

  const reportColumns = [
    { title: 'المستخدم', key: 'user', render: (_, r) => r.user?.username || '—' },
    { title: 'الباص', key: 'bus', render: (_, r) => r.bus?.plate_number || '—' },
    { title: 'النوع', dataIndex: 'type', key: 'type',
      render: t => <Tag color={t==='complaint'?'red':t==='suggestion'?'blue':'orange'} style={{fontSize:11}}>
        {t==='complaint'?'شكوى':t==='suggestion'?'اقتراح':'حادثة'}</Tag> },
    { title: 'الوقت', dataIndex: 'created_at', key: 'created_at',
      render: d => <span style={{fontSize:12, color:'#999'}}>{dayjs(d).format('HH:mm')}</span> },
  ];

  const issueColumns = [
    { title: 'الباص', key: 'bus', render: (_, r) => r.bus?.plate_number || '—' },
    { title: 'المُبلِّغ', key: 'user', render: (_, r) => r.user?.username || '—' },
    { title: 'نوع العطل', dataIndex: 'type', key: 'type',
      render: t => <Tag color="red" style={{fontSize:11}}>{t}</Tag> },
    { title: 'الوقت', dataIndex: 'created_at', key: 'created_at',
      render: d => <span style={{fontSize:12, color:'#999'}}>{dayjs(d).format('HH:mm')}</span> },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ background: '#f5f6fa' }}>
        <Header style={{
          background: '#fff', padding: '0 24px',
          display: 'flex', alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', height: 56
        }}>
          <div>
            <span style={{ fontWeight: 'bold', fontSize: 16, color: '#1a1a2e' }}>لوحة التحكم 🚌</span>
            <span style={{ fontSize: 11, color: '#bbb', marginRight: 10 }}>
              {dayjs().format('DD/MM/YYYY')}
            </span>
          </div>
        </Header>

        <Content style={{ margin: 20 }}>

          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={12} lg={6}>{statCard('إجمالي الباصات', stats.buses, <CarOutlined />, '#1890ff', '#e6f7ff')}</Col>
            <Col xs={12} lg={6}>{statCard('السائقون', stats.drivers, <UserOutlined />, '#52c41a', '#f6ffed')}</Col>
            <Col xs={12} lg={6}>{statCard('الركاب المسجلين', stats.totalPassengers, <TeamOutlined />, '#722ed1', '#f9f0ff')}</Col>
            <Col xs={12} lg={6}>{statCard('اشتراكات نشطة', stats.activeSubs, <CreditCardOutlined />, '#13c2c2', '#e6fffb')}</Col>
          </Row>

          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={12} lg={6}>{statCard('الخطوط', stats.routes, <ApartmentOutlined />, '#fa8c16', '#fff7e6')}</Col>
            <Col xs={12} lg={6}>{statCard('المواقف', stats.stations, <EnvironmentOutlined />, '#eb2f96', '#fff0f6')}</Col>
            <Col xs={12} lg={6}>{statCard('إجمالي الركوب', stats.totalTripsAll, <RiseOutlined />, '#2f54eb', '#f0f5ff')}</Col>
            <Col xs={12} lg={6}>
              <Card size="small" style={{
                borderRadius: 10, height: '100%',
                background: '#001529', border: 'none',
                boxShadow: '0 1px 6px rgba(0,0,0,0.1)'
              }}>
                <div style={{ color: '#aaa', fontSize: 12, marginBottom: 4 }}>ورديات نشطة اليوم</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>{stats.todayShifts}</div>
                <ScheduleOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.15)' }}/>
              </Card>
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={24}>
              <Card size="small" title="حالة الباصات"
                style={{ borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <Row gutter={[8, 8]}>
                  <Col xs={12} sm={6}>{busStatCard('نشط', stats.active, <CheckCircleOutlined />, '#52c41a')}</Col>
                  <Col xs={12} sm={6}>{busStatCard('غير نشط', stats.inactive, <CloseCircleOutlined />, '#bbb')}</Col>
                  <Col xs={12} sm={6}>{busStatCard('صيانة', stats.maintenance, <ToolOutlined />, '#fa8c16')}</Col>
                  <Col xs={12} sm={6}>{busStatCard('عطل', stats.breakdown, <WarningOutlined />, '#ff4d4f')}</Col>
                </Row>
              </Card>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <Card size="small"
                title={<span style={{fontSize:13}}>📊 تقارير اليوم</span>}
                extra={<Tag color="blue" style={{fontSize:11}}>{reports.length}</Tag>}
                style={{ borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
              >
                {reports.length > 0
                  ? <Table dataSource={reports} columns={reportColumns} rowKey="report_id" pagination={false} size="small"/>
                  : <Empty description={<span style={{fontSize:12, color:'#bbb'}}>لا يوجد تقارير اليوم</span>} image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                }
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small"
                title={<span style={{fontSize:13}}>⚠️ أعطال اليوم</span>}
                extra={<Tag color={issues.length > 0 ? 'red' : 'green'} style={{fontSize:11}}>{issues.length}</Tag>}
                style={{ borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
              >
                {issues.length > 0
                  ? <Table dataSource={issues} columns={issueColumns} rowKey="issue_id" pagination={false} size="small"/>
                  : <Empty description={<span style={{fontSize:12, color:'#bbb'}}>لا يوجد أعطال اليوم</span>} image={Empty.PRESENTED_IMAGE_SIMPLE}/>
                }
              </Card>
            </Col>
          </Row>

        </Content>
      </Layout>
    </Layout>
  );
};

export default Dashboard;
