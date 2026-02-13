export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
      {message}
    </div>
  );
}
