import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// Assume these icons are imported from an icon library
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  PageIcon,
  PlugInIcon,
  UserCircleIcon,
  DollarLineIcon,
  GeminiIcon,
  WhatsAppIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/whatsapp/dashboard"
  },
  {
    icon: <BoxCubeIcon />,
    name: "Send Message",
    path: "/whatsapp/send-message"
  },
  {
    icon: <PageIcon />,
    name: "Send Media",
    path: "/whatsapp/send-media"
  },
  {
    icon: <CalenderIcon />,
    name: "Inbox",
    path: "/whatsapp/inbox"
  },
  {
    icon: <UserCircleIcon />,
    name: "Contacts",
    path: "/whatsapp/contacts"
  },
  {
    icon: <DollarLineIcon />,
    name: "Blast Message",
    path: "/whatsapp/blast-message"
  },
  {
    icon: <PlugInIcon />,
    name: "Contact Categories",
    path: "/whatsapp/contact-categories"
  },
  {
    icon: <PageIcon />,
    name: "Settings",
    path: "/whatsapp/settings"
  },
  {
    icon: <GeminiIcon />,
    name: "Gemini AI",
    path: "/whatsapp/gemini"
  },
  {
    icon: <BoxCubeIcon />,
    name: "QR Login",
    path: "/whatsapp/login"
  },
];

// Empty others items since we're focusing only on WhatsApp Gateway
const othersItems: NavItem[] = [];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
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
              {(isExpanded || isHovered) && nav.name === "Gemini AI" && (
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
                <span className="text-gray-900 dark:text-white"> GEMINI</span>
              </h1>
            </div>
          ) : (
            <WhatsAppIcon className="text-brand-500 dark:text-brand-400 w-6 h-6" />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {isExpanded || isHovered ? (
                  "Menu"
                ) : (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>
            {/* No other menu sections needed */}
          </div>
        </nav>
        {isExpanded || isHovered ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
