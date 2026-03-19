/**
 * Skeleton loader — animated placeholder for loading states.
 * Pass Tailwind size classes via className to control dimensions.
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps): React.ReactElement {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-800 ${className}`}
      aria-hidden="true"
    />
  );
}
