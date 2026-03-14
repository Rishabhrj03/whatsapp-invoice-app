"use client";

import { useState } from "react";
import { updateBusinessProfile } from "@/app/actions/user";
import { Building2, Image as ImageIcon, CheckCircle2, Loader2, Save } from "lucide-react";

export default function SettingsClient({ initialUser }: { initialUser: any }) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

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
                        <label htmlFor="logoUrl" className="block text-xs font-black text-gray-400 uppercase tracking-widest px-1">Logo URL</label>
                        <div className="relative">
                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                id="logoUrl"
                                name="logoUrl"
                                defaultValue={initialUser.logoUrl || ""}
                                placeholder="https://example.com/logo.png"
                                className="block w-full pl-12 pr-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm text-black"
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 px-1">
                            Tip: For best results, use a square image (PNG/JPG) with a transparent background.
                        </p>
                    </div>

                    {initialUser.logoUrl && (
                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center gap-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logo Preview</p>
                            <img
                                src={initialUser.logoUrl}
                                alt="Business Logo"
                                className="h-20 w-auto object-contain drop-shadow-md"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    )}

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
