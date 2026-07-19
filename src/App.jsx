import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/auth/Login';
import ChangePassword from './pages/auth/change-password';
import Dashboard from './pages/dashboard/Dashboard';
import Buses from './pages/buses/Buses';
import Drivers from './pages/drivers/Drivers';
import RoutesPage from './pages/routes/Routes';
import Stations from './pages/stations/Stations';
import Subscriptions from './pages/subscriptions/Subscriptions';
import Notifications from './pages/notifications/Notifications';
import Reports from './pages/reports/Reports';
import Issues from './pages/issues/Issues';
import LostItems from './pages/lost-items/LostItems';
import Shifts from './pages/shifts/Shifts';
import Users from './pages/users/Users';
import POS from './pages/pos/POS';
import BusTrackerMap from './pages/bus-map/BusTrackerMap';

function App() {
  const { user } = useAuth();

  if (user && user.must_change_password) {
    return (
      <Routes>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="*" element={<Navigate to="/change-password" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/buses" element={<PrivateRoute><Buses /></PrivateRoute>} />
      <Route path="/bus-map" element={<PrivateRoute><BusTrackerMap /></PrivateRoute>} />
      <Route path="/drivers" element={<PrivateRoute><Drivers /></PrivateRoute>} />
      <Route path="/shifts" element={<PrivateRoute><Shifts /></PrivateRoute>} />
      <Route path="/routes" element={<PrivateRoute><RoutesPage /></PrivateRoute>} />
      <Route path="/stations" element={<PrivateRoute><Stations /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
      <Route path="/subscriptions" element={<PrivateRoute><Subscriptions /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/issues" element={<PrivateRoute><Issues /></PrivateRoute>} />
      <Route path="/lost-items" element={<PrivateRoute><LostItems /></PrivateRoute>} />
      <Route path="/pos" element={<POS />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
