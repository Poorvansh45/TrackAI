import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: any): string {
  if (!error) return "";

  // If it's already a string, return it
  if (typeof error === "string") return error;

  // Handle Axios response errors
  const responseData = error.response?.data;
  if (responseData) {
    const detail = responseData.detail;
    if (detail) {
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((err: any) => {
            if (typeof err === "string") return err;
            if (err && typeof err === "object") {
              const field = err.loc && Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : "";
              const msg = err.msg || "Invalid input";
              return field ? `${field}: ${msg}` : msg;
            }
            return JSON.stringify(err);
          })
          .join(", ");
      }
      if (typeof detail === "object") {
        const field = detail.loc && Array.isArray(detail.loc) ? detail.loc[detail.loc.length - 1] : "";
        const msg = detail.msg || "Invalid input";
        return field ? `${field}: ${msg}` : msg;
      }
    }
    
    if (responseData.message) {
      return typeof responseData.message === "string" 
        ? responseData.message 
        : JSON.stringify(responseData.message);
    }
  }

  // Handle standard JS Error or AxiosError message
  if (error.message && typeof error.message === "string") {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

