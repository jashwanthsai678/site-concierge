export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="animate-spin rounded-full border-2 border-gray-300 border-t-gray-500"
      style={{ width: size, height: size }}
    />
  )
}
