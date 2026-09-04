import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateField } from '../components/DateField';

function Wrapper({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  return <DateField label="Flight Date" name="flightDate" required value={value} onChange={setValue} />;
}

describe('DateField', () => {
  it('masks typed digits into DD-MM-YYYY as the user types', async () => {
    render(<Wrapper />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/flight date/i), '12072025');

    expect(screen.getByLabelText(/flight date/i)).toHaveValue('12-07-2025');
  });

  it("opens the calendar on the value's month and fills the input when a day is clicked", async () => {
    render(<Wrapper initialValue="12-07-2025" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /open calendar/i }));
    expect(screen.getByText('July 2025')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '20' }));

    expect(screen.getByLabelText(/flight date/i)).toHaveValue('20-07-2025');
    expect(screen.queryByText('July 2025')).not.toBeInTheDocument();
  });

  it('navigates between months with the previous/next controls', async () => {
    render(<Wrapper initialValue="12-07-2025" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /open calendar/i }));
    expect(screen.getByText('July 2025')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText('August 2025')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /previous month/i }));
    await user.click(screen.getByRole('button', { name: /previous month/i }));
    expect(screen.getByText('June 2025')).toBeInTheDocument();
  });

  it('closes the calendar when clicking outside it', async () => {
    render(
      <div>
        <Wrapper initialValue="12-07-2025" />
        <button type="button">Outside</button>
      </div>
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /open calendar/i }));
    expect(screen.getByText('July 2025')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByText('July 2025')).not.toBeInTheDocument();
  });

  it('lets a digit be typed into the middle of a filled date', async () => {
    render(<Wrapper initialValue="12-07-2025" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText(/flight date/i) as HTMLInputElement;

    await user.type(input, '3', { initialSelectionStart: 1, initialSelectionEnd: 1 });

    expect(input).toHaveValue('13-20-7202');
    expect(input.selectionStart).toBe(2);
  });

  it('deletes the preceding digit when the separator is backspaced', async () => {
    render(<Wrapper initialValue="12-07-2025" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText(/flight date/i) as HTMLInputElement;

    await user.type(input, '{Backspace}', { initialSelectionStart: 3, initialSelectionEnd: 3 });

    expect(input).toHaveValue('10-72-025');
    expect(input.selectionStart).toBe(1);
  });

  it('keeps the caret just after the digit the typist entered', async () => {
    render(<Wrapper initialValue="12-07-2025" />);
    const user = userEvent.setup();
    const input = screen.getByLabelText(/flight date/i) as HTMLInputElement;

    // Typing "9" at index 5 makes the raw value "12-079-2025"; the mask keeps the
    // first 8 digits ("12079202") and re-lays them out, so the caret must land
    // after the 5th digit, which is index 7 of "12-07-9202".
    await user.type(input, '9', { initialSelectionStart: 5, initialSelectionEnd: 5 });

    expect(input).toHaveValue('12-07-9202');
    expect(input.selectionStart).toBe(7);
  });

  it('opens on the current month when the typed year is out of range', async () => {
    render(<Wrapper initialValue="01-01-0001" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /open calendar/i }));

    expect(screen.queryByText(/January 1$/)).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(`\\b${new Date().getFullYear()}\\b`))).toBeInTheDocument();
  });

  it('disables month navigation at the range boundaries', async () => {
    render(<Wrapper initialValue="15-01-2000" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /open calendar/i }));
    expect(screen.getByText('January 2000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /next month/i }));
    expect(screen.getByText('February 2000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeEnabled();
  });

  it('always writes a four-digit year when a day is picked', async () => {
    render(<Wrapper initialValue="15-01-2000" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /open calendar/i }));
    await user.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getByLabelText(/flight date/i)).toHaveValue('03-01-2000');
  });
});
