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
    <header className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white/90 px-6 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.12)] backdrop-blur-lg transition-colors md:flex-row md:items-center md:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center text-2xl font-semibold tracking-tight text-black">
            <span className="text-black">TAS</span>
            <span className="mx-1 flex items-center" aria-hidden="true">
              <span className="inline-block h-3 w-3 rounded-full bg-[var(--brand)]" />
            </span>
            <span className="text-zinc-700">connect</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.32em] text-zinc-500">
          <Sparkles size={16} className="text-[var(--brand)]" />
          Unified Workspace
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
          Powered by <span className="text-black">Eerly.Ai</span>
        </p>

        <p className="text-[11px] text-zinc-500">
          Use slash commands (for example <code>/agent</code>) to switch assistants instantly.
        </p>
      </div>

      <div className="flex flex-col items-start gap-3 text-sm text-zinc-600 md:items-end">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
          Current Assistant
          <span className="ml-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-zinc-700 shadow-inner shadow-zinc-200/60">
            {assistantId}
          </span>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--brand)] via-[var(--brand)] to-[var(--brand-dark)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[0_18px_32px_rgba(242,60,57,0.28)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-light)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PlusCircle size={16} />
          New Chat
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
