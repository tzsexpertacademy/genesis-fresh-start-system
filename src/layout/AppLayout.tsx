import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { initSSE, closeSSE } from "../services/sseService";
import MobileNavBar from "../components/mobile/MobileNavBar";
import MobileMenuDrawer from "../components/mobile/MobileMenuDrawer";
import {
  GridIcon,
  PlugInIcon,
  GeminiIcon,
  BoxCubeIcon,
  PageIcon,
  CalenderIcon,
  UserCircleIcon,
  DollarLineIcon,
  DocsIcon, // Added for Logs
  TimeIcon, // Added for Schedule Message
  ListIcon, // Corrected import path will be implicitly handled by changing the source
} from "../icons"; // Corrected path from ../../icons to ../icons

// Define mobile bottom navigation items with icons
const bottomNavItems = [
  {
    name: "Dashboard",
    icon: <GridIcon />,
    path: "/whatsapp/dashboard"
  },
  {
    name: "Send",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    path: "/whatsapp/send-message"
  },
  {
    name: "Inbox",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    path: "/whatsapp/inbox"
  },
  {
    name: "AI Chat", // Generic name for AI chats
    icon: <GeminiIcon />, // Using GeminiIcon as a placeholder for AI chats
    path: "/whatsapp/gemini" // Default to Gemini, user can navigate to others from More menu
  }
];

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add('app-layout-ready');
    initSSE();
    return () => {
      document.body.classList.remove('app-layout-ready');
      closeSSE();
    };
  }, []);

  // Updated and reordered mobileMenuItems for the drawer
  const mobileMenuItems = [
    // Menu Utama
    { icon: <GridIcon />, name: "Dashboard", path: "/whatsapp/dashboard" },
    { icon: <BoxCubeIcon />, name: "Send Message", path: "/whatsapp/send-message" },
    { icon: <PageIcon />, name: "Send Media", path: "/whatsapp/send-media" },
    { icon: <CalenderIcon />, name: "Inbox", path: "/whatsapp/inbox" },
    { icon: <UserCircleIcon />, name: "Contacts", path: "/whatsapp/contacts" },
    { icon: <DollarLineIcon />, name: "Blast Message", path: "/whatsapp/blast-message" },
    { icon: <PlugInIcon />, name: "Contact Categories", path: "/whatsapp/contact-categories" },
    { icon: <ListIcon />, name: "Manage Items", path: "/whatsapp/manage-items" },
    { icon: <TimeIcon />, name: "Schedule Message", path: "/whatsapp/schedule-message" }, // Added Schedule Message
    { icon: <DocsIcon />, name: "Logs", path: "/whatsapp/logs" }, // Added Logs

    // Menu AI
    { icon: <PlugInIcon />, name: "Auto Reply WA", path: "/whatsapp/auto-reply-settings" },
    { icon: <GeminiIcon />, name: "Gemini Settings", path: "/whatsapp/ai-settings/gemini" },
    { icon: <PlugInIcon />, name: "OpenAI Settings", path: "/whatsapp/ai-settings/openai" },
    { icon: <PlugInIcon />, name: "Groq Settings", path: "/whatsapp/ai-settings/groq" },
    { icon: <GeminiIcon />, name: "Gemini AI Chat", path: "/whatsapp/gemini", isNew: true },
    { icon: <PlugInIcon />, name: "OpenAI Chat", path: "/whatsapp/openai-chat", isNew: true },
    { icon: <PlugInIcon />, name: "Groq Chat", path: "/whatsapp/groq-chat", isNew: true },

    // Lainnya
    { icon: <PlugInIcon />, name: "QR Login", path: "/whatsapp/login" }, // Changed icon for differentiation
    { icon: <PageIcon />, name: "Old General Settings", path: "/whatsapp/settings" },
  ];

  return (
    <div className="min-h-screen xl:flex pb-16 lg:pb-0">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-[1536px] md:p-6">
          <Outlet />
        </div>
      </div>
      <MobileNavBar
        items={bottomNavItems}
        onMoreClick={() => setIsMoreMenuOpen(true)}
      />
      <MobileMenuDrawer
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        items={mobileMenuItems}
      />
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;