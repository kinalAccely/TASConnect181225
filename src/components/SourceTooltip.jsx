import React, { useState } from 'react';
import { IoLinkOutline } from "react-icons/io5";

const SourceTooltip = ({ id, metadataCache }) => {
    const [isHovered, setIsHovered] = useState(false);
    const metadata = metadataCache?.[id] || { title: id, type: 'source' }; // Fallback metadata

    return (
        <span
            className="relative inline-block ml-1 align-baseline cursor-pointer group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className="
        inline-flex items-center justify-center 
        w-5 h-5 rounded-full 
        bg-zinc-100 text-[10px] text-zinc-500 font-bold 
        border border-zinc-200 hover:bg-zinc-200 hover:border-zinc-300
        transition-colors duration-200
      ">
                {metadata.index ? metadata.index : <IoLinkOutline size={12} />}
            </span>

            {isHovered && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="relative bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-lg shadow-2xl px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white">
                                {metadata.title || `Source ${id}`}
                            </span>
                            {metadata.status && (
                                <span className={`
                  text-[9px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full
                  ${metadata.status === 'verified'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/30'}
                `}>
                                    {metadata.status}
                                </span>
                            )}
                        </div>
                        {metadata.url && (
                            <a
                                href={metadata.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-orange-400 hover:text-orange-300 hover:underline mt-1.5 block transition-colors"
                            >
                                → View Source
                            </a>
                        )}
                        {/* Tooltip Arrow */}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gradient-to-br from-zinc-900 to-zinc-800 transform rotate-45"></div>
                    </div>
                </div>
            )}
        </span>
    );
};

export default SourceTooltip;
