/**
 * Green checkmark icon to show when a field is valid
 * Only displays when field is touched, has no errors, and has a value
 */

interface FieldCheckmarkProps {
  show: boolean;
  className?: string;
}

export default function FieldCheckmark({ show, className = '' }: FieldCheckmarkProps) {
  if (!show) return null;

  return (
    <div className={`absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none ${className}`}>
      <svg
        className="h-5 w-5 text-green-500"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}
