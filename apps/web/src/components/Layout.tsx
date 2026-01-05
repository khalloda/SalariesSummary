import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import LanguageToggle from './LanguageToggle';
import Tooltip from './Tooltip';
import { tooltips } from '../utils/tooltips';
// Logo path - Vite serves files from public directory at root
const logo = '/logo.png';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const isRTL = i18n.language === 'ar';
  
  const navItems = [
    { path: '/', label: i18n.t('dashboard') },
    { path: '/employees', label: i18n.t('employees') },
    { path: '/reports', label: i18n.t('reports') },
    { path: '/manage/employees', label: i18n.t('management') },
    { path: '/settings/notifications', label: i18n.t('notifications') }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex justify-between items-center h-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
              <img 
                src={logo} 
                alt="Logo" 
                className="h-10 w-auto"
                style={{ [isRTL ? 'marginLeft' : 'marginRight']: '1rem' }}
              />
              <h1 className="text-xl font-semibold">{i18n.t('title')}</h1>
            </div>
            <LanguageToggle />
          </div>
        </div>
        <nav className="bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className={`flex space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
              {navItems.map(item => (
                <Tooltip key={item.path} content={tooltips.navigation[item.path as keyof typeof tooltips.navigation] || item.label}>
                  <Link
                    to={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === item.path
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                </Tooltip>
              ))}
            </div>
          </div>
        </nav>
      </header>
      <main className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${location.pathname.startsWith('/manage/') || location.pathname === '/employees' || location.pathname.startsWith('/reports/') ? 'max-w-full' : 'max-w-7xl'}`}>
        {children}
      </main>
    </div>
  );
}

