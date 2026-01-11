// In-memory storage for patient sessions
const patientSessions: { [phoneNumber: string]: PatientSession } = {};

// Import the formatPhoneNumber utility
import { formatPhoneNumber } from './utils';

// Clean phone number for consistent storage
function cleanPhoneNumber(phoneNumber: string): string {
  return formatPhoneNumber(phoneNumber);
}

// Get patient session by phone number
export function getPatientSession(phoneNumber: string): PatientSession {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  return patientSessions[cleanPhone] || {
    name: null,
    age: null,
    gender: null,
    disease: null,
    language: null
  };
}

// Update patient session
export function updatePatientSession(phoneNumber: string, updates: Partial<PatientSession>): void {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  const currentSession = getPatientSession(phoneNumber);
  
  // Merge updates with current session
  const session = {
    ...currentSession,
    ...updates
  };
  
  // Store updated session
  patientSessions[cleanPhone] = session;
}

// Clear patient session
export function clearPatientSession(phoneNumber: string): void {
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  delete patientSessions[cleanPhone];
}

// Check if session is complete
export function isSessionComplete(session: PatientSession): boolean {
  return !!(session.name && session.age && session.gender && session.disease);
}

// Get missing fields from session
export function getMissingFields(session: PatientSession): string[] {
  const missing: string[] = [];
  
  if (!session.name) missing.push('name');
  if (!session.age) missing.push('age');
  if (!session.gender) missing.push('gender');
  if (!session.disease) missing.push('disease');
  
  return missing;
}

// Clean up old sessions (optional - can be called periodically)
export function cleanupOldSessions(): void {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  Object.keys(patientSessions).forEach(phone => {
    const session = patientSessions[phone];
    if (session.lastUpdated && (now - session.lastUpdated) > maxAge) {
      delete patientSessions[phone];
    }
  });
}

// Interface for patient session data
export interface PatientSession {
  name: string | null;
  age: number | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  disease: string | null;
  language: string | null;
  assignedDoctorId?: string | null;
  assignedDoctorName?: string | null;
  assignedDoctorSpecialization?: string | null;
  assignmentReasoning?: string | null;
  lastUpdated?: number;
} 