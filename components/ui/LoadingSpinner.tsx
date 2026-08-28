export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <span className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
