export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-800 p-4 rounded">
      <h3 className="text-gray-400 mb-2">{label}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
