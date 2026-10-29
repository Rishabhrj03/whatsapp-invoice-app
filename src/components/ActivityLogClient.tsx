"use client";

import { useState, useTransition } from "react";
import {
    History,
    Search,
    Filter,
    Calendar,
    User,
    Shield,
    Users,
    FileText,
    CalendarCheck,
    UtensilsCrossed,
    Tag,
    Settings,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Clock,
    Activity,
    Info,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { fetchActivityLogs } from "@/app/actions/activity";

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface ActivityLogItem {
    _id: string;
    tenantId: string;
    userId: string;
    userName: string;
    userEmail: string;
    userRole: 'OWNER' | 'STAFF';
    action: string;
    entityType: string;
    entityId?: string | null;
    description: string;
    metadata?: Record<string, any>;
    createdAt: string;
}

interface Stats {
    totalActions: number;
    actionsLast24h: number;
    actionsLast7d: number;
    breakdown: {
        owner: number;
        staff: number;
    };
}

interface ActivityLogClientProps {
    initialLogs: ActivityLogItem[];
    initialTotal: number;
    initialTotalPages: number;
    initialStats: Stats;
    members: Member[];
}

export default function ActivityLogClient({
    initialLogs,
    initialTotal,
    initialTotalPages,
    initialStats,
    members,
}: ActivityLogClientProps) {
    const [logs, setLogs] = useState<ActivityLogItem[]>(initialLogs);
    const [total, setTotal] = useState(initialTotal);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [stats, setStats] = useState<Stats>(initialStats);
    const [page, setPage] = useState(1);

    // Filters
    const [search, setSearch] = useState("");
    const [selectedMember, setSelectedMember] = useState("ALL");
    const [selectedEntity, setSelectedEntity] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [isPending, startTransition] = useTransition();
    const [expandedMetaId, setExpandedMetaId] = useState<string | null>(null);

    const loadLogs = (newPage = 1, currentFilters = {}) => {
        startTransition(async () => {
            const activeFilters = {
                page: newPage,
                limit: 15,
                search: search.trim(),
                userId: selectedMember,
                entityType: selectedEntity,
                startDate,
                endDate,
                ...currentFilters,
            };

            const res = await fetchActivityLogs(activeFilters);
            if (res.success) {
                setLogs(res.logs || []);
                setTotal(res.total || 0);
                setTotalPages(res.totalPages || 1);
                setPage(newPage);
            }
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        loadLogs(1);
    };

    const handleReset = () => {
        setSearch("");
        setSelectedMember("ALL");
        setSelectedEntity("ALL");
        setStartDate("");
        setEndDate("");
        loadLogs(1, {
            search: "",
            userId: "ALL",
            entityType: "ALL",
            startDate: "",
            endDate: "",
        });
    };

    // Helper: Formatted relative time
    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay === 1) return "Yesterday";
        if (diffDay < 7) return `${diffDay}d ago`;

        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Helper: Entity Icons & Color Palette
    const getEntityBadge = (type: string) => {
        switch (type) {
            case "INVOICE":
                return {
                    icon: FileText,
                    label: "Invoice",
                    bg: "bg-blue-50 text-blue-700 border-blue-200",
                    dot: "bg-blue-600",
                };
            case "BOOKING":
                return {
                    icon: CalendarCheck,
                    label: "Booking",
                    bg: "bg-amber-50 text-amber-700 border-amber-200",
                    dot: "bg-amber-600",
                };
            case "CUSTOMER":
                return {
                    icon: Users,
                    label: "Customer",
                    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    dot: "bg-emerald-600",
                };
            case "MENU_ITEM":
                return {
                    icon: UtensilsCrossed,
                    label: "Catalog",
                    bg: "bg-purple-50 text-purple-700 border-purple-200",
                    dot: "bg-purple-600",
                };
            case "CATEGORY":
                return {
                    icon: Tag,
                    label: "Category",
                    bg: "bg-orange-50 text-orange-700 border-orange-200",
                    dot: "bg-orange-600",
                };
            case "COUPON":
                return {
                    icon: Tag,
                    label: "Coupon",
                    bg: "bg-rose-50 text-rose-700 border-rose-200",
                    dot: "bg-rose-600",
                };
            case "TEAM":
                return {
                    icon: Shield,
                    label: "Team",
                    bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    dot: "bg-indigo-600",
                };
            case "SETTINGS":
                return {
                    icon: Settings,
                    label: "Settings",
                    bg: "bg-slate-100 text-slate-700 border-slate-300",
                    dot: "bg-slate-600",
                };
            default:
                return {
                    icon: Activity,
                    label: type,
                    bg: "bg-gray-50 text-gray-700 border-gray-200",
                    dot: "bg-gray-600",
                };
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <History size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Activity Log
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                                Audit Trail
                            </span>
                        </h1>
                        <p className="text-xs text-slate-500">
                            Real-time chronological timeline of all actions performed by account administrators and staff.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => loadLogs(page)}
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm active:scale-95 transition-all disabled:opacity-60"
                >
                    <RefreshCw size={14} className={isPending ? "animate-spin text-blue-600" : "text-slate-400"} />
                    Refresh
                </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Total Audit Logs
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                        {stats.totalActions.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Account-wide lifetime</span>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Recent (24 Hours)
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-blue-600 font-mono tracking-tight">
                        {stats.actionsLast24h.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Live stream active</span>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Owner Operations
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-purple-600 font-mono tracking-tight">
                        {stats.breakdown.owner.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Root admin changes</span>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                        Staff Operations
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
                        {stats.breakdown.staff.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-1 block">Staff team members</span>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by action, user name, email, or bill reference..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                    >
                        Search
                    </button>
                    {(search || selectedMember !== "ALL" || selectedEntity !== "ALL" || startDate || endDate) && (
                        <button
                            type="button"
                            onClick={handleReset}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all"
                        >
                            Reset
                        </button>
                    )}
                </form>

                {/* Sub-Filters: Member, Module, Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    {/* Performer Filter */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Team Member
                        </label>
                        <select
                            value={selectedMember}
                            onChange={(e) => {
                                setSelectedMember(e.target.value);
                                loadLogs(1, { userId: e.target.value });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="ALL">All Account Members</option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name} ({m.role})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Module Filter */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Module / Entity
                        </label>
                        <select
                            value={selectedEntity}
                            onChange={(e) => {
                                setSelectedEntity(e.target.value);
                                loadLogs(1, { entityType: e.target.value });
                            }}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="ALL">All Modules</option>
                            <option value="INVOICE">Invoices & POS</option>
                            <option value="BOOKING">Advance Bookings</option>
                            <option value="CUSTOMER">Customers CRM</option>
                            <option value="MENU_ITEM">Menu Catalog</option>
                            <option value="CATEGORY">Categories</option>
                            <option value="COUPON">Coupons</option>
                            <option value="TEAM">Team Members</option>
                            <option value="SETTINGS">Settings</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            From Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                loadLogs(1, { startDate: e.target.value });
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            To Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                loadLogs(1, { endDate: e.target.value });
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>
            </div>

            {/* Timeline Stream */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-slate-400" />
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                            Event Stream ({total.toLocaleString()} total)
                        </h2>
                    </div>
                    {isPending && (
                        <span className="text-xs text-blue-600 font-bold flex items-center gap-1.5 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                            Updating...
                        </span>
                    )}
                </div>

                {logs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                            <History size={28} />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No activity logs found</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                            No operations match your current search and filter criteria. Try clearing your filters or selecting a different date range.
                        </p>
                        <button
                            onClick={handleReset}
                            className="mt-4 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                        >
                            Clear All Filters
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {logs.map((log) => {
                            const badge = getEntityBadge(log.entityType);
                            const IconComponent = badge.icon;
                            const isExpanded = expandedMetaId === log._id;
                            const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

                            return (
                                <div
                                    key={log._id}
                                    className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex items-start gap-3.5 sm:gap-4"
                                >
                                    {/* Entity Icon Avatar */}
                                    <div
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${badge.bg}`}
                                        title={badge.label}
                                    >
                                        <IconComponent size={18} />
                                    </div>

                                    {/* Event Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                                            {/* User & Role */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                                    {log.userName}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                                                        log.userRole === "OWNER"
                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    }`}
                                                >
                                                    {log.userRole}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-normal hidden md:inline truncate">
                                                    ({log.userEmail})
                                                </span>
                                            </div>

                                            {/* Timestamp */}
                                            <span
                                                className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1"
                                                title={new Date(log.createdAt).toLocaleString()}
                                            >
                                                <Clock size={11} className="text-slate-300" />
                                                {formatTime(log.createdAt)}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <p className="text-xs sm:text-sm text-slate-700 font-semibold mt-1 leading-relaxed">
                                            {log.description}
                                        </p>

                                        {/* Meta & Chips Row */}
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                                                {badge.label}
                                            </span>

                                            {log.entityId && (
                                                <span className="font-mono text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                    Ref: {log.entityId.slice(-8).toUpperCase()}
                                                </span>
                                            )}

                                            {hasMetadata && (
                                                <button
                                                    onClick={() => setExpandedMetaId(isExpanded ? null : log._id)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 ml-auto"
                                                >
                                                    {isExpanded ? "Hide details" : "View details"}
                                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                            )}
                                        </div>

                                        {/* Expandable Metadata Tray */}
                                        {isExpanded && hasMetadata && (
                                            <div className="mt-3 p-3 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto shadow-inner border border-slate-800">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                                                    Context Payload
                                                </div>
                                                <pre className="text-[11px] leading-relaxed">
                                                    {JSON.stringify(log.metadata, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Bar */}
                {totalPages > 1 && (
                    <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-xs text-slate-500 font-medium">
                            Showing page <strong className="text-slate-900 font-bold">{page}</strong> of{" "}
                            <strong className="text-slate-900 font-bold">{totalPages}</strong>
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => loadLogs(page - 1)}
                                disabled={page <= 1 || isPending}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>
                            <button
                                onClick={() => loadLogs(page + 1)}
                                disabled={page >= totalPages || isPending}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
