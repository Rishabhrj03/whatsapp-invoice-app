"use client";

import { useState } from "react";
import { updateBusinessProfile } from "@/app/actions/user";
import { Building2, Image as ImageIcon, CheckCircle2, Loader2, Save, Upload, AlertCircle } from "lucide-react";
import { getUploadUrl } from "@/app/actions/invoice";

export default function SettingsClient({ initialUser }: { initialUser: any }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [logoUrl, setLogoUrl] = useState(initialUser.logoUrl || "");
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const uploadRes = await getUploadUrl(`logos/${initialUser._id}-${file.name}`, file.type);
            if (!uploadRes.success || !uploadRes.url) {
                return alert(`Failed to get upload URL: ${uploadRes.error}`);
            }

            const uploadFetch = await fetch(uploadRes.url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type }
            });

            if (!uploadFetch.ok) {
                return alert("Upload failed. Configure S3 CORS settings!");
            }

            const publicUrl = `${process.env.NEXT_PUBLIC_S3_PUBLIC_URL || ""}/logos/${initialUser._id}-${file.name}`;
            setLogoUrl(publicUrl);
            alert("Logo uploaded to S3 successfully!");
        } catch (err: any) {
            alert(`Upload Exception: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const defaultTemplate = `*Invoice from {business_name}*
Hello {customer_name},

*Details:*
{item_list}

*Total Amount:* {total_amount}

*View & Download Invoice:* {invoice_url}

Thank you for your business!`;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        formData.set("logoUrl", logoUrl); // Use uploaded/updated state URL

        const res = await updateBusinessProfile(formData);
        if (res.success) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } else {
            alert(res.error || "Failed to update profile");
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Customize your business branding and app preferences.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden relative">
                {success && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full text-xs font-black animate-in slide-in-from-top-4 duration-300">
                        <CheckCircle2 size={16} />
                        Settings Saved Successfully!
                    </div>
                )}

                <div className="p-8 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <Building2 size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Business Profile</h2>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-1.5">
                        <label htmlFor="businessName" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Business Name</label>
                        <input
                            type="text"
                            id="businessName"
                            name="businessName"
                            defaultValue={initialUser.businessName || ""}
                            placeholder="e.g. My Premium Store"
                            className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black font-bold"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Logo</label>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50/50 hover:bg-gray-50 hover:border-blue-400 transition-all cursor-pointer relative">
                                {uploading ? (
                                    <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
                                ) : (
                                    <Upload className="text-gray-400 mb-2" size={24} />
                                )}
                                <span className="text-sm font-bold text-gray-700">{uploading ? "Uploading to Cloud..." : "Upload File"}</span>
                                <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, WEBP</span>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={uploading}
                                />
                            </label>

                            <div className="flex-1 space-y-2">
                                <span className="text-[11px] font-bold text-gray-500">Or enter image URL:</span>
                                <div className="relative">
                                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        id="logoUrl"
                                        name="logoUrl"
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        placeholder="https://example.com/logo.png"
                                        className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {logoUrl && (
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center gap-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo Preview</p>
                            <img
                                src={logoUrl}
                                alt="Business Logo"
                                className="h-20 w-auto object-contain drop-shadow-md"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label htmlFor="whatsappTemplate" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">WhatsApp Message Template</label>
                        <textarea
                            key={initialUser.whatsappTemplate || "default"}
                            id="whatsappTemplate"
                            name="whatsappTemplate"
                            defaultValue={initialUser.whatsappTemplate || defaultTemplate}
                            placeholder={"Hello {customer_name},\n\nHere is your invoice for {total_amount}.\n\nView invoice: {invoice_url}\n\nThank you for shopping at {business_name}!"}
                            rows={6}
                            className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black font-medium leading-relaxed"
                        />
                        <p className="text-[10px] text-gray-400 px-1 mt-1 leading-normal">
                            Available Variables: <span className="text-blue-600 font-bold">{`{customer_name}`}</span>, <span className="text-blue-600 font-bold">{`{total_amount}`}</span>, <span className="text-blue-600 font-bold">{`{invoice_url}`}</span>, <span className="text-blue-600 font-bold">{`{business_name}`}</span>, <span className="text-blue-600 font-bold">{`{item_list}`}</span>
                        </p>
                    </div>

                    <hr className="border-gray-100" />

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-gray-800">
                            <AlertCircle size={18} className="text-amber-500" />
                            <h3 className="text-sm font-black uppercase tracking-wider">Booking Alert Settings</h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="bookingAlertHoursBefore" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Notify Before (Hours)</label>
                                <input
                                    type="number"
                                    id="bookingAlertHoursBefore"
                                    name="bookingAlertHoursBefore"
                                    defaultValue={initialUser.bookingAlertHoursBefore ?? 4}
                                    min={1}
                                    className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black font-bold"
                                />
                                <p className="text-[10px] text-gray-400 px-1">Alerts if not Prepared X hours before delivery.</p>
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="bookingAlertFrequencyMins" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Snooze Frequency (Mins)</label>
                                <input
                                    type="number"
                                    id="bookingAlertFrequencyMins"
                                    name="bookingAlertFrequencyMins"
                                    defaultValue={initialUser.bookingAlertFrequencyMins ?? 30}
                                    min={5}
                                    className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black font-bold"
                                />
                                <p className="text-[10px] text-gray-400 px-1">Repeat notification interval after dismiss.</p>
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label htmlFor="dispatchAlertHoursBefore" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Delivery Dispatch Alert (Hours Before)</label>
                                <input
                                    type="number"
                                    id="dispatchAlertHoursBefore"
                                    name="dispatchAlertHoursBefore"
                                    defaultValue={initialUser.dispatchAlertHoursBefore ?? 1}
                                    min={1}
                                    className="block w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black font-bold"
                                />
                                <p className="text-[10px] text-gray-400 px-1">Alert if order is not Dispatched within X hours of delivery.</p>
                            </div>
                        </div>
                    </div>
                    <hr className="border-gray-100" />

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-100 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {loading ? "Saving Changes..." : "Save Business Settings"}
                    </button>
                </form>
            </div>
        </div>
    );
}
