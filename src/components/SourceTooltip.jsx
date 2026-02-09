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
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50">
                    <div className="bg-white rounded-lg shadow-xl border border-zinc-200 p-3 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-zinc-800 line-clamp-2">
                                {metadata.title || `Source ${id}`}
                            </span>
                            {metadata.status && (
                                <span className={`
                  text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded
                  ${metadata.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}
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
                                className="text-[10px] text-blue-500 hover:underline truncate mt-1"
                            >
                                View Source
                            </a>
                        )}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-b border-r border-zinc-200 transform rotate-45"></div>
                    </div>
                </div>
            )}
        </span>
    );
};

export default SourceTooltip;
