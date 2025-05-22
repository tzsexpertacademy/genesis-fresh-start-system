import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import {
  BoxCubeIcon,
  CalenderIcon,
  // ChevronDownIcon, // Not used currently
  GridIcon,
  HorizontaLDots,
  PageIcon,
  PlugInIcon,
  UserCircleIcon,
  DollarLineIcon,
  GeminiIcon,
  WhatsAppIcon,
  ListIcon, // Added for Manage Items
  // Assuming an icon for Auto-Reply, reusing PlugInIcon for now
  TimeIcon, // Added for Schedule Message
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  // subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[]; // SubItems not used currently
  isNew?: boolean;
};

type NavSection = {
  titleKey: string; // Unique key for the section title
  titleText: string; // Text to display for the section title
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    titleKey: "mainMenu",
    titleText: "Menu Utama",
    items: [
      { icon: <GridIcon />, name: "Dashboard", path: "/whatsapp/dashboard" },
      { icon: <BoxCubeIcon />, name: "Send Message", path: "/whatsapp/send-message" },
      { icon: <PageIcon />, name: "Send Media", path: "/whatsapp/send-media" },
      { icon: <CalenderIcon />, name: "Inbox", path: "/whatsapp/inbox" },
      { icon: <UserCircleIcon />, name: "Contacts", path: "/whatsapp/contacts" },
      { icon: <DollarLineIcon />, name: "Blast Message", path: "/whatsapp/blast-message" },
      { icon: <PlugInIcon />, name: "Contact Categories", path: "/whatsapp/contact-categories" },
      { icon: <ListIcon />, name: "Manage Items", path: "/whatsapp/manage-items" },
      { icon: <TimeIcon />, name: "Schedule Message", path: "/whatsapp/schedule-message" }, // Added Schedule Message
    ],
  },
  {
    titleKey: "aiMenu",
    titleText: "Menu AI",
    items: [
      { icon: <PlugInIcon />, name: "Auto Reply WA", path: "/whatsapp/auto-reply-settings" },
      { icon: <GeminiIcon />, name: "Gemini Settings", path: "/whatsapp/ai-settings/gemini" },
      { icon: <PlugInIcon />, name: "OpenAI Settings", path: "/whatsapp/ai-settings/openai" },
      { icon: <PlugInIcon />, name: "Groq Settings", path: "/whatsapp/ai-settings/groq" },
      { icon: <GeminiIcon />, name: "Gemini AI Chat", path: "/whatsapp/gemini", isNew: true },
      { icon: <PlugInIcon />, name: "OpenAI Chat", path: "/whatsapp/openai-chat", isNew: true },
      { icon: <PlugInIcon />, name: "Groq Chat", path: "/whatsapp/groq-chat", isNew: true },
    ],
  },
  {
    titleKey: "otherMenu",
    titleText: "Lainnya",
    items: [
      { icon: <BoxCubeIcon />, name: "QR Login", path: "/whatsapp/login" },
      { icon: <PageIcon />, name: "Old General Settings", path: "/whatsapp/settings" },
    ],
  },
];


const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => {
      if (path.startsWith("/whatsapp/ai-settings") && location.pathname.startsWith("/whatsapp/ai-settings")) {
        return true; // Highlight any AI settings link if on any AI settings page
      }
      if (path === "/whatsapp/auto-reply-settings" && location.pathname === "/whatsapp/auto-reply-settings") {
        return true;
      }
      return location.pathname === path;
    },
    [location.pathname]
  );

  const renderNavItemsList = (items: NavItem[]) => (
    <ul className="flex flex-col gap-1.5"> {/* Reduced gap for items within a section */}
      {items.map((nav) => (
        <li key={nav.name}>
          {nav.path && (
            <Link
              to={nav.path}
              className={`menu-item group ${
                isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
              }`}
            >
              <span
                className={`menu-item-icon-size ${
                  isActive(nav.path)
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered) && (
                <span className="menu-item-text">{nav.name}</span>
              )}
              {(isExpanded || isHovered) && nav.isNew && (
                <span className="ml-auto text-xs font-medium text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-full px-2 py-0.5">
                  new
                </span>
              )}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 hidden lg:flex`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/">
          {isExpanded || isHovered ? (
            <div className="flex items-center gap-2">
              <WhatsAppIcon className="text-brand-500 dark:text-brand-400 w-6 h-6" />
              <h1 className="text-xl font-bold tracking-tight uppercase">
                <span className="text-brand-500 dark:text-brand-400">WA</span>
                <span className="text-gray-900 dark:text-white"> AI HUB</span>
              </h1>
            </div>
          ) : (
            <WhatsAppIcon className="text-brand-500 dark:text-brand-400 w-6 h-6" />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4"> {/* Gap between sections */}
            {navSections.map((section) => (
              section.items.length > 0 && ( // Only render section if it has items
                <div key={section.titleKey}>
                  <h2
                    className={`mb-2 text-xs uppercase flex leading-[20px] text-gray-400 ${ // Reduced bottom margin for section title
                      !isExpanded && !isHovered
                        ? "lg:justify-center"
                        : "justify-start"
                    }`}
                  >
                    {isExpanded || isHovered ? (
                      section.titleText
                    ) : (
                      <HorizontaLDots className="size-6" />
                    )}
                  </h2>
                  {renderNavItemsList(section.items)}
                </div>
              )
            ))}
          </div>
        </nav>
        {(isExpanded || isHovered) && <SidebarWidget />}
      </div>
    </aside>
  );
};

export default AppSidebar;