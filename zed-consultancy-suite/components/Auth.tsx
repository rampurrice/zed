import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
// FIX: Import Variants type from framer-motion to resolve type error.
import { motion, AnimatePresence, type Variants } from 'framer-motion';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
        if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) throw error;
            setMessage('Success! Please check your email for the confirmation link to complete your registration.');
        }
    } catch (error: any) {
        setError(error.error_description || error.message);
    } finally {
        setLoading(false);
    }
  };

  // FIX: Explicitly type variants object to prevent TypeScript from inferring 'type' as a broad 'string'.
  const alertVariants: Variants = {
      hidden: { opacity: 0, y: -20, height: 0 },
      visible: { opacity: 1, y: 0, height: 'auto', transition: { type: 'spring', stiffness: 400, damping: 25 } },
      exit: { opacity: 0, y: -20, height: 0, transition: { duration: 0.2 } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-100 dark:border-slate-700 animate-fade-in-scale">
        <div className="text-center">
            <div className="inline-block bg-primary-600 p-3 rounded-xl mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Your Account'}
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            {isLogin ? 'Sign in to access your ZED dashboard.' : 'Get started with the ZED Consultancy Suite.'}
          </p>
        </div>
        
        <form className="space-y-6" onSubmit={handleAuth}>
            <AnimatePresence>
            {error && (
              <motion.div 
                className="flex items-start p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-600/30 overflow-hidden"
                variants={alertVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <AlertTriangleIcon className="h-5 w-5 mr-3 flex-shrink-0 text-red-500" />
                <span>{error}</span>
              </motion.div>
            )}
            {message && (
              <motion.div 
                className="flex items-start p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg border border-green-200 dark:border-green-600/30 overflow-hidden"
                variants={alertVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                 <CheckCircleIcon className="h-5 w-5 mr-3 flex-shrink-0 text-green-500" />
                 <span>{message}</span>
              </motion.div>
            )}
            </AnimatePresence>
            
            <div>
                <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Email address
                </label>
                <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full px-4 py-3 mt-2 text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            
            <div>
                <label htmlFor="password"  className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full px-4 py-3 mt-2 text-slate-900 bg-white dark:text-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            
            <div>
                <motion.button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-300 disabled:cursor-not-allowed transition-colors"
                    whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
                    whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
                >
                    {loading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : null}
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                </motion.button>
            </div>
        </form>
        
        <div className="text-sm text-center">
            <button
                onClick={() => {
                    setIsLogin(!isLogin);
                    setError(null);
                    setMessage(null);
                }}
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 hover:underline focus:outline-none"
                aria-live="polite"
            >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
            </button>
        </div>
      </div>
    </div>
  );
};