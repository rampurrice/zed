
import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Notification } from '../types';
import { NotificationComponent } from '../components/Notification';

interface NotificationContextType {
  addNotification: (message: string, type: Notification['type'], duration?: number, actions?: Notification['actions']) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: Notification['type'], duration = 5000, actions: Notification['actions'] = []) => {
    const id = Date.now().toString() + Math.random().toString();
    setNotifications(prev => [...prev, { id, message, type, duration, actions }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-3 w-full max-w-sm">
        {notifications.map(notification => (
          <NotificationComponent
            key={notification.id}
            notification={notification}
            onDismiss={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};