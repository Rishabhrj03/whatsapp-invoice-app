"use client";

import { useState, useEffect } from "react";
import { X, Table, ArrowRight, CheckCircle2, AlertCircle, PlusCircle, RefreshCw, Repeat, AlertTriangle } from "lucide-react";

export type ImportMode = "append" | "replace" | "sync";

interface CSVMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    headers: string[];
    previewRows: string[][];
    onConfirm: (mapping: Record<string, string>, mode: ImportMode) => void;
}

export default function CSVMappingModal({ isOpen, onClose, headers, previewRows, onConfirm }: CSVMappingModalProps) {
    const [mapping, setMapping] = useState<Record<string, string>>({
        name: "",
        price: "",
        category: "",
        description: "",
    });
    const [mode, setMode] = useState<ImportMode>("append");

    // Auto-detect headers if possible
    useEffect(() => {
        setMapping(prev => {
            const newMapping = { ...prev };
            headers.forEach(h => {
                const lowH = h.toLowerCase().trim();
                if (lowH === "name" || lowH === "title" || lowH === "item" || lowH === "product") newMapping.name = h;
                if (lowH === "price" || lowH === "rate" || lowH === "cost" || lowH === "amount") newMapping.price = h;
                if (lowH === "category" || lowH === "type" || lowH === "group") newMapping.category = h;
                if (lowH === "description" || lowH === "desc" || lowH === "details" || lowH === "info") newMapping.description = h;
            });
            return newMapping;
        });
    }, [headers]);

    if (!isOpen) return null;

    const targetFields = [
        { key: "name", label: "Item Name", required: true },
        { key: "price", label: "Price", required: true },
        { key: "category", label: "Category", required: false },
        { key: "description", label: "Description", required: false },
    ];

    const isValid = mapping.name !== "" && mapping.price !== "";

    const handleConfirm = () => {
        if (isValid) {
            onConfirm(mapping, mode);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-gray-100 relative overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                            <Table size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Import Menu Catalog</h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">Map Fields & Choose Strategy</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[72vh] overflow-y-auto">
                    {/* Strategy Selector: Append vs Replace (from scratch) vs Sync */}
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            Choose Import Mode *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Mode 1: Append */}
                            <div
                                onClick={() => setMode("append")}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left ${
                                    mode === "append"
                                        ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-200"
                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`p-2 rounded-xl ${mode === "append" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                            <PlusCircle size={16} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                            Append
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900">Append</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Keep all current items and add new items after your existing records.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value="append"
                                        checked={mode === "append"}
                                        onChange={() => setMode("append")}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-gray-700">Add to existing</span>
                                </div>
                            </div>

                            {/* Mode 2: Replace / From Scratch */}
                            <div
                                onClick={() => setMode("replace")}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left ${
                                    mode === "replace"
                                        ? "border-rose-500 bg-rose-50/50 ring-2 ring-rose-200"
                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`p-2 rounded-xl ${mode === "replace" ? "bg-rose-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                            <RefreshCw size={16} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                            Scratch
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900">Add from Scratch</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Remove all previous items associated with you and start completely fresh.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value="replace"
                                        checked={mode === "replace"}
                                        onChange={() => setMode("replace")}
                                        className="text-rose-600 focus:ring-rose-500"
                                    />
                                    <span className="text-xs font-bold text-rose-700">Wipe & replace</span>
                                </div>
                            </div>

                            {/* Mode 3: Sync & Reconcile */}
                            <div
                                onClick={() => setMode("sync")}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 text-left ${
                                    mode === "sync"
                                        ? "border-purple-500 bg-purple-50/50 ring-2 ring-purple-200"
                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={`p-2 rounded-xl ${mode === "sync" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                            <Repeat size={16} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                            Mirror
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900">Sync & Reconcile</h4>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        Update matching items, add new items, and delete items missing from file.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value="sync"
                                        checked={mode === "sync"}
                                        onChange={() => setMode("sync")}
                                        className="text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-xs font-bold text-purple-700">Two-way sync</span>
                                </div>
                            </div>
                        </div>

                        {mode === "replace" && (
                            <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold animate-in fade-in">
                                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                                <span>Caution: This will permanently delete all existing catalog items before importing the sheet.</span>
                            </div>
                        )}
                        {mode === "sync" && (
                            <div className="flex items-center gap-2.5 p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-purple-800 text-xs font-semibold animate-in fade-in">
                                <Repeat size={18} className="text-purple-600 shrink-0" />
                                <span>Items are matched by Item Name. Any database items missing from this file will be deleted.</span>
                            </div>
                        )}
                    </div>

                    {/* Column Mapping Grid */}
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                            Field Alignment *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {targetFields.map((field) => (
                                <div key={field.key} className="space-y-2">
                                    <label className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </span>
                                        {mapping[field.key] ? (
                                            <CheckCircle2 size={12} className="text-green-500" />
                                        ) : field.required ? (
                                            <AlertCircle size={12} className="text-orange-400 opacity-50" />
                                        ) : null}
                                    </label>
                                    <select
                                        value={mapping[field.key]}
                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                        className={`w-full px-5 py-4 rounded-2xl border transition-all text-sm font-bold appearance-none bg-gray-50 group-hover:bg-white focus:ring-2 focus:ring-blue-500 outline-none
                                            ${mapping[field.key] ? "border-blue-100 text-blue-900 bg-blue-50/30" : "border-gray-100 text-gray-400"}`}
                                    >
                                        <option value="">Select CSV Column...</option>
                                        {headers.map((h) => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Data Preview */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Data Preview (First {previewRows.length} rows)</h3>
                        </div>
                        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px] border-collapse">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {headers.map(h => (
                                                <th key={h} className="px-4 py-3 font-black text-gray-500 border-b border-gray-100 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {previewRows.map((row, i) => (
                                            <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                {row.map((cell, j) => (
                                                    <td key={j} className="px-4 py-3 font-medium text-gray-600 truncate max-w-[150px]">{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-4 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className={`flex items-center gap-3 px-10 py-4 text-white rounded-2xl font-black shadow-xl transition-all active:scale-95 group disabled:opacity-50 disabled:grayscale ${
                            mode === "replace"
                                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100"
                                : mode === "sync"
                                ? "bg-purple-600 hover:bg-purple-700 shadow-purple-100"
                                : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
                        }`}
                    >
                        {mode === "replace"
                            ? "Wipe & Import from Scratch"
                            : mode === "sync"
                            ? "Sync & Reconcile Catalog"
                            : "Append to Catalog"}
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
