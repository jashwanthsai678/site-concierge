export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="animate-spin rounded-full border-2 border-white/20 border-t-white/80"
      style={{ width: size, height: size }}
    />
  )
}
