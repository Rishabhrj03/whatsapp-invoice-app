"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronsUpDown, User, X } from "lucide-react";

interface CustomerSelectorProps {
    customers: any[];
    selectedId: string;
    onSelect: (id: string) => void;
    onAddNew: () => void; // Keeping prop in interface just in case, though it's removed from UI here
}

export default function CustomerSelector({
    customers,
    selectedId,
    onSelect,
}: CustomerSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedCustomer = customers.find((c) => c._id === selectedId);

    const filteredCustomers = customers.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm)
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-bold text-gray-700 mb-1">
                Select Customer <span className="text-gray-400 font-normal">(Optional)</span>
            </label>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 transition-all text-left shadow-sm group"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${selectedCustomer ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                        <User size={16} />
                    </div>
                    <div>
                        <p className={`text-sm font-bold ${selectedCustomer ? 'text-gray-900' : 'text-gray-500'}`}>
                            {selectedCustomer ? selectedCustomer.name : "Guest"}
                        </p>
                        {selectedCustomer && (
                            <p className="text-[10px] text-gray-400 font-medium">{selectedCustomer.phoneNumber}</p>
                        )}
                    </div>
                </div>
                <ChevronsUpDown size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 border-t-blue-500 border-t-2">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-100 text-black outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="max-h-[240px] overflow-y-auto space-y-1 custom-scrollbar pb-2">
                        <button
                            type="button"
                            onClick={() => {
                                onSelect("");
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${!selectedId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            <span className="font-bold text-black">Guest</span>
                            {!selectedId && <Check size={16} />}
                        </button>

                        <div className="h-px bg-gray-50 my-1" />

                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((c) => (
                                <button
                                    key={c._id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(c._id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${selectedId === c._id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'}`}
                                >
                                    <div className="flex flex-col items-start px-1 font-bold">
                                        <span className="text-gray-900">{c.name}</span>
                                        <span className="text-[10px] text-gray-400">{c.phoneNumber}</span>
                                    </div>
                                    {selectedId === c._id && <Check size={16} />}
                                </button>
                            ))
                        ) : searchTerm ? (
                            <div className="p-4 text-center">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest leading-loose">No customers matching "{searchTerm}"</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
