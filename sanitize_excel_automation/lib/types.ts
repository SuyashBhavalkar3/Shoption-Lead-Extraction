export interface RawLead {
  full_name?: string;
  phone_number?: string;
  email?: string;
  campaign_id?: string;
  platform?: string;
  street_address?: string;
  [key: string]: string | number | boolean | undefined | null; // Replaced any with specific types
}

export interface SanitizedLead {
  'Full Name': string;
  'Phone Number': string;
  'Email': string;
  'Campaign ID': string;
  'Source': string;
  'City': string;
  'Q1': string;
  'Q2': string;
  'Q3': string;
  'Q4': string;
  'Q5': string;
  'Q6': string;
  'Q7': string;
  'Q8': string;
  'Q9': string;
  'Q10': string;
  'Answer  1': string;
  'Answer  2': string;
  'Answer  3': string;
  'Answer  4': string;
  'Answer  5': string;
  'Answer  6': string;
  'Answer  7': string;
  'Answer  8': string;
  'Answer  9': string;
  'Answer  10': string;
  'Coloumn 1': string;
  'Coloumn 2': string;
  'Coloumn 3': string;
  'Coloumn 4': string;
  'Coloumn 5': string;
  'Coloumn 6': string;
  'Coloumn 7': string;
  'Coloumn 8': string;
  'Coloumn 9': string;
  'Coloumn 10': string;
  'Coloumn 10 ': string;
}

export interface ProcessingLog {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface ProcessingResult {
  data: string[][]; // Changed from any[][]
  sortKeys: string[];
  headers: string[];
  logs: ProcessingLog[];
  summary: {
    totalRows: number;
    processedRows: number;
    skippedRows: number;
    failedRows: number;
  };
}

/** Represents the processing outcome of a single uploaded file */
export interface FileResult {
  id: string;             // unique key (timestamp + name)
  fileName: string;
  status: 'processing' | 'success' | 'error';
  result?: ProcessingResult;
  error?: string;
}
