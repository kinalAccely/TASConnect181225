import React, { useEffect, useState } from "react";
import { IoRocketOutline, IoClose } from "react-icons/io5";

export default function ComingSoonModal({ isOpen, onClose }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? "bg-black/20 backdrop-blur-sm opacity-100" : "bg-transparent opacity-0"
                }`}
        >
            <div
                className={`relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300 ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
                    }`}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
                >
                    <IoClose size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-light)] text-white shadow-lg">
                        <IoRocketOutline size={32} />
                    </div>

                    <h3 className="mb-2 text-xl font-bold text-zinc-900">
                        Live Demo Coming Soon
                    </h3>

                    <p className="mb-6 text-[14px] leading-relaxed text-zinc-500">
                        We're building an interactive sandbox environment for you to test and play with the agents live. Stay tuned!
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
