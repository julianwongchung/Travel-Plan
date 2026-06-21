import { BedDouble, BusFront, ReceiptText, ShieldCheck, ShoppingBag, Utensils } from "lucide-react";

const categoryStyles = {
  food: {
    label: "Food",
    icon: Utensils,
    className: "expense-category-food bg-orange-500/12 text-orange-600 dark:text-orange-300",
  },
  transport: {
    label: "Transport",
    icon: BusFront,
    className: "expense-category-transport bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  },
  purchase: {
    label: "Purchase",
    icon: ShoppingBag,
    className: "expense-category-purchase bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  hotel: {
    label: "Hotel",
    icon: BedDouble,
    className: "expense-category-hotel bg-blue-500/12 text-blue-700 dark:text-blue-300",
  },
  insurance: {
    label: "Insurance",
    icon: ShieldCheck,
    className: "expense-category-insurance bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
};

export function ExpenseCategoryBadge({ category }: { category: string | null }) {
  const normalizedCategory = category?.trim().toLowerCase();
  const style = normalizedCategory && normalizedCategory in categoryStyles
    ? categoryStyles[normalizedCategory as keyof typeof categoryStyles]
    : null;
  const Icon = style?.icon ?? ReceiptText;

  return (
    <span
      className={`inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
        style?.className ?? "bg-slate-500/12 text-slate-600 dark:text-slate-300"
      }`}
    >
      <Icon size={14} />
      {style?.label ?? category ?? "Uncategorized"}
    </span>
  );
}
