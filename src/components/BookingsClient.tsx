"use client";

import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, Clock, MapPin, Truck, AlertCircle, CheckCircle2, Package, TrendingUp, X, Edit2 } from "lucide-react";
import { createAdvanceBooking, updateBookingStatus, updateAdvanceBookingDetails } from "@/app/actions/booking";
import { getUploadUrl } from "@/app/actions/invoice";

interface BookingsClientProps {
    initialBookings: any[];
    settings: {
        hoursBefore: number;
        frequencyMins: number;
    };
}

export default function BookingsClient({ initialBookings, settings }: BookingsClientProps) {
    const [bookings, setBookings] = useState(initialBookings);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("All");

    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [editingBooking, setEditingBooking] = useState<any | null>(null);

    const initialFormState = {
        customerName: "",
        phoneNumber: "",
        address: "",
        deliveryDate: "",
        deliveryTime: "",
        type: "Pickup" as "Pickup" | "Delivery",
        description: "",
        weight: "",
        totalAmount: "" as string | number,
        advanceAmount: "" as string | number,
        alertTime: "",
        photos: [] as string[]
    };

    const [formData, setFormData] = useState(initialFormState);

    const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
    const [activeAlert, setActiveAlert] = useState<any | null>(null);
    const [dismissedAlerts, setDismissedAlerts] = useState<Record<string, number>>({});

    const playAlertSound = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (err) {
            console.error("Sound play failed:", err);
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem("dismissedAlerts");
        if (saved) setDismissedAlerts(JSON.parse(saved));
    }, []);

    useEffect(() => {
        const checkAlerts = () => {
            const now = new Date();
            const due = bookings.find(b => {
                const dismissedAt = (dismissedAlerts as any)[b._id];
                const snoozeDuration = (settings?.frequencyMins || 30) * 60 * 1000;

                if (dismissedAt && now.getTime() - dismissedAt < snoozeDuration) return false;

                if (b.alertTime && b.status !== "Delivered") {
                    const alertDate = new Date(b.alertTime);
                    if (alertDate <= now) return true;
                }

                if (b.deliveryDate && b.status !== "Prepared" && b.status !== "Delivered") {
                    const [hour, min] = (b.deliveryTime || "00:00").split(":");
                    const deliveryAt = new Date(b.deliveryDate);
                    deliveryAt.setHours(parseInt(hour), parseInt(min), 0, 0);

                    const bufferHours = settings?.hoursBefore || 4;
                    const cutoffTime = deliveryAt.getTime() - (bufferHours * 60 * 60 * 1000);

                    if (now.getTime() >= cutoffTime) {
                        b.isDeadlineAlert = true;
                        return true;
                    }
                }
                return false;
            });

            if (due) {
                setActiveAlert((prev: any) => {
                    if (!prev || prev._id !== due._id) {
                        playAlertSound();
                    }
                    return due;
                });
            }
        };

        const interval = setInterval(checkAlerts, 10000);
        checkAlerts();

        return () => clearInterval(interval);
    }, [bookings, dismissedAlerts]);

    const handleDismissAlert = () => {
        if (!activeAlert) return;
        const updated = { ...dismissedAlerts, [activeAlert._id]: Date.now() };
        setDismissedAlerts(updated);
        localStorage.setItem("dismissedAlerts", JSON.stringify(updated));
        setActiveAlert(null);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFilesToUpload([...filesToUpload, ...Array.from(e.target.files)]);
        }
    };

    const uploadPhotos = async () => {
        const urls: string[] = [];
        const publicPrefix = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

        for (const file of filesToUpload) {
            try {
                const uniqueKey = `bookings/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
                const response = await getUploadUrl(uniqueKey, file.type);
                if (response.success && response.url) {
                    const uploadFetch = await fetch(response.url, {
                        method: "PUT",
                        body: file,
                        headers: { "Content-Type": file.type }
                    });

                    if (uploadFetch.ok) {
                        const cleanPrefix = publicPrefix.endsWith('/') ? publicPrefix.slice(0, -1) : publicPrefix;
                        urls.push(`${cleanPrefix}/${uniqueKey}`);
                    } else {
                        console.error("Upload failed for:", file.name);
                    }
                }
            } catch (err) {
                console.error("Upload error:", err);
            }
        }
        return urls;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const uploadedUrls = await uploadPhotos();
            const payload = {
                ...formData,
                photos: [...formData.photos, ...uploadedUrls] // Append new photos to existing ones
            };

            let response;
            if (editingBooking) {
                response = await updateAdvanceBookingDetails(editingBooking._id, payload);
            } else {
                response = await createAdvanceBooking(payload);
            }

            if (response.success) {
                window.location.reload();
            } else {
                alert(response.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const response = await updateBookingStatus(id, newStatus);
        if (response.success) {
            setBookings(bookings.map(b => b._id === id ? { ...b, status: newStatus } : b));
        }
    };

    const openEditModal = (b: any) => {
        setFormData({
            customerName: b.customerName || "",
            phoneNumber: b.phoneNumber || "",
            address: b.address || "",
            deliveryDate: b.deliveryDate ? new Date(b.deliveryDate).toISOString().split('T')[0] : "",
            deliveryTime: b.deliveryTime || "",
            type: b.type || "Pickup",
            description: b.description || "",
            weight: b.weight || "",
            totalAmount: b.totalAmount || "",
            advanceAmount: b.advanceAmount || "",
            alertTime: b.alertTime ? new Date(b.alertTime).toISOString().slice(0, 16) : "",
            photos: b.photos || []
        });
        setEditingBooking(b);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setFormData(initialFormState);
        setEditingBooking(null);
        setFilesToUpload([]);
        setIsModalOpen(false);
    };

    const filteredBookings = bookings.filter(b => {
        const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || b.phoneNumber.includes(searchTerm);
        const matchesStatus = statusFilter === "All" || b.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const statusColors: any = {
        Received: "bg-blue-50 text-blue-700 border-blue-100",
        Preparing: "bg-amber-50 text-amber-700 border-amber-100",
        Prepared: "bg-purple-50 text-purple-700 border-purple-100",
        Delivered: "bg-green-50 text-green-700 border-green-100"
    };

    return (
        <div className="p-4 sm:p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Advance Bookings</h1>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage future orders and state timelines</p>
                </div>
                <button
                    onClick={() => { setEditingBooking(null); setFormData(initialFormState); setIsModalOpen(true); }}
                    className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus size={18} /> Add Booking
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-100 rounded-2xl bg-white shadow-sm text-sm focus:ring-2 focus:ring-blue-500 text-black outline-none"
                    />
                </div>
                <div className="flex flex-wrap gap-2 bg-gray-50 p-1 rounded-2xl">
                    {["All", "Received", "Preparing", "Prepared", "Delivered"].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${statusFilter === status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredBookings.map((b: any) => (
                    <div key={b._id} className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">{b.customerName}</h3>
                                <p className="text-xs text-gray-400 font-bold">{b.phoneNumber}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(b)} className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 border border-gray-100 transition-colors">
                                    <Edit2 size={14} />
                                </button>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${statusColors[b.status] || ''}`}>
                                    {b.status}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gray-400" />
                                <span>{formatDate(b.deliveryDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gray-400" />
                                <span>{b.deliveryTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {b.type === "Pickup" ? <Package size={14} className="text-gray-400" /> : <Truck size={14} className="text-gray-400" />}
                                <span>{b.type}</span>
                            </div>
                        </div>

                        {b.description && (
                            <p className="text-gray-500 text-xs italic bg-gray-50 p-3 rounded-xl border border-gray-100">{b.description}</p>
                        )}

                        <div className="pt-2 border-t border-gray-50 flex flex-col gap-1 text-[11px] font-bold text-gray-700">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Total Amount:</span>
                                <span className="text-gray-900 font-black">₹{b.totalAmount || 0}</span>
                            </div>
                            <div className="flex justify-between text-green-600">
                                <span>Advance Paid:</span>
                                <span>₹{b.advanceAmount || 0}</span>
                            </div>
                            <div className="flex justify-between border-t border-dashed pt-1 font-black text-blue-600">
                                <span>Pending Amt:</span>
                                <span>₹{(b.totalAmount || 0) - (b.advanceAmount || 0)}</span>
                            </div>
                        </div>

                        {b.photos && b.photos.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto py-1 custom-scrollbar">
                                {b.photos.map((src: string, index: number) => (
                                    <img key={index} src={src} onClick={() => setZoomedImage(src)} alt="Booking" className="w-14 h-14 object-cover rounded-xl border border-gray-100 flex-shrink-0 cursor-zoom-in hover:opacity-90 transition-opacity" />
                                ))}
                            </div>
                        )}

                        <div className="flex flex-col gap-2 pt-2 border-t border-gray-50">
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Update Status:</p>
                            <div className="grid grid-cols-2 gap-2">
                                {["Preparing", "Prepared", "Delivered"].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleStatusUpdate(b._id, s)}
                                        disabled={b.status === s}
                                        className={`px-3 py-2 text-[10px] font-black rounded-xl border transition-all ${b.status === s ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-100 hover:border-gray-300'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Creating Booking */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h2 className="text-xl font-black text-gray-900">{editingBooking ? "Edit Advance Booking" : "Add Advance Booking"}</h2>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase">Customer Name</label>
                                <input required type="text" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase">Phone Number</label>
                                <input
                                    required
                                    type="tel"
                                    pattern="[0-9]{10}"
                                    maxLength={10}
                                    placeholder="10 digit number"
                                    value={formData.phoneNumber}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setFormData({ ...formData, phoneNumber: val });
                                    }}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Delivery Date</label>
                                    <input required type="date" value={formData.deliveryDate} onChange={e => setFormData({ ...formData, deliveryDate: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Time</label>
                                    <input required type="time" value={formData.deliveryTime} onChange={e => setFormData({ ...formData, deliveryTime: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase">Type</label>
                                <div className="flex gap-2">
                                    {["Pickup", "Delivery"].map(type => (
                                        <button key={type} type="button" onClick={() => setFormData({ ...formData, type: type as "Pickup" | "Delivery" })} className={`flex-1 py-3 border rounded-xl font-bold text-sm transition-all ${formData.type === type ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>{type}</button>
                                    ))}
                                </div>
                            </div>
                            {formData.type === "Delivery" && (
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Address</label>
                                    <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Total Amount</label>
                                    <input type="number" placeholder="0" value={formData.totalAmount} onChange={e => setFormData({ ...formData, totalAmount: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Advance Amount</label>
                                    <input type="number" placeholder="0" value={formData.advanceAmount} onChange={e => setFormData({ ...formData, advanceAmount: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Weight <span className="text-gray-300 font-normal">(Opt)</span></label>
                                    <input type="text" placeholder="e.g., 1.5kg" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase">Alert Time <span className="text-gray-300 font-normal">(Opt)</span></label>
                                    <input type="datetime-local" value={formData.alertTime} onChange={e => setFormData({ ...formData, alertTime: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase">Description</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase">Attach Photos</label>
                                <input type="file" multiple accept="image/*" onChange={handlePhotoChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                <p className="text-[10px] text-gray-400">{filesToUpload.length} files selected</p>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50">
                                {loading ? "Saving Changes..." : (editingBooking ? "Update Booking" : "Create Booking")}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Lightbox / Zoomed image overlay */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" />
                    <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>
            )}
            {/* Active Alert Overlay */}
            {activeAlert && (
                <div className="fixed bottom-4 right-4 max-w-sm bg-amber-500 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3 z-[1500] animate-in slide-in-from-right-4 duration-300">
                    <AlertCircle size={24} className="flex-shrink-0 mt-0.5 text-white animate-bounce" />
                    <div className="flex-1">
                        <h4 className="font-extrabold text-sm uppercase">{activeAlert.isDeadlineAlert ? "🚨 Deadline Alert!" : "Booking Alert!"}</h4>
                        <p className="text-xs font-bold">
                            {activeAlert.isDeadlineAlert
                                ? `${activeAlert.customerName}'s order is not prepared yet! (${settings?.hoursBefore || 4}h remaining)`
                                : `${activeAlert.customerName}'s order requires attention.`}
                        </p>
                        {activeAlert.description && !activeAlert.isDeadlineAlert && (
                            <p className="text-[10px] opacity-80 italic mt-1 bg-amber-600/50 p-1.5 rounded-lg">"{activeAlert.description}"</p>
                        )}
                        <div className="flex gap-2 mt-3">
                            <button onClick={() => { setActiveAlert(null); openEditModal(activeAlert); }} className="px-3 py-1.5 bg-white text-amber-600 rounded-xl text-xs font-black shadow-sm">View</button>
                            <button onClick={handleDismissAlert} className="px-3 py-1.5 bg-amber-600 text-white border border-amber-400 rounded-xl text-xs font-bold">Dismiss</button>
                        </div>
                    </div>
                    <button onClick={() => setActiveAlert(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={16} /></button>
                </div>
            )}
        </div>
    );
}
