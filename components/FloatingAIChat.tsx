"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, Network } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: "ai" | "user" | "system";
  text: string;
  style?: "conflict" | "success" | "default" | "trace";
  agent?: string;
}

const INITIAL_MESSAGE: Message = {
  role: "ai",
  text: "Welcome aboard. I am your Master LangGraph Orchestrator. What kind of cruise voyage are you looking for today?",
  style: "default",
  agent: "Master Orchestrator",
};

// ─── Bubble Styles ────────────────────────────────────────────────────────────
const AI_BASE =
  "max-w-[88%] self-start bg-slate-800/80 border border-slate-700 text-slate-200 rounded-2xl rounded-tl-none p-3 text-sm leading-relaxed";
const AI_CONFLICT =
  "max-w-[88%] self-start bg-red-900/10 border border-red-500/50 text-red-200 rounded-2xl rounded-tl-none p-3 text-sm leading-relaxed";
const AI_SUCCESS =
  "max-w-[88%] self-start bg-green-900/10 border border-green-500/50 text-green-200 rounded-2xl rounded-tl-none p-3 text-sm leading-relaxed";
const USER_BUBBLE =
  "max-w-[88%] self-end bg-blue-600/20 border border-blue-500/50 text-blue-100 rounded-2xl rounded-tr-none p-3 text-sm leading-relaxed";
const TRACE_BUBBLE =
  "max-w-[100%] self-center flex items-center gap-2 text-slate-400 p-2 text-[10px] font-mono uppercase tracking-wider";

function bubbleClass(msg: Message) {
  if (msg.role === "user") return USER_BUBBLE;
  if (msg.role === "system" || msg.style === "trace") return TRACE_BUBBLE;
  if (msg.style === "conflict") return AI_CONFLICT;
  if (msg.style === "success") return AI_SUCCESS;
  return AI_BASE;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FloatingAIChat() {
  const router = useRouter();

  const [isOpen,    setIsOpen]    = useState(false);
  const [isTyping,  setIsTyping]  = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputVal,  setInputVal]  = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  const handleSend = async (e: React.FormEvent, presetMsg?: string) => {
    e.preventDefault();
    if (isTyping) return;

    const userText = presetMsg || inputVal.trim();
    if (!userText) return;

    // 1. Add user message
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInputVal("");
    setIsTyping(true);

    // 2. Intent trace visualization (UI ONLY)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: "system", style: "trace", text: "Analyzing intent... Routing to [Discovery Engine]" },
      ]);
    }, 400);

    // 3. Make real API Request
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();

      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: data.aiMsg || "Sorry, an error occurred in orchestration.",
            style: data.cruiseMatch ? "success" : "default",
            agent: "Discovery Agent",
          },
        ]);

        // Navigate dynamically to the global search pointing to this cruise
        if (data.cruiseMatch) {
            setTimeout(() => {
                 router.push(`/search?dest=${encodeURIComponent(data.cruiseMatch.destination)}`);
            }, 1000);
        }
      }, 1500); // UI breathing room

    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "System offline. Failed to reach Discovery Engine.", style: "conflict", agent: "System" },
      ]);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3">
      {/* ── Chat Window ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="w-[24rem] h-[34rem] flex flex-col overflow-hidden rounded-2xl border border-slate-700/50 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          style={{
            background: "rgba(2,6,23,0.96)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0"
                style={{ boxShadow: "0 0 15px rgba(37,99,235,0.2)" }}>
                <Network size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm tracking-wide">
                  Copilot Studio{" "}
                  <span className="text-slate-500 font-normal">| LangGraph</span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest">
                    Multi-Agent Orchestrator Active
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className="flex flex-col gap-1">
                {msg.role === "ai" && msg.agent && (
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                    <Bot size={10} />
                    {msg.agent}
                  </span>
                )}

                <div className={bubbleClass(msg)}>
                  {msg.style === "conflict" && (
                    <p className="text-[10px] font-extrabold text-red-400 uppercase tracking-widest mb-1.5">
                      ⚠ Conflict Detected
                    </p>
                  )}
                  {msg.style === "success" && (
                    <p className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest mb-1.5">
                      ✓ Orchestration Complete
                    </p>
                  )}
                  {msg.role === "system" ? (
                    <span className="flex items-center gap-2 opacity-60">
                      <Network size={12} className="animate-pulse text-blue-400 flex-shrink-0" />
                      {msg.text}
                    </span>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="self-start bg-slate-800/80 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                {[0, 0.15, 0.3].map((delay, idx) => (
                  <span
                    key={idx}
                    className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} className="h-2" />
          </div>

          {/* Suggested prompt chip */}
          {messages.length === 1 && !isTyping && (
            <div className="px-4 pb-3 flex-shrink-0">
              <button
                onClick={(e) => handleSend(e, "Find a weekend getaway to the Caribbean")}
                className="w-full text-left text-[11px] text-slate-400 border border-slate-700 hover:border-blue-500/50 hover:bg-blue-900/10 hover:text-blue-300 rounded-xl px-3 py-2.5 transition-all bg-slate-800/30 truncate cursor-pointer"
              >
                <Sparkles size={12} className="inline mr-1.5 text-blue-500" />
                Find a weekend getaway to the Caribbean...
              </button>
            </div>
          )}

          {/* Input bar */}
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-3 pb-3 pt-2 flex-shrink-0 border-t border-slate-800/80 bg-slate-900/50"
          >
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Send command to Orchestrator…"
              disabled={isTyping}
              className="flex-1 bg-slate-800/60 border border-slate-700 text-slate-100 text-sm placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all disabled:opacity-40"
            />
            <button
               type="submit"
               disabled={isTyping || !inputVal.trim()}
               className="w-11 h-11 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer flex-shrink-0"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </form>
        </div>
      )}

      {/* ── FAB Button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-label="Toggle Copilot Chat"
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-500 hover:scale-110 active:scale-95
          ${isOpen ? "rotate-180" : "rotate-0"}`}
        style={{
          background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
          boxShadow: isOpen
            ? "0 0 32px rgba(37,99,235,0.7), 0 4px 20px rgba(0,0,0,0.5)"
            : "0 0 20px rgba(37,99,235,0.4), 0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        {isOpen ? <X size={22} /> : <Network size={24} />}
      </button>

      {!isOpen && (
        <span className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-blue-400 animate-ping opacity-25 pointer-events-none" />
      )}
    </div>
  );
}
