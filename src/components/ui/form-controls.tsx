import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Select Field
// Native select with design system styling
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
}

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className, children, placeholder, disabled, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          data-slot="select"
          disabled={disabled}
          className={cn(
            // Base
            "h-9 w-full appearance-none rounded-lg border border-input bg-transparent",
            "pl-3 pr-9 py-1 text-sm transition-colors outline-none",
            // States
            "hover:border-ring/60",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-input/50",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            // Dark
            "dark:bg-input/30",
            // Placeholder color when empty
            "text-foreground [&>option[disabled]]:text-muted-foreground",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>

        {/* Chevron icon */}
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  }
);
SelectField.displayName = "SelectField";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Checkbox Field
// Styled checkbox with label and optional description
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckboxFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  description?: string;
}

const CheckboxField = React.forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ className, label, description, id, disabled, ...props }, ref) => {
    const inputId = id ?? React.useId();
    const descId = description ? `${inputId}-desc` : undefined;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex items-start gap-3 cursor-pointer group",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
      >
        {/* Checkbox */}
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            aria-describedby={descId}
            className={cn(
              "peer h-4 w-4 appearance-none rounded-sm border border-input",
              "bg-transparent transition-all duration-150",
              "checked:bg-brand-500 checked:border-brand-500",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
              "hover:border-ring/60",
              "disabled:cursor-not-allowed",
              "indeterminate:bg-brand-500/40 indeterminate:border-brand-500/60",
            )}
            {...props}
          />
          {/* Checkmark SVG overlay */}
          <svg
            className="pointer-events-none absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Label + description */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-foreground leading-tight">
            {label}
          </span>
          {description && (
            <span id={descId} className="text-xs text-muted-foreground leading-snug">
              {description}
            </span>
          )}
        </div>
      </label>
    );
  }
);
CheckboxField.displayName = "CheckboxField";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Radio Group Field
// Accessible radio buttons with label and description
// ─────────────────────────────────────────────────────────────────────────────

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupFieldProps extends Omit<React.HTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  legend?: string;
  options: RadioOption[];
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  orientation?: "vertical" | "horizontal";
  /** Card-style radio buttons */
  card?: boolean;
}

function RadioGroupField({
  legend,
  options,
  name,
  value,
  onChange,
  orientation = "vertical",
  card = false,
  className,
  ...props
}: RadioGroupFieldProps) {
  return (
    <fieldset
      data-slot="radio-group"
      className={cn("border-none p-0 m-0", className)}
      {...props}
    >
      {legend && (
        <legend className="mb-2 text-sm font-medium text-foreground">
          {legend}
        </legend>
      )}
      <div
        role="radiogroup"
        className={cn(
          orientation === "horizontal"
            ? "flex flex-wrap gap-3"
            : "flex flex-col gap-2"
        )}
      >
        {options.map((option) => (
          <RadioOption
            key={option.value}
            option={option}
            name={name}
            checked={value === option.value}
            card={card}
            onChange={onChange}
          />
        ))}
      </div>
    </fieldset>
  );
}

function RadioOption({
  option,
  name,
  checked,
  card,
  onChange,
}: {
  option: RadioOption;
  name: string;
  checked: boolean;
  card?: boolean;
  onChange?: (value: string) => void;
}) {
  const id = `${name}-${option.value}`;

  if (card) {
    return (
      <label
        htmlFor={id}
        className={cn(
          "flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer",
          "transition-all duration-150",
          checked
            ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/30"
            : "border-border/60 bg-transparent hover:border-border hover:bg-muted/30",
          option.disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="radio"
          id={id}
          name={name}
          value={option.value}
          checked={checked}
          disabled={option.disabled}
          onChange={() => onChange?.(option.value)}
          className="sr-only"
        />
        {/* Radio indicator */}
        <div className={cn(
          "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          checked ? "border-brand-500" : "border-input"
        )}>
          {checked && (
            <div className="w-2 h-2 rounded-full bg-brand-500" />
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{option.label}</span>
          {option.description && (
            <span className="text-xs text-muted-foreground">{option.description}</span>
          )}
        </div>
      </label>
    );
  }

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-2.5 cursor-pointer group",
        option.disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          type="radio"
          id={id}
          name={name}
          value={option.value}
          checked={checked}
          disabled={option.disabled}
          onChange={() => onChange?.(option.value)}
          className={cn(
            "peer h-4 w-4 appearance-none rounded-full border border-input",
            "transition-all duration-150",
            "checked:border-brand-500",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            "hover:border-ring/60"
          )}
        />
        {/* Inner dot */}
        <div className="pointer-events-none absolute w-2 h-2 rounded-full bg-brand-500 opacity-0 peer-checked:opacity-100 transition-opacity" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground leading-tight">
          {option.label}
        </span>
        {option.description && (
          <span className="text-xs text-muted-foreground">{option.description}</span>
        )}
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Switch Field
// Toggle switch with label and description
// ─────────────────────────────────────────────────────────────────────────────

export interface SwitchFieldProps {
  id?: string;
  label?: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  labelPosition?: "left" | "right";
}

const switchTrackSizes = {
  sm: "w-8 h-4",
  md: "w-10 h-5",
  lg: "w-12 h-6",
};

const switchThumbSizes = {
  sm: "w-3 h-3 data-[checked]:translate-x-4",
  md: "w-4 h-4 data-[checked]:translate-x-5",
  lg: "w-5 h-5 data-[checked]:translate-x-6",
};

function SwitchField({
  id,
  label,
  description,
  checked = false,
  onCheckedChange,
  disabled = false,
  size = "md",
  className,
  labelPosition = "right",
}: SwitchFieldProps) {
  const inputId = id ?? React.useId();
  const descId = description ? `${inputId}-desc` : undefined;

  const toggle = (
    <button
      type="button"
      id={inputId}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-describedby={descId}
      disabled={disabled}
      data-checked={checked ? "" : undefined}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent",
        "transition-colors duration-200 cursor-pointer",
        "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        checked ? "bg-brand-500" : "bg-input",
        switchTrackSizes[size]
      )}
    >
      <span
        aria-hidden="true"
        data-checked={checked ? "" : undefined}
        className={cn(
          "pointer-events-none absolute left-0.5 block rounded-full bg-white shadow-sm",
          "transition-transform duration-200 ease-in-out",
          switchThumbSizes[size]
        )}
      />
    </button>
  );

  if (!label) return toggle;

  const labelEl = (
    <div className="flex flex-col gap-0.5 min-w-0">
      <label
        htmlFor={inputId}
        className={cn(
          "text-sm font-medium text-foreground leading-tight cursor-pointer",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        {label}
      </label>
      {description && (
        <span id={descId} className="text-xs text-muted-foreground">
          {description}
        </span>
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-3",
        labelPosition === "left" && "flex-row-reverse justify-between",
        className
      )}
    >
      {labelPosition === "right" && toggle}
      {labelEl}
      {labelPosition === "left" && toggle}
    </div>
  );
}

export {
  SelectField,
  CheckboxField,
  RadioGroupField,
  SwitchField,
};
