/**
 * Shared button component — consistent styling with variant, size, and loading support.
 */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500",
  secondary:
    "bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500",
  ghost:
    "bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white focus:ring-gray-500",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:pointer-events-none disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
