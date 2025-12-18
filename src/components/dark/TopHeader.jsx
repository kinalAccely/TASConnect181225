import React from "react";
import { Sparkles, PlusCircle } from "lucide-react";

const TopHeader = ({ assistantId, isLoading, onNewChat }) => {
  const handleNewChat = () => {
    if (isLoading) {
      return;
    }
    if (typeof onNewChat === "function") {
      onNewChat();
    }
  };

  return (
    <header className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/85 px-6 py-5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-lg transition-colors md:flex-row md:items-center md:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center text-2xl font-semibold tracking-tight text-slate-100">
            <span className="text-slate-100">TAS</span>
            <span className="mx-1 flex items-center" aria-hidden="true">
              <span className="inline-block h-3 w-3 rounded-full bg-sky-400" />
            </span>
            <span className="text-slate-400">connect</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-slate-500">
          <Sparkles size={16} className="text-sky-400" />
          Unified Workspace
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
          Powered by <span className="text-slate-100">Eerly.Ai</span>
        </p>

        <p className="text-[11px] text-slate-400">
          Use slash commands (for example <code>/agent</code>) to switch assistants instantly.
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 text-sm text-slate-200 md:items-end">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
          Current Assistant
          <span className="ml-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-sky-200 shadow-inner shadow-sky-900/40">
            {assistantId}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/45 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusCircle size={16} />
          New Chat
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
