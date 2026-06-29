import { useEffect, useMemo, useRef, useState } from 'react';
import { Layout, Card, Row, Col, Statistic, Tag, Empty, Spin, Alert, Button, message } from 'antd';
import {
  CarOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons';
import Sidebar from '../../components/Sidebar';
import api from '../../api/axios';
import './BusTrackerMap.css';

const { Header, Content } = Layout;

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const DEFAULT_CENTER = [36.21, 37.13];
const POLL_INTERVAL = 30000;

let leafletPromise;

const loadLeaflet = () => {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.L), { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });

  return leafletPromise;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ar-SY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const directionLabel = (direction) => {
  const labels = {
    outbound: 'ذهاب',
    inbound: 'إياب',
  };
  return labels[direction] || direction || '-';
};

const buildPopup = (bus) => `
  <div class="bus-popup">
    <div class="bus-popup-title">باص ${bus.plate_number || bus.bus_id}</div>
    <div class="bus-popup-row"><span>الحالة</span><strong>${bus.status || '-'}</strong></div>
    <div class="bus-popup-row"><span>الاتجاه</span><strong>${directionLabel(bus.direction)}</strong></div>
    <div class="bus-popup-row"><span>الموقف الحالي</span><strong>${bus.current_station_index ?? '-'}</strong></div>
    <div class="bus-popup-row"><span>الخط</span><strong>${bus.route_name || bus.route_id || '-'}</strong></div>
    <div class="bus-popup-row"><span>آخر تحديث</span><strong>${formatDate(bus.last_update)}</strong></div>
    <div class="bus-popup-row"><span>الإحداثيات</span><strong>${bus.lat}, ${bus.lng}</strong></div>
  </div>
`;

const getBounds = (buses) => {
  const points = buses
    .map((bus) => ({ lat: Number(bus.lat), lng: Number(bus.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (!points.length) return null;

  return points.reduce((bounds, point) => ({
    minLat: Math.min(bounds.minLat, point.lat),
    maxLat: Math.max(bounds.maxLat, point.lat),
    minLng: Math.min(bounds.minLng, point.lng),
    maxLng: Math.max(bounds.maxLng, point.lng),
  }), {
    minLat: points[0].lat,
    maxLat: points[0].lat,
    minLng: points[0].lng,
    maxLng: points[0].lng,
  });
};

const fallbackPosition = (bus, bounds) => {
  if (!bounds) return { left: '50%', top: '50%' };

  const latRange = bounds.maxLat - bounds.minLat || 0.01;
  const lngRange = bounds.maxLng - bounds.minLng || 0.01;
  const left = 10 + ((Number(bus.lng) - bounds.minLng) / lngRange) * 80;
  const top = 90 - ((Number(bus.lat) - bounds.minLat) / latRange) * 80;

  return {
    left: `${Math.max(8, Math.min(92, left))}%`,
    top: `${Math.max(8, Math.min(92, top))}%`,
  };
};

const BusTrackerMap = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [buses, setBuses] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [leafletError, setLeafletError] = useState(false);

  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const LRef = useRef(null);

  const bounds = useMemo(() => getBounds(buses), [buses]);

  const fetchBuses = async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get('/bus-tracker/map');
      const nextBuses = Array.isArray(response.data?.buses) ? response.data.buses : [];
      setBuses(nextBuses);
      setCount(response.data?.count ?? nextBuses.length);
      setError('');
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'تعذر جلب مواقع الباصات');
      if (!silent) message.error('تعذر جلب مواقع الباصات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBuses();
    const interval = setInterval(() => fetchBuses({ silent: true }), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !mapElementRef.current || mapRef.current) return;

        LRef.current = L;
        mapRef.current = L.map(mapElementRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
        }).setView(DEFAULT_CENTER, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapRef.current);

        setLeafletReady(true);
      })
      .catch(() => {
        if (!cancelled) setLeafletError(true);
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = buses
      .filter((bus) => Number.isFinite(Number(bus.lat)) && Number.isFinite(Number(bus.lng)))
      .map((bus) => {
        const marker = L.marker([Number(bus.lat), Number(bus.lng)], {
          icon: L.divIcon({
            className: '',
            html: `<div class="bus-map-marker">${bus.plate_number || bus.bus_id}</div>`,
            iconSize: [1, 1],
            iconAnchor: [0, 0],
          }),
        }).addTo(map);

        marker.bindPopup(buildPopup(bus));
        return marker;
      });

    const points = buses
      .map((bus) => [Number(bus.lat), Number(bus.lng)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }
  }, [buses, leafletReady]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <Sidebar collapsed={collapsed} />
      <Layout style={{ background: '#f5f6fa' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          height: 56,
        }}>
          <h2 style={{ margin: 0, color: '#1a1a2e', fontSize: 18 }}>خريطة الباصات النشطة</h2>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={() => fetchBuses({ silent: true })}
            loading={refreshing}
          >
            تحديث
          </Button>
        </Header>

        <Content className="bus-map-content">
          {error && (
            <Alert
              type="error"
              showIcon
              message={error}
              style={{ marginBottom: 12 }}
            />
          )}

          {leafletError && (
            <Alert
              type="warning"
              showIcon
              message="تعذر تحميل خريطة OpenStreetMap، سيتم عرض المواقع على مخطط مبسط."
              style={{ marginBottom: 12 }}
            />
          )}

          <Row gutter={[12, 12]} className="bus-map-summary">
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic title="الباصات النشطة" value={count} prefix={<CarOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic title="المواقع المعروضة" value={buses.length} prefix={<EnvironmentOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card size="small">
                <Statistic
                  title="آخر تحديث"
                  value={lastRefresh ? formatDate(lastRefresh) : '-'}
                  prefix={<FieldTimeOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <div className="bus-map-shell">
            <Card className="bus-map-card" title="المواقع على الخريطة">
              <Spin spinning={loading}>
                <div ref={mapElementRef} className="bus-map">
                  {leafletError && buses.map((bus) => (
                    <div
                      key={bus.bus_id}
                      className="bus-fallback-point"
                      style={fallbackPosition(bus, bounds)}
                      title={`${bus.plate_number} - ${bus.route_name || ''}`}
                    >
                      {bus.plate_number || bus.bus_id}
                    </div>
                  ))}
                  {!loading && !buses.length && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="لا توجد باصات نشطة حالياً"
                      style={{ marginTop: 160 }}
                    />
                  )}
                </div>
              </Spin>
            </Card>

            <Card className="bus-list-card" title="معلومات الباصات">
              {buses.length ? (
                <div className="bus-list">
                  {buses.map((bus) => (
                    <div key={bus.bus_id} className="bus-list-item">
                      <div className="bus-list-head">
                        <div className="bus-plate">{bus.plate_number || `#${bus.bus_id}`}</div>
                        <Tag color="green">{bus.status || 'active'}</Tag>
                      </div>
                      <div className="bus-meta">
                        <div><span>الخط</span>{bus.route_name || bus.route_id || '-'}</div>
                        <div><span>الاتجاه</span>{directionLabel(bus.direction)}</div>
                        <div><span>الموقف الحالي</span>{bus.current_station_index ?? '-'}</div>
                        <div><span>آخر تحديث</span>{formatDate(bus.last_update)}</div>
                        <div><span>Latitude</span>{bus.lat ?? '-'}</div>
                        <div><span>Longitude</span>{bus.lng ?? '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد بيانات" />
              )}
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default BusTrackerMap;
