import React, { useState, useCallback, useMemo } from 'react';
import { ZED_PARAMETERS } from '../constants';
import type { AssessmentData, AssessmentInput } from '../types';
import { ZEDParameter } from '../types';
import { motion } from 'framer-motion';

interface AssessmentFormProps {
  onSubmit: (data: Omit<AssessmentData, 'clientName'>) => void;
}

const StarRating: React.FC<{ rating: number; onRate: (rating: number) => void }> = ({ rating, onRate }) => {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          className={`text-3xl transition-colors duration-150 ${
            star <= rating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300 dark:hover:text-amber-500'
          }`}
          aria-label={`Rate ${star} star`}
          whileHover={{ scale: 1.2, y: -2 }}
          whileTap={{ scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          ★
        </motion.button>
      ))}
    </div>
  );
};


const ParameterInput: React.FC<{ parameter: ZEDParameter; value: AssessmentInput; onChange: (value: AssessmentInput) => void; }> = ({ parameter, value, onChange }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{parameter}</h3>
        <StarRating 
            rating={value.rating} 
            onRate={(newRating) => onChange({ ...value, rating: newRating })} 
        />
      </div>
      <textarea
        rows={4}
        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
        placeholder={`Enter observations for ${parameter}...`}
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
      />
    </div>
  );
};

export const AssessmentForm: React.FC<AssessmentFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<Omit<AssessmentData, 'clientName'>>(
    () => ZED_PARAMETERS.reduce((acc, param) => {
      acc[param] = { notes: '', rating: 0 };
      return acc;
    }, {} as Omit<AssessmentData, 'clientName'>)
  );

  const handleInputChange = useCallback((parameter: ZEDParameter, value: AssessmentInput) => {
    setFormData(prev => ({ ...prev, [parameter]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const completionPercentage = useMemo(() => {
    const total = ZED_PARAMETERS.length;
    const completed = ZED_PARAMETERS.filter(param => {
        const item = formData[param];
        return item.notes.trim() !== '' || item.rating > 0;
    }).length;
    return Math.round((completed / total) * 100);
  }, [formData]);


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 sticky top-20 z-10">
          <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Assessment Progress</h3>
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{completionPercentage}% Complete</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
              <motion.div 
                className="bg-primary-600 h-2.5 rounded-full" 
                initial={{ width: 0 }}
                animate={{ width: `${completionPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
          </div>
      </div>
      {ZED_PARAMETERS.map(param => (
        <ParameterInput
          key={param}
          parameter={param}
          value={formData[param]}
          onChange={(value) => handleInputChange(param, value)}
        />
      ))}
      <div className="flex justify-end pt-4">
        <motion.button
          type="submit"
          className="bg-primary-600 text-white font-semibold py-3 px-8 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          Generate AI Analysis
        </motion.button>
      </div>
    </form>
  );
};