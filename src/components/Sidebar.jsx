import { useEffect, useState } from 'react';
import { Layout, Menu, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, CarOutlined, UserOutlined, ApartmentOutlined,
  EnvironmentOutlined, CreditCardOutlined, BellOutlined,
  FileTextOutlined, WarningOutlined, InboxOutlined, LogoutOutlined, ShopOutlined,
  ScheduleOutlined, TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const { Sider } = Layout;

const Sidebar = ({ collapsed }) => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { logout } = useAuth();

  const [pendingReports, setPendingReports] = useState(0);
  const [pendingLostItems, setPendingLostItems] = useState(0);
  const [pendingIssues, setPendingIssues] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchBadges = async () => {
    try {
      const [rRes, lRes, iRes, nRes] = await Promise.all([
        api.get('/reports').catch(() => ({ data: [] })),
        api.get('/lost-items').catch(() => ({ data: [] })),
        api.get('/issues').catch(() => ({ data: [] })),
        api.get('/notifications').catch(() => ({ data: [] })),
      ]);
      const reports = Array.isArray(rRes.data) ? rRes.data : [];
      const lostItems = Array.isArray(lRes.data) ? lRes.data : [];
      const issues = Array.isArray(iRes.data) ? iRes.data : [];
      const notifs = Array.isArray(nRes.data) ? nRes.data : [];
      setPendingReports(reports.filter(r => r.status === 'pending').length);
      setPendingLostItems(lostItems.filter(l => l.status === 'pending' || l.status === 'lost').length);
      setPendingIssues(issues.filter(i => i.status === 'pending').length);
      setUnreadNotifs(notifs.filter(n => !n.is_read && n.type === 'admin' && n.sender_type !== 'admin').length);
    } finally { /* empty */ }
  };

  useEffect(() => {
     fetchBadges();
    const interval = setInterval(fetchBadges, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { fetchBadges(); }, [location.pathname]);

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'الرئيسية' },
    { key: '/buses', icon: <CarOutlined />, label: 'الباصات' },
    { key: '/bus-map', icon: <EnvironmentOutlined />, label: 'خريطة الباصات' },
    { key: '/drivers', icon: <UserOutlined />, label: 'السائقون' },
    { key: '/shifts', icon: <ScheduleOutlined />, label: 'الورديات' },
    { key: '/routes', icon: <ApartmentOutlined />, label: 'الخطوط' },
    { key: '/stations', icon: <EnvironmentOutlined />, label: 'المواقف' },
    { key: '/users', icon: <TeamOutlined />, label: 'المستخدمون' },
    { key: '/subscriptions', icon: <CreditCardOutlined />, label: 'الاشتراكات' },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>الإشعارات</span>
          {unreadNotifs > 0 && <Badge count={unreadNotifs} size="small" />}
        </div>
      )
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>البلاغات</span>
          {pendingReports > 0 && <Badge count={pendingReports} size="small" />}
        </div>
      )
    },
    {
      key: '/issues',
      icon: <WarningOutlined />,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>الأعطال</span>
          {pendingIssues > 0 && <Badge count={pendingIssues} size="small" />}
        </div>
      )
    },
    {
      key: '/lost-items',
      icon: <InboxOutlined />,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>المفقودات</span>
          {pendingLostItems > 0 && <Badge count={pendingLostItems} size="small" />}
        </div>
      )
    },
    { key: '/pos', icon: <ShopOutlined />, label: 'نقاط البيع' },
  ];

  return (
    <Sider
      collapsed={collapsed}
      style={{ minHeight: '100vh', background: '#001529' }}
      width={220}
    >
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'white',
        fontSize: collapsed ? 14 : 16, fontWeight: 'bold',
        borderBottom: '1px solid #1f3a5f', margin: '0 8px'
      }}>
        {collapsed ? '🚌' : '🚌 نظام الباصات'}
      </div>

      <Menu
        theme="dark" mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ marginTop: 8 }}
      />

      <div style={{ position: 'absolute', bottom: 0, width: '100%' }}>
        <Menu
          theme="dark" mode="inline"
          items={[{ key: 'logout', icon: <LogoutOutlined />, label: 'تسجيل الخروج', danger: true }]}
          onClick={logout}
        />
      </div>
    </Sider>
  );
};

export default Sidebar;
