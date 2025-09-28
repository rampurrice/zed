import React, { useState, useEffect } from 'react';
import { getAnalyticsData } from '../services/ragService';
import type { AnalyticsData } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';
// FIX: Import Variants type from framer-motion to resolve type error.
import { motion, type Variants } from 'framer-motion';

// FIX: Explicitly type variants object to prevent TypeScript from inferring 'ease' as a broad 'string'.
const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
    },
};

// FIX: Explicitly type variants object to prevent TypeScript from inferring 'ease' as a broad 'string'.
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: 'easeOut',
        },
    },
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <motion.div 
      className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md flex items-center space-x-4 border border-slate-200 dark:border-slate-700"
      variants={itemVariants}
    >
        <div className="bg-primary-100 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
    </motion.div>
);

export const Dashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const result = await getAnalyticsData();
                setData(result);
            } catch (err: any) {
                setError(err.message || 'Failed to fetch analytics data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return <div className="p-6 text-center text-slate-500 dark:text-slate-400 animate-fade-in">Loading analytics dashboard...</div>
    }

    if (error || !data) {
         return <div className="p-6 text-center text-red-500 dark:text-red-400 animate-fade-in">{error || 'No data available.'}</div>
    }
    
    const deadlineSuccessRate = Math.round((data.deadlineCompliance.onTime / (data.deadlineCompliance.onTime + data.deadlineCompliance.overdue)) * 100);

    return (
        <motion.div 
            className="space-y-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
             <motion.div variants={itemVariants}>
                <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tighter">Analytics Dashboard</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Key performance indicators for ZED consultancy projects.</p>
            </motion.div>

            <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
            >
                <StatCard title="Total Active Projects" value={data.consultantLoad.reduce((sum, c) => sum + c.activeProjects, 0).toString()} icon={<UsersIcon className="h-6 w-6" />} />
                <StatCard title="Deadline Compliance" value={`${deadlineSuccessRate}%`} icon={<CheckBadgeIcon className="h-6 w-6" />} />
                <StatCard title="Man-Days Logged vs Planned" value={`${data.manDaysComparison.totalLogged} / ${data.manDaysComparison.totalPlanned}`} icon={<ClockIcon className="h-6 w-6" />} />
            </motion.div>

            <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-8" variants={containerVariants}>
                {/* Consultant Workload */}
                <motion.div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700" variants={itemVariants}>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                        <UsersIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        Consultant Workload
                    </h3>
                    <div className="space-y-4">
                        {data.consultantLoad.map(consultant => (
                            <div key={consultant.consultantName}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-medium text-slate-700 dark:text-slate-300">{consultant.consultantName}</span>
                                    <span className="text-slate-500 dark:text-slate-400">{consultant.activeProjects} projects</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${consultant.activeProjects * 10}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Average Time per Milestone */}
                <motion.div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700" variants={itemVariants}>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                        <ClockIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                        Average Time per Milestone
                    </h3>
                    <ul className="space-y-3">
                        {data.milestoneTimings.map(milestone => (
                            <li key={milestone.milestone} className="flex justify-between items-center text-sm p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{milestone.milestone}</span>
                                <span className="font-bold text-primary-700 dark:text-primary-400">{milestone.averageDays} days</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </motion.div>
            
            {/* Certification Success Rate by Sector */}
            <motion.div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700" variants={itemVariants}>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                    Certification Success Rate by Sector
                </h3>
                 <div className="space-y-4">
                    {data.successRatesBySector.map(sector => (
                        <div key={sector.sector}>
                             <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{sector.sector}</span>
                                <span className="text-slate-500 dark:text-slate-400">{sector.successPercentage}% Success</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                                <div className="bg-green-500 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ width: `${sector.successPercentage}%` }}>
                                    {sector.successPercentage}%
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
            </motion.div>
        </motion.div>
    );
};