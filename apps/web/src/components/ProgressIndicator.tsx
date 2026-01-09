import React from 'react';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
}

/**
 * Progress indicator component for multi-section forms
 */
export default function ProgressIndicator({
  current,
  total,
  labels,
  className = '',
}: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Progress: {current} of {total} sections
        </span>
        <span className="text-sm text-gray-500">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {labels && labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {labels.map((label, index) => (
            <span
              key={index}
              className={`text-xs px-2 py-1 rounded ${
                index < current
                  ? 'bg-green-100 text-green-800'
                  : index === current
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
