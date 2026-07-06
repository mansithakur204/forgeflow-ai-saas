import * as React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Data Table System
// Responsive, sortable, accessible table with loading + empty states
// ─────────────────────────────────────────────────────────────────────────────

// ── Column Definition ────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T = Record<string, unknown>> {
  /** Unique key matching a property of T */
  key: keyof T | string;
  /** Column header label */
  label: string;
  /** Width class e.g. "w-[200px]" or "min-w-[120px]" */
  width?: string;
  /** Allow sorting on this column */
  sortable?: boolean;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Custom cell render function */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Hide on smaller screens */
  hideOn?: "sm" | "md" | "lg";
}

// ── Sort State ───────────────────────────────────────────────────────────────

export interface SortState {
  key: string;
  direction: SortDirection;
}

// ── Table Root ───────────────────────────────────────────────────────────────

export interface DataTableProps<T extends Record<string, unknown> = Record<string, unknown>>
  extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<T>[];
  data: T[];
  /** Row unique key (defaults to "id") */
  rowKey?: keyof T | ((row: T, index: number) => string | number);
  /** Controlled sort */
  sortState?: SortState;
  onSort?: (key: string, direction: SortDirection) => void;
  /** Loading state — shows spinner overlay */
  loading?: boolean;
  /** Empty state config */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  /** Table density */
  density?: "compact" | "default" | "spacious";
  /** Zebra striping */
  striped?: boolean;
  /** Sticky first column (for wide tables on mobile) */
  stickyFirstColumn?: boolean;
  /** Footer slot (pagination, etc.) */
  footer?: React.ReactNode;
  /** Caption for accessibility */
  caption?: string;
}

const densityClasses = {
  compact: "py-1.5 px-3 text-xs",
  default: "py-2.5 px-4 text-sm",
  spacious: "py-4 px-6 text-sm",
};

const headerDensityClasses = {
  compact: "py-2 px-3",
  default: "py-2.5 px-4",
  spacious: "py-3.5 px-6",
};

const hideOnClasses = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey = "id",
  sortState,
  onSort,
  loading = false,
  emptyTitle = "No data",
  emptyDescription = "No records found.",
  emptyIcon,
  emptyAction,
  density = "default",
  striped = false,
  stickyFirstColumn = false,
  footer,
  caption,
  className,
  ...props
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number): string | number => {
    if (typeof rowKey === "function") return rowKey(row, index);
    return (row[rowKey] as string | number) ?? index;
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sortState?.key === key) {
      const next: SortDirection =
        sortState.direction === "asc" ? "desc" : sortState.direction === "desc" ? null : "asc";
      onSort(key, next);
    } else {
      onSort(key, "asc");
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortState?.key !== key) {
      return <ChevronsUpDown className="w-3 h-3 opacity-30 ml-1" aria-hidden="true" />;
    }
    return sortState.direction === "asc" ? (
      <ChevronUp className="w-3 h-3 ml-1 text-brand-500" aria-hidden="true" />
    ) : sortState.direction === "desc" ? (
      <ChevronDown className="w-3 h-3 ml-1 text-brand-500" aria-hidden="true" />
    ) : (
      <ChevronsUpDown className="w-3 h-3 opacity-30 ml-1" aria-hidden="true" />
    );
  };

  return (
    <div
      data-slot="data-table-root"
      className={cn("flex flex-col gap-0", className)}
      {...props}
    >
      {/* Scrollable wrapper for responsive overflow */}
      <div className="relative w-full overflow-x-auto rounded-xl border border-border/60">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-xl">
            <Spinner size="md" variant="brand" label="Loading data…" />
          </div>
        )}

        <table
          data-slot="data-table"
          className="w-full border-collapse"
          aria-busy={loading}
          aria-label={caption}
        >
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}

          {/* Header */}
          <thead>
            <tr className="border-b border-border/60 bg-muted/40">
              {columns.map((col, colIndex) => {
                const key = String(col.key);
                const isSorted = sortState?.key === key;
                return (
                  <th
                    key={key}
                    scope="col"
                    aria-sort={
                      isSorted
                        ? sortState?.direction === "asc"
                          ? "ascending"
                          : sortState?.direction === "desc"
                          ? "descending"
                          : "none"
                        : undefined
                    }
                    className={cn(
                      headerDensityClasses[density],
                      "text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
                      alignClasses[col.align ?? "left"],
                      col.width,
                      col.hideOn && hideOnClasses[col.hideOn],
                      stickyFirstColumn && colIndex === 0 && "sticky left-0 z-10 bg-muted/40",
                    )}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className={cn(
                          "inline-flex items-center gap-0.5 hover:text-foreground transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-1",
                          isSorted && "text-foreground"
                        )}
                      >
                        {col.label}
                        {renderSortIcon(key)}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.length === 0 && !loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    icon={emptyIcon}
                    action={emptyAction}
                    size="sm"
                    className="my-8 mx-auto"
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={cn(
                    "border-b border-border/40 last:border-0",
                    "transition-colors duration-100",
                    "hover:bg-muted/30",
                    striped && rowIndex % 2 === 0 && "bg-muted/10",
                  )}
                >
                  {columns.map((col, colIndex) => {
                    const key = String(col.key);
                    const cellValue = row[col.key as keyof T];
                    return (
                      <td
                        key={key}
                        className={cn(
                          densityClasses[density],
                          "text-foreground/90",
                          alignClasses[col.align ?? "left"],
                          col.width,
                          col.hideOn && hideOnClasses[col.hideOn],
                          stickyFirstColumn && colIndex === 0 &&
                            "sticky left-0 z-10 bg-card font-medium"
                        )}
                      >
                        {col.render
                          ? col.render(cellValue, row, rowIndex)
                          : cellValue != null
                          ? String(cellValue)
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer (pagination, row count, etc.) */}
      {footer && (
        <div className="flex items-center justify-between px-1 pt-3 text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

// ── Simple Table Primitives (for non-data use cases) ─────────────────────────

function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/60">
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-b border-border/60 bg-muted/40", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody data-slot="table-body" className={cn("", className)} {...props} />;
}

function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-border/60 bg-muted/20 font-medium", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/40 last:border-0",
        "transition-colors hover:bg-muted/30",
        "data-[selected=true]:bg-brand-500/5",
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-4 py-2.5 text-sm text-foreground/90", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("py-2 text-xs text-muted-foreground text-center", className)}
      {...props}
    />
  );
}

export {
  DataTable,
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
};
