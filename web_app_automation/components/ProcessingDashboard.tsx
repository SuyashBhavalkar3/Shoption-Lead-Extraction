"use client";

import React, { useState, useCallback } from 'react';
import {
    Download, CheckCircle2, AlertCircle, RefreshCcw,
    FileSpreadsheet, Activity, Loader2, ChevronDown, ChevronUp, FileX2, Files
} from 'lucide-react';
import Papa from 'papaparse';
import CSVUpload, { ParsedFile } from './CSVUpload';
import LogConsole from './LogConsole';
import DataPreview from './DataPreview';
import { processCSVData, FIXED_SCHEMA_HEADERS } from '@/lib/utils/csv-processor';
import { FileResult } from '@/lib/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function generateCSVBlob(result: NonNullable<FileResult['result']>): string {
    return Papa.unparse({ fields: result.headers, data: result.data });
}

function triggerDownload(csvString: string, filename: string) {
    const csvWithBom = '\uFEFF' + csvString;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function uniqueId(name: string) {
    return `${Date.now()}-${name}`;
}

function to24HourTime(hour12: string, minute: string, meridiem: 'AM' | 'PM'): string {
    const parsedHour = Number(hour12);
    const parsedMinute = Number(minute);
    if (!Number.isInteger(parsedHour) || parsedHour < 1 || parsedHour > 12) return '';
    if (!Number.isInteger(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) return '';
    let hour24 = parsedHour % 12;
    if (meridiem === 'PM') hour24 += 12;
    return `${String(hour24).padStart(2, '0')}:${String(parsedMinute).padStart(2, '0')}`;
}

function from24HourTime(time: string): { hour12: string; minute: string; meridiem: 'AM' | 'PM' } {
    const match = time.match(/^(\d{2}):(\d{2})$/);
    if (!match) {
        return { hour12: '10', minute: '00', meridiem: 'AM' };
    }
    const hour24 = Number(match[1]);
    const minute = match[2];
    const meridiem: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return { hour12: String(hour12), minute, meridiem };
}

interface SourceFile {
    id: string;
    fileName: string;
    data: ParsedFile['data'];
    mapping: ParsedFile['mapping'];
}

// ─── FileCard ────────────────────────────────────────────────────────────────

function FileCard({ fr }: { fr: FileResult }) {
    const [open, setOpen] = useState(false);

    const handleDownload = () => {
        if (!fr.result) return;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        triggerDownload(generateCSVBlob(fr.result), `sanitized_${fr.fileName}_${ts}.csv`);
    };

    return (
        <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden transition-all duration-300">
            {/* ── Card Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                {/* Left: status + name */}
                <div className="flex items-center gap-3 min-w-0">
                    {fr.status === 'processing' && (
                        <Loader2 className="w-5 h-5 text-primary-brand animate-spin shrink-0" />
                    )}
                    {fr.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5 text-primary-brand shrink-0" />
                    )}
                    {fr.status === 'error' && (
                        <FileX2 className="w-5 h-5 text-muted-text shrink-0" />
                    )}
                    <span className="font-semibold text-text-base text-sm truncate">{fr.fileName}</span>
                </div>

                {/* Right: stats + buttons */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                    {fr.status === 'processing' && (
                        <span className="text-xs text-muted-text font-medium">Processing…</span>
                    )}

                    {fr.status === 'success' && fr.result && (
                        <>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-bg-base rounded-lg text-text-base border border-card-border">
                                {fr.result.summary.totalRows} rows
                            </span>
                            <span className="text-xs font-semibold px-2.5 py-1 bg-card-bg text-primary-brand rounded-lg border border-card-border">
                                {fr.result.summary.processedRows} ok
                            </span>
                            {fr.result.summary.failedRows > 0 && (
                                <span className="text-xs font-semibold px-2.5 py-1 bg-bg-base text-muted-text rounded-lg border border-card-border">
                                    {fr.result.summary.failedRows} failed
                                </span>
                            )}
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-brand text-bg-base text-xs font-bold rounded-xl hover:bg-primary-brand active:scale-95 transition-all"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download
                            </button>
                            <button
                                onClick={() => setOpen((o) => !o)}
                                className="p-1.5 text-muted-text hover:text-text-base bg-bg-base border border-card-border rounded-xl transition-all active:scale-95"
                                title={open ? 'Collapse' : 'Expand preview & logs'}
                            >
                                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </>
                    )}

                    {fr.status === 'error' && (
                        <span className="text-xs text-muted-text font-semibold max-w-[260px] truncate" title={fr.error}>
                            {fr.error}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Expanded Section ── */}
            {open && fr.status === 'success' && fr.result && (
                <div className="border-t border-card-border grid grid-cols-1 lg:grid-cols-3 gap-0">
                    <div className="lg:col-span-2 p-5">
                        <DataPreview data={fr.result.data} headers={fr.result.headers} />
                    </div>
                    <div className="lg:col-span-1 p-5 border-t lg:border-t-0 lg:border-l border-card-border">
                        <LogConsole logs={fr.result.logs} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── ProcessingDashboard ────────────────────────────────────────────────────

export default function ProcessingDashboard() {
    const [fileResults, setFileResults] = useState<FileResult[]>([]);
    const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [timeFilterEnabled, setTimeFilterEnabled] = useState(false);
    const [selectedHour, setSelectedHour] = useState('10');
    const [selectedMinute, setSelectedMinute] = useState('00');
    const [selectedMeridiem, setSelectedMeridiem] = useState<'AM' | 'PM'>('AM');

    const isProcessing = fileResults.some((f) => f.status === 'processing');
    const successResults = fileResults.filter((f) => f.status === 'success' && f.result);
    const hasResults = fileResults.length > 0;

    // ── Aggregate stats across all files ──
    const totalRows = successResults.reduce((s, f) => s + (f.result?.summary.totalRows ?? 0), 0);
    const processedRows = successResults.reduce((s, f) => s + (f.result?.summary.processedRows ?? 0), 0);
    const skippedRows = successResults.reduce((s, f) => s + (f.result?.summary.skippedRows ?? 0), 0);
    const failedRows = successResults.reduce((s, f) => s + (f.result?.summary.failedRows ?? 0), 0);
    const skippedOrFailedRows = skippedRows + failedRows;

    // ── Handle multiple uploaded files ──
    const reprocessAll = useCallback((files: SourceFile[], timeValue: string) => {
        const results: FileResult[] = files.map((sf) => {
            try {
                const result = processCSVData(sf.data, sf.mapping, timeValue || null);
                return {
                    id: sf.id,
                    fileName: sf.fileName,
                    status: 'success',
                    result
                };
            } catch (err) {
                return {
                    id: sf.id,
                    fileName: sf.fileName,
                    status: 'error',
                    error: err instanceof Error ? err.message : 'Unexpected error',
                };
            }
        });
        setFileResults(results);
    }, []);

    const handleFilesReady = useCallback((parsedFiles: ParsedFile[]) => {
        setGlobalError(null);
        const newlyAdded: SourceFile[] = parsedFiles.map((pf) => ({
            id: uniqueId(pf.fileName),
            fileName: pf.fileName,
            data: pf.data,
            mapping: pf.mapping,
        }));
        setSourceFiles((prev) => {
            const combined = [...prev, ...newlyAdded];
            reprocessAll(combined, selectedTime);
            return combined;
        });
    }, [reprocessAll, selectedTime]);

    const applyClockTime = useCallback(
        (hour: string, minute: string, meridiem: 'AM' | 'PM') => {
            const nextTime = to24HourTime(hour, minute, meridiem);
            if (!nextTime) return;
            setSelectedHour(hour);
            setSelectedMinute(minute);
            setSelectedMeridiem(meridiem);
            setSelectedTime(nextTime);
            setTimeFilterEnabled(true);
            reprocessAll(sourceFiles, nextTime);
        },
        [reprocessAll, sourceFiles]
    );

    // ── Download all files merged into one CSV ──
    const handleDownloadAll = () => {
        const combined = successResults.flatMap((f) =>
            f.result!.data.map((row, index) => ({
                row,
                sortKey: f.result!.sortKeys[index] ?? ''
            }))
        );

        if (combined.length === 0) return;

        combined.sort((a, b) =>
            a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true, sensitivity: 'base' })
        );

        const csv = Papa.unparse({ fields: FIXED_SCHEMA_HEADERS, data: combined.map((entry) => entry.row) });
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        triggerDownload(csv, `sanitized_all_${ts}.csv`);
    };

    const reset = () => {
        setFileResults([]);
        setSourceFiles([]);
        setSelectedTime('');
        setTimeFilterEnabled(false);
        setSelectedHour('10');
        setSelectedMinute('00');
        setSelectedMeridiem('AM');
        setGlobalError(null);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-text-base">
                        CRM CSV Sanitizer
                    </h1>
                    <p className="text-muted-text mt-1 text-sm font-medium">
                        Production-safe lead data transformation tool
                    </p>
                </div>

                {hasResults && (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={reset}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-text hover:text-text-base bg-card-bg border border-card-border hover:bg-bg-base rounded-xl transition-all active:scale-95"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* ── Upload Zone ── */}
            <CSVUpload
                onFilesReady={handleFilesReady}
                onError={setGlobalError}
                isLoading={isProcessing}
            />

            <div className="bg-card-bg border border-card-border rounded-2xl p-4 md:p-5">
                <div className="flex flex-col gap-4">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-base">Time Filter (created_time)</p>
                        <p className="text-xs text-muted-text mt-0.5">
                            Select time only (inclusive). Example: `10:00` keeps leads from 10:00 onward.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-2 text-sm text-text-base font-medium">
                            <input
                                type="checkbox"
                                checked={timeFilterEnabled}
                                onChange={(e) => {
                                    const enabled = e.target.checked;
                                    setTimeFilterEnabled(enabled);
                                    if (!enabled) {
                                        setSelectedTime('');
                                        reprocessAll(sourceFiles, '');
                                        return;
                                    }
                                    const nextTime = to24HourTime(selectedHour, selectedMinute, selectedMeridiem);
                                    setSelectedTime(nextTime);
                                    reprocessAll(sourceFiles, nextTime);
                                }}
                                className="h-4 w-4 rounded border-card-border"
                            />
                            Enable time filter
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={selectedHour}
                            disabled={!timeFilterEnabled}
                            onChange={(e) => applyClockTime(e.target.value, selectedMinute, selectedMeridiem)}
                            className="px-3 py-2 rounded-xl border border-card-border bg-bg-base text-text-base text-sm disabled:opacity-50"
                        >
                            {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                                <option key={h} value={h}>{h}</option>
                            ))}
                        </select>
                        <span className="text-muted-text font-semibold">:</span>
                        <select
                            value={selectedMinute}
                            disabled={!timeFilterEnabled}
                            onChange={(e) => applyClockTime(selectedHour, e.target.value, selectedMeridiem)}
                            className="px-3 py-2 rounded-xl border border-card-border bg-bg-base text-text-base text-sm disabled:opacity-50"
                        >
                            {Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')).map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <select
                            value={selectedMeridiem}
                            disabled={!timeFilterEnabled}
                            onChange={(e) => applyClockTime(selectedHour, selectedMinute, e.target.value as 'AM' | 'PM')}
                            className="px-3 py-2 rounded-xl border border-card-border bg-bg-base text-text-base text-sm disabled:opacity-50"
                        >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                        <button
                            onClick={() => {
                                setSelectedTime('');
                                setTimeFilterEnabled(false);
                                reprocessAll(sourceFiles, '');
                            }}
                            className="px-3 py-2 rounded-xl border border-card-border text-sm font-semibold text-muted-text hover:text-text-base hover:bg-bg-base transition-all"
                        >
                            None (All)
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {['09:00', '10:00', '12:00', '15:00', '18:00'].map((preset) => (
                            <button
                                key={preset}
                                onClick={() => {
                                    const parsed = from24HourTime(preset);
                                    applyClockTime(parsed.hour12, parsed.minute, parsed.meridiem);
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-card-border text-xs font-semibold text-muted-text hover:text-text-base hover:bg-bg-base transition-all"
                            >
                                {preset}
                            </button>
                        ))}
                        {selectedTime && timeFilterEnabled && (
                            <span className="text-xs text-muted-text">Active: {selectedTime}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Global Error ── */}
            {globalError && (
                <div className="p-4 bg-bg-base border border-card-border rounded-2xl flex items-start gap-3 text-muted-text animate-in fade-in duration-300">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold whitespace-pre-line">{globalError}</p>
                </div>
            )}

            {/* ── Aggregate Stats (shown only once there are results) ── */}
            {hasResults && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card-bg p-6 rounded-2xl border border-card-border">
                        <p className="text-sm font-semibold text-muted-text">Total Rows</p>
                        <p className="text-3xl font-extrabold text-text-base mt-1">{totalRows}</p>
                        <p className="text-xs text-muted-text mt-0.5">{successResults.length} file(s) processed</p>
                    </div>
                    <div className="bg-card-bg p-6 rounded-2xl border border-card-border">
                        <p className="text-sm font-semibold text-muted-text">Processed Successfully</p>
                        <p className="text-3xl font-extrabold text-primary-brand mt-1">{processedRows}</p>
                    </div>
                    <div className="bg-card-bg p-6 rounded-2xl border border-card-border">
                        <p className="text-sm font-semibold text-muted-text">Skipped / Failed</p>
                        <p className="text-3xl font-extrabold text-text-base mt-1">{skippedOrFailedRows}</p>
                    </div>
                </div>
            )}

            {/* ── Per-file Result Cards ── */}
            {hasResults && (
                <div className="space-y-4">
                    {successResults.length > 1 && (
                        <div className="flex justify-start">
                            <button
                                onClick={handleDownloadAll}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-bg-base bg-primary-brand hover:bg-primary-brand rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Files className="w-4 h-4" />
                                Download Combined Sanitized
                            </button>
                        </div>
                    )}
                    {fileResults.map((fr) => (
                        <FileCard key={fr.id} fr={fr} />
                    ))}
                </div>
            )}

            {/* ── Feature Cards (shown on empty state) ── */}
            {!hasResults && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                    {[
                        { title: 'Strict Schema', desc: 'Maintains 100% fixed column order and naming for CRM compatibility.', icon: FileSpreadsheet },
                        { title: 'Safe Sanitization', desc: 'Predictable cleaning for phone numbers and campaign IDs.', icon: CheckCircle2 },
                        { title: 'Real-time Logs', desc: 'Detailed processing logs and validation error reporting per file.', icon: Activity },
                    ].map((feature, i) => (
                        <div
                            key={i}
                            className="p-6 bg-card-bg border border-card-border rounded-2xl hover:scale-[1.02] transition-all duration-300"
                        >
                            <div className="w-12 h-12 bg-bg-base text-primary-brand rounded-xl flex items-center justify-center mb-4">
                                <feature.icon className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-text-base mb-2">{feature.title}</h3>
                            <p className="text-sm text-muted-text leading-relaxed font-medium">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
