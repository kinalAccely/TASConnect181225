import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDown,
    ChevronRight,
    Loader2,
    Brain,
    Search,
    Database,
    Wrench,
    CheckCircle2,
    Sparkles,
    Layout,
    FileText,
    Calculator,
    Zap,
    Cpu,
    UserCheck,
    Receipt,
    Ticket
} from 'lucide-react';
// import { cn } from "@/lib/utils";

const getToolIcon = (name) => {
    const lowerName = name?.toLowerCase() || "";
    if (lowerName.includes("search") || lowerName.includes("query")) return <Search size={14} />;
    if (lowerName.includes("database") || lowerName.includes("sql") || lowerName.includes("fetch")) return <Database size={14} />;
    if (lowerName.includes("analyze") || lowerName.includes("thought") || lowerName.includes("think")) return <Brain size={14} />;
    if (lowerName.includes("calculate") || lowerName.includes("metric")) return <Calculator size={14} />;
    if (lowerName.includes("create") || lowerName.includes("generate")) return <Layout size={14} />;
    if (lowerName.includes("document") || lowerName.includes("pdf") || lowerName.includes("word")) return <FileText size={14} />;
    if (lowerName.includes("leave") || lowerName.includes("vacation") || lowerName.includes("approv") || lowerName.includes("workflow")) return <UserCheck size={14} />;
    if (lowerName.includes("invoice") || lowerName.includes("purchase") || lowerName.includes("order") || lowerName.includes("financial")) return <Receipt size={14} />;
    if (lowerName.includes("jira") || lowerName.includes("ticket") || lowerName.includes("issue")) return <Ticket size={14} />;
    if (lowerName.includes("sap") || lowerName.includes("enterprise")) return <Cpu size={14} />;
    return <Wrench size={14} />;
};

export const ThinkingIndicator = ({ customMessages = [], toolMessages = [], className }) => {
    const [isOpen, setIsOpen] = useState(true);
    const bottomRef = useRef < HTMLDivElement > (null);

    const hasReasoning = customMessages && customMessages.length > 0;
    const hasTools = toolMessages && toolMessages.length > 0;

    useEffect(() => {
        if (hasTools || hasReasoning) {
            setIsOpen(true);
        }
    }, [hasTools, hasReasoning]);



    if (!hasReasoning && !hasTools) {
        return (
            <></>
            // <div className={cn("flex items-center gap-3 py-3 px-4 max-w-[80%] my-2 bg-muted/30 rounded-xl border border-border/50", className)}>
            //     <div className="flex gap-1.5">
            //         <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
            //         <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
            //         <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            //     </div>
            //     <span className="text-sm text-muted-foreground font-medium animate-pulse">Assistant is thinking...</span>
            // </div>
        );
    }

    return (
        <></>
        // <div className={cn("w-full max-w-3xl mx-auto my-4 animate-in fade-in slide-in-from-bottom-2 duration-300 px-4", className)}>
        //     <div className="rounded-xl border border-border/60 bg-muted/20 overflow-hidden shadow-sm backdrop-blur-sm">
        //         {/* Header / Toggle */}
        //         <div
        //             onClick={() => setIsOpen(!isOpen)}
        //             className="flex items-center gap-3 w-full p-3 text-sm transition-all hover:bg-muted/40 text-left border-b border-border/40 cursor-pointer"
        //         >
        //             <div className="flex items-center justify-center p-1 rounded-md bg-background/50 text-primary/70">
        //                 <Sparkles size={14} className={cn(!hasTools && "animate-pulse")} />
        //             </div>
        //             <span className="font-semibold text-foreground/70 flex-1">Thinking Process</span>
        //             <div className="flex items-center gap-3">
        //                 <div className="flex items-center justify-center text-muted-foreground/60 transition-transform duration-200">
        //                     {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        //                 </div>
        //             </div>
        //         </div>

        //         {isOpen && (
        //             <div className="bg-background/40">
        //                 {/* Reasoning Section (Custom Messages) */}
        //                 {hasReasoning && (
        //                     <div className="p-4 border-b border-border/30">
        //                         <div className="flex items-start gap-3 mb-2">
        //                             <div className="mt-0.5 p-1 rounded-full bg-blue-500/10 text-blue-500">
        //                                 <Brain size={12} />
        //                             </div>
        //                             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Reasoning</span>
        //                         </div>
        //                         <div className="space-y-2 pl-7 text-sm text-foreground/80 leading-relaxed break-words overflow-hidden">
        //                             {customMessages.map((msg, idx) => {
        //                                 const content = typeof msg === 'string' ? msg : (msg?.message || JSON.stringify(msg));
        //                                 return (
        //                                     <div key={idx} className="animate-in fade-in slide-in-from-left-2">
        //                                         {content}
        //                                     </div>
        //                                 );
        //                             })}
        //                         </div>
        //                     </div>
        //                 )}

        //                 {/* Actions Section (Tool Messages) */}
        //                 {hasTools && (
        //                     <div className="p-4">
        //                         <div className="flex items-start gap-3 mb-4">
        //                             <div className="mt-0.5 p-1 rounded-full bg-emerald-500/10 text-emerald-500">
        //                                 <Zap size={12} />
        //                             </div>
        //                             <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Actions Taken</span>
        //                         </div>

        //                         <div className="relative pl-10 pr-2 space-y-6 overflow-hidden">
        //                             {/* Vertical Timeline Line */}
        //                             <div className="absolute left-[20px] top-2 bottom-2 w-px bg-border/60" />

        //                             {toolMessages.map((msg, idx) => {
        //                                 const isLast = idx === toolMessages.length - 1;
        //                                 const content = typeof msg === 'string' ? msg : JSON.stringify(msg);

        //                                 return (
        //                                     <div key={idx} className="relative flex items-center gap-4 min-w-0 animate-in fade-in slide-in-from-left-2">
        //                                         {/* Timeline Node */}
        //                                         <div
        //                                             className={cn(
        //                                                 "absolute -left-[28px] w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10 bg-background",
        //                                                 isLast ? "border-primary shadow-[0_0_8px_rgba(var(--primary),0.2)]" : "bg-emerald-50/50 border-emerald-500"
        //                                             )}
        //                                         >
        //                                             {isLast ? (
        //                                                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        //                                             ) : (
        //                                                 <CheckCircle2 size={10} className="text-emerald-500" />
        //                                             )}
        //                                         </div>

        //                                         {/* Tool Detail Card */}
        //                                         <div className={cn(
        //                                             "flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 min-w-0",
        //                                             isLast ? "bg-white dark:bg-zinc-900 border-primary shadow-md" : "bg-muted/10 border-border/40 opacity-70"
        //                                         )}>
        //                                             <div className={cn(
        //                                                 "p-2 rounded-lg",
        //                                                 isLast ? "bg-primary/10 text-primary animate-pulse" : "bg-muted/40 text-muted-foreground"
        //                                             )}>
        //                                                 {getToolIcon(content)}
        //                                             </div>
        //                                             <div className="min-w-0 flex-1">
        //                                                 <p className={cn(
        //                                                     "text-xs font-semibold break-words line-clamp-2",
        //                                                     isLast ? "text-foreground" : "text-muted-foreground"
        //                                                 )}>
        //                                                     {content.split('\n')[0]} {/* Only show first line in timeline */}
        //                                                 </p>
        //                                             </div>
        //                                             {!isLast && <span className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 uppercase tracking-tighter">Done</span>}
        //                                             {isLast && <Loader2 size={12} className="animate-spin text-primary/60" />}
        //                                         </div>
        //                                     </div>
        //                                 );
        //                             })}
        //                             <div ref={bottomRef} className="h-2" />
        //                         </div>
        //                     </div>
        //                 )}
        //             </div>
        //         )}
        //     </div>
        // </div>
    );
};
