import React from 'react';
import Dropdown from '../ui/dropdown/Dropdown';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  time: string;
  read: boolean;
  message: string;
  icon?: React.ReactNode;
}

const NotificationDropdown: React.FC = () => {
  // Sample notification data
  const notifications: Notification[] = [
    {
      id: '1',
      title: 'New Message',
      time: '1 min ago',
      read: false,
      message: 'You have a new message from Alex',
      icon: (
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-500">
          <svg 
            className="h-4 w-4" 
            fill="none"
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
      ),
    },
    {
      id: '2',
      title: 'Payment Successful',
      time: '2 hours ago',
      read: true,
      message: 'Your payment of $350 has been processed successfully',
      icon: (
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-500">
          <svg 
            className="h-4 w-4" 
            fill="none"
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      ),
    },
    {
      id: '3',
      title: 'System Update',
      time: 'Yesterday',
      read: true,
      message: 'Your system has been updated to the latest version',
      icon: (
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-500">
          <svg 
            className="h-4 w-4" 
            fill="none"
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      ),
    },
  ];

  const notificationTrigger = (
    <button
      type="button"
      className="relative rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
    >
      <span className="sr-only">View notifications</span>
      {/* Notification bell icon */}
      <svg
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      
      {/* Notification badge */}
      {notifications.some(n => !n.read) && (
        <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500 dark:border-gray-900"></div>
      )}
    </button>
  );

  return (
    <Dropdown
      trigger={notificationTrigger}
      position="right"
      width="w-80"
      className="hidden sm:block"
    >
      <div className="px-4 py-2">
        <h6 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
          Notifications
        </h6>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {notifications.filter(n => !n.read).length} New Notifications
        </p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/30 ${
              !notification.read ? 'bg-gray-50 dark:bg-gray-800/60' : ''
            }`}
          >
            {notification.icon && (
              <div className="mr-3 flex-shrink-0">{notification.icon}</div>
            )}
            <div className="w-full pl-1">
              <div className="mb-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                {notification.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {notification.message}
              </div>
              <span className="mt-1 block text-xs font-medium text-blue-600 dark:text-blue-400">
                {notification.time}
              </span>
            </div>
          </div>
        ))}
      </div>
      <Link
        to="/notifications"
        className="block border-t border-gray-200 bg-gray-50 py-2 text-center text-sm font-medium text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
      >
        View all notifications
      </Link>
    </Dropdown>
  );
};

export default NotificationDropdown;
