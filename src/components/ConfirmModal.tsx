"use client";

import { X, AlertTriangle } from "lucide-react";
import { useEffect } from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    isLoading?: boolean;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Delete",
    cancelText = "Cancel",
    type = "danger",
    isLoading = false,
}: ConfirmModalProps) {
    // Lock scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: "bg-red-50",
            icon: "text-red-600",
            button: "bg-red-600 hover:bg-red-700 shadow-red-100",
            border: "border-red-100",
        },
        warning: {
            bg: "bg-orange-50",
            icon: "text-orange-600",
            button: "bg-orange-600 hover:bg-orange-700 shadow-orange-100",
            border: "border-orange-100",
        },
        info: {
            bg: "bg-blue-50",
            icon: "text-blue-600",
            button: "bg-blue-600 hover:bg-blue-700 shadow-blue-100",
            border: "border-blue-100",
        },
    };

    const style = colors[type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-white/20">
            <div
                className="absolute inset-0"
                onClick={isLoading ? undefined : onClose}
            ></div>

            <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden relative animate-in fade-in zoom-in duration-200">
                <div className="p-8">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="absolute right-6 top-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X size={20} />
                    </button>

                    <div className="flex flex-col items-center text-center space-y-4 pt-2">
                        <div className={`w-16 h-16 ${style.bg} ${style.icon} rounded-full flex items-center justify-center`}>
                            <AlertTriangle size={32} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-8">
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`w-full py-4 px-4 ${style.button} text-white rounded-2xl font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2`}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : confirmText}
                        </button>

                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full py-4 px-4 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-2xl font-bold transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
