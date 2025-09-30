import React, { useState } from 'react';
import { verifyUdyamNumber } from '../services/ragService';
import type { Project } from '../types';

interface UdyamVerificationProps {
    project: Project;
    onVerificationSuccess: (updatedProject: Project) => void;
}

export const UdyamVerification: React.FC<UdyamVerificationProps> = ({ project, onVerificationSuccess }) => {
    const [udyamNumber, setUdyamNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleVerify = async () => {
        if (!udyamNumber.trim()) {
            setError('Please enter a UDYAM number.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const result = await verifyUdyamNumber(project.id, udyamNumber);
            setSuccessMessage(result.message);
            onVerificationSuccess(result.project);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (project.has_udyam_check) {
         return (
             <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-sm rounded-md border border-green-200 dark:border-green-700/50">
                UDYAM number <strong>{project.udyam_number}</strong> successfully verified.
             </div>
         );
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter the client's UDYAM registration number for live verification. e.g., <code>UDYAM-MH-18-0000001</code>.
            </p>
            <div className="flex items-start space-x-2">
                <input
                    type="text"
                    value={udyamNumber}
                    onChange={(e) => setUdyamNumber(e.target.value.toUpperCase())}
                    placeholder="UDYAM-XX-00-0000000"
                    className="flex-grow bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm"
                    disabled={isLoading}
                />
                <button
                    onClick={handleVerify}
                    disabled={isLoading || !udyamNumber.trim()}
                    className="bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none disabled:bg-slate-400"
                >
                    {isLoading ? 'Verifying...' : 'Verify'}
                </button>
            </div>
             {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
             {successMessage && <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>}
        </div>
    );
};
