"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronsUpDown, X, Tag } from "lucide-react";

interface MenuSelectorProps {
    menuItems: any[];
    selectedId: string;
    onSelect: (id: string, name: string, price: number) => void;
}

export default function MenuSelector({
    menuItems,
    selectedId,
    onSelect,
}: MenuSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedMenu = menuItems.find((m) => m._id === selectedId);

    const filteredMenu = menuItems.filter((m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="relative w-full" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-left shadow-sm group"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${selectedMenu ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Tag size={16} />
                    </div>
                    <div className="flex-1 truncate">
                        <p className={`text-sm font-bold truncate ${selectedMenu ? 'text-gray-900' : 'text-gray-500'}`}>
                            {selectedMenu ? selectedMenu.name : "Select Menu Item"}
                        </p>
                    </div>
                </div>
                <ChevronsUpDown size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200 border-t-indigo-500 border-t-2">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 text-black outline-none"
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

                    <div className="max-h-[240px] overflow-y-auto space-y-1 custom-scrollbar">
                        {filteredMenu.length > 0 ? (
                            filteredMenu.map((m) => (
                                <button
                                    key={m._id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(m._id, m.name, m.price);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${selectedId === m._id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-600'}`}
                                >
                                    <div className="flex flex-col items-start px-1 font-bold text-left truncate mr-2">
                                        <span className="text-gray-900 truncate w-full">{m.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-indigo-600 font-black">₹{m.price}</span>
                                        {selectedId === m._id && <Check size={16} />}
                                    </div>
                                </button>
                            ))
                        ) : searchTerm && (
                            <div className="p-4 text-center">
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-widest leading-loose">No items matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
