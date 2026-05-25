// components/dashboard/ErrorBanner.tsx
interface ErrorBannerProps {
  message: string | null;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="bg-error-container/80 text-on-error-container font-helper-text text-helper-text text-center py-2 px-4 text-xs border-b border-error/20">
      ⚠ {message}
    </div>
  );
}
