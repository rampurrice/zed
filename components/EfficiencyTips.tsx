import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { DocumentArrowUpIcon } from './icons/DocumentArrowUpIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';

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

const tips = [
    {
        icon: <DocumentArrowUpIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />,
        text: "Upload all documents early — the AI becomes smarter as the knowledge base grows.",
    },
    {
        icon: <DocumentTextIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />,
        text: "Use descriptive file names (e.g., Waste_Management_SOP_v2.pdf) for better search and retrieval.",
    },
    {
        icon: <SparklesIcon className="h-6 w-6 text-amber-500 dark:text-amber-400" />,
        text: "Run the chat assistant before drafting reports — it helps refine your questions and improves report accuracy.",
    },
    {
        icon: <ChartBarIcon className="h-6 w-6 text-green-500 dark:text-green-400" />,
        text: "Regularly review the Dashboard to catch delays before they become bottlenecks.",
    },
];

export const EfficiencyTips: React.FC = () => {
    return (
        <motion.div 
            className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border border-slate-200 dark:border-slate-700" 
            variants={itemVariants}
        >
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center">
                <LightBulbIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400" />
                For Maximum Efficiency
            </h3>
            <ul className="space-y-4">
                {tips.map((tip, index) => (
                    <li key={index} className="flex items-start space-x-4">
                        <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
                            {tip.icon}
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm pt-2">
                            {tip.text}
                        </p>
                    </li>
                ))}
            </ul>
        </motion.div>
    );
};