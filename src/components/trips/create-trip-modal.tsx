"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { createTripFromModal } from "@/lib/actions/trips";
import { countryCurrencyOptions, getCurrencyForCountry } from "@/lib/utils/country-currency";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-fields";
import { IOSModal } from "@/components/ui/ios-modal";

const createTripSchema = z.object({
  name: z.string().trim().min(1, "Trip name is required."),
  start_date: z.string().trim().min(1, "Start date is required."),
  end_date: z.string().trim().min(1, "End date is required."),
  country: z.string().trim().refine(
    (country) => countryCurrencyOptions.some((option) => option.country === country),
    "Country is required.",
  ),
  city: z.string().trim(),
}).refine(
  (data) => !data.start_date || !data.end_date || data.end_date >= data.start_date,
  { message: "End date must be on or after start date.", path: ["end_date"] },
);

type CreateTripFormInput = z.input<typeof createTripSchema>;
type CreateTripFormValues = z.output<typeof createTripSchema>;

function ErrorMessage({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm font-semibold text-[var(--danger)]">{message}</p>
  ) : null;
}

const defaultValues = {
  name: "",
  start_date: "",
  end_date: "",
  country: "",
  city: "",
} satisfies CreateTripFormInput;

const travelerDraftStorageKey = "travel-os:create-trip:traveler-names";

function compactTravelerNames(names: string[]) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const rawName of names) {
    const name = rawName.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    output.push(name);
  }

  return output;
}

function hasDuplicateTravelerNames(names: string[]) {
  const seen = new Set<string>();
  for (const rawName of names) {
    const name = rawName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export function CreateTripModal() {
  const [open, setOpen] = useState(false);
  const [travelerNames, setTravelerNames] = useState(() => {
    if (typeof window === "undefined") return [""];

    const stored = window.sessionStorage.getItem(travelerDraftStorageKey);
    if (!stored) return [""];

    try {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed) && parsed.every((name) => typeof name === "string")) {
        return parsed.length ? parsed : [""];
      }
    } catch {
      window.sessionStorage.removeItem(travelerDraftStorageKey);
    }

    return [""];
  });
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<CreateTripFormInput, unknown, CreateTripFormValues>({
    resolver: zodResolver(createTripSchema),
    defaultValues,
    mode: "onChange",
  });
  const selectedCountry = useWatch({ control, name: "country" });
  const defaultCurrency = getCurrencyForCountry(selectedCountry);
  const duplicateTravelerNames = useMemo(() => hasDuplicateTravelerNames(travelerNames), [travelerNames]);

  useEffect(() => {
    if (travelerNames.some((name) => name.trim())) {
      window.sessionStorage.setItem(travelerDraftStorageKey, JSON.stringify(travelerNames));
    } else {
      window.sessionStorage.removeItem(travelerDraftStorageKey);
    }
  }, [travelerNames]);

  function close() {
    if (isPending) return;
    setOpen(false);
    setServerError(null);
    reset(defaultValues);
  }

  function updateTravelerName(index: number, name: string) {
    setTravelerNames((current) => current.map((travelerName, travelerIndex) => (
      travelerIndex === index ? name : travelerName
    )));
  }

  function addTravelerName() {
    setTravelerNames((current) => [...current, ""]);
  }

  function removeTravelerName(index: number) {
    setTravelerNames((current) => (
      current.length > 1 ? current.filter((_, travelerIndex) => travelerIndex !== index) : current
    ));
  }

  function submitForm(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    void handleSubmit((values) => {
      if (duplicateTravelerNames) return;
      const compactNames = compactTravelerNames(travelerNames);
      const formData = new FormData(form);
      formData.set("name", values.name);
      formData.set("start_date", values.start_date);
      formData.set("end_date", values.end_date);
      formData.set("country", values.country);
      formData.set("city", values.city);
      formData.set("travelers", compactNames.join("\n"));
      formData.set("default_currency", getCurrencyForCountry(values.country));

      setServerError(null);
      startTransition(async () => {
        try {
          const result = await createTripFromModal(formData);
          if (!result.ok) {
            setServerError(result.error);
            return;
          }

          setOpen(false);
          window.sessionStorage.removeItem(travelerDraftStorageKey);
          setTravelerNames([""]);
          reset(defaultValues);
          router.push(`/trips/${result.tripId}/overview`);
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "Could not create trip.");
        }
      });
    })(event);
  }

  return (
    <>
      <Button
        type="button"
        className="w-full px-5 sm:w-auto"
        onClick={() => setOpen(true)}
      >
        <CalendarPlus size={17} />
        Create Private Trip
      </Button>

      <IOSModal open={open} title="Create Private Trip" onClose={close}>
        <form className="grid min-w-0 gap-4" onSubmit={submitForm}>
          <Field label="Trip name">
            <Input {...register("name")} placeholder="Da Nang Trip" autoComplete="off" />
          </Field>
          <ErrorMessage message={errors.name?.message} />

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <Input {...register("start_date")} type="date" lang="en-GB" />
            </Field>
            <Field label="End date">
              <Input {...register("end_date")} type="date" lang="en-GB" />
            </Field>
          </div>
          <ErrorMessage message={errors.start_date?.message ?? errors.end_date?.message} />

          <Field label="Country">
            <Select {...register("country")}>
              <option value="">Select country</option>
              {countryCurrencyOptions.map((option) => (
                <option key={option.country} value={option.country}>{option.country}</option>
              ))}
            </Select>
          </Field>
          <input type="hidden" name="default_currency" value={defaultCurrency} />
          <ErrorMessage message={errors.country?.message} />

          <Field label="City / destination name (optional)">
            <Input {...register("city")} placeholder="Shinjuku, Tokyo" autoComplete="off" />
          </Field>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">Traveler name</p>
              <Button
                type="button"
                variant="secondary"
                className="min-h-9 px-3 py-1 text-xs"
                onClick={addTravelerName}
                disabled={travelerNames.length >= 50}
              >
                <Plus size={14} />
                Add traveler
              </Button>
            </div>

            <div className="grid gap-2">
              {travelerNames.map((travelerName, index) => (
                <div key={index} className="flex min-w-0 items-center gap-2">
                  <Input
                    name={`traveler_name_${index}`}
                    aria-label="Traveler name"
                    value={travelerName}
                    placeholder={index === 0 ? "Julian" : "Traveler name"}
                    autoComplete="name"
                    onChange={(event) => updateTravelerName(index, event.target.value)}
                  />
                  {travelerNames.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`Remove traveler ${index + 1}`}
                      className="ios-pressable grid size-11 shrink-0 place-items-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--danger)]"
                      onClick={() => removeTravelerName(index)}
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {duplicateTravelerNames ? (
              <ErrorMessage message="Traveler names must be unique." />
            ) : null}
          </div>

          <ErrorMessage message={serverError ?? undefined} />

          <div className="mt-1 grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={close} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || duplicateTravelerNames || isPending}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </IOSModal>
    </>
  );
}
