"use client";

import { useState, useRef, useEffect } from "react";
import { createMenuEntry, deleteMenuEntry, importMenuItemsFromCSV, deleteMultipleMenuEntries, updateMenuEntry } from "@/app/actions/menu";
import { deleteCategory, updateCategory } from "@/app/actions/category";
import { Trash2, PlusCircle, Tag, IndianRupee, FileText, LayoutGrid, CheckCircle2, ArrowLeft, Upload, FileUp, Loader2, Pencil } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import ConfirmModal from "./ConfirmModal";
import CSVMappingModal from "./CSVMappingModal";
import CreateCategoryModal from "./CreateCategoryModal";
import Pagination from "./Pagination";

interface MenuClientProps {
    initialMenuItems: any[];
    initialCategories?: any[];
    initialTab: "items" | "categories";
    currentPage: number;
    totalItemPages: number;
    totalCategoryPages: number;
}

export default function MenuClient({ initialMenuItems, initialCategories = [], initialTab, currentPage, totalItemPages, totalCategoryPages }: MenuClientProps) {
    const [menuItems, setMenuItems] = useState(initialMenuItems);
    const [categories, setCategories] = useState(initialCategories);
    const [activeTab, setActiveTab] = useState<"items" | "categories">(initialTab);
    const [view, setView] = useState<"list" | "add" | "edit">("list");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
    const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [deleteCategoryModal, setDeleteCategoryModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const formRef = useRef<HTMLFormElement>(null);

    const handleTabChange = (newTab: "items" | "categories") => {
        setActiveTab(newTab);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", newTab);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", activeTab);
        params.set("page", newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    useEffect(() => {
        if (view === "edit" && editingItem && formRef.current) {
            const form = formRef.current;
            (form.elements.namedItem("name") as HTMLInputElement).value = editingItem.name;
            (form.elements.namedItem("price") as HTMLInputElement).value = editingItem.price;
            (form.elements.namedItem("category") as HTMLSelectElement).value = editingItem.category || "";
            (form.elements.namedItem("description") as HTMLTextAreaElement).value = editingItem.description || "";
        }
    }, [view, editingItem]);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/[^0-9.]/g, "");
        const parts = val.split(".");
        if (parts.length > 2) {
            e.target.value = parts[0] + "." + parts.slice(1).join("");
        } else {
            e.target.value = val;
        }
    };

    const handleDelete = async () => {
        const id = deleteModal.id;
        if (!id) return;

        setLoading(true);
        try {
            const res = await deleteMenuEntry(id);
            if (res.success) {
                setMenuItems(prev => prev.filter(item => item._id.toString() !== id));
                setDeleteModal({ isOpen: false, id: "" });
                router.refresh();
            } else {
                alert(res.error || "Delete failed");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred during deletion");
        }
        setLoading(false);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        setLoading(true);
        try {
            const res = await deleteMultipleMenuEntries(selectedIds);
            if (res.success) {
                setMenuItems(prev => prev.filter(item => !selectedIds.includes(item._id.toString())));
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
                router.refresh();
            } else {
                alert(res.error || "Bulk delete failed");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred during bulk deletion");
        }
        setLoading(false);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === menuItems.length && menuItems.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(menuItems.map(item => item._id.toString()));
        }
    };

    const toggleSelectItem = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        if (view === "edit" && editingItem) {
            const res = await updateMenuEntry(editingItem._id.toString(), formData);
            if (res.success && res.menuItem) {
                setMenuItems(prev => prev.map(item => item._id === res.menuItem._id ? res.menuItem : item));
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setView("list");
                    setEditingItem(null);
                    router.refresh();
                }, 1000);
            } else {
                alert(res.error || "Failed to update menu item");
            }
        } else {
            const res = await createMenuEntry(formData);
            if (res.success && res.menuItem) {
                setMenuItems(prev => [res.menuItem, ...prev]);
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setView("list");
                    router.refresh();
                }, 1000);
            } else {
                alert(res.error || "Failed to create menu item");
            }
        }
        setLoading(false);
    };

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        const parseCSVLine = (line: string) => {
            const values = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/^"|"$/g, ""));
                    current = "";
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/^"|"$/g, ""));
            return values;
        };

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
            if (lines.length < 2) {
                alert("CSV must have at least a header row and one data row.");
                setLoading(false);
                return;
            }

            const headers = parseCSVLine(lines[0]);
            const rows = lines.slice(1).map(l => parseCSVLine(l));

            setCsvData({ headers, rows });
            setIsMappingModalOpen(true);
            setLoading(false);
            e.target.value = "";
        };
        reader.readAsText(file);
    };

    const handleMappingConfirm = async (mapping: Record<string, string>) => {
        if (!csvData) return;
        setIsMappingModalOpen(false);
        setLoading(true);

        const { headers, rows } = csvData;
        const nameIdx = headers.indexOf(mapping.name);
        const priceIdx = headers.indexOf(mapping.price);
        const categoryIdx = mapping.category ? headers.indexOf(mapping.category) : -1;
        const descIdx = mapping.description ? headers.indexOf(mapping.description) : -1;

        const itemsToImport = rows.map(row => {
            const priceVal = parseFloat(row[priceIdx]);
            return {
                name: row[nameIdx],
                price: isNaN(priceVal) ? 0 : priceVal,
                category: categoryIdx !== -1 ? row[categoryIdx] : "",
                description: descIdx !== -1 ? row[descIdx] : ""
            };
        }).filter(item => item.name && item.name.trim() !== "");

        if (itemsToImport.length === 0) {
            alert("No valid items found to import.");
            setLoading(false);
            return;
        }

        try {
            const res = await importMenuItemsFromCSV(itemsToImport);
            if (res.success) {
                alert(`Successfully imported ${res.count} items!`);
                router.refresh();
                window.location.reload();
            } else {
                alert(res.error || "Import failed");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred during import");
        }
        setLoading(false);
    };

    const handleDeleteCategory = async () => {
        const id = deleteCategoryModal.id;
        if (!id) return;

        setLoading(true);
        try {
            const res = await deleteCategory(id);
            if (res.success) {
                setCategories(prev => prev.filter(c => c._id !== id));
                setDeleteCategoryModal({ isOpen: false, id: "" });
                router.refresh();
            } else {
                alert(res.error || "Delete failed");
            }
        } catch (err) {
            console.error(err);
            alert("An error occurred during deletion");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {activeTab === "items" ? "Menu Items" : "Categories"}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {activeTab === "items"
                            ? "Manage your standard inventory items and pricing."
                            : "Organize your menu into groups for easier management."}
                    </p>
                </div>
                {view === "list" ? (
                    <div className="flex flex-wrap gap-3 w-full md:w-auto">
                        {activeTab === "items" && (
                            <label className="flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl font-bold shadow-sm cursor-pointer">
                                <FileUp size={18} className="text-orange-500" />
                                Import CSV
                                <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={loading} />
                            </label>
                        )}
                        <button
                            onClick={() => {
                                if (activeTab === "items") {
                                    setEditingItem(null);
                                    setView("add");
                                } else {
                                    setEditingCategory(null);
                                    setIsCategoryModalOpen(true);
                                }
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 py-3 px-6 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-lg shadow-orange-100 transition-all active:scale-95"
                        >
                            {activeTab === "items" ? (
                                <><PlusCircle size={18} /> Add Menu Item</>
                            ) : (
                                <><PlusCircle size={18} /> Add Category</>
                            )}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => { setView("list"); setEditingItem(null); }}
                        className="flex items-center justify-center gap-2 py-3 px-6 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                    >
                        <ArrowLeft size={18} /> Back to Catalog
                    </button>
                )}
            </div>

            {view === "list" && (
                <div className="flex p-1 bg-gray-100/50 rounded-2xl w-fit">
                    <button
                        onClick={() => handleTabChange("items")}
                        className={`px-6 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === "items"
                            ? "bg-white text-orange-600 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Menu Items
                    </button>
                    <button
                        onClick={() => handleTabChange("categories")}
                        className={`px-6 py-2.5 rounded-xl transition-all font-black text-xs uppercase tracking-widest ${activeTab === "categories"
                            ? "bg-white text-orange-600 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        Categories
                    </button>
                </div>
            )}

            {view === "add" || view === "edit" ? (
                <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-orange-50 relative overflow-hidden">
                        {success && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{view === "edit" ? "Item Updated!" : "Item Added!"}</h3>
                                <p className="text-gray-500 text-sm">Updating catalog...</p>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
                                {view === "edit" ? <Pencil size={24} /> : <PlusCircle size={24} />}
                            </div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">{view === "edit" ? "Edit Item Details" : "Item Details"}</h2>
                        </div>

                        <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Item Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    placeholder="e.g. Chocolate Cake"
                                    className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="price" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Price (₹) *</label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        id="price"
                                        name="price"
                                        required
                                        placeholder="0.00"
                                        onChange={handlePriceChange}
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="category" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Category</label>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={18} />
                                    <div className="flex gap-2 relative">
                                        <select
                                            id="category"
                                            name="category"
                                            className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black appearance-none font-medium cursor-pointer"
                                        >
                                            <option value="">Uncategorized</option>
                                            {categories.map((c: any) => (
                                                <option key={c._id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsCategoryModalOpen(true)}
                                            className="px-4 py-4 bg-orange-100 text-orange-600 rounded-2xl hover:bg-orange-200 font-bold transition-colors whitespace-nowrap flex items-center justify-center gap-1 shadow-sm active:scale-95"
                                        >
                                            <PlusCircle size={18} />
                                            <span className="hidden sm:inline">New</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="description" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Description</label>
                                <div className="relative">
                                    <FileText className="absolute left-4 top-4 text-gray-400" size={18} />
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={3}
                                        placeholder="Ingredients or details..."
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm text-black"
                                    ></textarea>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-xl shadow-orange-100 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? "Saving..." : (view === "edit" ? "Update Menu Item" : "Save Menu Item")}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                {activeTab === "items" ? (
                                    <><LayoutGrid className="text-orange-500" size={20} /> Item Catalog</>
                                ) : (
                                    <><Tag className="text-orange-500" size={20} /> Categories</>
                                )}
                            </h2>
                            <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">
                                {activeTab === "items" ? `${menuItems.length} Products` : `${categories.length} Categories`}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            {activeTab === "items" ? (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.length === menuItems.length && menuItems.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Info</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Category</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Price</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-10">Manage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {menuItems.map((item) => (
                                            <tr key={item._id.toString()} className={`hover:bg-orange-50/20 transition-colors group ${selectedIds.includes(item._id.toString()) ? 'bg-orange-50/30' : ''}`}>
                                                <td className="px-6 py-5 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(item._id.toString())}
                                                        onChange={() => toggleSelectItem(item._id.toString())}
                                                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="min-w-[40px] h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                                                            {item.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                            {item.description && (
                                                                <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">
                                                                    {item.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    {item.category ? (
                                                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-orange-100 text-orange-700">
                                                            {item.category}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300 text-[10px] italic">Universal</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-gray-900 text-sm">
                                                    ₹{parseFloat(item.price).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-5 text-right px-10">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => { setEditingItem(item); setView("edit"); }}
                                                            className="p-2.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                                            title="Edit Item"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteModal({ isOpen: true, id: item._id.toString() })}
                                                            className="p-2.5 text-red-100 group-hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {menuItems.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-20 text-center">
                                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <LayoutGrid className="text-gray-200" size={40} />
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-bold">Your menu catalog is empty</p>
                                                    <p className="text-xs text-gray-400 mt-1">Add items to start building invoices.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest pl-12">Category Name</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Items</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right px-10">Manage</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {categories.map((cat) => {
                                            const itemCount = menuItems.filter(item => item.category === cat.name).length;
                                            return (
                                                <tr key={cat._id.toString()} className="hover:bg-orange-50/20 transition-colors group">
                                                    <td className="px-6 py-5 pl-12">
                                                        <div className="flex items-center gap-4">
                                                            <div
                                                                className="w-3 h-3 rounded-full shadow-sm"
                                                                style={{ backgroundColor: cat.color || '#f97316' }}
                                                            />
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">{cat.name}</p>
                                                                {cat.description && (
                                                                    <p className="text-[10px] text-gray-400 font-medium truncate max-w-[200px]">
                                                                        {cat.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-orange-50 text-orange-600">
                                                            {itemCount} Items
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-right px-10">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}
                                                                className="p-2.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                                                                title="Edit Category"
                                                            >
                                                                <Pencil size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteCategoryModal({ isOpen: true, id: cat._id.toString() })}
                                                                className="p-2.5 text-red-100 group-hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                                title="Delete Category"
                                                                disabled={itemCount > 0}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {categories.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-20 text-center">
                                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Tag className="text-gray-200" size={40} />
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-bold">No categories yet</p>
                                                    <p className="text-xs text-gray-400 mt-1">Create categories to organize your menu.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {activeTab === "items" && totalItemPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalItemPages}
                                onPageChange={handlePageChange}
                            />
                        )}
                        {activeTab === "categories" && totalCategoryPages > 1 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalCategoryPages}
                                onPageChange={handlePageChange}
                            />
                        )}
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: "" })}
                onConfirm={handleDelete}
                title="Delete Menu Item?"
                message="This item will be removed from your catalog. Existing invoices with this item will not be affected."
                confirmText="Yes, Remove Item"
                isLoading={loading}
            />

            <ConfirmModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleBulkDelete}
                title={`Delete ${selectedIds.length} Items?`}
                message={`Are you sure you want to remove these ${selectedIds.length} items from your catalog? This action cannot be undone.`}
                confirmText="Yes, Delete All"
                isLoading={loading}
            />

            <CSVMappingModal
                isOpen={isMappingModalOpen}
                onClose={() => setIsMappingModalOpen(false)}
                headers={csvData?.headers || []}
                previewRows={csvData?.rows.slice(0, 3) || []}
                onConfirm={handleMappingConfirm}
            />

            <ConfirmModal
                isOpen={deleteCategoryModal.isOpen}
                onClose={() => setDeleteCategoryModal({ isOpen: false, id: "" })}
                onConfirm={handleDeleteCategory}
                title="Delete Category?"
                message="Are you sure you want to delete this category? This will not delete the items in this category, but they will become uncategorized."
                confirmText="Yes, Delete Category"
                isLoading={loading}
            />

            <CreateCategoryModal
                isOpen={isCategoryModalOpen}
                onClose={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                }}
                editingCategory={editingCategory}
                onSuccess={(newCat) => {
                    if (editingCategory) {
                        setCategories(prev => prev.map(c => c._id === newCat._id ? newCat : c).sort((a, b) => a.name.localeCompare(b.name)));
                    } else {
                        setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
                    }
                    setTimeout(() => {
                        if (formRef.current && activeTab === "items") {
                            (formRef.current.elements.namedItem("category") as HTMLSelectElement).value = newCat.name;
                        }
                    }, 50);
                    router.refresh();
                }}
            />

            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="bg-gray-900 border border-white/10 px-8 py-5 rounded-[2rem] shadow-2xl backdrop-blur-xl flex items-center gap-8 ring-1 ring-white/20">
                        <div className="flex flex-col">
                            <span className="text-white font-black text-sm tracking-tight">{selectedIds.length} items selected</span>
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Bulk Actions Available</span>
                        </div>
                        <div className="h-8 w-px bg-white/10" />
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedIds([])}
                                className="px-5 py-2.5 text-gray-400 hover:text-white text-xs font-black transition-colors"
                            >
                                Deselect
                            </button>
                            <button
                                onClick={() => setIsBulkDeleteModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-black shadow-lg shadow-red-900/20 transition-all active:scale-95"
                            >
                                <Trash2 size={16} />
                                Delete Selected
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && !isMappingModalOpen && !deleteModal.isOpen && !isBulkDeleteModalOpen && (
                <div className="fixed inset-0 z-[120] bg-white/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
                        <p className="text-sm font-black text-gray-900 animate-pulse">Processing your catalog...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
