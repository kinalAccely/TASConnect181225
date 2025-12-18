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

        <p className="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">
          Powered by <span className="text-black">Eerly.Ai</span>
        </p>
      </div>
    </header>
  );
};

export default TopHeader;
