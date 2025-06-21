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
    console.log('🔍 === CHECKING PHONE EXISTS ===');
    console.log('📱 Original phone number:', phoneNumber);
    console.log('📋 Phone column:', phoneColumn);
    
    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('🧹 Cleaned phone number:', cleanPhoneNumber);
    
    console.log('🔍 Querying patients table...');
    // Query the patients table
    const { data, error } = await supabase
      .from('patients')
      .select(phoneColumn)
      .eq(phoneColumn, cleanPhoneNumber)
      .limit(1);

    console.log('📊 Supabase query result:', { data, error });

    if (error) {
      console.error('❌ Supabase query error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Database query failed: ${error.message}`);
    }

    const exists = data && data.length > 0;
    console.log('✅ Phone exists check result:', exists);
    console.log('📊 Records found:', data?.length || 0);

    // Return true if any records were found
    return exists;
  } catch (error) {
    console.error('❌ Error checking phone existence:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
    console.log('🔍 === GETTING PATIENT BY PHONE ===');
    console.log('📱 Original phone number:', phoneNumber);
    
    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    console.log('🧹 Cleaned phone number:', cleanPhoneNumber);
    
    console.log('🔍 Querying patients table for full data...');
    // Query the patients table
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('phone_number', cleanPhoneNumber)
      .limit(1)
      .single();

    console.log('📊 Supabase query result:', { data, error });

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        console.log('⚠️ No patient found with this phone number');
        return null;
      }
      console.error('❌ Supabase query error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log('✅ Patient data retrieved successfully:', data);
    return data;
  } catch (error) {
    console.error('❌ Error getting patient data:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
    console.log('🚀 Starting patient data insertion...');
    console.log('📊 Input data:', patientData);
    
    // Clean the phone number
    const cleanPhoneNumber = patientData.phone_number.replace(/[\s\-\(\)]/g, '');
    console.log('📱 Cleaned phone number:', cleanPhoneNumber);
    
    console.log('🎯 Priority assigned by AI:', patientData.priority);
    
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
    
    console.log('💾 Data to insert:', insertData);
    
    // Insert patient data
    console.log('🔄 Executing Supabase insert...');
    const { data, error } = await supabase
      .from('patients')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to insert patient data: ${error.message}`);
    }

    console.log('✅ Raw Supabase response:', data);

    // Log successful data storage
    console.log('✅ Patient data stored successfully:', {
      id: data.id,
      name: data.name,
      age: data.age,
      gender: data.gender,
      disease: data.disease,
      priority: data.priority,
      phone_number: data.phone_number,
      language: data.language,
      created_at: data.created_at
    });

    return data;
  } catch (error) {
    console.error('❌ Error inserting patient data:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw error;
  }
}