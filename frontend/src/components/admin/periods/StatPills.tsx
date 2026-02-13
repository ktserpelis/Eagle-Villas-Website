function Pill({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${className}`}>
      {label}: {value}
    </span>
  );
}

export default function StatPills({ total, open, closed }: { total: number; open: number; closed: number }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <Pill label="Total" value={total} className="bg-slate-100 text-slate-700" />
      <Pill label="Open" value={open} className="bg-green-100 text-green-700" />
      <Pill label="Closed" value={closed} className="bg-slate-200 text-slate-700" />
    </div>
  );
}
