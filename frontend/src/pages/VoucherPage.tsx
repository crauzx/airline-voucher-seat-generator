import { VoucherForm } from '../components/VoucherForm';

export function VoucherPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Airline Voucher Seat Assignment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter flight and crew details to generate 3 random voucher seats.
        </p>
      </div>
      <VoucherForm />
    </main>
  );
}
