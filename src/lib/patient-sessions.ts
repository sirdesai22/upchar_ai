// In-memory storage for patient registration sessions
// In production, you might want to use Redis or database for this
interface PatientSession {
  phoneNumber: string;
  name?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  disease?: string;
  language?: string;
  lastUpdated: Date;
}

const patientSessions = new Map<string, PatientSession>();

/**
 * Get or create a patient session
 * @param phoneNumber - Patient's phone number
 * @returns PatientSession - Current session data
 */
export function getPatientSession(phoneNumber: string): PatientSession {
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  if (!patientSessions.has(cleanPhone)) {
    patientSessions.set(cleanPhone, {
      phoneNumber: cleanPhone,
      lastUpdated: new Date()
    });
  }
  
  return patientSessions.get(cleanPhone)!;
}

/**
 * Update patient session with new data
 * @param phoneNumber - Patient's phone number
 * @param data - Partial patient data to update
 */
export function updatePatientSession(phoneNumber: string, data: Partial<PatientSession>): void {
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const session = getPatientSession(cleanPhone);
  
  Object.assign(session, {
    ...data,
    lastUpdated: new Date()
  });
  
  patientSessions.set(cleanPhone, session);
  console.log('📝 Updated patient session:', session);
}

/**
 * Clear patient session (after successful registration)
 * @param phoneNumber - Patient's phone number
 */
export function clearPatientSession(phoneNumber: string): void {
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  patientSessions.delete(cleanPhone);
  console.log('🗑️ Cleared patient session for:', cleanPhone);
}

/**
 * Check if session has all required fields
 * @param session - Patient session
 * @returns boolean - True if all fields are present
 */
export function isSessionComplete(session: PatientSession): boolean {
  return !!(session.name && session.age && session.gender && session.disease);
}

/**
 * Get missing fields from session
 * @param session - Patient session
 * @returns string[] - Array of missing field names
 */
export function getMissingFields(session: PatientSession): string[] {
  const missing: string[] = [];
  
  if (!session.name) missing.push('name');
  if (!session.age) missing.push('age');
  if (!session.gender) missing.push('gender');
  if (!session.disease) missing.push('disease');
  // Language is optional, defaults to English
  
  return missing;
}

/**
 * Clean up old sessions (older than 1 hour)
 */
export function cleanupOldSessions(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [phone, session] of patientSessions.entries()) {
    if (session.lastUpdated < oneHourAgo) {
      patientSessions.delete(phone);
      console.log('🧹 Cleaned up old session for:', phone);
    }
  }
}

// Clean up old sessions every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000); 