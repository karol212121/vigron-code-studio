import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User, RefreshCw, AlertTriangle, FileCode } from "lucide-react";
import { ChatMessage } from "../types";

interface AIChatProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => Promise<void>;
  isSending: boolean;
  activeFileName?: string;
  onApplySuggestedCode?: (code: string) => void;
}

export const AIChat: React.FC<AIChatProps> = ({
  messages,
  onSendMessage,
  isSending,
  activeFileName,
  onApplySuggestedCode,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const msg = input.trim();
    setInput("");
    onSendMessage(msg);
  };

  // Helper function to extract code blocks from markdown
  const extractCodeBlocks = (markdown: string) => {
    const regex = /```(?:\w+)?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let match;
    while ((match = regex.exec(markdown)) !== null) {
      blocks.push(match[1]);
    }
    return blocks;
  };

  // Custom text renderer to format chat bubbles beautifully
  const renderMessageContent = (msg: ChatMessage) => {
    const text = msg.content;
    const codeBlocks = extractCodeBlocks(text);

    return (
      <div className="space-y-3">
        <p className="whitespace-pre-wrap leading-relaxed break-words">{text}</p>
        
        {codeBlocks.length > 0 && onApplySuggestedCode && (
          <div className="pt-2 border-t border-slate-700/50 space-y-2">
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center">
              <Sparkles className="w-3 h-3 mr-1" /> Kod taklifi aniqlandi:
            </p>
            {codeBlocks.map((code, idx) => (
              <button
                key={idx}
                onClick={() => onApplySuggestedCode(code)}
                className="w-full flex items-center justify-between px-3 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-98 text-slate-950 text-xs font-bold rounded-xl transition duration-150 shadow-md shadow-emerald-500/10"
              >
                <span className="flex items-center">
                  <FileCode className="w-4 h-4 mr-2" />
                  {activeFileName ? `Kodni ${activeFileName}-ga joylash` : "Ushbu kodni tahrirlovchiga joylash"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/10">
            <Sparkles className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Gemini AI Yordamchi</h3>
            <p className="text-[10px] text-emerald-400 font-semibold">Tahrirlash va tushuntirish</p>
          </div>
        </div>
        {activeFileName && (
          <span className="text-[10px] bg-slate-750 border border-slate-700 px-2 py-0.5 rounded-lg text-slate-400 font-mono">
            Focus: {activeFileName}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Welcome bubble */}
        <div className="flex space-x-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-none p-3 max-w-[85%] text-xs md:text-sm text-slate-200">
            <p className="font-bold text-emerald-400 mb-1">Assalomu alaykum! 👋</p>
            <p className="leading-relaxed">
              Men sizning aqlli kod yordamchingizman. Python, JavaScript, HTML, CSS yoki istalgan dasturlash tilini birgalikda o'rganishimiz mumkin.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-400 list-disc list-inside">
              <li>Xatolarni tushuntirish va tuzatish</li>
              <li>Siz xohlagan dasturni yaratib berish</li>
              <li>Kodlarni tahlil qilish</li>
            </ul>
          </div>
        </div>

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex space-x-2 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`rounded-2xl p-3 max-w-[85%] text-xs md:text-sm border ${
                  isUser
                    ? "bg-slate-800 border-emerald-500/30 text-slate-100 rounded-tr-none"
                    : "bg-slate-800/80 border-slate-700/50 text-slate-200 rounded-tl-none"
                }`}
              >
                {renderMessageContent(msg)}
              </div>
              {isUser && (
                <div className="w-6 h-6 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 mt-0.5 border border-slate-600">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {isSending && (
          <div className="flex space-x-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-none p-3 text-xs md:text-sm text-slate-400 flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Gemini fikrlamoqda va kod yozmoqda...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-850 border-t border-slate-750 shrink-0">
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:border-emerald-500/50 transition">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isSending}
            placeholder="Yordamchini so'roq qiling..."
            className="flex-1 bg-transparent border-none outline-none text-slate-100 text-xs md:text-sm placeholder-slate-500 focus:ring-0"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="p-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-lg transition active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
