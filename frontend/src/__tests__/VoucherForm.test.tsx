import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VoucherForm } from '../components/VoucherForm';
import { checkVoucher } from '../api/checkVoucher';
import { generateVoucher } from '../api/generateVoucher';
import { ApiRequestError } from '../api/client';

vi.mock('../api/checkVoucher');
vi.mock('../api/generateVoucher');

const mockedCheckVoucher = vi.mocked(checkVoucher);
const mockedGenerateVoucher = vi.mocked(generateVoucher);

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/crew name/i), 'Sarah');
  await user.type(screen.getByLabelText(/crew id/i), '98123');
  await user.type(screen.getByLabelText(/flight number/i), 'ID102');
  await user.type(screen.getByLabelText(/flight date/i), '12072025');
  await user.selectOptions(screen.getByLabelText(/aircraft type/i), 'AIRBUS_320');
  return user;
}

describe('VoucherForm', () => {
  beforeEach(() => {
    mockedCheckVoucher.mockReset();
    mockedGenerateVoucher.mockReset();
  });

  it('generates and displays seats when no voucher exists yet', async () => {
    mockedCheckVoucher.mockResolvedValue({ exists: false });
    mockedGenerateVoucher.mockResolvedValue({ success: true, seats: ['3B', '7C', '14D'] });

    render(<VoucherForm />);
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /generate vouchers/i }));

    await waitFor(() => {
      expect(screen.getByText('3B')).toBeInTheDocument();
    });
    expect(screen.getByText('7C')).toBeInTheDocument();
    expect(screen.getByText('14D')).toBeInTheDocument();
    expect(mockedGenerateVoucher).toHaveBeenCalledWith(
      expect.objectContaining({
        flightNumber: 'ID102',
        date: '2025-07-12',
        aircraft: 'AIRBUS_320',
      })
    );
  });

  it('shows a duplicate error and does not call generate when a voucher already exists', async () => {
    mockedCheckVoucher.mockResolvedValue({ exists: true });

    render(<VoucherForm />);
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /generate vouchers/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already been generated/i);
    });
    expect(mockedGenerateVoucher).not.toHaveBeenCalled();
  });

  it('shows client-side validation errors and does not call the API when a required field is empty', async () => {
    render(<VoucherForm />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /generate vouchers/i }));

    expect(await screen.findByText(/crew name is required/i)).toBeInTheDocument();
    expect(mockedCheckVoucher).not.toHaveBeenCalled();
    expect(mockedGenerateVoucher).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as that field is edited', async () => {
    render(<VoucherForm />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /generate vouchers/i }));

    const crewNameError = await screen.findByText(/crew name is required/i);
    expect(crewNameError).toBeInTheDocument();
    expect(screen.getByText(/crew id is required/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/crew name/i), 'S');

    expect(screen.queryByText(/crew name is required/i)).not.toBeInTheDocument();
    expect(screen.getByText(/crew id is required/i)).toBeInTheDocument();
  });

  it('shows the generate error message when generate fails after a successful check', async () => {
    mockedCheckVoucher.mockResolvedValue({ exists: false });
    mockedGenerateVoucher.mockRejectedValue(
      new ApiRequestError(
        409,
        'VOUCHER_EXISTS',
        'Vouchers have already been generated for this flight and date'
      )
    );

    render(<VoucherForm />);
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /generate vouchers/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already been generated/i);
    });
  });

  it('clears the generated seats once any field is edited', async () => {
    mockedCheckVoucher.mockResolvedValue({ exists: false });
    mockedGenerateVoucher.mockResolvedValue({ success: true, seats: ['3B', '7C', '14D'] });

    render(<VoucherForm />);
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /generate vouchers/i }));
    await waitFor(() => expect(screen.getByText('3B')).toBeInTheDocument());

    await user.clear(screen.getByLabelText(/flight number/i));
    await user.type(screen.getByLabelText(/flight number/i), 'ZZ999');

    expect(screen.queryByText('3B')).not.toBeInTheDocument();
    expect(screen.queryByText('7C')).not.toBeInTheDocument();
    expect(screen.queryByText('14D')).not.toBeInTheDocument();
  });

  it('clears the duplicate error once the flight number is edited', async () => {
    mockedCheckVoucher.mockResolvedValue({ exists: true });

    render(<VoucherForm />);
    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: /generate vouchers/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/already been generated/i)
    );

    await user.type(screen.getByLabelText(/flight number/i), 'X');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
