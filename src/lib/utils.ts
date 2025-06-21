import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString();
}

export function formatDate(dateTime: string): string {
  return new Date(dateTime).toLocaleDateString();
}

export function formatTime(dateTime: string): string {
  return new Date(dateTime).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
} 