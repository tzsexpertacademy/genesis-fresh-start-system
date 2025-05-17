import { Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import ScrollToTop from "./components/common/ScrollToTop";

// WhatsApp Gateway Pages
import QRLogin from "./pages/WhatsApp/QRLogin";
import Dashboard from "./pages/WhatsApp/Dashboard";
import SendMessage from "./pages/WhatsApp/SendMessage";
import SendMedia from "./pages/WhatsApp/SendMedia";
import Inbox from "./pages/WhatsApp/Inbox";
import ImprovedInbox from "./pages/WhatsApp/ImprovedInbox";
import EnhancedInbox from "./pages/WhatsApp/EnhancedInbox";
import Settings from "./pages/WhatsApp/Settings";
import Logs from "./pages/WhatsApp/Logs";
import GeminiAI from "./pages/WhatsApp/GeminiAI";
import GeminiSettings from "./pages/WhatsApp/GeminiSettings";
import Contacts from "./pages/WhatsApp/Contacts";
import ContactCategories from "./pages/WhatsApp/ContactCategories";
import BlastMessage from "./pages/WhatsApp/BlastMessage";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Dashboard Layout - No Authentication Required */}
        <Route element={<AppLayout />}>
          {/* Redirect root to WhatsApp Dashboard */}
          <Route index path="/" element={<Dashboard />} />

          {/* WhatsApp Gateway */}
          <Route path="/whatsapp/dashboard" element={<Dashboard />} />
          <Route path="/whatsapp/send-message" element={<SendMessage />} />
          <Route path="/whatsapp/send-media" element={<SendMedia />} />
          <Route path="/whatsapp/inbox" element={<EnhancedInbox />} />
          <Route path="/whatsapp/inbox-improved" element={<ImprovedInbox />} />
          <Route path="/whatsapp/inbox-old" element={<Inbox />} />
          <Route path="/whatsapp/contacts" element={<Contacts />} />
          <Route path="/whatsapp/contact-categories" element={<ContactCategories />} />
          <Route path="/whatsapp/settings" element={<Settings />} />
          <Route path="/whatsapp/logs" element={<Logs />} />
          <Route path="/whatsapp/gemini" element={<GeminiAI />} />
          <Route path="/whatsapp/gemini-settings" element={<GeminiSettings />} />
          <Route path="/whatsapp/blast-message" element={<BlastMessage />} /> {/* Add BlastMessage route */}

          {/* End of WhatsApp Gateway routes */}
        </Route>

        {/* WhatsApp Login */}
        <Route path="/whatsapp/login" element={<QRLogin />} />

        {/* Fallback Route - Redirect to WhatsApp Dashboard */}
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </>
  );
}
