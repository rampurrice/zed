
import React, { useState, useEffect } from 'react';
import { getAnalyticsData } from '../services/ragService';
import type { AnalyticsData } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckBadgeIcon } from './icons/CheckBadgeIcon';

/*
-- Supabase SQL to create the Analytics View --
-- Run this in your Supabase SQL Editor to power the dashboard.

CREATE OR REPLACE VIEW public.vw_project_analytics AS
SELECT
    -- Consultant Load
    c.consultant_name,
    COUNT(p.id) AS active_projects,

    -- Milestone Timings (Example for Baseline to ActionPlan)
    EXTRACT(DAY FROM (p.action_plan_date - p.baseline_date)) AS baseline_to_action_plan_days,

    -- Deadline Compliance
    CASE WHEN p.completion_date <= p.milestone_due_date THEN 1 ELSE 0 END AS met_deadline,

    -- Man-days
    p.planned_man_days,
    p.logged_man_days,

    -- Success Rate
    cl.industry AS sector,
    CASE WHEN p.current_state = 'Completion' THEN 1 ELSE 0 END AS is_successful
FROM
    projects p
LEFT JOIN
    consultants c ON p.consultant_id = c.id
LEFT JOIN
    clients cl ON p.client_id = cl.id
WHERE
    p.is_active = true; -- Or appropriate filter
*/

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
        <div className="bg-primary-100 text-primary-600 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
    </div>
);

export const Dashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
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
        return <div className="p-6 text-center text-slate-500 animate-fade-in">Loading analytics dashboard...</div>
    }

    if (error || !data) {
         return <div className="p-6 text-center text-red-500 animate-fade-in">{error || 'No data available.'}</div>
    }
    
    const deadlineSuccessRate = Math.round((data.deadlineCompliance.onTime / (data.deadlineCompliance.onTime + data.deadlineCompliance.overdue)) * 100);

    return (
        <div className="animate-fade-in space-y-8">
             <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics Dashboard</h1>
                <p className="text-slate-600 mt-1">Key performance indicators for ZED consultancy projects.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Active Projects" value={data.consultantLoad.reduce((sum, c) => sum + c.activeProjects, 0).toString()} icon={<UsersIcon className="h-6 w-6" />} />
                <StatCard title="Deadline Compliance" value={`${deadlineSuccessRate}%`} icon={<CheckBadgeIcon className="h-6 w-6" />} />
                <StatCard title="Man-Days Logged vs Planned" value={`${data.manDaysComparison.totalLogged} / ${data.manDaysComparison.totalPlanned}`} icon={<ClockIcon className="h-6 w-6" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Consultant Workload */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                        <UsersIcon className="h-5 w-5 mr-2 text-primary-600" />
                        Consultant Workload
                    </h3>
                    <div className="space-y-4">
                        {data.consultantLoad.map(consultant => (
                            <div key={consultant.consultantName}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-medium text-slate-700">{consultant.consultantName}</span>
                                    <span className="text-slate-500">{consultant.activeProjects} projects</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${consultant.activeProjects * 10}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Average Time per Milestone */}
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                        <ClockIcon className="h-5 w-5 mr-2 text-primary-600" />
                        Average Time per Milestone
                    </h3>
                    <ul className="space-y-3">
                        {data.milestoneTimings.map(milestone => (
                            <li key={milestone.milestone} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md">
                                <span className="font-medium text-slate-700">{milestone.milestone}</span>
                                <span className="font-bold text-primary-700">{milestone.averageDays} days</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
            {/* Certification Success Rate by Sector */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
                    <ChartBarIcon className="h-5 w-5 mr-2 text-primary-600" />
                    Certification Success Rate by Sector
                </h3>
                 <div className="space-y-4">
                    {data.successRatesBySector.map(sector => (
                        <div key={sector.sector}>
                             <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="font-medium text-slate-700">{sector.sector}</span>
                                <span className="text-slate-500">{sector.successPercentage}% Success</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div className="bg-green-500 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ width: `${sector.successPercentage}%` }}>
                                    {sector.successPercentage}%
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};
