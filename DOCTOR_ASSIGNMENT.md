# Doctor Assignment System

## Overview

The doctor assignment system automatically assigns the most appropriate doctor to patients based on their medical condition, age, gender, and priority level. This system uses AI to analyze the patient's problem and match it with the best available doctor's specialization.

## How It Works

### 1. Patient Data Collection
When a patient books an appointment, the system collects:
- Patient name, age, gender
- Medical condition/disease
- Priority level (High/Medium/Low)
- Language preference

### 2. Doctor Database Query
The system fetches all active doctors from the database with their:
- Name and specialization
- Status (active/inactive)
- Contact information

### 3. AI-Powered Assignment
The system uses Gemini AI to:
- Analyze the patient's medical condition
- Match it with appropriate doctor specializations
- Consider urgency and priority
- Provide reasoning for the assignment

### 4. Assignment Storage
The assigned doctor information is stored in:
- Patient session (for immediate access)
- Calendar event description (for reference)
- Dashboard display (for administrators)

## Implementation Details

### Files Modified

1. **`src/services/gemini.ts`**
   - Updated `bookAppointment()` method
   - Added doctor fetching from database
   - Added AI-powered doctor assignment logic
   - Enhanced appointment booking with doctor information

2. **`src/lib/patient-sessions.ts`**
   - Extended `PatientSession` interface
   - Added assigned doctor fields:
     - `assignedDoctorId`
     - `assignedDoctorName`
     - `assignedDoctorSpecialization`
     - `assignmentReasoning`

3. **`src/services/supabase.ts`**
   - Updated `PatientData` interface
   - Modified `getPatientByPhone()` to include assigned doctor info
   - Merges database data with session data

4. **`src/components/Dashboard.tsx`**
   - Updated `Patient` interface
   - Enhanced patient cards to show assigned doctor
   - Added doctor assignment display in UI

### AI Prompt Structure

The doctor assignment uses a structured prompt that includes:

```
Patient Information:
- Name, Age, Gender
- Disease/Problem
- Priority Level

Available Doctors:
- List of all active doctors with specializations

Instructions:
- Analyze patient's condition
- Match with appropriate specialization
- Consider urgency and priority
- Return assignment with reasoning
```

### Response Format

The AI returns a JSON response:
```json
{
  "assignedDoctorId": "doctor_id",
  "assignedDoctorName": "Dr. Name",
  "assignedDoctorSpecialization": "specialization",
  "reasoning": "explanation of assignment"
}
```

## Usage Examples

### Booking an Appointment
```javascript
const result = await geminiService.bookAppointment(
  "I need to book an appointment for chest pain", 
  "+1234567890"
);
```

### Testing the System
```javascript
// Test doctor assignment
const response = await fetch('/api/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    testType: 'bookAppointment',
    message: 'Book appointment for diabetes',
    phoneNumber: '+1234567890'
  })
});
```

## Benefits

1. **Intelligent Matching**: AI analyzes medical conditions and matches with appropriate specialists
2. **Priority Consideration**: High-priority cases are assigned to appropriate specialists
3. **Transparency**: Assignment reasoning is provided and stored
4. **Fallback Handling**: If AI assignment fails, system falls back to first available doctor
5. **Visual Feedback**: Dashboard shows assigned doctors for each patient

## Error Handling

- If no doctors are available, returns appropriate error message
- If AI assignment fails, falls back to first available doctor
- If assigned doctor is no longer available, prompts for retry
- Comprehensive error logging for debugging

## Future Enhancements

1. **Load Balancing**: Consider doctor workload and availability
2. **Specialization Weighting**: Prioritize exact matches over general matches
3. **Patient History**: Consider previous doctor assignments
4. **Real-time Availability**: Check doctor's current schedule
5. **Multi-language Support**: Assignment reasoning in patient's preferred language 