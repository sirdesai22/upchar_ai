import { SarvamAIClient } from "sarvamai";

// Language code mapping
export const LANGUAGE_CODES: { [key: string]: string } = {
  'english': 'en',
  'hindi': 'hi-IN',
  'bengali': 'bn',
  'tamil': 'ta',
  'telugu': 'te',
  'marathi': 'mr',
  'gujarati': 'gu',
  'kannada': 'kn',
  'malayalam': 'ml',
  'punjabi': 'pa',
  'odia': 'or',
  'oriya': 'or',
  'assamese': 'as',
  'en': 'en',
  'hi': 'hi-IN',
  'bn': 'bn',
  'ta': 'ta',
  'te': 'te',
  'mr': 'mr',
  'gu': 'gu',
  'kn': 'kn',
  'ml': 'ml',
  'pa': 'pa',
  'or': 'or',
  'as': 'as'
};

export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  speakerGender?: 'Male' | 'Female';
}

export interface TranslationResponse {
  success: boolean;
  translatedText?: string;
  error?: string;
  originalText?: string;
  targetLanguage?: string;
}

class SarvamService {
  private client: SarvamAIClient;

  constructor() {
    const apiKey = process.env.SARVAM_API_KEY;
    
    if (!apiKey) {
      throw new Error('SARVAM_API_KEY environment variable is required');
    }

    this.client = new SarvamAIClient({
      apiSubscriptionKey: apiKey
    });
  }

  /**
   * Get language code from language name or code
   * @param language - Language name or code
   * @returns string - Standardized language code
   */
  private getLanguageCode(language: string): string {
    const normalizedLanguage = language.toLowerCase().trim();
    return LANGUAGE_CODES[normalizedLanguage] || 'en';
  }

  /**
   * Translate text using SarvamAI
   * @param text - Text to translate
   * @param options - Translation options
   * @returns Promise<TranslationResponse> - Translation result
   */
  async translateText(text: string, options: TranslationOptions): Promise<TranslationResponse> {
    try {
      // If target language is English, return original text
      if (options.targetLanguage.toLowerCase() === 'english' || options.targetLanguage.toLowerCase() === 'en') {
        return {
          success: true,
          translatedText: text,
          originalText: text,
          targetLanguage: 'en'
        };
      }

      const targetLanguageCode = this.getLanguageCode(options.targetLanguage);
      const sourceLanguageCode = options.sourceLanguage ? this.getLanguageCode(options.sourceLanguage) : 'auto';

      const response = await this.client.text.translate({
        input: text,
        source_language_code: sourceLanguageCode as any,
        target_language_code: targetLanguageCode as any,
        speaker_gender: options.speakerGender || 'Male'
      });

      return {
        success: true,
        translatedText: response.translated_text || text,
        originalText: text,
        targetLanguage: targetLanguageCode
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Translation failed',
        originalText: text,
        targetLanguage: options.targetLanguage
      };
    }
  }

  /**
   * Translate Gemini response for patient
   * @param geminiResponse - Response from Gemini AI
   * @param patientLanguage - Patient's preferred language
   * @param speakerGender - Speaker gender for voice (optional)
   * @returns Promise<TranslationResponse> - Translated response
   */
  async translateGeminiResponse(
    geminiResponse: string, 
    patientLanguage: string, 
    speakerGender?: 'Male' | 'Female'
  ): Promise<TranslationResponse> {
    return this.translateText(geminiResponse, {
      targetLanguage: patientLanguage,
      speakerGender
    });
  }

  /**
   * Translate registration completion message
   * @param message - Registration completion message
   * @param patientLanguage - Patient's preferred language
   * @returns Promise<TranslationResponse> - Translated message
   */
  async translateRegistrationMessage(
    message: string, 
    patientLanguage: string
  ): Promise<TranslationResponse> {
    return this.translateText(message, {
      targetLanguage: patientLanguage,
      speakerGender: 'Female' // Use female voice for healthcare messages
    });
  }

  /**
   * Translate error messages
   * @param errorMessage - Error message to translate
   * @param patientLanguage - Patient's preferred language
   * @returns Promise<TranslationResponse> - Translated error message
   */
  async translateErrorMessage(
    errorMessage: string, 
    patientLanguage: string
  ): Promise<TranslationResponse> {
    return this.translateText(errorMessage, {
      targetLanguage: patientLanguage,
      speakerGender: 'Female'
    });
  }

  /**
   * Check if translation is needed
   * @param targetLanguage - Target language
   * @returns boolean - True if translation is needed
   */
  isTranslationNeeded(targetLanguage: string): boolean {
    const languageCode = this.getLanguageCode(targetLanguage);
    return languageCode !== 'en';
  }

  /**
   * Get supported languages
   * @returns string[] - Array of supported language names
   */
  getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_CODES).filter(key => key.length > 2); // Only language names, not codes
  }

  /**
   * Validate language support
   * @param language - Language to validate
   * @returns boolean - True if language is supported
   */
  isLanguageSupported(language: string): boolean {
    const normalizedLanguage = language.toLowerCase().trim();
    return LANGUAGE_CODES.hasOwnProperty(normalizedLanguage);
  }
}

// Export singleton instance
export const sarvamService = new SarvamService();

// Export default instance
export default sarvamService; 