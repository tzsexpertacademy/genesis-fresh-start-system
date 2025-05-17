import React from 'react';
import { Link } from 'react-router-dom';
import { PlugInIcon } from '../../icons';

const UserDropdown: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <Link
        to="/whatsapp/login"
        className="flex items-center justify-center px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-md hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        title="QR Login"
      >
        <PlugInIcon className="w-4 h-4 mr-1" />
        <span className="hidden md:inline">Login</span>
      </Link>
    </div>
  );
};

export default UserDropdown;
