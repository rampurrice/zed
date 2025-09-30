import React, { useState, useCallback, useMemo } from 'react';
import { ZED_PARAMETERS } from '../constants';
import type { AssessmentData, AssessmentInput, ParameterInfo } from '../types';
import { ZEDParameter } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Accordion } from './Accordion';
import { getParameterInfo } from '../services/ragService';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';

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
  const [info, setInfo] = useState<ParameterInfo | null>(null);
  const [isInfoLoading, setIsInfoLoading] = useState(false);
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleInfo = async () => {
    if (isInfoVisible) {
      setIsInfoVisible(false);
      return;
    }

    if (info) {
      setIsInfoVisible(true);
      return;
    }

    setIsInfoLoading(true);
    setError(null);
    try {
      const result = await getParameterInfo(parameter);
      setInfo(result);
      setIsInfoVisible(true);
    } catch (err: any) {
      setError(err.message || "Could not load AI insights.");
    } finally {
      setIsInfoLoading(false);
    }
  };
  
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{parameter}</h3>
             <button
                type="button"
                onClick={handleToggleInfo}
                className="text-slate-400 dark:text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                aria-label={`Get more info about ${parameter}`}
            >
                {isInfoLoading ? (
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                <InformationCircleIcon className="w-5 h-5" />
                )}
            </button>
        </div>
        <StarRating 
            rating={value.rating} 
            onRate={(newRating) => onChange({ ...value, rating: newRating })} 
        />
      </div>

       <AnimatePresence>
        {isInfoVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '1rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : info ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic">{info.description}</p>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Typical Compliance Actions:</h4>
                    <ul className="space-y-1.5">
                      {info.complianceActions.map((action, i) => (
                        <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                          <CheckBadgeIcon className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <textarea
        rows={4}
        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 mt-4"
        placeholder={`Enter observations for ${parameter}...`}
        value={value.notes}
        onChange={(e) => onChange({ ...value, notes: e.target.value })}
      />
    </div>
  );
};

const PARAMETER_GROUPS = {
  "Bronze Level (5 Parameters)": Object.values(ZEDParameter).slice(0, 5),
  "Silver Level (Adds 9 Parameters)": Object.values(ZEDParameter).slice(5, 14),
  "Gold Level (Adds 6 Parameters)": Object.values(ZEDParameter).slice(14),
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

      <div className="space-y-4">
        {Object.entries(PARAMETER_GROUPS).map(([groupTitle, params], index) => (
          <Accordion key={groupTitle} title={groupTitle} defaultOpen={index === 0}>
            <div className="space-y-4 pt-4">
              {params.map(param => (
                <ParameterInput
                  key={param}
                  parameter={param}
                  value={formData[param]}
                  onChange={(value) => handleInputChange(param, value)}
                />
              ))}
            </div>
          </Accordion>
        ))}
      </div>
      
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