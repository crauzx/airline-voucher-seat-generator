interface SeatResultProps {
  seats: string[];
}

export function SeatResult({ seats }: SeatResultProps) {
  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
      <p className="text-sm font-medium text-emerald-800">Vouchers generated successfully</p>
      <div className="mt-2 flex gap-3">
        {seats.map((seat) => (
          <span
            key={seat}
            className="rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white"
          >
            {seat}
          </span>
        ))}
      </div>
    </div>
  );
}
