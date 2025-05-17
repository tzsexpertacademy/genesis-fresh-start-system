import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Define the interface for submenu items
interface SubMenuItem {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
}

// Define the interface for menu items
interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubMenuItem[];
}

// Define the interface for the props
interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
}

const MobileMenuDrawer: React.FC<MobileMenuDrawerProps> = ({ isOpen, onClose, items }) => {
  const location = useLocation();

  // Check if a path is active
  const isActive = (path: string) => location.pathname === path;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white dark:bg-gray-900 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Menu</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 rounded-md hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-64px)]">
          {/* No authentication buttons needed */}

          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.name}>
                {item.path && (
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-lg ${
                      isActive(item.path)
                        ? 'bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
                    }`}
                    onClick={onClose}
                  >
                    <span className="menu-item-icon-size mr-3 text-gray-500 dark:text-gray-400">
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                    {item.name === "Gemini AI" && (
                      <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-brand-50 text-brand-500 dark:bg-brand-500/[0.15] dark:text-brand-400">
                        new
                      </span>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MobileMenuDrawer;
