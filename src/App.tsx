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
import Settings from "./pages/WhatsApp/Settings"; // This is the old general WhatsApp settings
import Logs from "./pages/WhatsApp/Logs";
import GeminiAI from "./pages/WhatsApp/GeminiAI";
// GlobalAISettings is removed
import GeminiProviderSettings from "./pages/WhatsApp/GeminiProviderSettings";
import OpenAIProviderSettings from "./pages/WhatsApp/OpenAIProviderSettings";
import GroqProviderSettings from "./pages/WhatsApp/GroqProviderSettings";
import Contacts from "./pages/WhatsApp/Contacts";
import ContactCategories from "./pages/WhatsApp/ContactCategories";
import BlastMessage from "./pages/WhatsApp/BlastMessage";
import OpenAIChat from "./pages/WhatsApp/OpenAIChat";
import GroqChat from "./pages/WhatsApp/GroqChat";
import AutoReplySettings from "./pages/WhatsApp/AutoReplySettings";
import ManageItems from "./pages/WhatsApp/ManageItems";
import ScheduleMessage from "./pages/WhatsApp/ScheduleMessage"; // Import ScheduleMessage

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
          <Route path="/whatsapp/manage-items" element={<ManageItems />} />
          <Route path="/whatsapp/schedule-message" element={<ScheduleMessage />} /> {/* Add ScheduleMessage route */}


          {/* Old general WhatsApp settings (not AI related) */}
          <Route path="/whatsapp/settings" element={<Settings />} />

          <Route path="/whatsapp/logs" element={<Logs />} />
          <Route path="/whatsapp/gemini" element={<GeminiAI />} />

          {/* AI Settings Routes - Provider Specific */}
          {/* <Route path="/whatsapp/ai-settings/global" element={<GlobalAISettings />} /> REMOVED */}
          <Route path="/whatsapp/ai-settings/gemini" element={<GeminiProviderSettings />} />
          <Route path="/whatsapp/ai-settings/openai" element={<OpenAIProviderSettings />} />
          <Route path="/whatsapp/ai-settings/groq" element={<GroqProviderSettings />} />
          <Route path="/whatsapp/auto-reply-settings" element={<AutoReplySettings />} />


          {/* Legacy route for old AI settings, now points to GeminiProviderSettings as a sensible default if needed, or could be removed. */}
          {/* For now, let's point it to GeminiProviderSettings if someone had it bookmarked. */}
          <Route path="/whatsapp/gemini-settings" element={<GeminiProviderSettings />} />


          <Route path="/whatsapp/blast-message" element={<BlastMessage />} />
          <Route path="/whatsapp/openai-chat" element={<OpenAIChat />} />
          <Route path="/whatsapp/groq-chat" element={<GroqChat />} />

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