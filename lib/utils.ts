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
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD") // Tách ký tự có dấu thành ký tự gốc + dấu
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ toàn bộ dấu
    .replace(/đ/g, "d") // Chuyển đ -> d
    .replace(/Đ/g, "D") // Chuyển Đ -> D
    .replace(/[^a-zA-Z0-9\s-]/g, "") // Bỏ ký tự đặc biệt
    .replace(/\s+/g, "-") // ⚡ Thay tất cả khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, "-") // Gộp nhiều dấu gạch ngang liên tiếp
    .trim();
}