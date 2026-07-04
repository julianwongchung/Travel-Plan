"use client";

import { useState, useTransition, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { BedDouble, BusFront, ChevronLeft, ShieldCheck, ShoppingBag, Utensils } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createExpense } from "@/lib/actions/expenses";
import { tripKeys } from "@/lib/db/query-keys";
import type { Currency } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

type ExpenseCategory = "food" | "transport" | "purchase" | "hotel" | "insurance";
type TransportType = "MRT" | "Flight" | "GRAB";

type TravelerOption = {
  id: string;
  name: string;
};

const currencies = ["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD", "CNY"] as const;

const expenseFormSchema = z.object({
  total_amount: z.coerce.number().positive("Amount must be greater than zero."),
  currency: z.enum(currencies),
  paid_by_traveler_id: z.string().trim().min(1, "Who paid is required."),
  notes: z.string().trim(),
});

type ExpenseFormInput = z.input<typeof expenseFormSchema>;
type ExpenseFormValues = z.output<typeof expenseFormSchema>;

const categoryOptions = [
  {
    category: "food" as const,
    label: "Food",
    icon: Utensils,
    className: "border-orange-300/50 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  },
  {
    category: "transport" as const,
    label: "Transport",
    icon: BusFront,
    className: "border-cyan-300/50 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  },
  {
    category: "purchase" as const,
    label: "Purchase",
    icon: ShoppingBag,
    className: "border-violet-300/50 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  {
    category: "hotel" as const,
    label: "Hotel",
    icon: BedDouble,
    className: "border-blue-300/50 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    category: "insurance" as const,
    label: "Insurance",
    icon: ShieldCheck,
    className: "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
];

const categoryFields = {
  food: "Food",
  transport: "Transport",
  purchase: "Purchase",
  hotel: "Hotel",
  insurance: "Insurance",
} satisfies Record<ExpenseCategory, string>;

const transportOptions: TransportType[] = ["MRT", "Flight", "GRAB"];

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function currentTimestampParts() {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`,
    time: `${padDatePart(now.getHours())}:${padDatePart(now.getMinutes())}`,
  };
}

function expenseNameFor(category: ExpenseCategory, transportType: TransportType | null) {
  if (category === "transport") return transportType ?? "Transport";
  return categoryFields[category];
}

function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm font-semibold text-[var(--danger)]">{message}</p>
  ) : null;
}

export function AddExpenseSheet({
  tripId,
  travelers,
  defaultCurrency,
}: {
  tripId: string;
  travelers: TravelerOption[];
  defaultCurrency: Currency;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [transportType, setTransportType] = useState<TransportType | null>(null);
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      total_amount: 0,
      currency: defaultCurrency,
      paid_by_traveler_id: "",
      notes: "",
    },
  });

  function close() {
    if (isPending) return;
    setOpen(false);
    setCategory(null);
    setTransportType(null);
    setSplitEnabled(false);
    setServerError(null);
    reset();
  }

  function chooseCategory(nextCategory: ExpenseCategory) {
    setCategory(nextCategory);
    setTransportType(null);
    setSplitEnabled(false);
    setServerError(null);
  }

  const showingTransportOptions = category === "transport" && !transportType;
  const showingForm = category !== null && !showingTransportOptions;
  const generatedExpenseName = category ? expenseNameFor(category, transportType) : "";

  function submitForm(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    void handleSubmit((values) => {
      if (!category) return;
      if (category === "transport" && !transportType) {
        setError("total_amount", { message: "Choose a transport type first." });
        return;
      }

      const formData = new FormData(form);
      const timestamp = currentTimestampParts();
      formData.set("category", category);
      formData.set("expense_name", expenseNameFor(category, transportType));
      formData.set("total_amount", String(values.total_amount));
      formData.set("currency", values.currency);
      formData.set("expense_date", timestamp.date);
      formData.set("expense_time", timestamp.time);
      formData.set("paid_by_traveler_id", values.paid_by_traveler_id);
      formData.set("notes", values.notes);

      setServerError(null);
      startTransition(async () => {
        try {
          await createExpense(tripId, formData);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: tripKeys.expenses(tripId) }),
            queryClient.invalidateQueries({ queryKey: tripKeys.overview(tripId) }),
          ]);
          setOpen(false);
          setCategory(null);
          setTransportType(null);
          setSplitEnabled(false);
          reset();
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "Could not add expense.");
        }
      });
    })(event);
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>+ Add</Button>

      <IOSBottomSheet
        open={open}
        title={
          showingTransportOptions
            ? "Choose Transport"
            : category
              ? `Add ${generatedExpenseName} Expense`
              : "Add Expense"
        }
        onClose={close}
        placement="center"
      >
        {showingForm ? (
          <form
            className="grid min-w-0 gap-4"
            onSubmit={submitForm}
          >
            <input type="hidden" name="category" value={category} />

            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setTransportType(null);
                setSplitEnabled(false);
                setServerError(null);
              }}
              className="ios-pressable -mt-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-full px-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <ChevronLeft size={17} />
              Choose another category
            </button>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount">
                <Input
                  {...register("total_amount")}
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  autoFocus
                />
              </Field>
              <Field label="Currency">
                <Select {...register("currency")}>
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <ErrorMessage message={errors.total_amount?.message ?? errors.currency?.message} />

            <Field label="Who paid">
              <Select {...register("paid_by_traveler_id")}>
                <option value="">Not set</option>
                {travelers.map((traveler) => (
                  <option key={traveler.id} value={traveler.id}>{traveler.name}</option>
                ))}
              </Select>
            </Field>
            <ErrorMessage message={errors.paid_by_traveler_id?.message} />

            <section className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--muted)] p-3">
              <div>
                <h3 className="text-sm font-bold">Split</h3>
                <label className="mt-2 flex min-h-11 items-center gap-3 rounded-[16px] bg-[var(--card-strong)] px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={splitEnabled}
                    onChange={(event) => setSplitEnabled(event.target.checked)}
                    className="size-5 rounded border border-[var(--border)] accent-[var(--primary)]"
                  />
                  <span>Split expense</span>
                </label>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {splitEnabled ? "Equal split across all travelers" : "Not split. Assigned to payer only."}
                </p>
              </div>
              {splitEnabled ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {travelers.length ? travelers.map((traveler) => (
                    <label
                      key={traveler.id}
                      className="flex min-h-11 items-center gap-3 rounded-[16px] bg-[var(--card-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
                    >
                      <input
                        type="checkbox"
                        name="traveler_ids"
                        value={traveler.id}
                        defaultChecked
                        className="size-5 rounded border border-[var(--border)] accent-[var(--primary)]"
                      />
                      {traveler.name}
                    </label>
                  )) : (
                    <p className="text-sm font-semibold text-[var(--danger)]">Add travelers before splitting expenses.</p>
                  )}
                </div>
              ) : null}
            </section>

            <Field label="Notes">
              <Textarea {...register("notes")} className="min-h-24" placeholder="Optional notes" />
            </Field>

            <ErrorMessage message={serverError ?? undefined} />

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="secondary" onClick={close} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : `Save ${generatedExpenseName} Expense`}
              </Button>
            </div>
          </form>
        ) : showingTransportOptions ? (
          <div className="grid min-w-0 gap-4">
            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setServerError(null);
              }}
              className="ios-pressable -mt-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-full px-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
            >
              <ChevronLeft size={17} />
              Choose another category
            </button>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {transportOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={option}
                  onClick={() => setTransportType(option)}
                  className="ios-pressable grid min-h-24 min-w-0 place-items-center rounded-[20px] border border-cyan-300/50 bg-cyan-500/10 p-3 text-center text-sm font-bold text-[var(--foreground)]"
                >
                  {option}
                </button>
              ))}
            </div>
            <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          </div>
        ) : (
          <div className="grid min-w-0 gap-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
              {categoryOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.category}
                    type="button"
                    aria-label={option.label}
                    onClick={() => chooseCategory(option.category)}
                    className={`ios-pressable grid min-h-24 min-w-0 place-items-center content-center gap-2 rounded-[22px] border p-3 text-center ${option.className}`}
                  >
                    <span className="grid size-10 place-items-center rounded-full bg-white/55 dark:bg-white/10">
                      <Icon size={20} />
                    </span>
                    <span className="text-sm font-bold text-[var(--foreground)]">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
          </div>
        )}
      </IOSBottomSheet>
    </>
  );
}
