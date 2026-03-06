"use client";

import { useState, useEffect, useCallback } from "react";

interface ArchivedTask {
    id: string;
    taskId: string;
    status: string;
    customer: string;
    type: string;
    eta: string;
    address: string;
    technician?: string;
    archivedAt: string;
    createdAt: string;
    uploadedBy?: { alias: string };
}

export default function HistoryPage() {
    const [records, setRecords] = useState<ArchivedTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState("");
    const [techFilter, setTechFilter] = useState("");
    const [taskFilter, setTaskFilter] = useState("");

    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (dateFilter) params.set("date", dateFilter);
            if (techFilter) params.set("technician", techFilter);
            if (taskFilter) params.set("taskId", taskFilter);

            const res = await fetch(`/api/history?${params}`);
            if (res.ok) {
                const data = await res.json();
                setRecords(data.records || []);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setIsLoading(false);
        }
    }, [dateFilter, techFilter, taskFilter]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Group records by archivedAt date
    const grouped = records.reduce<Record<string, ArchivedTask[]>>((acc, record) => {
        const dateKey = new Date(record.archivedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "America/New_York",
        });
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(record);
        return acc;
    }, {});

    const dateGroups = Object.entries(grouped);

    return (
        <div className="font-[Inter,sans-serif]">
            {/* ── Header ── */}
            <div className="mb-4 md:mb-6">
                <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1">
                    History
                </h1>
                <p className="text-gray-500 text-xs md:text-sm">
                    Archived tasks grouped by date. Use filters to search specific records.
                </p>
            </div>

            {/* ── Filters Bar ── */}
            <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm border border-gray-100 mb-4 md:mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-icons-outlined text-gray-400 text-lg">filter_alt</span>
                    <span className="text-sm font-semibold text-gray-700">Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                    {/* Date filter */}
                    <div className="relative">
                        <label className="block text-[0.625rem] uppercase tracking-wider font-semibold text-gray-400 mb-1">Date</label>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                        />
                    </div>
                    {/* Technician filter */}
                    <div>
                        <label className="block text-[0.625rem] uppercase tracking-wider font-semibold text-gray-400 mb-1">Technician</label>
                        <input
                            type="text"
                            value={techFilter}
                            onChange={e => setTechFilter(e.target.value)}
                            placeholder="Search by alias…"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-gray-50 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                        />
                    </div>
                    {/* Task ID filter */}
                    <div>
                        <label className="block text-[0.625rem] uppercase tracking-wider font-semibold text-gray-400 mb-1">Task #</label>
                        <input
                            type="text"
                            value={taskFilter}
                            onChange={e => setTaskFilter(e.target.value)}
                            placeholder="Search by task ID…"
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-gray-50 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                        />
                    </div>
                </div>
                {/* Clear filters */}
                {(dateFilter || techFilter || taskFilter) && (
                    <button
                        onClick={() => { setDateFilter(""); setTechFilter(""); setTaskFilter(""); }}
                        className="mt-2 text-xs text-indigo-500 font-medium hover:text-indigo-700 transition-colors bg-transparent border-none cursor-pointer p-0"
                    >
                        ✕ Clear all filters
                    </button>
                )}
            </div>

            {/* ── Loading ── */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-4 border-indigo-100 border-t-indigo-400 animate-spin" />
                </div>
            )}

            {/* ── Empty state ── */}
            {!isLoading && records.length === 0 && (
                <div className="text-center py-10 md:py-14 px-4 border-2 border-dashed border-gray-200 rounded-xl md:rounded-3xl bg-white">
                    <span className="material-icons-outlined text-3xl md:text-4xl text-gray-300 opacity-40 mb-2 block">inventory_2</span>
                    <p className="text-xs md:text-sm text-gray-400">
                        No archived tasks found{(dateFilter || techFilter || taskFilter) ? " for the current filters" : ""}
                    </p>
                </div>
            )}

            {/* ══════════════════════════════ */}
            {/* ── DATE-GROUPED TABLES      ── */}
            {/* ══════════════════════════════ */}
            {!isLoading && dateGroups.map(([date, tasks]) => (
                <div key={date} className="mb-5 md:mb-8">
                    {/* Date header */}
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                        <span className="material-icons-outlined text-indigo-400 text-base md:text-lg">calendar_today</span>
                        <h2 className="text-sm md:text-base font-bold text-gray-800">{date}</h2>
                        <span className="ml-1 px-2 py-0.5 bg-gray-100 rounded-full text-[0.625rem] font-semibold text-gray-500">
                            {tasks.length} task{tasks.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Excel-style table */}
                    <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-3 py-2.5 text-[0.6rem] md:text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Task #</th>
                                        <th className="px-3 py-2.5 text-[0.6rem] md:text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                                        <th className="px-3 py-2.5 text-[0.6rem] md:text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Customer</th>
                                        <th className="px-3 py-2.5 text-[0.6rem] md:text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden sm:table-cell">Type</th>
                                        <th className="px-3 py-2.5 text-[0.6rem] md:text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden md:table-cell">ETA</th>
                                        <th className="px-3 py-2.5 text-[0.6rem] md:text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">Address</th>
                                        <th className="px-3 py-2.5 text-[0.6rem] md:text-[0.625rem] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Technician</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((task, i) => (
                                        <tr
                                            key={task.id}
                                            className={`border-b border-gray-50 transition-colors hover:bg-gray-50/80 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                                        >
                                            <td className="px-3 py-2.5 text-xs md:text-sm font-mono font-bold text-indigo-600 whitespace-nowrap">{task.taskId}</td>
                                            <td className="px-3 py-2.5">
                                                <StatusBadge status={task.status} />
                                            </td>
                                            <td className="px-3 py-2.5 text-xs md:text-sm text-gray-700 font-medium whitespace-nowrap">{task.customer}</td>
                                            <td className="px-3 py-2.5 text-xs md:text-sm text-gray-500 whitespace-nowrap hidden sm:table-cell">{task.type}</td>
                                            <td className="px-3 py-2.5 text-xs md:text-sm text-gray-500 whitespace-nowrap hidden md:table-cell">{task.eta}</td>
                                            <td className="px-3 py-2.5 text-xs md:text-sm text-gray-500 max-w-[200px] truncate hidden lg:table-cell">{task.address}</td>
                                            <td className="px-3 py-2.5 text-xs md:text-sm text-gray-600 font-medium whitespace-nowrap">{task.uploadedBy?.alias || task.technician || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    let classes = "bg-gray-100 text-gray-600";
    if (s.includes("complet") || s.includes("paid")) classes = "bg-gray-900 text-white";
    else if (s.includes("working")) classes = "bg-blue-100 text-blue-700";
    else if (s.includes("commit")) classes = "bg-blue-100 text-blue-800";
    else if (s.includes("accept") || s.includes("assign")) classes = "bg-emerald-100 text-emerald-800";
    else if (s.includes("pend") || s.includes("open")) classes = "bg-amber-100 text-amber-800";
    else if (s.includes("cancel")) classes = "bg-red-100 text-red-700";

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[0.625rem] md:text-xs font-bold whitespace-nowrap ${classes}`}>
            {status}
        </span>
    );
}
