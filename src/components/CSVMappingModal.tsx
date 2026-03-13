"use client";

import { useState, useEffect } from "react";
import { X, Table, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

interface CSVMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    headers: string[];
    previewRows: string[][];
    onConfirm: (mapping: Record<string, string>) => void;
}

export default function CSVMappingModal({ isOpen, onClose, headers, previewRows, onConfirm }: CSVMappingModalProps) {
    const [mapping, setMapping] = useState<Record<string, string>>({
        name: "",
        price: "",
        category: "",
        description: "",
    });

    // Auto-detect headers if possible
    useEffect(() => {
        const newMapping = { ...mapping };
        headers.forEach(h => {
            const lowH = h.toLowerCase().trim();
            if (lowH === "name" || lowH === "title" || lowH === "item" || lowH === "product") newMapping.name = h;
            if (lowH === "price" || lowH === "rate" || lowH === "cost" || lowH === "amount") newMapping.price = h;
            if (lowH === "category" || lowH === "type" || lowH === "group") newMapping.category = h;
            if (lowH === "description" || lowH === "desc" || lowH === "details" || lowH === "info") newMapping.description = h;
        });
        setMapping(newMapping);
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
            onConfirm(mapping);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 relative overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                            <Table size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Map CSV Columns</h2>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">Step 2 of 2: Field Alignment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
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

                <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-4 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className="flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale text-white rounded-2xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95 group"
                    >
                        Review & Import
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
