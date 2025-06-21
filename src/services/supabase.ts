import { supabase } from '@/lib/supabase-client';

export interface PatientData {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  disease: string;
  priority: 'High' | 'Medium' | 'Low';
  phone_number: string;
  language?: string;
  created_at: string;
}

/**
 * Check if a phone number exists in the patients table
 * @param phoneNumber - The phone number to check
 * @param phoneColumn - The column name for phone number (default: 'phone_number')
 * @returns Promise<boolean> - true if phone exists, false otherwise
 */
export async function checkPhoneExists(
  phoneNumber: string,
  phoneColumn: string = 'phone_number'
): Promise<boolean> {
  try {
    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Query the patients table
    const { data, error } = await supabase
      .from('patients')
      .select(phoneColumn)
      .eq(phoneColumn, cleanPhoneNumber)
      .limit(1);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    const exists = data && data.length > 0;

    // Return true if any records were found
    return exists;
  } catch (error) {
    throw error;
  }
}

/**
 * Get patient data by phone number
 * @param phoneNumber - The phone number to search for
 * @returns Promise<PatientData | null> - Patient data if found, null otherwise
 */
export async function getPatientByPhone(phoneNumber: string): Promise<PatientData | null> {
  try {
    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Query the patients table
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('phone_number', cleanPhoneNumber)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Database query failed: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Insert new patient data into the database
 * @param patientData - Patient information to insert
 * @returns Promise<PatientData> - Inserted patient data
 */
export async function insertPatient(patientData: {
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  disease: string;
  phone_number: string;
  language?: string;
  priority: 'High' | 'Medium' | 'Low';
}): Promise<PatientData> {
  try {
    // Clean the phone number
    const cleanPhoneNumber = patientData.phone_number.replace(/[\s\-\(\)]/g, '');
    
    // Prepare data for insertion
    const insertData = {
      name: patientData.name,
      age: patientData.age,
      gender: patientData.gender,
      disease: patientData.disease,
      phone_number: cleanPhoneNumber,
      language: patientData.language || 'English',
      priority: patientData.priority
    };
    
    // Insert patient data
    const { data, error } = await supabase
      .from('patients')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert patient data: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}