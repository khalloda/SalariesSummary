import React, { useState, useEffect } from 'react';
import { formatNumber, parseFormattedNumber } from '../utils/formatting';

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string;
  onChange: (value: number) => void;
  decimals?: number;
  showHelper?: boolean;
}

/**
 * Number input that displays formatted value (with thousand separators)
 * but stores and emits raw numeric value
 */
export default function FormattedNumberInput({
  value,
  onChange,
  decimals = 2,
  showHelper = true,
  className = '',
  ...props
}: FormattedNumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Initialize display value
  useEffect(() => {
    if (!isFocused) {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      setDisplayValue(num && !isNaN(num) ? formatNumber(num, decimals) : '');
    }
  }, [value, decimals, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Show raw number while editing
    const num = typeof value === 'string' ? parseFloat(value) : value;
    setDisplayValue(num && !isNaN(num) ? String(num) : '');
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Parse and format on blur
    const parsed = parseFormattedNumber(displayValue);
    onChange(parsed);
    setDisplayValue(parsed ? formatNumber(parsed, decimals) : '');
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    // Emit parsed value for real-time updates if needed
    const parsed = parseFormattedNumber(inputValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
      />
      {showHelper && value && !isFocused && (
        <p className="mt-1 text-xs text-gray-500">
          {formatNumber(typeof value === 'string' ? parseFloat(value) : value, decimals)} EGP
        </p>
      )}
    </div>
  );
}
