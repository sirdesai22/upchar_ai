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

/**
 * Format phone number to 10-digit format by removing country code and whatsapp prefix
 * @param phoneNumber - The phone number to format (e.g., "whatsapp:+916362805484")
 * @returns string - The formatted 10-digit phone number (e.g., "6362805484")
 */
export function formatPhoneNumber(phoneNumber: string): string {
  // Remove whatsapp: prefix if present
  let cleaned = phoneNumber.replace(/^whatsapp:/, '');
  
  // Remove country code +91 if present
  cleaned = cleaned.replace(/^\+91/, '');
  
  // Remove any remaining spaces, dashes, parentheses
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');
  
  // If the number starts with 91 and is longer than 10 digits, remove the 91
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  
  // Return only the last 10 digits if the number is longer
  if (cleaned.length > 10) {
    cleaned = cleaned.slice(-10);
  }
  
  return cleaned;
} 