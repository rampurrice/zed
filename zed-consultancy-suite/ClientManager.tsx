
import React from 'react';
import type { Client } from '../types';
import { UsersIcon } from './icons/UsersIcon';

interface ClientManagerProps {
  clients: Client[];
}

export const ClientManager: React.FC<ClientManagerProps> = ({ clients }) => {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Client Management</h1>
      <p className="text-slate-600 mt-1 mb-8">View and manage your organization's clients.</p>
      
      <div className="bg-white shadow-lg rounded-xl">
        <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-slate-700 flex items-center">
                <UsersIcon className="h-6 w-6 mr-2 text-primary-600"/>
                All Clients ({clients.length})
            </h3>
        </div>
        {clients.length > 0 ? (
            <ul className="divide-y divide-gray-200">
            {clients.map(client => (
                <li key={client.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    <p className="text-sm text-slate-600">{client.industry}</p>
                </div>
                <div className="text-sm text-right text-slate-500 flex-1">
                    <p className="font-semibold text-slate-800">{client.contact_person}</p>
                    <p>{client.contact_email}</p>
                </div>
                </li>
            ))}
            </ul>
        ) : (
            <div className="p-6 text-center text-slate-500">
                No clients have been added yet.
            </div>
        )}
      </div>
    </div>
  );
};
