
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Notification } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { XMarkIcon } from './icons/XMarkIcon';

const icons = {
  success: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
  error: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
  info: <InformationCircleIcon className="h-6 w-6 text-primary-500" />,
};

interface NotificationProps {
  notification: Notification;
  onDismiss: () => void;
}

export const NotificationComponent: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (notification.duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration]);
  
  const handleAnimationComplete = () => {
    if (!isVisible) {
      onDismiss();
    }
  };

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {isVisible && (
        <motion.div
          layout
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-white dark:bg-slate-800 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-black dark:ring-slate-700 ring-opacity-5"
        >
          <div className="w-0 flex-1 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">{icons[notification.type]}</div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{notification.message}</p>
                 {notification.actions && notification.actions.length > 0 && (
                    <div className="mt-2 flex space-x-3">
                        {notification.actions.map((action, index) => (
                             <button key={index} onClick={() => { action.onClick(); setIsVisible(false); }} className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
                                {action.label}
                            </button>
                        ))}
                    </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex border-l border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsVisible(false)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};