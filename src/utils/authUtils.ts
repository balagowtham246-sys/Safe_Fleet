import { INITIAL_DRIVERS } from '../data/fleetData';
import { Driver } from '../types';

/**
 * List of approved email addresses and domains for Fleet Manager role onboarding.
 * Configurable via VITE_APPROVED_MANAGER_EMAILS environment variable.
 */
const DEFAULT_APPROVED_MANAGERS = [
  'balagowtham246@gmail.com',
  'manager@demo.safefleet.ai',
  'admin@demo.safefleet.ai',
  'admin@safefleet.ai',
  'sarah.jenkins@safefleet.ai',
  'manager@safefleet.ai',
];

export function getApprovedManagerEmails(): string[] {
  const envEmails = (import.meta as any).env?.VITE_APPROVED_MANAGER_EMAILS;
  if (envEmails && typeof envEmails === 'string') {
    const parsed = envEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set([...DEFAULT_APPROVED_MANAGERS.map((e) => e.toLowerCase()), ...parsed]));
  }
  return DEFAULT_APPROVED_MANAGERS.map((e) => e.toLowerCase());
}

/**
 * Checks if a given email address is authorized for Fleet Manager onboarding.
 */
export function isApprovedManagerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  const approvedList = getApprovedManagerEmails();

  if (approvedList.includes(normalized)) {
    return true;
  }

  // Check if domain is approved or if email explicitly contains approved manager markers
  const domain = normalized.split('@')[1];
  if (domain === 'safefleet.ai') {
    return true;
  }

  return false;
}

/**
 * Returns available driver profiles from the fleet roster.
 */
export function getRegisteredDriverRoster(): Driver[] {
  return INITIAL_DRIVERS;
}

/**
 * Normalizes a mobile phone number to consistent +91 format for Twilio and Firestore.
 */
export function normalizePhoneNumber(input: string): string {
  if (!input) return '+919842188412';
  const cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+91')) return cleaned;
  if (cleaned.startsWith('91') && cleaned.length === 12) return '+' + cleaned;
  if (cleaned.length === 10) return '+91' + cleaned;
  return cleaned.startsWith('+') ? cleaned : '+91' + cleaned;
}

