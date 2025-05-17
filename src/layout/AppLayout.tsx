import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { initSSE, closeSSE } from "../services/sseService";
import MobileNavBar from "../components/mobile/MobileNavBar";
import MobileMenuDrawer from "../components/mobile/MobileMenuDrawer";
import { GridIcon, PlugInIcon, GeminiIcon } from "../icons";

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
    name: "Gemini AI",
    icon: <GeminiIcon />,
    path: "/whatsapp/gemini"
  }
];

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Simple effect to ensure the layout is properly rendered
  useEffect(() => {
    // Add a class to indicate the layout is ready
    document.body.classList.add('app-layout-ready');

    // Initialize SSE connection for real-time notifications
    initSSE();

    return () => {
      document.body.classList.remove('app-layout-ready');

      // Close SSE connection when component unmounts
      closeSSE();
    };
  }, []);

  // Get the menu items for the More menu
  const mobileMenuItems = [
    {
      icon: <GridIcon />,
      name: "Dashboard",
      path: "/whatsapp/dashboard"
    },
    {
      icon: <PlugInIcon />,
      name: "Send Message",
      path: "/whatsapp/send-message"
    },
    {
      icon: <PlugInIcon />,
      name: "Send Media",
      path: "/whatsapp/send-media"
    },
    {
      icon: <PlugInIcon />,
      name: "Inbox",
      path: "/whatsapp/inbox"
    },
    {
      icon: <PlugInIcon />,
      name: "Contacts",
      path: "/whatsapp/contacts"
    },
    {
      icon: <PlugInIcon />,
      name: "Blast Message",
      path: "/whatsapp/blast-message"
    },
    {
      icon: <PlugInIcon />,
      name: "Contact Categories",
      path: "/whatsapp/contact-categories"
    },
    {
      icon: <PlugInIcon />,
      name: "Settings",
      path: "/whatsapp/settings"
    },
    {
      icon: <GeminiIcon />,
      name: "Gemini AI",
      path: "/whatsapp/gemini"
    },
    {
      icon: <PlugInIcon />,
      name: "QR Login",
      path: "/whatsapp/login"
    },
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

      {/* Mobile Navigation */}
      <MobileNavBar
        items={bottomNavItems}
        onMoreClick={() => setIsMoreMenuOpen(true)}
      />

      {/* Mobile Menu Drawer */}
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
