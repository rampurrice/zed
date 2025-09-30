import React from 'react';
import type { Client } from '../types';
import { UsersIcon } from './icons/UsersIcon';
// FIX: Import Variants type from framer-motion to fix type error.
import { motion, type Variants } from 'framer-motion';
import { PlusIcon } from './icons/PlusIcon';

interface ClientManagerProps {
  clients: Client[];
  onAddNewClient: () => void;
}

// FIX: Explicitly type listItemVariants to prevent TypeScript from inferring 'ease' as a broad 'string' type.
const listItemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            delay: i * 0.05,
            duration: 0.3,
            ease: 'easeOut'
        }
    })
};

export const ClientManager: React.FC<ClientManagerProps> = ({ clients, onAddNewClient }) => {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tighter">Client Management</h1>
      <p className="text-slate-600 dark:text-slate-400 mt-2 mb-8 max-w-2xl">View and manage your organization's clients.</p>
      
      <div className="bg-white dark:bg-slate-800 shadow-md rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 flex items-center">
                <UsersIcon className="h-6 w-6 mr-3 text-primary-600 dark:text-primary-400"/>
                All Clients ({clients.length})
            </h3>
            <motion.button
                onClick={onAddNewClient}
                className="inline-flex items-center text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 py-2 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add New Client
            </motion.button>
        </div>
        {clients.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {clients.map((client, index) => (
                <motion.li 
                    key={client.id}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={listItemVariants}
                    className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                    <div className="flex-1 mb-2 sm:mb-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{client.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{client.industry}</p>
                    </div>
                    <div className="text-sm text-left sm:text-right text-slate-500 dark:text-slate-400 flex-1">
                        <p className="font-medium text-slate-800 dark:text-slate-300">{client.contact_person}</p>
                        <p>{client.contact_email}</p>
                    </div>
                </motion.li>
            ))}
            </ul>
        ) : (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">
                No clients have been added yet. Click 'Add New Client' to get started.
            </div>
        )}
      </div>
    </div>
  );
};