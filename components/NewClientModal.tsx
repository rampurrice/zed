import React, { useState, useEffect } from 'react';
import type { Client } from '../types';
// FIX: Import Variants type from framer-motion to resolve type error.
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { MSME_INDUSTRIES } from '../constants';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Client, 'id' | 'user_id'>) => void;
}

const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
};

// FIX: Explicitly type variants object to prevent TypeScript from inferring 'type' as a broad 'string'.
const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 50 },
    visible: { 
        opacity: 1, 
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 } 
    },
    exit: { 
        opacity: 0, 
        scale: 0.95,
        y: -30,
        transition: { duration: 0.2, ease: 'easeOut' }
    }
};

export const NewClientModal: React.FC<NewClientModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setIndustry('');
      setContactPerson('');
      setContactEmail('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !industry.trim()) {
      setError('Client Name and Industry are required.');
      return;
    }
    onSave({
      name,
      industry,
      contact_person: contactPerson,
      contact_email: contactEmail,
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" 
            onClick={onClose}
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700" 
            onClick={e => e.stopPropagation()}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add New Client</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Enter the details for the new client organization.</p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {error && <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-200 text-sm rounded-md border border-red-200 dark:border-red-700/50">{error}</div>}
                <div>
                  <label htmlFor="client-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Client Name <span className="text-red-500">*</span></label>
                  <input type="text" id="client-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm" required />
                </div>
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Industry <span className="text-red-500">*</span></label>
                  <select
                    id="industry"
                    value={industry}
                    onChange={e => setIndustry(e.target.value)}
                    className="mt-1 block w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm"
                    required
                  >
                    <option value="" disabled>Select an Industry</option>
                    {MSME_INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact-person" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contact Person</label>
                  <input type="text" id="contact-person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="mt-1 block w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm" />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contact Email</label>
                  <input type="email" id="contact-email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="mt-1 block w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm" />
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end items-center rounded-b-xl space-x-3 border-t border-slate-200 dark:border-slate-700">
                <motion.button type="button" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg shadow-sm transition-colors">Cancel</motion.button>
                <motion.button type="submit" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} className="bg-primary-600 text-white font-semibold py-2 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition-colors">
                  Save Client
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};