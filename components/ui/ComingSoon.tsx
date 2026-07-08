import Link from "next/link";

interface Props {
  title: string;
  description?: string;
  backHref?: string;
}

export default function ComingSoon({ title, description, backHref }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">
        🚧
      </div>
      <h2 className="text-xl font-semibold text-slate-700">{title}</h2>
      <p className="text-slate-400 mt-2 text-sm max-w-xs">
        {description ?? "This module is under development and will be available soon."}
      </p>
      {backHref && (
        <Link
          href={backHref}
          className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
        >
          Go back
        </Link>
      )}
    </div>
  );
}
