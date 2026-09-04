interface BaseProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
}

interface TextFieldProps extends BaseProps {
  type?: 'text';
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}

interface SelectFieldProps extends BaseProps {
  type: 'select';
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

type FormFieldProps = TextFieldProps | SelectFieldProps;

function inputClasses(hasError: boolean): string {
  const base = 'rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500';
  return hasError ? `${base} border-red-400` : `${base} border-slate-300`;
}

export function FormField(props: FormFieldProps) {
  const { label, name, error, required } = props;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      {props.type === 'select' ? (
        <select
          id={name}
          name={name}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className={inputClasses(Boolean(error))}
        >
          <option value="">Select {label}</option>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type="text"
          value={props.value}
          placeholder={props.placeholder}
          maxLength={props.maxLength}
          onChange={(event) => props.onChange(event.target.value)}
          className={inputClasses(Boolean(error))}
        />
      )}

      {error && (
        <span role="alert" className="text-sm text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
