import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './hooks/useAuth';
import Compose from './pages/Compose';
import EmailDetail from './pages/EmailDetail';
import Inbox from './pages/Inbox';
import Login from './pages/Login';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/compose" element={<RequireAuth><Compose /></RequireAuth>} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/dashboard" element={<Navigate to="/dashboard/scheduled" replace />} />
              <Route path="/dashboard/:tab" element={<Inbox />} />
              <Route path="/email/:id" element={<EmailDetail />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
