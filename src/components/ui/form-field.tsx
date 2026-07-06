import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Form Field Wrapper
// Composes any input with label, hint, error, and character count
// ─────────────────────────────────────────────────────────────────────────────

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Unique ID — wired to label `for` and input `id` */
  id: string;
  label?: string;
  /** Required indicator (visual asterisk + aria-required) */
  required?: boolean;
  /** Help text shown below the input */
  hint?: string;
  /** Error message — triggers error styling on child input via aria-invalid */
  error?: string;
  /** Success message */
  success?: string;
  /** Current character count (for textareas) */
  charCount?: number;
  /** Max character count */
  maxChars?: number;
  /** Horizontal layout: label left, input right */
  inline?: boolean;
  /** Visually hide the label (still present for SR) */
  hideLabel?: boolean;
}

function FormField({
  id,
  label,
  required,
  hint,
  error,
  success,
  charCount,
  maxChars,
  inline = false,
  hideLabel = false,
  className,
  children,
  ...props
}: FormFieldProps) {
  const hasError = !!error;
  const hasSuccess = !!success && !hasError;
  const nearLimit = maxChars && charCount !== undefined && charCount > maxChars * 0.85;
  const overLimit = maxChars && charCount !== undefined && charCount > maxChars;

  // Inject aria-invalid and aria-describedby into child inputs
  const enrichedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const describedBy = [
      hint ? `${id}-hint` : null,
      error ? `${id}-error` : null,
      success ? `${id}-success` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return React.cloneElement(child as React.ReactElement<React.HTMLAttributes<HTMLElement> & { "aria-invalid"?: boolean; "aria-describedby"?: string; id?: string }>, {
      id,
      "aria-invalid": hasError || undefined,
      "aria-describedby": describedBy || undefined,
      "aria-required": required,
    });
  });

  return (
    <div
      data-slot="form-field"
      className={cn(
        inline
          ? "flex flex-row items-start gap-4"
          : "flex flex-col gap-1.5",
        className
      )}
      {...props}
    >
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium text-foreground leading-none",
            inline && "pt-2 min-w-[120px] shrink-0",
            hideLabel && "sr-only"
          )}
        >
          {label}
          {required && (
            <span
              className="ml-1 text-destructive"
              aria-hidden="true"
              title="Required"
            >
              *
            </span>
          )}
        </label>
      )}

      {/* Input slot + messages */}
      <div className="flex-1 flex flex-col gap-1">
        {/* The actual input (slot) */}
        {enrichedChildren}

        {/* Bottom row: message + char count */}
        <div className="flex items-start justify-between gap-2 min-h-[1rem]">
          {/* Message area */}
          <div className="flex-1">
            {hasError && (
              <p
                id={`${id}-error`}
                role="alert"
                className="flex items-center gap-1 text-xs text-destructive"
              >
                <AlertCircle className="w-3 h-3 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            {hasSuccess && (
              <p
                id={`${id}-success`}
                className="flex items-center gap-1 text-xs text-success"
              >
                <CheckCircle2 className="w-3 h-3 shrink-0" aria-hidden="true" />
                {success}
              </p>
            )}
            {hint && !hasError && !hasSuccess && (
              <p
                id={`${id}-hint`}
                className="text-xs text-muted-foreground"
              >
                {hint}
              </p>
            )}
          </div>

          {/* Char count */}
          {maxChars !== undefined && charCount !== undefined && (
            <span
              className={cn(
                "text-xs tabular-nums shrink-0",
                overLimit
                  ? "text-destructive font-medium"
                  : nearLimit
                  ? "text-warning"
                  : "text-muted-foreground"
              )}
              aria-live="polite"
            >
              {charCount}/{maxChars}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export { FormField };
