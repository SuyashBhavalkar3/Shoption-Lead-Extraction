"use client";

import { useState, useEffect } from "react";

interface AdAccount {
  id: string;
  name: string;
  pageId: string;
}

interface AdDetail {
  id: string;
  name: string;
  status: string;
  effectiveStatus: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  ads: AdDetail[];
}

interface FieldData {
  name: string;
  values: string[];
}

interface Lead {
  id: string;
  created_time: string;
  field_data: FieldData[];
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  platform?: string;
}

interface FlattenedAd extends AdDetail {
  campaignId: string;
  campaignName: string;
}

interface DownloadHistoryItem {
  id: string;
  timestamp: string; // ISO string
  campaignName: string;
  adName: string;
  downloadType: "Raw" | "Sanitized";
  dateRangeFrom: string;
  dateRangeTo: string;
  leadsCount: number;
  csvContent: string;
}

export default function Home() {
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  interface DateRangeState {
    fromDate?: string;
    fromHour?: string;
    fromMin?: string;
    fromPeriod?: string;
    toDate?: string;
    toHour?: string;
    toMin?: string;
    toPeriod?: string;
  }

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedAdId, setSelectedAdId] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRangeState>({});
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [downloadHistory, setDownloadHistory] = useState<DownloadHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Fetch Ad Accounts on mount
  useEffect(() => {
    async function fetchAdAccounts() {
      try {
        setLoadingAccounts(true);
        setError(null);
        const res = await fetch("/api/ad-accounts");
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load ad accounts");
        }
        const data = await res.json();
        const accounts: AdAccount[] = data.data || [];
        setAdAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
          fetchCampaigns();
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingAccounts(false);
      }
    }
    fetchAdAccounts();

    // Load download history from localStorage
    const existing = localStorage.getItem("shoption_download_history");
    if (existing) {
      try {
        let history: DownloadHistoryItem[] = JSON.parse(existing);
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        // Filter out history older than 7 days
        history = history.filter(item => new Date(item.timestamp).getTime() > sevenDaysAgo);
        setDownloadHistory(history);
        localStorage.setItem("shoption_download_history", JSON.stringify(history));
      } catch (e) {
        console.error("Failed to parse download history", e);
      }
    }
  }, []);

  // Fetch Campaigns
  const fetchCampaigns = async () => {
    setSelectedCampaignId("");
    setSelectedAdId("");
    setDateRange({});
    try {
      setLoadingCampaigns(true);
      setError(null);
      const res = await fetch("/api/campaigns");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch campaigns");
      }
      const data = await res.json();
      setCampaigns(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    fetchCampaigns();
  };

  const handleDateChange = (field: keyof DateRangeState, value: string) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const recordHistory = (campaignName: string, adName: string, type: "Raw" | "Sanitized", leadsCount: number, csvContent: string) => {
    const hasFrom = !!dateRange.fromDate;
    const hasTo = !!dateRange.toDate;
    
    let fromVal = "";
    let toVal = "";
    
    if (!hasFrom && !hasTo) {
      fromVal = "Downloaded all leads from this campaign";
      toVal = "";
    } else {
      fromVal = hasFrom 
        ? `${dateRange.fromDate} ${dateRange.fromHour || "12"}:${dateRange.fromMin || "00"} ${dateRange.fromPeriod || "AM"}`
        : "Start of time";
      toVal = hasTo
        ? `${dateRange.toDate} ${dateRange.toHour || "12"}:${dateRange.toMin || "00"} ${dateRange.toPeriod || "AM"}`
        : "End of day";
    }

    const newItem: DownloadHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      campaignName,
      adName,
      downloadType: type,
      dateRangeFrom: fromVal,
      dateRangeTo: toVal,
      leadsCount,
      csvContent
    };

    setDownloadHistory((prev) => {
      const updated = [newItem, ...prev];
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = updated.filter(item => new Date(item.timestamp).getTime() > sevenDaysAgo);
      localStorage.setItem("shoption_download_history", JSON.stringify(filtered));
      return filtered;
    });
  };

  // Helper to fetch leads for a campaign and filter them by selected ad and date/time range
  const fetchFilteredLeads = async (campaignId: string, campaignName: string, adId: string) => {
    setDownloadError(null);
    setDownloading(true);
    try {
      const res = await fetch(`/api/leads?campaignId=${campaignId}&campaignName=${encodeURIComponent(campaignName)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch leads");
      }
      const data = await res.json();
      const rawLeads: Lead[] = data.data || [];

      // Filter by selected ad ID
      let filtered = rawLeads;
      if (adId) {
        filtered = filtered.filter((lead) => lead.ad_id === adId);
      }

      // Filter leads by date and time
      const range = dateRange;
      
      const parseCampaignDateTime = (r: DateRangeState, type: "from" | "to") => {
        const dateStr = type === "from" ? r.fromDate : r.toDate;
        if (!dateStr) return null;
        
        const hasTime = r[`${type}Hour`] && r[`${type}Min`] && r[`${type}Period`];
        
        let hourNum: number;
        let minNum: number;
        
        if (hasTime) {
          const hour = r[`${type}Hour`] || "12";
          const min = r[`${type}Min`] || "00";
          const period = r[`${type}Period`] || "AM";
          
          hourNum = parseInt(hour, 10);
          minNum = parseInt(min, 10);
          
          if (period === "PM" && hourNum !== 12) {
            hourNum += 12;
          } else if (period === "AM" && hourNum === 12) {
            hourNum = 0;
          }
        } else {
          if (type === "from") {
            hourNum = 0;
            minNum = 0;
          } else {
            hourNum = 23;
            minNum = 59;
          }
        }
        
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day, hourNum, minNum, type === "from" ? 0 : 59, type === "from" ? 0 : 999);
      };

      const start = parseCampaignDateTime(range, "from");
      const end = parseCampaignDateTime(range, "to");

      return filtered.filter((lead) => {
        if (!lead.created_time) return true;
        const leadDate = new Date(lead.created_time);

        if (start && leadDate < start) return false;
        if (end && leadDate > end) return false;

        return true;
      });
    } catch (err: any) {
      setDownloadError(err.message);
      return null;
    } finally {
      setDownloading(false);
    }
  };

  // CSV Helper functions
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

  // Export Raw CSV
  const handleDownloadRaw = async (campaignId: string, campaignName: string, ad: AdDetail) => {
    const leads = await fetchFilteredLeads(campaignId, campaignName, ad.id);
    if (!leads) return;

    if (leads.length === 0) {
      alert("No leads found for the selected range.");
      return;
    }

    const uniqueFields = new Set<string>();
    leads.forEach((lead) => {
      lead.field_data?.forEach((fd) => {
        if (fd.name) uniqueFields.add(fd.name);
      });
    });
    const customHeaders = Array.from(uniqueFields);

    const headers = ["Lead ID", "Created Time", ...customHeaders];
    const rows = leads.map((lead) => {
      return [
        lead.id,
        lead.created_time,
        ...customHeaders.map((field) => {
          const matched = lead.field_data?.find((fd) => fd.name === field);
          return matched && matched.values ? matched.values.join(", ") : "";
        }),
      ];
    });

    const csv = convertToCSV(headers, rows);
    const safeName = ad.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    triggerDownload(csv, `leads_raw_${safeName}.csv`);
    recordHistory(campaignName, ad.name, "Raw", leads.length, csv);
  };

  // Export Sanitized CSV
  const handleDownloadSanitized = async (campaignId: string, campaignName: string, ad: AdDetail) => {
    const leads = await fetchFilteredLeads(campaignId, campaignName, ad.id);
    if (!leads) return;

    if (leads.length === 0) {
      alert("No leads found for the selected range.");
      return;
    }

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

    const rows = leads.map((lead) => {
      const fieldData = lead.field_data || [];

      const findFieldVal = (patterns: string[]) => {
        const found = fieldData.find((fd) =>
          patterns.some((p) => fd.name?.toLowerCase().includes(p.toLowerCase()))
        );
        return found && found.values ? found.values.join(", ").trim() : "";
      };

      const nameVal = findFieldVal(["full_name", "name", "नाव", "नाम"]);
      const rawPhone = findFieldVal(["phone_number", "phone", "mobile", "contact", "नंबर", "फोन", "मोबाईल"]);
      
      const cleanPhone = (phoneStr: string) => {
        const digits = phoneStr.replace(/\D/g, "");
        return digits.length >= 10 ? digits.slice(-10) : digits;
      };
      const phoneVal = cleanPhone(rawPhone);
      const emailVal = phoneVal ? `${phoneVal}@gmail.com` : "";
      const cityVal = findFieldVal(["city", "town", "address", "पता", "शहर", "गाव", "गांव"]);

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

      const qValues: string[] = Array(10).fill("");
      const aValues: string[] = Array(10).fill("");

      customFields.slice(0, 10).forEach((fd, index) => {
        qValues[index] = fd.name ? fd.name.trim() : "";
        aValues[index] = fd.values ? fd.values.join(", ").trim() : "";
      });

      return [
        nameVal,                 // Full Name
        phoneVal,                // Phone Number
        emailVal,                // Email
        campaignId,              // Campaign ID
        lead.platform || "Meta", // Source
        cityVal,                 // City
        ...qValues,              // Q1 to Q10
        ...aValues,              // Answer 1 to Answer 10
        lead.ad_name || ad.name || campaignName, // Coloumn 1
        "",                      // Coloumn 2
        "",                      // Coloumn 3
        "",                      // Coloumn 4
        "",                      // Coloumn 5
        "",                      // Coloumn 6
        "",                      // Coloumn 7
        "",                      // Coloumn 8
        "",                      // Coloumn 9
        "",                      // Coloumn 10
        ""                       // Coloumn 10 (repeated)
      ];
    });

    const csv = convertToCSV(headers, rows);
    const safeName = ad.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    triggerDownload(csv, `leads_sanitized_${safeName}.csv`);
    recordHistory(campaignName, ad.name, "Sanitized", leads.length, csv);
  };

  const flattenedAds: FlattenedAd[] = campaigns.flatMap((campaign) =>
    campaign.ads.map((ad) => ({
      ...ad,
      campaignId: campaign.id,
      campaignName: campaign.name,
    }))
  );

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);
  const selectedAd = selectedCampaign?.ads.find(a => a.id === selectedAdId);

  const openDownloadModal = (campaignId: string, adId: string) => {
    setSelectedCampaignId(campaignId);
    setSelectedAdId(adId);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#000000] flex flex-col font-sans selection:bg-[#1877f2] selection:text-[#ffffff]">
      {/* Top Banner Header */}
      <header className="border-b border-[#000000] bg-[#ffffff] sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Left Side: Brand Logo and Title */}
          <div className="flex items-center gap-3">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="h-8 w-8 object-contain border border-[#000000]" 
            />
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-[#000000] flex items-center gap-2">
                Meta Leads Console
                <span className="text-[9px] font-bold text-[#ffffff] bg-[#1877f2] px-1 py-0.5 border border-[#000000]">
                  ACTIVE
                </span>
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-[#1877f2] font-bold">Shoption Automation Union Platform</p>
            </div>
          </div>

          {/* Right Side: Ad Account Dropdown and History Button next to each other */}
          <div className="flex items-center gap-4">
            {/* Ad Account Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#000000]">Ad Account:</span>
              {loadingAccounts ? (
                <span className="text-xs text-[#1877f2] animate-pulse font-bold">Loading Accounts...</span>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountChange(e.target.value)}
                  className="bg-[#ffffff] text-[#000000] border border-[#000000] px-2 py-1 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-[#1877f2] cursor-pointer"
                >
                  {adAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.id})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* History Button (White background, black text/border) */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="px-3.5 py-1.5 bg-[#ffffff] hover:bg-[#1877f2] text-black hover:text-white border border-[#000000] font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
            >
              History
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4">
        {error && (
          <div className="text-[#000000] text-xs py-2.5 px-3 bg-[#ffffff] border-2 border-[#000000] flex items-center gap-2 font-bold uppercase tracking-wider">
            <span className="text-[#1877f2]">ERROR:</span> {error}
          </div>
        )}

        {downloadError && (
          <div className="text-[#000000] text-xs py-2.5 px-3 bg-[#ffffff] border-2 border-[#000000] flex items-center gap-2 font-bold uppercase tracking-wider">
            <span className="text-[#1877f2]">DOWNLOAD ERROR:</span> {downloadError}
          </div>
        )}

        {/* Unified Cumulative Table Grid */}
        <div className="border border-[#000000] flex flex-col bg-[#ffffff]">
          <div className="bg-[#1877f2] p-3.5 border-b border-[#000000] flex items-center justify-between">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-white">Manage Campaigns, Ads & Download</h2>
            <span className="text-[9px] font-mono bg-white text-black px-1.5 py-0.5 border border-black">
              {flattenedAds.length} Active Ads
            </span>
          </div>

          <div className="overflow-auto max-h-[580px]">
            {loadingCampaigns ? (
              <div className="p-12 text-center text-xs text-[#1877f2] font-bold animate-pulse">
                Fetching campaigns and ads from Meta API...
              </div>
            ) : flattenedAds.length === 0 ? (
              <div className="p-12 text-center text-xs text-black uppercase tracking-wider font-bold">
                No active campaigns or delivering ads found for this account.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#000000] bg-white text-black text-[10px] uppercase font-black">
                    <th className="p-3 w-12 text-center border-r border-[#000000]">
                      <div className="h-4 w-4 border border-[#000000] mx-auto bg-white flex items-center justify-center">
                        <div className="h-2 w-2 bg-[#1877f2]"></div>
                      </div>
                    </th>
                    <th className="p-3 w-16 text-center border-r border-[#000000]">Off/On</th>
                    <th className="p-3 border-r border-[#000000] w-1/3">Campaign</th>
                    <th className="p-3 border-r border-[#000000] w-1/3">Ad</th>
                    <th className="p-3 w-28 border-r border-[#000000]">Delivery</th>
                    <th className="p-3 w-24 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {flattenedAds.map((ad) => {
                    const isSelected = selectedAdId === ad.id;
                    return (
                      <tr
                        key={ad.id}
                        className="border-b border-[#000000] transition-all hover:bg-[#1877f2]/5"
                      >
                        {/* Checkbox column */}
                        <td className="p-3 text-center border-r border-[#000000]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedCampaignId(ad.campaignId);
                              setSelectedAdId(ad.id);
                            }}
                            className="h-4 w-4 border border-[#000000] accent-[#1877f2] cursor-pointer"
                          />
                        </td>

                        {/* Toggle Switch column */}
                        <td className="p-3 text-center border-r border-[#000000]">
                          <div 
                            className="relative inline-flex items-center cursor-not-allowed opacity-50"
                            title="Please visit Meta Ads Manager to turn off ad"
                            onClick={() => alert("Please visit Meta Ads Manager to turn off ad")}
                          >
                            <div className="w-9 h-5 border border-[#000000] rounded-full p-0.5 transition-colors bg-[#1877f2]">
                              <div className="w-3.5 h-3.5 bg-white rounded-full transition-transform translate-x-4 border border-[#000000]"></div>
                            </div>
                          </div>
                        </td>

                        {/* Campaign Name column */}
                        <td className="p-3 border-r border-[#000000] font-black break-all text-xs">
                          {ad.campaignName}
                        </td>

                        {/* Ad Column with Shoption logo thumbnail */}
                        <td className="p-3 font-bold border-r border-[#000000] break-all">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 border border-[#000000] bg-[#ffffff] flex-shrink-0 flex items-center justify-center overflow-hidden">
                              <img 
                                src="/logoa.png" 
                                alt="Ad Thumbnail" 
                                className="w-full h-full object-contain" 
                              />
                            </div>
                            <span className="text-xs">{ad.name}</span>
                          </div>
                        </td>

                        {/* Delivery Column */}
                        <td className="p-3 border-r border-[#000000]">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-[#1877f2]"></div>
                            <span className="text-[11px] font-bold">Active</span>
                          </div>
                        </td>

                        {/* Download Trigger Column */}
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openDownloadModal(ad.campaignId, ad.id)}
                            className="px-3 py-1 bg-[#1877f2] hover:bg-black text-white hover:border-black font-black border border-[#1877f2] rounded-none text-[10px] uppercase tracking-wider cursor-pointer"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Date/Time Selector Modal Overlay */}
      {isModalOpen && selectedCampaign && selectedAd && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border-2 border-[#000000] max-w-md w-full flex flex-col">
            <div className="bg-[#1877f2] p-3 border-b border-[#000000] flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Lead Download Parameters</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-black font-black text-xs border border-white px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="border border-[#000000] p-2 bg-[#ffffff] text-[11px] space-y-1">
                <div className="font-bold text-black uppercase">Active Entity Context:</div>
                <div className="text-[#1877f2] font-black break-all">CAMPAIGN: {selectedCampaign.name}</div>
                <div className="text-black font-black break-all">AD: {selectedAd.name}</div>
              </div>

              {/* Date/Time inputs */}
              <div className="space-y-3 bg-[#ffffff] p-3 border border-[#000000]">
                {/* From Date/Time */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-black block">From Date & Time</label>
                  <input
                    type="date"
                    value={dateRange.fromDate || ""}
                    onChange={(e) => handleDateChange("fromDate", e.target.value)}
                    className="w-full bg-[#ffffff] border border-[#000000] text-black px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                  />
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <select
                      value={dateRange.fromHour || ""}
                      onChange={(e) => handleDateChange("fromHour", e.target.value)}
                      className="bg-[#ffffff] border border-[#000000] text-black p-1 text-[11px] font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                    >
                      <option value="">HH</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={dateRange.fromMin || ""}
                      onChange={(e) => handleDateChange("fromMin", e.target.value)}
                      className="bg-[#ffffff] border border-[#000000] text-black p-1 text-[11px] font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={dateRange.fromPeriod || ""}
                      onChange={(e) => handleDateChange("fromPeriod", e.target.value)}
                      className="bg-[#ffffff] border border-[#000000] text-black p-1 text-[11px] font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                    >
                      <option value="">AM/PM</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                {/* To Date/Time */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-wider text-black block">To Date & Time</label>
                  <input
                    type="date"
                    value={dateRange.toDate || ""}
                    onChange={(e) => handleDateChange("toDate", e.target.value)}
                    className="w-full bg-[#ffffff] border border-[#000000] text-black px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                  />
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <select
                      value={dateRange.toHour || ""}
                      onChange={(e) => handleDateChange("toHour", e.target.value)}
                      className="bg-[#ffffff] border border-[#000000] text-black p-1 text-[11px] font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                    >
                      <option value="">HH</option>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h.toString().padStart(2, '0')}>{h.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <select
                      value={dateRange.toMin || ""}
                      onChange={(e) => handleDateChange("toMin", e.target.value)}
                      className="bg-[#ffffff] border border-[#000000] text-black p-1 text-[11px] font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                    >
                      <option value="">MM</option>
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={dateRange.toPeriod || ""}
                      onChange={(e) => handleDateChange("toPeriod", e.target.value)}
                      className="bg-[#ffffff] border border-[#000000] text-black p-1 text-[11px] font-mono focus:outline-none focus:border-[#1877f2] cursor-pointer"
                    >
                      <option value="">AM/PM</option>
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => handleDownloadRaw(selectedCampaignId, selectedCampaign.name, selectedAd)}
                  disabled={downloading}
                  className="w-full py-2 bg-black hover:bg-[#1877f2] text-white font-black border border-black text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                >
                  {downloading ? "Processing..." : "Download Raw CSV"}
                </button>
                <button
                  onClick={() => handleDownloadSanitized(selectedCampaignId, selectedCampaign.name, selectedAd)}
                  disabled={downloading}
                  className="w-full py-2 bg-[#1877f2] hover:bg-black text-white font-black border border-[#1877f2] text-xs uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                >
                  {downloading ? "Processing..." : "Download Sanitized CSV"}
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-1.5 bg-white hover:bg-[#e4e6eb] text-black font-bold border border-[#000000] text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal Overlay */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 flex items-center justify-center p-4">
          <div className="bg-[#ffffff] border-2 border-[#000000] max-w-3xl w-full flex flex-col max-h-[90vh]">
            <div className="bg-[#1877f2] p-3 border-b border-[#000000] flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Download History (Last 7 Days)</h3>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="text-white hover:text-black font-black text-xs border border-white px-2 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-auto space-y-4">
              {downloadHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-black uppercase tracking-wider font-bold border border-dashed border-black">
                  No download history recorded in the last 7 days.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#000000] bg-white text-black text-[10px] uppercase font-black">
                        <th className="p-2 border-r border-[#000000]">Date & Time</th>
                        <th className="p-2 border-r border-[#000000]">Campaign</th>
                        <th className="p-2 border-r border-[#000000]">Ad</th>
                        <th className="p-2 border-r border-[#000000]">Format</th>
                        <th className="p-2 border-r border-[#000000]">Leads</th>
                        <th className="p-2 border-r border-[#000000]">Range Filtered</th>
                        <th className="p-2 w-20 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {downloadHistory.map((item) => (
                        <tr key={item.id} className="border-b border-[#000000] hover:bg-[#1877f2]/10">
                          <td className="p-2 border-r border-[#000000] font-mono">
                            {new Date(item.timestamp).toLocaleString()}
                          </td>
                          <td className="p-2 border-r border-[#000000] font-bold">{item.campaignName}</td>
                          <td className="p-2 border-r border-[#000000] font-bold">{item.adName}</td>
                          <td className="p-2 border-r border-[#000000] font-black text-[#1877f2]">{item.downloadType}</td>
                          <td className="p-2 border-r border-[#000000] font-mono font-bold">{item.leadsCount}</td>
                          <td className="p-2 border-r border-[#000000] text-[10px] break-all font-mono">
                            {item.dateRangeTo 
                              ? `${item.dateRangeFrom} → ${item.dateRangeTo}`
                              : item.dateRangeFrom}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => {
                                const safeName = item.adName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
                                triggerDownload(item.csvContent, `recovered_${item.downloadType.toLowerCase()}_${safeName}.csv`);
                              }}
                              className="px-2 py-0.5 bg-[#1877f2] hover:bg-black text-white hover:border-black border border-[#1877f2] font-black text-[9px] uppercase tracking-wider cursor-pointer"
                            >
                              Recover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-[#000000] flex justify-end bg-white">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-3 py-1.5 bg-white hover:bg-[#e4e6eb] text-black font-bold border border-[#000000] text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[#000000] py-4 px-6 text-center text-[10px] text-black uppercase tracking-wider bg-[#ffffff]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Shoption B2B Union Platform</p>
          <p className="text-[#1877f2] font-black">Meta API v23.0 Connected</p>
        </div>
      </footer>
    </div>
  );
}
