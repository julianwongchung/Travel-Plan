import { z } from "zod";

type ErrorLike = {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
};

const fallbackMessage = "Something went wrong. Please try again.";

function errorLike(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? error as ErrorLike : {};
}

export function normalizeActionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Please check the form and try again.";
  }

  if (error instanceof Error && error.name === "ActionValidationError") {
    return error.message;
  }

  const details = errorLike(error);
  const message = details.message ?? (error instanceof Error ? error.message : "");
  const lowerMessage = message.toLowerCase();
  const code = details.code;
  const status = details.status;

  if (
    status === 401
    || lowerMessage.includes("jwt")
    || lowerMessage.includes("session")
    || lowerMessage.includes("not authenticated")
    || lowerMessage.includes("auth session missing")
  ) {
    return "Your session has expired. Please log in again.";
  }

  if (
    code === "42501"
    || lowerMessage.includes("rls")
    || lowerMessage.includes("permission")
    || lowerMessage.includes("not have permission")
    || lowerMessage.includes("not allowed")
  ) {
    return "You do not have permission to do this.";
  }

  if (
    code === "PGRST202"
    || lowerMessage.includes("could not find the function")
    || lowerMessage.includes("schema cache")
  ) {
    return "The database is missing the latest Supabase migrations. Apply the latest migrations and try again.";
  }

  if (
    code === "23505"
    || lowerMessage.includes("duplicate")
    || lowerMessage.includes("unique constraint")
    || lowerMessage.includes("already exists")
  ) {
    return "This item already exists.";
  }

  if (
    code === "23514"
    || code === "P0001"
    || lowerMessage.includes("check constraint")
    || lowerMessage.includes("invalid input")
  ) {
    if (lowerMessage.includes("only admins can create trips")) {
      return "Your account does not have admin permission to create trips.";
    }

    if (
      lowerMessage.includes("currency")
      || lowerMessage.includes("trips_currency_check")
      || lowerMessage.includes("trip_expenses_currency_check")
    ) {
      return "This currency is not enabled in the database yet. Apply the latest Supabase migration and try again.";
    }

    if (
      lowerMessage.includes("required")
      || lowerMessage.includes("must be")
      || lowerMessage.includes("cannot be")
      || lowerMessage.includes("outside the trip date range")
    ) {
      return message;
    }
    return "Please check the form and try again.";
  }

  if (message && !code) {
    return message;
  }

  return fallbackMessage;
}

export function actionValidationError(message: string) {
  const error = new Error(message);
  error.name = "ActionValidationError";
  return error;
}

export function throwSafeActionError(error: unknown): never {
  throw new Error(normalizeActionError(error));
}
