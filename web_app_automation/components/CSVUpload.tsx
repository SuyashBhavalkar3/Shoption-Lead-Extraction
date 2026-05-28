"use client";

import React, { useState, useCallback } from 'react';
import { Upload, Loader2, Files } from 'lucide-react';
import Papa from 'papaparse';
import { validateHeaders } from '@/lib/utils/sanitization';
import { RawLead } from '@/lib/types';

export interface ParsedFile {
    data: RawLead[];
    fileName: string;
    mapping: Record<string, string>;
}

interface CSVUploadProps {
    onFilesReady: (files: ParsedFile[]) => void;
    onError: (error: string) => void;
    isLoading: boolean;
}

/** Parses a single CSV File into a ParsedFile object, or returns an error string. */
function parseCSVFile(file: File): Promise<ParsedFile | { fileName: string; error: string }> {
    return new Promise((resolve) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            resolve({ fileName: file.name, error: 'Not a valid CSV file.' });
            return;
        }

        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as string[][];
                if (rows.length === 0) {
                    resolve({ fileName: file.name, error: 'The CSV file is empty.' });
                    return;
                }

                let headerRowIndex = -1;
                let mapping: Record<string, string> = {};

                for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    const validation = validateHeaders(rows[i]);
                    if (validation.isValid) {
                        headerRowIndex = i;
                        mapping = validation.mapping;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    resolve({
                        fileName: file.name,
                        error: 'Could not find mandatory columns (full_name, phone_number, campaign_id, platform).',
                    });
                    return;
                }

                const headers = rows[headerRowIndex];
                const dataRows = rows.slice(headerRowIndex + 1).map((row) => {
                    const obj: RawLead = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index];
                    });
                    return obj;
                });

                resolve({ data: dataRows, fileName: file.name, mapping });
            },
            error: (err) => {
                resolve({ fileName: file.name, error: `Parse error: ${err.message}` });
            },
        });
    });
}

export default function CSVUpload({ onFilesReady, onError, isLoading }: CSVUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isParsing, setIsParsing] = useState(false);

    const processFiles = useCallback(
        async (files: File[]) => {
            const csvFiles = files.filter(
                (f) => f.type === 'text/csv' || f.name.endsWith('.csv')
            );

            if (csvFiles.length === 0) {
                onError('No valid CSV files found. Please upload .csv files only.');
                return;
            }

            setIsParsing(true);
            const results = await Promise.all(csvFiles.map(parseCSVFile));

            const errors = results.filter((r): r is { fileName: string; error: string } => 'error' in r);
            const parsed = results.filter((r): r is ParsedFile => !('error' in r));

            if (errors.length > 0) {
                const errorMessages = errors.map((e) => `"${e.fileName}": ${e.error}`).join('\n');
                onError(`${errors.length} file(s) failed:\n${errorMessages}`);
            }

            if (parsed.length > 0) {
                onFilesReady(parsed);
            }

            setIsParsing(false);
        },
        [onFilesReady, onError]
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) processFiles(files);
        },
        [processFiles]
    );

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length > 0) processFiles(files);
        // Reset input so same files can be re-selected
        e.target.value = '';
    };

    const busy = isLoading || isParsing;

    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
                relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
                ${isDragging
                    ? 'border-primary-brand bg-primary-brand/[0.04] scale-[0.99]'
                    : 'border-card-border hover:border-muted-border hover:scale-[1.01] bg-card-bg/60 backdrop-blur-md shadow-lg shadow-black/[0.02]'
                }
                ${busy ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            <input
                type="file"
                accept=".csv"
                multiple
                onChange={onFileChange}
                disabled={busy}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />

            <div className="flex flex-col items-center justify-center space-y-4">
                <div
                    className={`p-4 rounded-2xl transition-all duration-300 ${
                        isDragging
                            ? 'bg-primary-brand/10 text-primary-brand scale-110'
                            : 'bg-bg-base text-muted-text'
                    }`}
                >
                    {busy ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                    ) : isDragging ? (
                        <Files className="w-8 h-8" />
                    ) : (
                        <Upload className="w-8 h-8" />
                    )}
                </div>

                <div className="text-center">
                    <p className="text-lg font-semibold text-text-base">
                        {busy ? 'Parsing files...' : 'Drag and drop your Meta lead CSVs'}
                    </p>
                    <p className="text-sm text-muted-text mt-1">
                        Select one or multiple .csv files at once
                    </p>
                </div>

                {!busy && (
                    <button className="px-5 py-2.5 bg-primary-brand text-white rounded-xl text-sm font-semibold hover:bg-primary-brand/95 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary-brand/15">
                        Select Files
                    </button>
                )}
            </div>
        </div>
    );
}
