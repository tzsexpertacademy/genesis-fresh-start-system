import { Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import ScrollToTop from "./components/common/ScrollToTop";

// WhatsApp Gateway Pages
import Dashboard from './pages/WhatsApp/Dashboard';
import QRLogin from './pages/WhatsApp/QRLogin';
import EnhancedInbox from './pages/WhatsApp/EnhancedInbox';
import Inbox from './pages/WhatsApp/Inbox';
import ImprovedInbox from './pages/WhatsApp/ImprovedInbox';
import SendMessage from './pages/WhatsApp/SendMessage';
import SendMedia from './pages/WhatsApp/SendMedia';
import Contacts from './pages/WhatsApp/Contacts';
import ContactCategories from './pages/WhatsApp/ContactCategories';
import ManageItems from './pages/WhatsApp/ManageItems';
import ScheduleMessage from './pages/WhatsApp/ScheduleMessage';
import BlastMessage from './pages/WhatsApp/BlastMessage';
import Settings from './pages/WhatsApp/Settings';
import Logs from './pages/WhatsApp/Logs';

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Dashboard Layout - No Authentication Required */}
        <Route element={<AppLayout />}>
          {/* Redirect root to WhatsApp Dashboard */}
          <Route index path="/" element={<Dashboard />} />

          {/* WhatsApp Gateway Routes */}
          <Route path="/whatsapp/dashboard" element={<Dashboard />} />
          <Route path="/whatsapp/send-message" element={<SendMessage />} />
          <Route path="/whatsapp/send-media" element={<SendMedia />} />
          <Route path="/whatsapp/inbox" element={<Inbox />} />
          <Route path="/whatsapp/enhanced-inbox" element={<EnhancedInbox />} />
          <Route path="/whatsapp/improved-inbox" element={<ImprovedInbox />} />
          <Route path="/whatsapp/contacts" element={<Contacts />} />
          <Route path="/whatsapp/contact-categories" element={<ContactCategories />} />
          <Route path="/whatsapp/manage-items" element={<ManageItems />} />
          <Route path="/whatsapp/schedule-message" element={<ScheduleMessage />} />
          <Route path="/whatsapp/blast-message" element={<BlastMessage />} />
          <Route path="/whatsapp/settings" element={<Settings />} />
          <Route path="/whatsapp/logs" element={<Logs />} />
        </Route>

        {/* WhatsApp Login */}
        <Route path="/whatsapp/login" element={<QRLogin />} />

        {/* Fallback Route - Redirect to WhatsApp Dashboard */}
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </>
  );
}