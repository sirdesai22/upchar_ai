// Test file to demonstrate phone number formatting
// This is for demonstration purposes only

function formatPhoneNumber(phoneNumber) {
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

// Test cases
const testCases = [
  "whatsapp:+916362805484",
  "+916362805484", 
  "916362805484",
  "6362805484",
  "whatsapp:+91 636 280 5484",
  "+91 (636) 280-5484",
  "636-280-5484"
];

console.log("Phone Number Formatting Test Results:");
console.log("=====================================");

testCases.forEach(testCase => {
  const result = formatPhoneNumber(testCase);
  console.log(`Input: "${testCase}" -> Output: "${result}"`);
});

console.log("\nAll numbers should output: 6362805484"); 