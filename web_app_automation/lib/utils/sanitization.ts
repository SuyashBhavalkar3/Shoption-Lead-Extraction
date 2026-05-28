/**
 * Sanitizes phone number:
 * - Remove prefixes like p:, +91
 * - Remove spaces and special characters
 * - Keep only numeric digits
 * - Prefer last 10 digits
 */
export function sanitizePhoneNumber(value: string | undefined): string {
    if (!value) return "";

    // Remove p:, p : or other prefixes and non-numeric characters
    const cleaned = value.replace(/^[pPcC]\s*:\s*/i, "").replace(/[^0-9]/g, "");

    // Handle +91 prefix if it exists after cleaning but before slicing
    // If the number starts with 91 and has 12 digits, it's likely a +91 number
    let result = cleaned;
    if (result.startsWith("91") && result.length > 10) {
        result = result.slice(2);
    }

    // Return last 10 digits
    return result.slice(-10);
}

/**
 * Sanitizes Campaign ID:
 * - Only keep numeric digits
 */
export function sanitizeCampaignId(value: string | undefined): string {
    if (!value) return "";

    // Remove prefixes like c:, campaign: and keep only digits
    return value.replace(/[^0-9]/g, "");
}

/**
 * Generates email from sanitized phone number
 */
export function generateEmailFromPhone(phone: string): string {
    if (!phone) return "";
    return `${phone}@gmail.com`;
}

/**
 * Extracts city from street address
 * Simple heuristic: last part of address usually contains city or just return blank if too complex
 */
export function extractCity(address: string | undefined): string {
    if (!address) return "";

    // Basic heuristic: often addresses are comma separated
    const parts = address.split(',').map(p => p.trim());
    if (parts.length > 1) {
        // Return second to last part or last part depending on common formats
        // For now, let's just return the last part as a placeholder or improve if needed
        return parts[parts.length - 1];
    }

    return address;
}

/**
 * Maps expected mandatory columns to their possible aliases in raw CSVs
 */
const MANDATORY_ALIASES: Record<string, string[]> = {
    'full_name': ['full_name', 'fullname', 'name', 'Full Name'],
    'phone_number': ['phone_number', 'phone', 'mobile', 'Phone Number'],
    'campaign_id': ['campaign_id', 'campaign', 'Campaign ID'],
    'platform': ['platform', 'source', 'Source', 'Platform']
};

/**
 * Maps optional City/Address columns to their possible aliases in raw CSVs
 */
const CITY_ALIASES = [
    'city', 'City', 'CITY',
    'adress', 'Adress', 'ADRESS',
    'address', 'Address', 'ADDRESS',
    'street_address', 'street_adress', 'Street_Address', 'Street Address',
    'street-address', 'street-adress', 'street address', 'street adress'
];

/**
 * Validates if the raw data has the mandatory columns (or their aliases)
 * and maps optional city/address headers.
 */
export function validateHeaders(headers: string[]): { isValid: boolean; missing: string[]; mapping: Record<string, string> } {
    const missing: string[] = [];
    const mapping: Record<string, string> = {};

    Object.entries(MANDATORY_ALIASES).forEach(([key, aliases]) => {
        const foundAlias = aliases.find(alias => headers.includes(alias));
        if (foundAlias) {
            mapping[key] = foundAlias;
        } else {
            missing.push(key);
        }
    });

    // Match optional city column
    const foundCityAlias = CITY_ALIASES.find(alias => headers.includes(alias));
    if (foundCityAlias) {
        mapping['city'] = foundCityAlias;
    }

    return {
        isValid: missing.length === 0,
        missing,
        mapping
    };
}
