import React from 'react';
import type { PipelineProgress } from '../types';

interface PipelineProgressModalProps {
  isOpen: boolean;
  progress: PipelineProgress;
  onClose?: () => void;
  onCancel?: () => void;
}

export const PipelineProgressModal: React.FC<PipelineProgressModalProps> = ({
  isOpen,
  progress,
  onClose,
  onCancel,
}) => {
  if (!isOpen) return null;

  const formatTime = (ms?: number): string => {
    if (!ms) return 'Calculating...';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-2xl font-bold text-brand-blue mb-4">Processing Episode Images</h2>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{progress.currentStepName}</span>
            <span>{progress.currentStep} / {progress.totalSteps}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-brand-blue h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>

        {progress.estimatedTimeRemaining !== undefined && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Estimated time remaining: {formatTime(progress.estimatedTimeRemaining)}</span>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand-blue hover:bg-brand-purple text-white rounded transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

