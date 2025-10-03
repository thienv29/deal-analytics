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

export function normalizeVietnamPhone(raw: string): string {
  if (!raw) return "";
  
  // 1. Bỏ khoảng trắng, dấu . hoặc -
  let phone = raw.replace(/[\s\-\.\(\)]/g, "");

  // 2. Nếu bắt đầu bằng +84 => đổi thành 0
  if (phone.startsWith("+84")) {
    phone = "0" + phone.slice(3);
  } else if (phone.startsWith("84")) {
    // hoặc 84xxxxxx
    phone = "0" + phone.slice(2);
  }else if (!phone.startsWith("0")) {
    // nếu không có 0 đầu thì tự thêm
    phone = "0" + phone;
  }
  // 3. Nếu đã bắt đầu bằng 0 thì giữ nguyên
  return phone;
}