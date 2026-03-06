"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useToast, ToastContainer } from "@/app/components/Toast";

interface ExtractedTask {
    id?: string;
    taskId: string;
    status: string;
    customer: string;
    type: string;
    eta: string;
    address: string;
    technician?: string;
    uploadedBy?: { alias: string };
    createdAt?: string;
}

const FIELD_CONFIG: { key: keyof ExtractedTask; label: string; icon: string; color: string }[] = [
    { key: "taskId", label: "Task ID", icon: "tag", color: "#4F46E5" },
    { key: "status", label: "Status", icon: "flag", color: "#F59E0B" },
    { key: "customer", label: "Customer", icon: "business", color: "#10B981" },
    { key: "type", label: "Type", icon: "category", color: "#8B5CF6" },
    { key: "eta", label: "ETA", icon: "schedule", color: "#F97316" },
    { key: "address", label: "Address", icon: "location_on", color: "#EF4444" },
    { key: "technician", label: "Technician", icon: "engineering", color: "#10B981" }
];

const MOBILE_VISIBLE_KEYS = new Set(["taskId", "status", "customer"]);

const POLL_INTERVAL = 5000; // 5 seconds

const FLORIDA_CITIES = [
    "Orlando", "Kissimmee", "Winter Park", "Winter Garden",
    "Altamonte Springs", "Sanford", "Clermont", "Poinciana",
    "Davenport", "Apopka", "Ocoee", "St. Cloud",
    "Oviedo", "Lake Mary", "Dr Phillips", "Windermere",
    "Celebration", "Tavares", "Leesburg", "The Villages"
];

export default function DashboardPage() {
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tasks, setTasks] = useState<ExtractedTask[]>([]);
    const [stagedFile, setStagedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
    const [showTechPopup, setShowTechPopup] = useState(false);
    const [addressDropdownId, setAddressDropdownId] = useState<string | null>(null);
    const { toasts, addToast, removeToast } = useToast();
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Fetch active calls from DB ──
    const fetchCalls = useCallback(async () => {
        try {
            const res = await fetch("/api/calls");
            if (res.ok) {
                const data = await res.json();
                setTasks(data.calls || []);
            }
        } catch (err) {
            console.error("Failed to load calls", err);
        }
    }, []);

    // ── Initial load + 5s polling for real-time sync ──
    useEffect(() => {
        fetchCalls();
        pollRef.current = setInterval(fetchCalls, POLL_INTERVAL);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchCalls]);

    // ── Stage file (no OCR yet) ──
    const stageFile = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) {
            setError("Please upload a valid image file (PNG, JPG, WEBP).");
            return;
        }
        setError(null);
        setStagedFile(file);
        setImagePreview(URL.createObjectURL(file));
    }, []);

    // ── Extract Data: trigger OCR on staged file ──
    const extractData = async () => {
        if (!stagedFile) return;
        setIsExtracting(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("image", stagedFile);
            const res = await fetch("/api/ocr", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || `OCR failed with status ${res.status}`);

            const savedCount = data.tasks?.length || 0;
            const dupCount = data.duplicates?.length || 0;

            if (savedCount > 0) {
                setTasks(prev => [...data.tasks, ...prev]);
                addToast(`${savedCount} task${savedCount !== 1 ? "s" : ""} extracted successfully`, "success");
            }

            if (dupCount > 0) {
                const ids = data.duplicates.join(", #");
                addToast(`${dupCount} duplicate${dupCount !== 1 ? "s" : ""} ignored: #${ids}`, "warning");
            }

            if (savedCount === 0 && dupCount === 0) {
                setError("No task data could be extracted from this image. Try a clearer screenshot.");
            }

            // Clear staged file after extraction
            setStagedFile(null);
            setImagePreview(null);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Extraction failed.";
            setError(msg);
            addToast(msg, "error");
        } finally {
            setIsExtracting(false);
        }
    };

    // ── File handlers ──
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) stageFile(e.dataTransfer.files[0]);
    }, [stageFile]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) stageFile(e.target.files[0]);
    };

    // ── Update task status ──
    const updateStatus = async (taskId: string, newStatus: "Working" | "Completed") => {
        setUpdatingStatus(taskId);
        try {
            const res = await fetch(`/api/calls/${taskId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error("Failed to update status");

            if (newStatus === "Completed") {
                // Remove from local state immediately for instant feedback
                setTasks(prev => prev.filter(t => t.id !== taskId));
                setExpandedCard(null);
                addToast("Task marked as Completed and removed from board", "success");
            } else {
                // Update local state
                setTasks(prev => prev.map(t =>
                    t.id === taskId ? { ...t, status: newStatus } : t
                ));
                addToast(`Task marked as ${newStatus}`, "info");
            }
        } catch {
            addToast("Failed to update task status", "error");
        } finally {
            setUpdatingStatus(null);
        }
    };

    // ── Update task address ──
    const updateAddress = async (taskId: string, newAddress: string) => {
        try {
            const res = await fetch(`/api/calls/${taskId}/address`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address: newAddress }),
            });
            if (!res.ok) throw new Error("Failed to update address");
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, address: newAddress } : t
            ));
            setAddressDropdownId(null);
            addToast(`Address set to ${newAddress}`, "success");
        } catch {
            addToast("Failed to update address", "error");
        }
    };

    const getStatusStyle = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes("complet") || s.includes("paid")) return "bg-gray-900 text-white";
        if (s.includes("working")) return "bg-blue-100 text-blue-700";
        if (s.includes("commit")) return "bg-blue-100 text-blue-800";
        if (s.includes("accept") || s.includes("assign")) return "bg-emerald-100 text-emerald-800";
        if (s.includes("pend") || s.includes("open")) return "bg-amber-100 text-amber-800";
        return "bg-indigo-50 text-indigo-700";
    };

    return (
        <div className="font-[Inter,sans-serif]">

            {/* ── Toast Container ── */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 md:mb-6 gap-3">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1">
                        CSEView is Back
                    </h1>
                    <p className="text-gray-500 text-xs md:text-sm">
                        Welcome, view and extract shared service tasks.
                    </p>
                </div>
                {tasks.length > 0 && (
                    <div className="flex gap-3 md:gap-4 items-center bg-gray-50 px-3 py-2 md:px-4 rounded-xl border border-gray-200 overflow-x-auto shrink-0">
                        <div className="text-center">
                            <p className="text-lg md:text-xl font-bold text-gray-900">{tasks.length}</p>
                            <p className="text-[0.6rem] md:text-[0.625rem] text-gray-500 uppercase tracking-wider">Tasks</p>
                        </div>
                        <div className="w-px h-6 md:h-8 bg-gray-200" />
                        <div className="text-center">
                            <p className="text-lg md:text-xl font-bold text-blue-600">{tasks.filter(t => t.customer?.toLowerCase().includes("bank of america")).length}</p>
                            <p className="text-[0.6rem] md:text-[0.625rem] text-gray-500 uppercase tracking-wider">BOA</p>
                        </div>
                        <div className="w-px h-6 md:h-8 bg-gray-200" />
                        <div className="text-center">
                            <p className="text-lg md:text-xl font-bold text-green-600">{tasks.filter(t => t.customer?.toLowerCase().includes("publix")).length}</p>
                            <p className="text-[0.6rem] md:text-[0.625rem] text-gray-500 uppercase tracking-wider">Publix</p>
                        </div>
                        <div className="w-px h-6 md:h-8 bg-gray-200" />
                        <div
                            className="text-center cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 -mx-1 transition-colors"
                            onClick={() => setShowTechPopup(true)}
                        >
                            <p className="text-lg md:text-xl font-bold text-green-600">{new Set(tasks.map(t => t.uploadedBy?.alias).filter(Boolean)).size}</p>
                            <p className="text-[0.6rem] md:text-[0.625rem] text-gray-500 uppercase tracking-wider">Technician</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Technician Pop-up ── */}
            {showTechPopup && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
                    onClick={() => setShowTechPopup(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <span className="material-icons-outlined text-green-500 text-xl">group</span>
                                <h3 className="text-base font-bold text-gray-900 m-0">Active Technicians</h3>
                            </div>
                            <button
                                onClick={() => setShowTechPopup(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors bg-transparent border-none cursor-pointer text-gray-400"
                            >
                                <span className="material-icons-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Technician List */}
                        <div className="px-5 py-3 max-h-[300px] overflow-y-auto">
                            {(() => {
                                const techMap = new Map<string, number>();
                                tasks.forEach(t => {
                                    const alias = t.uploadedBy?.alias;
                                    if (alias) techMap.set(alias, (techMap.get(alias) || 0) + 1);
                                });
                                const entries = Array.from(techMap.entries()).sort((a, b) => b[1] - a[1]);

                                if (entries.length === 0) {
                                    return (
                                        <p className="text-sm text-gray-400 text-center py-4">No technicians active</p>
                                    );
                                }

                                return entries.map(([alias, count]) => (
                                    <div key={alias} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-b-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs uppercase">
                                                {alias.slice(0, 2)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 m-0">{alias}</p>
                                                <p className="text-[0.625rem] text-gray-400 m-0">Online</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-[0.625rem] font-bold text-gray-500">
                                            {count} task{count !== 1 ? "s" : ""}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                            <p className="text-[0.625rem] text-gray-400 text-center m-0 uppercase tracking-wider">
                                {new Set(tasks.map(t => t.uploadedBy?.alias).filter(Boolean)).size} technician{new Set(tasks.map(t => t.uploadedBy?.alias).filter(Boolean)).size !== 1 ? "s" : ""} active
                            </p>
                        </div>
                    </div>
                </div>
            )}


            {/* ── Upload Card ── */}
            <div
                className={`bg-white rounded-xl md:rounded-3xl p-4 md:p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] relative overflow-hidden transition-all mb-4 md:mb-6 border-2 ${isDragging ? "border-indigo-400" : "border-transparent"}`}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                onDrop={handleDrop}
            >
                <div className="flex justify-between items-start mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-2 md:p-3 bg-gray-100 rounded-lg md:rounded-2xl flex items-center justify-center">
                            <span className="material-icons-outlined text-gray-600 text-xl md:text-2xl">document_scanner</span>
                        </div>
                        <div>
                            <h3 className="text-base md:text-xl font-bold text-gray-900 m-0">
                                Screenshot Scanner
                            </h3>
                            <p className="text-[0.65rem] md:text-xs text-gray-400 mt-0.5 max-w-[260px] md:max-w-[400px]">
                                Upload a screenshot then click &quot;Extract Data&quot; to scan and save tasks
                            </p>
                        </div>
                    </div>
                </div>

                {isExtracting ? (
                    <div className="flex flex-col items-center justify-center py-8 md:py-12 gap-4">
                        <div className="relative w-12 h-12 md:w-16 md:h-16">
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-gray-900">Extracting data…</p>
                            <p className="text-xs text-gray-400 mt-1">Google Cloud Vision OCR + duplicate check in progress</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {/* Drop zone */}
                        <div className={`flex flex-col items-center justify-center gap-3 md:gap-4 rounded-lg md:rounded-2xl border-2 border-dashed transition-all ${imagePreview ? "p-4 md:p-6" : "py-8 px-4 md:py-12 md:px-8"} ${isDragging ? "bg-violet-50 border-indigo-400" : "bg-gray-50 border-gray-200"}`}>
                            {imagePreview ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={imagePreview} alt="Preview" className="max-h-32 md:max-h-40 rounded-xl border border-gray-200 object-contain shadow-md" />
                            ) : (
                                <>
                                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-2xl flex items-center justify-center transition-all ${isDragging ? "bg-indigo-100 scale-110" : "bg-gray-100"}`}>
                                        <span className={`material-icons-outlined text-xl md:text-2xl transition-colors ${isDragging ? "text-indigo-400" : "text-gray-400"}`}>cloud_upload</span>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-gray-700">
                                            Drag & drop screenshot here
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WEBP</p>
                                    </div>
                                </>
                            )}

                            <label className="inline-flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-gray-800 text-white rounded-lg md:rounded-xl text-sm font-semibold cursor-pointer shadow-[0_4px_14px_rgba(31,41,55,0.25)] transition-all hover:bg-gray-700 hover:-translate-y-0.5 active:scale-95">
                                <span className="material-icons-outlined text-base">image</span>
                                {imagePreview ? "Change Image" : "Browse File"}
                                <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleFile} />
                            </label>
                        </div>

                        {/* ── Extract Data Button (only when file is staged) ── */}
                        {stagedFile && (
                            <button
                                onClick={extractData}
                                className="flex items-center justify-center gap-2 w-full py-3 md:py-3.5 bg-indigo-600 text-white rounded-xl text-sm font-bold cursor-pointer shadow-[0_4px_14px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-500 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)] active:scale-[0.98] border-none"
                            >
                                <span className="material-icons-outlined text-lg">auto_awesome</span>
                                Extract Data
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="flex items-start gap-2 md:gap-3 p-3 md:p-4 mb-4 md:mb-6 bg-red-50 border border-red-200 rounded-lg md:rounded-2xl">
                    <span className="material-icons-outlined text-red-500 text-lg md:text-xl shrink-0 mt-0.5">error_outline</span>
                    <div>
                        <p className="text-sm font-semibold text-red-900">Error</p>
                        <p className="text-xs text-red-600 mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════ */}
            {/* ── DATA BAR SECTION (Active Board from DB)          ── */}
            {/* ══════════════════════════════════════════════════════ */}
            {tasks.length > 0 && (
                <div id="data-bars" className="flex flex-col gap-2.5 md:gap-4">

                    {/* Section heading */}
                    <div className="flex justify-between items-center py-1 md:py-2">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="p-1.5 md:p-2 bg-emerald-50 rounded-lg flex items-center justify-center">
                                <span className="material-icons-outlined text-emerald-500 text-base md:text-lg">people</span>
                            </div>
                            <h3 className="font-bold text-base md:text-lg text-gray-900 m-0">
                                Active Tasks
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[0.65rem] md:text-xs text-gray-400">{tasks.length} active · syncing live</span>
                        </div>
                    </div>

                    {/* ── Data Bar Cards ── */}
                    {tasks.map((task, i) => {
                        const isExpanded = expandedCard === (task.id || String(i));
                        const statusClass = getStatusStyle(task.status);
                        const isUpdating = updatingStatus === task.id;

                        return (
                            <div
                                key={task.id || i}
                                className={`bg-white rounded-xl md:rounded-2xl overflow-hidden transition-all duration-200 ${isExpanded ? "shadow-lg border border-indigo-200" : "shadow-sm border border-gray-100 hover:shadow-md"}`}
                            >
                                {/* ── Horizontal Data Bar ── */}
                                <div
                                    className="flex items-center px-3 py-2.5 md:px-5 md:py-3.5 gap-0 overflow-x-auto cursor-pointer"
                                    onClick={() => setExpandedCard(isExpanded ? null : (task.id || String(i)))}
                                >
                                    {/* Row number */}
                                    <div className="min-w-6 md:min-w-8 font-mono text-[0.65rem] md:text-xs text-gray-300 font-semibold shrink-0">
                                        {i + 1}
                                    </div>

                                    {/* ── Field Pills ── */}
                                    <div className="flex items-center gap-1.5 md:gap-2 flex-1 overflow-hidden">
                                        {FIELD_CONFIG.map(field => {
                                            const value = String(task[field.key] || "—");
                                            const isMobileVisible = MOBILE_VISIBLE_KEYS.has(field.key);

                                            if (field.key === "taskId") {
                                                return (
                                                    <div key={field.key} className="flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-indigo-50 border border-indigo-200 rounded-md md:rounded-lg font-mono text-[0.65rem] md:text-[0.8125rem] font-bold text-indigo-600 whitespace-nowrap shrink-0">
                                                        <span className="material-icons-outlined text-xs md:text-sm">{field.icon}</span>
                                                        {value}
                                                    </div>
                                                );
                                            }

                                            if (field.key === "status") {
                                                return (
                                                    <div key={field.key} className={`flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg text-[0.65rem] md:text-xs font-bold whitespace-nowrap shrink-0 ${statusClass}`}>
                                                        <span className="material-icons-outlined text-xs md:text-sm">{field.icon}</span>
                                                        {value}
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={field.key}
                                                    className={`items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 bg-gray-50 rounded-md md:rounded-lg text-[0.65rem] md:text-xs font-medium text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis ${isMobileVisible ? "flex" : "hidden md:flex"} ${field.key === "address" ? "shrink min-w-0" : "shrink-0"}`}
                                                >
                                                    <span className="material-icons-outlined text-xs md:text-sm shrink-0" style={{ color: field.color }}>{field.icon}</span>
                                                    <span className="overflow-hidden text-ellipsis">{value}</span>
                                                </div>
                                            );
                                        })}

                                        {/* Uploaded by pill */}
                                        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[0.6875rem] font-medium text-gray-500 whitespace-nowrap shrink-0">
                                            <span className="material-icons-outlined text-xs">person</span>
                                            {task.uploadedBy?.alias || "Me"}
                                        </div>
                                    </div>

                                    {/* Expand indicator */}
                                    <span className={`material-icons-outlined text-base md:text-lg text-gray-400 ml-1.5 md:ml-2 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                        expand_more
                                    </span>
                                </div>

                                {/* ── Expanded Detail Panel ── */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-3 md:p-5 bg-gray-50/80 animate-fade-slide-down">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                                            {FIELD_CONFIG.map(field => {
                                                if (field.key === "address") {
                                                    const isOpen = addressDropdownId === (task.id || String(i));
                                                    return (
                                                        <div key={field.key} className="p-2.5 md:p-4 bg-white rounded-lg md:rounded-xl border border-gray-100 relative">
                                                            <div className="flex items-center gap-1.5 mb-1 md:mb-1.5">
                                                                <span className="material-icons-outlined text-xs md:text-sm" style={{ color: field.color }}>{field.icon}</span>
                                                                <span className="text-[0.55rem] md:text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wider">{field.label}</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAddressDropdownId(isOpen ? null : (task.id || String(i)));
                                                                }}
                                                                className="flex items-center gap-1 w-full text-left bg-transparent border-none cursor-pointer p-0 m-0"
                                                            >
                                                                <p className="text-xs md:text-sm font-semibold text-gray-900 wrap-break-word m-0 flex-1">
                                                                    {task.address || "— Select city"}
                                                                </p>
                                                                <span className={`material-icons-outlined text-sm text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}>expand_more</span>
                                                            </button>
                                                            {isOpen && (
                                                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                                                    {FLORIDA_CITIES.map(city => (
                                                                        <button
                                                                            key={city}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (task.id) updateAddress(task.id, city);
                                                                            }}
                                                                            className={`w-full text-left px-3 py-2 text-xs md:text-sm border-none cursor-pointer transition-colors ${task.address === city
                                                                                ? "bg-indigo-50 text-indigo-700 font-semibold"
                                                                                : "bg-white text-gray-700 hover:bg-gray-50"
                                                                                }`}
                                                                        >
                                                                            {city}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={field.key} className="p-2.5 md:p-4 bg-white rounded-lg md:rounded-xl border border-gray-100">
                                                        <div className="flex items-center gap-1.5 mb-1 md:mb-1.5">
                                                            <span className="material-icons-outlined text-xs md:text-sm" style={{ color: field.color }}>{field.icon}</span>
                                                            <span className="text-[0.55rem] md:text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wider">{field.label}</span>
                                                        </div>
                                                        <p className="text-xs md:text-sm font-semibold text-gray-900 wrap-break-word m-0">
                                                            {String(task[field.key] || "—")}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                            {/* Uploaded By cell */}
                                            <div className="p-2.5 md:p-4 bg-white rounded-lg md:rounded-xl border border-gray-100">
                                                <div className="flex items-center gap-1.5 mb-1 md:mb-1.5">
                                                    <span className="material-icons-outlined text-xs md:text-sm" style={{ color: "#6366F1" }}>person</span>
                                                    <span className="text-[0.55rem] md:text-[0.625rem] font-semibold text-gray-400 uppercase tracking-wider">Uploaded By</span>
                                                </div>
                                                <p className="text-xs md:text-sm font-semibold text-gray-900 m-0">
                                                    {task.uploadedBy?.alias || "—"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Metadata row */}
                                        <div className="flex flex-wrap gap-2 md:gap-4 mt-2 md:mt-3 text-[0.6rem] md:text-[0.6875rem] text-gray-400">
                                            <span>Uploaded by: <strong className="text-gray-500">{task.uploadedBy?.alias || "Me"}</strong></span>
                                            {task.createdAt && (
                                                <span>Date: <strong className="text-gray-500">{new Date(task.createdAt).toLocaleString()}</strong></span>
                                            )}
                                        </div>

                                        {/* ── Status Action Buttons ── */}
                                        <div className="flex gap-2 mt-3 md:mt-4 pt-3 border-t border-gray-200">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); task.id && updateStatus(task.id, "Working"); }}
                                                disabled={isUpdating || task.status === "Working"}
                                                className={`flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all border-none cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${task.status === "Working" ? "bg-blue-100 text-blue-700 ring-2 ring-blue-400" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
                                            >
                                                <span className="material-icons-outlined text-sm md:text-base">build</span>
                                                {isUpdating ? "Updating…" : "Working"}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); task.id && updateStatus(task.id, "Completed"); }}
                                                disabled={isUpdating}
                                                className="flex items-center gap-1.5 px-3 py-2 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition-all border-none cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-800 text-white shadow-[0_2px_8px_rgba(31,41,55,0.2)] hover:bg-gray-700 hover:-translate-y-0.5"
                                            >
                                                <span className="material-icons-outlined text-sm md:text-base">check_circle</span>
                                                {isUpdating ? "Updating…" : "Completed"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Empty State ── */}
            {tasks.length === 0 && !isExtracting && !error && (
                <div className="text-center py-10 md:py-14 px-4 md:px-8 text-gray-300 border-2 border-dashed border-gray-200 rounded-xl md:rounded-3xl bg-white">
                    <span className="material-icons-outlined text-3xl md:text-4xl opacity-40 mb-2 md:mb-3 block">table_chart</span>
                    <p className="text-xs md:text-sm text-gray-400">
                        Extract tasks from screenshots — they&apos;ll appear here
                    </p>
                </div>
            )}
        </div>
    );
}
