import { toGujaratiNumerals } from '../constants';

// Indian states mapping: English -> Gujarati
const STATE_NAME_GU: Record<string, string> = {
  'Gujarat': 'ગુજરાત',
  'Maharashtra': 'મહારાષ્ટ્ર',
  'Rajasthan': 'રાજસ્થાન',
  'Madhya Pradesh': 'મધ્ય પ્રદેશ',
  'Delhi': 'દિલ્હી',
  'Karnataka': 'કર્ણાટક',
  'Tamil Nadu': 'તમિલનાડુ',
  'Uttar Pradesh': 'ઉત્તર પ્રદેશ',
  'West Bengal': 'પશ્ચિમ બંગાળ',
  'Andhra Pradesh': 'આંધ્ર પ્રદેશ',
  'Telangana': 'તેલંગાણા',
  'Kerala': 'કેરળ',
  'Punjab': 'પંજાબ',
  'Haryana': 'હરિયાણા',
  'Bihar': 'બિહાર',
  'Odisha': 'ઓડિશા',
  'Jharkhand': 'ઝારખંડ',
  'Chhattisgarh': 'છત્તીસગઢ',
  'Assam': 'આસામ',
  'Goa': 'ગોવા',
  'Uttarakhand': 'ઉત્તરાખંડ',
  'Himachal Pradesh': 'હિમાચલ પ્રદેશ',
  'Jammu and Kashmir': 'જમ્મુ અને કાશ્મીર',
};

// Major cities mapping: English -> Gujarati
const CITY_NAME_GU: Record<string, string> = {
  'Ahmedabad': 'અમદાવાદ',
  'Surat': 'સુરત',
  'Vadodara': 'વડોદરા',
  'Rajkot': 'રાજકોટ',
  'Bhavnagar': 'ભાવનગર',
  'Jamnagar': 'જામનગર',
  'Junagadh': 'જુનાગઢ',
  'Gandhinagar': 'ગાંધીનગર',
  'Anand': 'આણંદ',
  'Nadiad': 'નડિયાદ',
  'Morbi': 'મોરબી',
  'Mehsana': 'મહેસાણા',
  'Bharuch': 'ભરૂચ',
  'Vapi': 'વાપી',
  'Navsari': 'નવસારી',
  'Veraval': 'વેરાવળ',
  'Porbandar': 'પોરબંદર',
  'Godhra': 'ગોધરા',
  'Palanpur': 'પાલનપુર',
  'Bhuj': 'ભુજ',
  'Mumbai': 'મુંબઈ',
  'Pune': 'પુણે',
  'Delhi': 'દિલ્હી',
  'Bangalore': 'બેંગલોર',
  'Chennai': 'ચેન્નઈ',
  'Kolkata': 'કોલકાતા',
  'Hyderabad': 'હૈદરાબાદ',
  'Jaipur': 'જયપુર',
  'Lucknow': 'લખનૌ',
  'Indore': 'ઇન્દોર',
};

/**
 * Translates a state name to Gujarati if available.
 */
export function translateState(state: string | undefined | null, useGujarati: boolean): string {
  if (!state) return '';
  if (!useGujarati) return state;
  // Try exact match first, then case-insensitive
  return STATE_NAME_GU[state] || STATE_NAME_GU[state.trim()] || state;
}

/**
 * Translates a city name to Gujarati if available.
 */
export function translateCity(city: string | undefined | null, useGujarati: boolean): string {
  if (!city) return '';
  if (!useGujarati) return city;
  // Try exact match first, then case-insensitive
  return CITY_NAME_GU[city] || CITY_NAME_GU[city.trim()] || city;
}

export interface FormatWeightOptions {
  label?: string;
  useGujarati?: boolean;
  t?: (key: string, opts?: Record<string, unknown>) => string;
}

/**
 * Formats weight in grams to a human-readable string.
 * Supports:
 * - Custom labels (weight_label from server)
 * - Gujarati numerals
 * - i18n translation keys
 * - Automatic g/kg conversion
 */
export function formatWeight(
  grams: number,
  options?: FormatWeightOptions
): string {
  // If a custom label is provided, use it directly
  if (options?.label) return options.label;

  const toNum = options?.useGujarati ? toGujaratiNumerals : String;

  if (grams >= 1000) {
    const kg = grams / 1000;
    const value = toNum(Number.isInteger(kg) ? kg : kg.toFixed(1));
    return options?.t ? options.t('product.weightKg', { value }) : `${value} kg`;
  }

  const value = toNum(grams);
  return options?.t ? options.t('product.weightGrams', { value }) : `${value}g`;
}
