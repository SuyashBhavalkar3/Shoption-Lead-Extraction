import { ProcessingResult, ProcessingLog, RawLead } from '../types';
import {
    sanitizePhoneNumber,
    sanitizeCampaignId,
    generateEmailFromPhone,
    extractCity
} from './sanitization';

export const FIXED_SCHEMA_HEADERS = [
    'Full Name',
    'Phone Number',
    'Email',
    'Campaign ID',
    'Source',
    'City',
    'Q1',
    'Q2',
    'Q3',
    'Q4',
    'Q5',
    'Q6',
    'Q7',
    'Q8',
    'Q9',
    'Q10',
    'Answer  1',
    'Answer  2',
    'Answer  3',
    'Answer  4',
    'Answer  5',
    'Answer  6',
    'Answer  7',
    'Answer  8',
    'Answer  9',
    'Answer  10',
    'Coloumn 1',
    'Coloumn 2',
    'Coloumn 3',
    'Coloumn 4',
    'Coloumn 5',
    'Coloumn 6',
    'Coloumn 7',
    'Coloumn 8',
    'Coloumn 9',
    'Coloumn 10',
    'Coloumn 10' // Intentionally duplicated
];

export function processCSVData(rawData: RawLead[], headerMapping: Record<string, string>): ProcessingResult {
    const logs: ProcessingLog[] = [];
    const processedData: string[][] = [];
    let processedRows = 0;
    let failedRows = 0;

    const timestamp = new Date().toLocaleTimeString();
    logs.push({
        type: 'info',
        message: `Started processing ${rawData.length} rows with mapping: ${JSON.stringify(headerMapping)}`,
        timestamp
    });

    rawData.forEach((row, index) => {
        try {
            // Basic row validation - must have at least one valid value
            const values = Object.values(row).filter(v => v !== null && v !== undefined && v !== '');
            if (values.length === 0) {
                return; // Silent skip for empty rows
            }

            const fullname = String(row[headerMapping['full_name']] || "");
            const rawPhone = String(row[headerMapping['phone_number']] || "");
            const phone = sanitizePhoneNumber(rawPhone);
            const email = generateEmailFromPhone(phone);
            const campaignId = sanitizeCampaignId(String(row[headerMapping['campaign_id']] || ""));
            const source = String(row[headerMapping['platform']] || "");
            const cityKey = headerMapping['city'];
            const city = extractCity(String((cityKey && row[cityKey]) || row['street_address'] || row['City'] || ""));
            const col1 = String(row['ad_name'] || row['campaign_name'] || "");

            // Identify Marathi questions (columns with non-ASCII or specific patterns)
            // Usually these are columns that are NOT in our mapping or other standard fields
            const usedKeys = Object.values(headerMapping).concat(['street_address', 'zip_code', 'inbox_url', 'created_time', 'id', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_name', 'form_id', 'form_name', 'is_organic', 'email']);

            const potentialMarathiKeys = Object.keys(row).filter(key =>
                !usedKeys.includes(key) && key.length > 5 // Heuristic: Marathi questions are usually long
            );

            // Extract up to 10 questions and their answers dynamically
            const questions = Array(10).fill("");
            const answers = Array(10).fill("");

            for (let i = 0; i < 10; i++) {
                const qKey = potentialMarathiKeys[i];
                if (qKey) {
                    questions[i] = qKey;
                    answers[i] = String(row[qKey] || "");
                }
            }

            // Map to strict array order corresponding to FIXED_SCHEMA_HEADERS
            const rowOutput = [
                fullname,      // Full Name
                phone,         // Phone Number
                email,         // Email
                campaignId,    // Campaign ID
                source,        // Source
                city,          // City
                ...questions,  // Q1-Q10
                ...answers,    // Answer  1-Answer  10
                col1,          // Coloumn 1
                "", "", "", "", "", "", "", "", "", "" // Coloumn 2-10 (10 is duplicated in headers)
            ];

            processedData.push(rowOutput);
            processedRows++;
        } catch (error) {
            failedRows++;
            logs.push({
                type: 'error',
                message: `Error processing row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    });

    logs.push({
        type: 'success',
        message: `Completed processing. ${processedRows} rows processed successfully.`,
        timestamp: new Date().toLocaleTimeString()
    });

    return {
        data: processedData,
        headers: FIXED_SCHEMA_HEADERS,
        logs,
        summary: {
            totalRows: rawData.length,
            processedRows,
            failedRows
        }
    };
}
