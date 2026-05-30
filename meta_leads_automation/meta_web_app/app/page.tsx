"use client";

import { useState, useEffect } from "react";

interface LeadForm {
  id: string;
  name: string;
  status: string;
  locale: string;
}

interface FieldData {
  name: string;
  values: string[];
}

interface Lead {
  id: string;
  created_time: string;
  field_data: FieldData[];
}

export default function Home() {
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingForms, setLoadingForms] = useState<boolean>(true);
  const [loadingLeads, setLoadingLeads] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const getFilteredLeads = () => {
    return leads.filter((lead) => {
      if (!lead.created_time) return true;
      const leadDate = new Date(lead.created_time);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (leadDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (leadDate > end) return false;
      }
      return true;
    });
  };

  const filteredLeads = getFilteredLeads();

  // Fetch Forms on Mount
  useEffect(() => {
    async function fetchForms() {
      try {
        setLoadingForms(true);
        setError(null);
        const res = await fetch("/api/forms");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load forms");
        }
        const data = await res.json();
        const activeForms = data.data || [];
        setForms(activeForms);
        if (activeForms.length > 0) {
          setSelectedFormId(activeForms[0].id);
        } else {
          setSelectedFormId("");
        }
      } catch (err: any) {
        setError(err.message);
        setForms([]);
        setSelectedFormId("");
      } finally {
        setLoadingForms(false);
      }
    }
    fetchForms();
  }, []);

  // Fetch Leads when Selected Form Changes
  useEffect(() => {
    if (!selectedFormId) {
      setLeads([]);
      return;
    }

    async function fetchLeads() {
      try {
        setLoadingLeads(true);
        setLeadsError(null);
        const res = await fetch(`/api/leads?formId=${selectedFormId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load leads");
        }
        const data = await res.json();
        setLeads(data.data || []);
      } catch (err: any) {
        setLeadsError(err.message);
        setLeads([]);
      } finally {
        setLoadingLeads(false);
      }
    }
    fetchLeads();
  }, [selectedFormId]);

  // Extract all unique field names to act as dynamic columns
  const getUniqueFields = () => {
    const fields = new Set<string>();
    leads.forEach((lead) => {
      lead.field_data?.forEach((field) => {
        if (field.name) fields.add(field.name);
      });
    });
    return Array.from(fields);
  };

  const uniqueFields = getUniqueFields();

  const selectedForm = forms.find((f) => f.id === selectedFormId);

  // CSV Generation Helpers
  const convertToCSV = (headers: string[], rows: string[][]) => {
    const escapeCSV = (val: string) => {
      const formatted = val.replace(/"/g, '""');
      return `"${formatted}"`;
    };
    return [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");
  };

  const triggerDownload = (csvContent: string, filename: string) => {
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadRaw = () => {
    if (filteredLeads.length === 0) return;
    const headers = ["Lead ID", "Created Time", ...uniqueFields];
    const rows = filteredLeads.map((lead) => {
      return [
        lead.id,
        lead.created_time,
        ...uniqueFields.map((field) => {
          const matched = lead.field_data?.find((fd) => fd.name === field);
          return matched && matched.values ? matched.values.join(", ") : "";
        }),
      ];
    });

    const csv = convertToCSV(headers, rows);
    const safeName = (selectedForm?.name || "leads").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    triggerDownload(csv, `leads_raw_${safeName}.csv`);
  };

  const handleDownloadSanitized = () => {
    if (filteredLeads.length === 0) return;

    // The exact columns requested by the user
    const headers = [
      "Full Name",
      "Phone Number",
      "Email",
      "Campaign ID",
      "Source",
      "City",
      "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10",
      "Answer  1", "Answer  2", "Answer  3", "Answer  4", "Answer  5", "Answer  6", "Answer  7", "Answer  8", "Answer  9", "Answer  10",
      "Coloumn 1", "Coloumn 2", "Coloumn 3", "Coloumn 4", "Coloumn 5", "Coloumn 6", "Coloumn 7", "Coloumn 8", "Coloumn 9", "Coloumn 10", "Coloumn 10"
    ];

    const rows = filteredLeads.map((lead) => {
      const fieldData = lead.field_data || [];

      // Helper to find field value matching patterns
      const findFieldVal = (patterns: string[]) => {
        const found = fieldData.find((fd) =>
          patterns.some((p) => fd.name?.toLowerCase().includes(p.toLowerCase()))
        );
        return found && found.values ? found.values.join(", ").trim() : "";
      };

      // Retrieve values for standard fields
      const nameVal = findFieldVal(["full_name", "name", "नाव", "नाम"]);
      const rawPhone = findFieldVal(["phone_number", "phone", "mobile", "contact", "नंबर", "फोन", "मोबाईल"]);
      const phoneVal = rawPhone.replace(/[^\d+]/g, ""); // Clean phone (only digits and +)
      const emailVal = findFieldVal(["email", "ईमेल"]);
      const cityVal = findFieldVal(["city", "town", "address", "पता", "शहर", "गाव", "गांव"]);

      // Identify custom questions (fields that are not standard)
      const standardKeywords = [
        "name", "नाव", "नाम",
        "phone", "mobile", "contact", "नंबर", "फोन", "मोबाईल",
        "email", "ईमेल",
        "city", "town", "address", "पता", "शहर", "गाव", "गांव",
        "zip", "postal", "pin", "पिन", "inbox_url"
      ];
      const customFields = fieldData.filter(
        (fd) => !standardKeywords.some((keyword) => fd.name?.toLowerCase().includes(keyword))
      );

      // Map Q1-Q10 and Answer 1-Answer 10
      const qValues: string[] = Array(10).fill("");
      const aValues: string[] = Array(10).fill("");

      customFields.slice(0, 10).forEach((fd, index) => {
        qValues[index] = fd.name ? fd.name.trim() : "";
        aValues[index] = fd.values ? fd.values.join(", ").trim() : "";
      });

      // Format Created Time to YYYY-MM-DD HH:MM:SS
      let formattedTime = lead.created_time;
      try {
        const date = new Date(lead.created_time);
        if (!isNaN(date.getTime())) {
          const pad = (n: number) => n.toString().padStart(2, "0");
          formattedTime = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
            date.getDate()
          )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
        }
      } catch (e) {}

      // Construct Row according to exact requested headers
      return [
        nameVal,                                // Full Name
        phoneVal,                               // Phone Number
        emailVal,                               // Email
        (lead as any).campaign_id || "",        // Campaign ID
        "Facebook Leads",                       // Source
        cityVal,                                // City
        ...qValues,                             // Q1 to Q10
        ...aValues,                             // Answer 1 to Answer 10
        lead.id.trim(),                         // Coloumn 1 (Lead ID)
        formattedTime.trim(),                   // Coloumn 2 (Created Time)
        (lead as any).form_id || selectedFormId || "", // Coloumn 3 (Form ID)
        (lead as any).campaign_name || "",      // Coloumn 4 (Campaign Name)
        "",                                     // Coloumn 5
        "",                                     // Coloumn 6
        "",                                     // Coloumn 7
        "",                                     // Coloumn 8
        "",                                     // Coloumn 9
        "",                                     // Coloumn 10
        ""                                      // Coloumn 10 (repeated)
      ];
    });

    const csv = convertToCSV(headers, rows);
    const safeName = (selectedForm?.name || "leads").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    triggerDownload(csv, `leads_sanitized_${safeName}.csv`);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-900">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-teal-400 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20">
              <svg
                className="h-6 w-6 text-slate-950"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-300 via-emerald-300 to-green-400 bg-clip-text text-transparent">
                Meta Leads Automation
              </h1>
              <p className="text-xs text-slate-400">Secure Lead Capture & Export Portal</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            System Live
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Top Control Panel */}
        <section className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
          {/* Campaign Selection */}
          <div className="lg:col-span-2 space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Select Lead Generation Campaign Form
            </label>
            {loadingForms ? (
              <div className="h-11 w-full bg-slate-900/80 animate-pulse rounded-xl border border-slate-800 flex items-center px-4">
                <span className="text-slate-500 text-sm">Loading campaign forms...</span>
              </div>
            ) : error ? (
              <div className="text-red-400 text-sm py-2 px-3 bg-red-950/30 rounded-lg border border-red-900/50">
                ⚠️ {error}
              </div>
            ) : (
              <div className="relative">
                <select
                  id="campaign-selector"
                  value={selectedFormId}
                  onChange={(e) => setSelectedFormId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all cursor-pointer text-sm appearance-none pr-10"
                >
                  {forms.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.name} ({form.locale})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Date Filtering Inputs */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all cursor-pointer font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                End Date
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all cursor-pointer font-mono"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    title="Clear date filters"
                    className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Lead Details, Stats & Export Container */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Quick Stats Panel */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl backdrop-blur-sm flex lg:flex-col justify-between lg:justify-center items-center lg:items-start gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                Leads Filtered / Total
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-teal-400 tracking-tight">
                  {loadingLeads ? "..." : filteredLeads.length}
                </span>
                {leads.length > 0 && !loadingLeads && (
                  <span className="text-sm text-slate-400">
                    / {leads.length}
                  </span>
                )}
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-teal-950/50 flex items-center justify-center border border-teal-900/30 shrink-0">
              <svg className="h-6 w-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>

          {/* Lead Details & Export Table */}
          <div className="lg:col-span-3 bg-slate-950/40 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Leads Explorer</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Form ID: <code className="text-teal-400 select-all font-mono">{selectedFormId || "none"}</code>
                </p>
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadRaw}
                  disabled={filteredLeads.length === 0 || loadingLeads}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all shadow-md shadow-slate-950/50 disabled:opacity-40 disabled:hover:bg-slate-800 disabled:cursor-not-allowed border border-slate-700/60 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Raw CSV
                </button>
                <button
                  onClick={handleDownloadSanitized}
                  disabled={filteredLeads.length === 0 || loadingLeads}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-md shadow-teal-500/10 disabled:opacity-40 disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Download Sanitized CSV
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto max-h-[500px]">
              {loadingLeads ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 rounded-full border-4 border-teal-500/20 border-t-teal-500 animate-spin"></div>
                  <span className="text-slate-400 text-sm">Retrieving leads from Meta servers...</span>
                </div>
              ) : leadsError ? (
                <div className="p-8 text-center">
                  <div className="text-red-400 font-semibold mb-2">Failed to load leads</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">{leadsError}</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-sm">
                  <svg
                    className="mx-auto h-12 w-12 text-slate-600 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  No leads match the filter criteria for this form.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-300 font-medium select-none">
                      <th className="px-6 py-4">Lead ID</th>
                      <th className="px-6 py-4">Created Time</th>
                      {uniqueFields.map((field) => (
                        <th key={field} className="px-6 py-4 capitalize whitespace-nowrap">
                          {field.replace(/_/g, " ")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-900/35 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-teal-400 select-all font-semibold">
                          {lead.id}
                        </td>
                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                          {new Date(lead.created_time).toLocaleString()}
                        </td>
                        {uniqueFields.map((field) => {
                          const matched = lead.field_data?.find((fd) => fd.name === field);
                          const value = matched && matched.values ? matched.values.join(", ") : "-";
                          return (
                            <td key={field} className="px-6 py-4 text-slate-300 max-w-xs truncate">
                              {value}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Shoption IC. All rights reserved.</p>
          <p className="text-slate-600">Meta API Version v23.0</p>
        </div>
      </footer>
    </div>
  );
}
