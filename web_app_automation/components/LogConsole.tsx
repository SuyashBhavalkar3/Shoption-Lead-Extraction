"use client";

import React, { useEffect, useRef } from 'react';
import { Terminal, Info, Copy } from 'lucide-react';
import { ProcessingLog } from '@/lib/types';

interface LogConsoleProps {
    logs: ProcessingLog[];
}

export default function LogConsole({ logs }: LogConsoleProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const copyLogs = () => {
        const logText = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
        navigator.clipboard.writeText(logText);
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'success': return <Info className="w-4 h-4 text-primary-brand" />;
            case 'error': return <Info className="w-4 h-4 text-muted-text" />;
            default: return <Info className="w-4 h-4 text-text-base" />;
        }
    };

    return (
        <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden flex flex-col h-[400px]">
            <div className="px-4 py-3 bg-bg-base flex items-center justify-between border-b border-card-border">
                <div className="flex items-center space-x-2 text-text-base">
                    <Terminal className="w-4 h-4 text-primary-brand" />
                    <span className="text-xs font-mono font-bold tracking-wider uppercase text-muted-text">Processing Logs</span>
                </div>
                <button
                    onClick={copyLogs}
                    className="text-muted-text hover:text-text-base hover:bg-bg-base p-1.5 rounded-lg transition-all active:scale-90"
                    title="Copy Logs"
                >
                    <Copy className="w-4 h-4" />
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-5 space-y-2 font-mono text-[11px] leading-relaxed"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                        <Terminal className="w-8 h-8 text-muted-text animate-pulse" />
                        <p className="text-muted-text italic text-xs">Waiting for lead data to process...</p>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="flex items-start space-x-3 group animate-in fade-in slide-in-from-bottom-1 duration-200">
                            <span className="text-muted-text shrink-0 select-none">[{log.timestamp}]</span>
                            <span className="shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
                            <span className={`
                                ${log.type === 'info' ? 'text-text-base' : ''}
                                ${log.type === 'success' ? 'text-primary-brand font-semibold' : ''}
                                ${log.type === 'warning' ? 'text-text-base font-semibold' : ''}
                                ${log.type === 'error' ? 'text-muted-text font-semibold' : ''}
                            `}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
