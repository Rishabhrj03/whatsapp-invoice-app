"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Check, ChevronsUpDown, X, Tag } from "lucide-react";

interface MenuSelectorProps {
    menuItems: any[];
    selectedId: string;
    onSelect: (id: string, name: string, price: number) => void;
    forceOpenTrigger?: number;
}

export default function MenuSelector(props: MenuSelectorProps) {
    const { menuItems, selectedId, onSelect } = props;
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedMenu = menuItems.find((m) => m._id === selectedId);

    const filteredMenu = menuItems.filter((m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (props.forceOpenTrigger) {
            setIsOpen(true);
            setSearchTerm(""); // Reset search when auto-opened
        }
    }, [props.forceOpenTrigger]);

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
                className="w-full h-[46px] flex items-center justify-between px-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-left shadow-sm group overflow-hidden"
            >
                <div className="flex items-center gap-3 overflow-hidden pr-2 w-full">
                    <div className={`p-1.5 rounded-lg shrink-0 ${selectedMenu ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                        <Tag size={16} />
                    </div>
                    <p className={`text-sm font-bold truncate w-full ${selectedMenu ? 'text-gray-900' : 'text-gray-500'}`}>
                        {selectedMenu ? selectedMenu.name : "Select Menu Item"}
                    </p>
                </div>
                <ChevronsUpDown size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Select Menu Item</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Choose an item to add to the bill</p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="p-4 border-b border-gray-100 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search specific item..."
                                    className="w-full pl-12 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 outline-none transition-all shadow-inner"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 bg-gray-200 p-1 rounded-full"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Menu Grid */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-gray-50/30">
                            {filteredMenu.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                                    {filteredMenu.map((m) => (
                                        <button
                                            key={m._id}
                                            type="button"
                                            onClick={() => {
                                                onSelect(m._id, m.name, m.price);
                                                setIsOpen(false);
                                            }}
                                            className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all group ${
                                                selectedId === m._id 
                                                    ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-[0.98]' 
                                                    : 'border-transparent bg-white shadow-sm hover:border-gray-200 hover:shadow-md hover:-translate-y-1 text-gray-700'
                                            }`}
                                        >
                                            {selectedId === m._id && (
                                                <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 bg-indigo-500 text-white rounded-full shadow-sm">
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                            <span className={`text-sm sm:text-base font-black text-center line-clamp-2 w-full mb-2 transition-colors ${selectedId === m._id ? 'text-indigo-900' : 'text-gray-800 group-hover:text-gray-900'}`}>
                                                {m.name}
                                            </span>
                                            <span className={`text-sm font-bold bg-gray-100/80 px-3 py-1 rounded-full ${selectedId === m._id ? 'text-indigo-700 bg-indigo-100' : 'text-gray-500 group-hover:text-gray-700'}`}>
                                                ₹{m.price}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : searchTerm && (
                                <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-sm mx-auto max-w-md mt-10">
                                    <Search className="text-gray-200 w-16 h-16 mx-auto mb-4" />
                                    <p className="text-sm font-black text-gray-600">No items found</p>
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest leading-loose mt-2">Try adjusting your search term</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
