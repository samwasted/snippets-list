import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  HomeIcon, 
  UsersIcon, 
  FolderIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Spaces', href: '/admin/spaces', icon: FolderIcon },
  { name: 'Snippets', href: '/admin/snippets', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={onClose}>
          <div className="fixed inset-0 bg-gray-900/80" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 z-50 flex w-72 flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-xl">
          <div className="flex h-16 shrink-0 items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
            <button
              type="button"
              className="lg:hidden"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`
                            group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                            ${isActive 
                              ? 'bg-gray-50 text-indigo-600' 
                              : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                            }
                          `}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;