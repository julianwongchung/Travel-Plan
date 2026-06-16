"use client";

import { useState, useTransition, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BusFront, ChevronLeft, ShoppingBag, Utensils } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createExpense } from "@/lib/actions/expenses";
import type { Currency } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-fields";
import { IOSBottomSheet } from "@/components/ui/ios-bottom-sheet";

type ExpenseCategory = "food" | "transport" | "purchase";

type TravelerOption = {
  id: string;
  name: string;
};

const currencies = ["MYR", "SGD", "USD", "VND", "THB", "IDR", "PHP", "JPY", "KRW", "TWD", "HKD"] as const;

const expenseFormSchema = z.object({
  expense_name: z.string().trim().min(1, "Expense name is required."),
  total_amount: z.coerce.number().positive("Amount must be greater than zero."),
  currency: z.enum(currencies),
  expense_date: z.string().trim(),
  occurred_at: z.string().trim(),
  paid_by_traveler_id: z.string().trim(),
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
];

const categoryFields = {
  food: {
    nameLabel: "Expense name",
    namePlaceholder: "Dinner",
    dateLabel: "Date",
  },
  transport: {
    nameLabel: "Transport type/name",
    namePlaceholder: "Airport taxi",
    dateLabel: "Date/time",
  },
  purchase: {
    nameLabel: "Item name",
    namePlaceholder: "Souvenirs",
    dateLabel: "Date",
  },
} satisfies Record<ExpenseCategory, {
  nameLabel: string;
  namePlaceholder: string;
  dateLabel: string;
}>;

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
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseFormInput, unknown, ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expense_name: "",
      total_amount: 0,
      currency: defaultCurrency,
      expense_date: "",
      occurred_at: "",
      paid_by_traveler_id: "",
      notes: "",
    },
  });

  function close() {
    if (isPending) return;
    setOpen(false);
    setCategory(null);
    setServerError(null);
    reset();
  }

  function chooseCategory(nextCategory: ExpenseCategory) {
    setCategory(nextCategory);
    setServerError(null);
  }

  const selectedFields = category ? categoryFields[category] : null;

  function submitForm(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    void handleSubmit((values) => {
      if (!category) return;
      if (category === "transport" && !values.occurred_at) {
        setError("occurred_at", { message: "Date and time are required." });
        return;
      }
      if (category !== "transport" && !values.expense_date) {
        setError("expense_date", { message: "Date is required." });
        return;
      }

      const formData = new FormData(form);
      const [expenseDate, expenseTime = ""] = category === "transport"
        ? values.occurred_at.split("T")
        : [values.expense_date, ""];
      formData.set("category", category);
      formData.set("expense_name", values.expense_name);
      formData.set("total_amount", String(values.total_amount));
      formData.set("currency", values.currency);
      formData.set("expense_date", expenseDate);
      formData.set("expense_time", expenseTime);
      formData.set("paid_by_traveler_id", values.paid_by_traveler_id);
      formData.set("notes", values.notes);

      setServerError(null);
      startTransition(async () => {
        try {
          await createExpense(tripId, formData);
          router.refresh();
          setOpen(false);
          setCategory(null);
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
        title={category ? `Add ${categoryOptions.find((option) => option.category === category)?.label} Expense` : "Add Expense"}
        onClose={close}
      >
        {category && selectedFields ? (
          <form
            className="grid min-w-0 gap-4"
            onSubmit={submitForm}
          >
            <input type="hidden" name="category" value={category} />

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

            <Field label={selectedFields.nameLabel}>
              <Input
                {...register("expense_name")}
                placeholder={selectedFields.namePlaceholder}
                autoComplete="off"
              />
            </Field>
            <ErrorMessage message={errors.expense_name?.message} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount">
                <Input
                  {...register("total_amount")}
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
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

            {category === "transport" ? (
              <Field label={selectedFields.dateLabel}>
                <Input {...register("occurred_at")} type="datetime-local" />
              </Field>
            ) : (
              <Field label={selectedFields.dateLabel}>
                <Input {...register("expense_date")} type="date" />
              </Field>
            )}
            <ErrorMessage message={errors.occurred_at?.message ?? errors.expense_date?.message} />

            <Field label="Person who paid">
              <Select {...register("paid_by_traveler_id")}>
                <option value="">Not set</option>
                {travelers.map((traveler) => (
                  <option key={traveler.id} value={traveler.id}>{traveler.name}</option>
                ))}
              </Select>
            </Field>

            <section className="grid min-w-0 gap-2">
              <h3 className="text-sm font-bold">Split with people</h3>
              {travelers.length ? (
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {travelers.map((traveler) => (
                    <label
                      key={traveler.id}
                      className="min-w-0 rounded-[18px] border border-[var(--border)] bg-[var(--muted)] p-3 text-sm"
                    >
                      <span className="flex min-h-8 items-center gap-3 font-semibold">
                        <input
                          name="traveler_ids"
                          type="checkbox"
                          value={traveler.id}
                          defaultChecked
                          className="size-5 accent-[var(--primary)]"
                        />
                        {traveler.name}
                      </span>
                      <Input
                        className="mt-2 bg-[var(--card-strong)]"
                        name={`split_${traveler.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="Custom amount optional"
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-[16px] bg-[var(--muted)] p-3 text-sm text-[var(--muted-foreground)]">
                  No travelers are available for splitting yet.
                </p>
              )}
            </section>

            <Field label="Notes">
              <Textarea {...register("notes")} className="min-h-24" placeholder="Optional notes" />
            </Field>

            <ErrorMessage message={serverError ?? undefined} />

            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : `Save ${categoryOptions.find((option) => option.category === category)?.label} Expense`}
            </Button>
          </form>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {categoryOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.category}
                  type="button"
                  aria-label={option.label}
                  onClick={() => chooseCategory(option.category)}
                  className={`ios-pressable grid min-h-28 min-w-0 place-items-center content-center gap-2 rounded-[22px] border p-3 text-center ${option.className}`}
                >
                  <span className="grid size-10 place-items-center rounded-full bg-white/55 dark:bg-white/10">
                    <Icon size={20} />
                  </span>
                  <span className="text-sm font-bold text-[var(--foreground)]">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </IOSBottomSheet>
    </>
  );
}
