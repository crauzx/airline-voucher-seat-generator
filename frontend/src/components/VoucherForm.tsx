import { FormEvent, useState } from 'react';
import { FormField } from './FormField';
import { DateField } from './DateField';
import { SeatResult } from './SeatResult';
import { ErrorBanner } from './ErrorBanner';
import { AIRCRAFT_OPTIONS, AircraftType } from '../types/api';
import { VoucherFormValues, FormErrors, validateForm } from '../utils/validateForm';
import { convertDisplayDateToIso } from '../utils/date';
import { checkVoucher } from '../api/checkVoucher';
import { generateVoucher } from '../api/generateVoucher';
import { ApiRequestError } from '../api/client';

const initialValues: VoucherFormValues = {
  crewName: '',
  crewId: '',
  flightNumber: '',
  flightDate: '',
  aircraft: '',
};

export function VoucherForm() {
  const [values, setValues] = useState<VoucherFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [seats, setSeats] = useState<string[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof VoucherFormValues>(field: K, value: VoucherFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Seats and API errors belong to the values that were submitted. Once any field
    // moves, they no longer describe what is on screen.
    setSeats(null);
    setApiError(null);
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);
    setSeats(null);

    const errors = validateForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const isoDate = convertDisplayDateToIso(values.flightDate);
    if (!isoDate) return;

    setIsSubmitting(true);
    try {
      const checkResult = await checkVoucher({
        flightNumber: values.flightNumber.trim(),
        date: isoDate,
      });

      if (checkResult.exists) {
        setApiError(
          `Vouchers have already been generated for flight ${values.flightNumber.trim()} on ${values.flightDate}.`
        );
        return;
      }

      const generateResult = await generateVoucher({
        name: values.crewName.trim(),
        id: values.crewId.trim(),
        flightNumber: values.flightNumber.trim(),
        date: isoDate,
        aircraft: values.aircraft as AircraftType,
      });

      setSeats(generateResult.seats);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setApiError(error.message);
      } else {
        setApiError('Unable to reach the server. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <FormField
        label="Crew Name"
        name="crewName"
        required
        value={values.crewName}
        error={fieldErrors.crewName}
        onChange={(value) => updateField('crewName', value)}
      />
      <FormField
        label="Crew ID"
        name="crewId"
        required
        value={values.crewId}
        error={fieldErrors.crewId}
        onChange={(value) => updateField('crewId', value)}
      />
      <FormField
        label="Flight Number"
        name="flightNumber"
        required
        placeholder="e.g. GA102"
        value={values.flightNumber}
        error={fieldErrors.flightNumber}
        onChange={(value) => updateField('flightNumber', value.toUpperCase())}
      />
      <DateField
        label="Flight Date"
        name="flightDate"
        required
        value={values.flightDate}
        error={fieldErrors.flightDate}
        onChange={(value) => updateField('flightDate', value)}
      />
      <FormField
        type="select"
        label="Aircraft Type"
        name="aircraft"
        required
        options={AIRCRAFT_OPTIONS}
        value={values.aircraft}
        error={fieldErrors.aircraft}
        onChange={(value) => updateField('aircraft', value as AircraftType)}
      />

      {apiError && <ErrorBanner message={apiError} />}
      {seats && <SeatResult seats={seats} />}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Generating...' : 'Generate Vouchers'}
      </button>
    </form>
  );
}
