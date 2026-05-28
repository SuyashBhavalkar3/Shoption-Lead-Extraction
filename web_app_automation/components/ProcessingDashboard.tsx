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
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
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

// ─── FileCard ────────────────────────────────────────────────────────────────

function FileCard({ fr }: { fr: FileResult }) {
    const [open, setOpen] = useState(false);

    const handleDownload = () => {
        if (!fr.result) return;
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        triggerDownload(generateCSVBlob(fr.result), `sanitized_${fr.fileName}_${ts}.csv`);
    };

    return (
        <div className="bg-card-bg/60 backdrop-blur-md border border-card-border rounded-2xl overflow-hidden shadow-md transition-all duration-300">
            {/* ── Card Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                {/* Left: status + name */}
                <div className="flex items-center gap-3 min-w-0">
                    {fr.status === 'processing' && (
                        <Loader2 className="w-5 h-5 text-primary-brand animate-spin shrink-0" />
                    )}
                    {fr.status === 'success' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                    {fr.status === 'error' && (
                        <FileX2 className="w-5 h-5 text-rose-500 shrink-0" />
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
                            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
                                {fr.result.summary.processedRows} ok
                            </span>
                            {fr.result.summary.failedRows > 0 && (
                                <span className="text-xs font-semibold px-2.5 py-1 bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20">
                                    {fr.result.summary.failedRows} failed
                                </span>
                            )}
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-brand text-white text-xs font-bold rounded-xl hover:bg-primary-brand/90 active:scale-95 transition-all shadow-sm"
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
                        <span className="text-xs text-rose-500 font-semibold max-w-[260px] truncate" title={fr.error}>
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
    const [globalError, setGlobalError] = useState<string | null>(null);

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
    const handleFilesReady = useCallback((parsedFiles: ParsedFile[]) => {
        setGlobalError(null);

        // Create placeholder entries in "processing" state
        const placeholders: FileResult[] = parsedFiles.map((pf) => ({
            id: uniqueId(pf.fileName),
            fileName: pf.fileName,
            status: 'processing',
        }));

        setFileResults((prev) => [...prev, ...placeholders]);

        // Process each file independently (with a small stagger for UX)
        parsedFiles.forEach((pf, idx) => {
            const id = placeholders[idx].id;
            setTimeout(() => {
                try {
                    const result = processCSVData(pf.data, pf.mapping);
                    setFileResults((prev) =>
                        prev.map((fr) =>
                            fr.id === id ? { ...fr, status: 'success', result } : fr
                        )
                    );
                } catch (err) {
                    setFileResults((prev) =>
                        prev.map((fr) =>
                            fr.id === id
                                ? {
                                      ...fr,
                                      status: 'error',
                                      error:
                                          err instanceof Error
                                              ? err.message
                                              : 'Unexpected error',
                                  }
                                : fr
                        )
                    );
                }
            }, idx * 200); // stagger 200ms per file for smoother UX
        });
    }, []);

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
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-text hover:text-text-base bg-card-bg border border-card-border hover:bg-bg-base/80 rounded-xl transition-all shadow-sm active:scale-95"
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

            {/* ── Global Error ── */}
            {globalError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-500 animate-in fade-in duration-300">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold whitespace-pre-line">{globalError}</p>
                </div>
            )}

            {/* ── Aggregate Stats (shown only once there are results) ── */}
            {hasResults && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-card-bg/60 backdrop-blur-md p-6 rounded-2xl border border-card-border shadow-md">
                        <p className="text-sm font-semibold text-muted-text">Total Rows</p>
                        <p className="text-3xl font-extrabold text-text-base mt-1">{totalRows}</p>
                        <p className="text-xs text-muted-text mt-0.5">{successResults.length} file(s) processed</p>
                    </div>
                    <div className="bg-card-bg/60 backdrop-blur-md p-6 rounded-2xl border border-card-border border-l-4 border-l-emerald-500 shadow-md">
                        <p className="text-sm font-semibold text-muted-text">Processed Successfully</p>
                        <p className="text-3xl font-extrabold text-emerald-500 mt-1">{processedRows}</p>
                    </div>
                    <div className="bg-card-bg/60 backdrop-blur-md p-6 rounded-2xl border border-card-border border-l-4 border-l-rose-500 shadow-md">
                        <p className="text-sm font-semibold text-muted-text">Skipped / Failed</p>
                        <p className="text-3xl font-extrabold text-rose-500 mt-1">{skippedOrFailedRows}</p>
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
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-primary-brand hover:bg-primary-brand/90 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="p-6 bg-card-bg/60 backdrop-blur-md border border-card-border rounded-2xl shadow-lg hover:scale-[1.02] transition-all duration-300"
                        >
                            <div className="w-12 h-12 bg-primary-brand/10 text-primary-brand rounded-xl flex items-center justify-center mb-4">
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
