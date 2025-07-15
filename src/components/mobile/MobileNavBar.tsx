import React from 'react';
import { Link, useLocation } from 'react-router-dom';

// Define the interface for menu items
interface MobileMenuItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

// Define the interface for the props
interface MobileNavBarProps {
  items: MobileMenuItem[];
  onMoreClick: () => void;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({ items, onMoreClick }) => {
  const location = useLocation();
  
  // Check if a path is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 lg:hidden">
      <div className="grid grid-cols-5 h-16">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center ${
              isActive(item.path) 
                ? 'text-brand-500 dark:text-brand-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <div className={`menu-item-icon-size ${
              isActive(item.path) 
                ? 'text-brand-500 dark:text-brand-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {item.icon}
            </div>
            <span className="text-xs mt-1">{item.name}</span>
          </Link>
        ))}
        
        {/* More button */}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400"
        >
          <div className="menu-item-icon-size">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </div>
          <span className="text-xs mt-1">More</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNavBar;
