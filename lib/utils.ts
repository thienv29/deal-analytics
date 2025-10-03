import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function toTitleCase(raw?: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .split(/\s+/)
    .map(word => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function normalizeVietnamPhone(raw?: string): string {
  if (!raw) return "";
  
  let phone = raw.replace(/[\s\-\.\(\)]/g, "");

  if (phone.startsWith("+84")) {
    phone = "0" + phone.slice(3);
  } else if (phone.startsWith("84")) {
    phone = "0" + phone.slice(2);
  }else if (!phone.startsWith("0")) {
    phone = "0" + phone;
  }
  return phone;
}