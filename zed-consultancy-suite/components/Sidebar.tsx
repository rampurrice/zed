import React from 'react';
import { HomeIcon } from './icons/HomeIcon';
import { UsersIcon } from './icons/UsersIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { ChevronDoubleLeftIcon } from './icons/ChevronDoubleLeftIcon';
import type { Page } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItemProps {
    icon: React.ReactNode;
    label: Page;
    active?: boolean;
    onClick: () => void;
    isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isCollapsed }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors text-left ${
        isCollapsed ? 'justify-center' : ''
      } ${
        active
          ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      {icon}
      <AnimatePresence>
      {!isCollapsed && (
          <motion.span 
              className="ml-3 overflow-hidden whitespace-nowrap"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
              {label}
          </motion.span>
      )}
      </AnimatePresence>
    </button>
    {isCollapsed && (
        <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-100 text-xs font-medium rounded-lg whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
            {label}
        </div>
    )}
  </div>
);

interface SidebarProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
}

const sidebarVariants = {
    open: { width: '16rem' }, // 256px
    collapsed: { width: '5rem' }, // 80px
};

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage, isCollapsed, setIsCollapsed }) => {
  return (
    <motion.aside 
        className="bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex flex-col justify-between"
        variants={sidebarVariants}
        animate={isCollapsed ? 'collapsed' : 'open'}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
        <nav className="space-y-2 p-4">
            <NavItem 
                icon={<HomeIcon className="h-5 w-5 flex-shrink-0" />} 
                label="Dashboard" 
                active={currentPage === 'Dashboard'} 
                onClick={() => setCurrentPage('Dashboard')}
                isCollapsed={isCollapsed}
            />
            <NavItem 
                icon={<UsersIcon className="h-5 w-5 flex-shrink-0" />} 
                label="Clients" 
                active={currentPage === 'Clients'}
                onClick={() => setCurrentPage('Clients')}
                isCollapsed={isCollapsed}
            />
            <NavItem 
                icon={<DocumentTextIcon className="h-5 w-5 flex-shrink-0" />} 
                label="New Assessment" 
                active={currentPage === 'New Assessment'}
                onClick={() => setCurrentPage('New Assessment')}
                isCollapsed={isCollapsed}
            />
            <NavItem 
                icon={<ClipboardDocumentListIcon className="h-5 w-5 flex-shrink-0" />} 
                label="Projects" 
                active={currentPage === 'Projects'}
                onClick={() => setCurrentPage('Projects')}
                isCollapsed={isCollapsed}
            />
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-slate-800">
             <div className="relative group">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${isCollapsed ? 'justify-center' : ''}`}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
                        <ChevronDoubleLeftIcon className="h-5 w-5 flex-shrink-0" />
                    </motion.div>
                    <AnimatePresence>
                    {!isCollapsed && (
                        <motion.span 
                            className="ml-3 overflow-hidden whitespace-nowrap"
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                        >
                            Collapse
                        </motion.span>
                    )}
                    </AnimatePresence>
                </button>
                 {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-100 text-xs font-medium rounded-lg whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
                        Expand
                    </div>
                )}
            </div>
        </div>
    </motion.aside>
  );
};