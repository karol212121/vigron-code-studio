import React, { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Play, RefreshCw, Trash, Sparkles } from "lucide-react";
import { TerminalLine } from "../types";

interface TerminalProps {
  history: TerminalLine[];
  onRunCommand: (command: string) => Promise<void>;
  onClearHistory: () => void;
  onKillProcesses?: () => void;
  currentDir: string;
  isExecuting: boolean;
  currentProject: string;
  activeTabPath?: string;
}

export const Terminal: React.FC<TerminalProps> = ({
  history,
  onRunCommand,
  onClearHistory,
  onKillProcesses,
  currentDir,
  isExecuting,
  currentProject,
  activeTabPath = "",
}) => {
  const [cmd, setCmd] = useState("");
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isExecuting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim() || isExecuting) return;
    const finalCmd = cmd.trim();
    setCmd("");
    setHistoryIndex(-1); // Reset index
    onRunCommand(finalCmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const inputs = history.filter(h => h.type === "input").map(h => h.text);
    if (inputs.length === 0) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = historyIndex === -1 ? inputs.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCmd(inputs[nextIndex] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= inputs.length) {
        setHistoryIndex(-1);
        setCmd("");
      } else {
        setHistoryIndex(nextIndex);
        setCmd(inputs[nextIndex] || "");
      }
    }
  };

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const runQuickCommand = (command: string) => {
    if (isExecuting) return;
    onRunCommand(command);
  };

  const lastSlash = activeTabPath ? activeTabPath.lastIndexOf("/") : -1;
  const activeFileName = activeTabPath
    ? (lastSlash !== -1 ? activeTabPath.substring(lastSlash + 1) : activeTabPath)
    : "";
  const activeExt = activeFileName.split(".").pop()?.toLowerCase() || "";

  const pythonCmd = activeExt === "py" ? `python3 ${activeFileName}` : "python3 main.py";
  const nodeCmd = activeExt === "js" ? `node ${activeFileName}` : "node app.js";
  const dartCmd = activeExt === "dart" ? `dart ${activeFileName}` : "dart main.dart";

  const quickCommands = [
    { label: "dir (ls)", command: "dir" },
    { label: "cls (clear)", command: "cls" },
    { label: "ver", command: "ver" },
    { label: "systeminfo", command: "systeminfo" },
    { label: "ipconfig", command: "ipconfig" },
    { label: "help", command: "help" },
    { label: activeExt === "py" ? `Run ${activeFileName}` : "Run Python", command: pythonCmd },
    { label: "pip install requests", command: "pip3 install requests" },
    { label: "pip3 list", command: "pip3 list" },
    { label: activeExt === "js" ? `Run ${activeFileName}` : "Run Node JS", command: nodeCmd },
    { label: "npm install", command: "npm install" },
    { label: activeExt === "dart" ? `Run ${activeFileName}` : "Run Dart", command: dartCmd },
    { label: "To'xtatish (Kill)", action: onKillProcesses },
    { label: "Tozalash", action: onClearHistory },
  ];

  return (
    <div 
      onClick={handleTerminalClick}
      className="flex flex-col h-full bg-slate-950 text-slate-100 font-mono text-xs md:text-sm rounded-2xl border border-slate-800 overflow-hidden shadow-inner cursor-text"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-300">Terminal Shell</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-semibold border border-slate-700/50">
            {currentDir ? `${currentProject}/${currentDir}` : `${currentProject} (root)`}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isExecuting && (
            <span className="flex items-center text-[10px] text-emerald-400 font-semibold uppercase tracking-wider space-x-1 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin mr-1 text-emerald-400" />
              Bajarilmoqda...
            </span>
          )}
          {onKillProcesses && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onKillProcesses();
              }}
              className="px-2 py-1 bg-red-600/25 hover:bg-red-600 border border-red-500/30 rounded-lg text-red-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition active:scale-95"
              title="Faol Python yoki fon jarayonlarini to'xtatish"
            >
              To'xtatish
            </button>
          )}
          <button
            onClick={onClearHistory}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
            title="Kanalni tozalash"
          >
            <Trash className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Output history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 select-text custom-scrollbar">
        {/* Welcome greeting */}
        <div className="text-slate-500 border-b border-slate-900 pb-3 mb-3 bg-slate-900/30 p-4 rounded-xl border border-slate-800/40">
          <p className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Vigron Code Studio - Interaktiv Terminal
          </p>
          <p className="mt-1 text-xs text-slate-300 leading-relaxed">
            Siz ushbu qumloq (sandbox) terminalda xavfsiz tarzda Linux buyruqlari, Python kutubxonalari o'rnatish, Node.js va Dart/Flutter loyihalarini to'liq ishga tushira olasiz!
          </p>
          
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">Python 3.10</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-semibold">JS/TS/Node</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">Linux Bash</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20 text-[10px] font-bold">Direct Downloads (TEL)</span>
          </div>

          {/* Explicit direct file download guide */}
          <div className="mt-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
            <p className="text-amber-400 font-bold mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <span>📥</span> Telefon xotirasiga to'g'ridan-to'g'ri yuklab olish:
            </p>
            <p className="text-slate-300 leading-snug">
              Istalgan faylni telefoningiz xotirasiga saqlash uchun quyidagi buyruqlarni kiriting:
            </p>
            <ul className="mt-1.5 space-y-1 text-[11px] text-slate-400 list-disc list-inside">
              <li><code className="text-emerald-400 font-bold bg-slate-950 px-1 rounded">download &lt;fayl_nomi&gt;</code> - Faylni to'g'ridan-to'g'ri yuklab oladi (Masalan: <code className="text-sky-400">download bot.py</code>)</li>
              <li><code className="text-emerald-400 font-bold bg-slate-950 px-1 rounded">save &lt;fayl_nomi&gt;</code> - Faylni saqlaydi (Masalan: <code className="text-sky-400">save main.py</code>)</li>
              <li><code className="text-emerald-400 font-bold bg-slate-950 px-1 rounded">download</code> - Tahrirlanayotgan faol faylni to'g'ridan-to'g'ri yuklab oladi</li>
              <li><code className="text-emerald-400 font-bold bg-slate-950 px-1 rounded">yuklash</code> yoki <code className="text-emerald-400 font-bold bg-slate-950 px-1 rounded">yuklab-olish</code> - Telefonga yuklab olish buyruqlari</li>
            </ul>
          </div>

          {/* Quick interactive guide inside welcome greeting */}
          <div className="mt-4 space-y-2.5 pt-3 border-t border-slate-900 text-xs">
            <p className="text-emerald-400 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/15">
              <span>🚀</span> TAYYOR KUTUBXONALAR (PRE-INSTALLED LIBRARIES):
            </p>
            <p className="text-slate-300 leading-snug">
              Barcha mashhur dasturlash kutubxonalari saytga oldindan o'rnatilgan! <code className="text-emerald-400 font-bold">pip3 install</code> buyruqlarini ishlatish shart emas, loyihangizda to'g'ridan-to'g'ri <code className="text-sky-400">import requests</code> deb yozishingiz va ishlatishingiz mumkin:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("pip3 list"); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-emerald-500/25 hover:border-emerald-500/40 rounded text-[11px] text-emerald-300 transition flex justify-between items-center group font-mono"
              >
                <span>pip3 list (Barcha kutubxonalar)</span>
                <span className="text-[9px] text-emerald-400 font-bold opacity-80 group-hover:opacity-100 group-hover:underline">Ko'rish ➔</span>
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("python3 -c \"import telebot; print('Telebot muvaffaqiyatli ulangan!')\""); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 transition flex justify-between items-center group font-mono"
              >
                <span>Telebot test qilish</span>
                <span className="text-[9px] text-emerald-400 opacity-65 group-hover:opacity-100 group-hover:underline">Bajarish ➔</span>
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("python3 -c \"import requests; print('Requests ulangan!')\""); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 transition flex justify-between items-center group font-mono"
              >
                <span>Requests test qilish</span>
                <span className="text-[9px] text-emerald-400 opacity-65 group-hover:opacity-100 group-hover:underline">Bajarish ➔</span>
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("python3 -c \"import aiogram; print('Aiogram muvaffaqiyatli ulangan!')\""); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 transition flex justify-between items-center group font-mono"
              >
                <span>Aiogram test qilish</span>
                <span className="text-[9px] text-emerald-400 opacity-65 group-hover:opacity-100 group-hover:underline">Bajarish ➔</span>
              </button>
            </div>

            <p className="text-slate-400 font-bold text-[11px] uppercase tracking-wider mt-3 flex items-center gap-1">
              <span>📂</span> Muhim Tizim & Fayl Buyruqlari (Click-to-run):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("ls -la"); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 transition flex justify-between items-center group font-mono"
              >
                <span>ls -la (Fayllar ro'yxati)</span>
                <span className="text-[9px] text-emerald-400 opacity-65 group-hover:opacity-100 group-hover:underline">Bajarish ➔</span>
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("pwd"); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 transition flex justify-between items-center group font-mono"
              >
                <span>pwd (Turgan manzil)</span>
                <span className="text-[9px] text-emerald-400 opacity-65 group-hover:opacity-100 group-hover:underline">Bajarish ➔</span>
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("python3 main.py"); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 transition flex justify-between items-center group font-mono"
              >
                <span>python3 main.py</span>
                <span className="text-[9px] text-emerald-400 opacity-65 group-hover:opacity-100 group-hover:underline">Bajarish ➔</span>
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); runQuickCommand("node app.js"); }}
                className="text-left px-2 py-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded text-[11px] text-slate-300 transition flex justify-between items-center group font-mono"
              >
                <span>node app.js</span>
                <span className="text-[9px] text-emerald-400 opacity-65 group-hover:opacity-100 group-hover:underline">Bajarish ➔</span>
              </button>
            </div>
          </div>
        </div>

        {history.map((line, index) => {
          if (line.type === "input") {
            return (
              <div key={line.id} className="flex flex-col space-y-0.5 pt-4 first:pt-0">
                {index > 0 && (
                  <div className="w-full flex items-center gap-2 py-3 select-none">
                    <div className="h-px bg-slate-800/80 flex-1"></div>
                    <span className="text-[9px] text-slate-500 font-bold tracking-wider uppercase bg-slate-900/30 px-2 py-0.5 rounded-full border border-slate-850">
                      ⚡ BUYRUQ AJRATUVCHI (TERMINAL DIVIDER)
                    </span>
                    <div className="h-px bg-slate-800/80 flex-1"></div>
                  </div>
                )}
                <div className="flex items-start text-emerald-400">
                  <span className="mr-2 select-none text-slate-500 font-bold">
                    [{line.timestamp}] {line.dir ? `${currentProject}/${line.dir}` : `${currentProject}`}$
                  </span>
                  <span className="font-semibold text-emerald-300">{line.text}</span>
                </div>
              </div>
            );
          } else if (line.type === "stdout") {
            const qrMatch = line.text.match(/\[QR_CODE_IMAGE_DATA:(data:image\/png;base64,[\s\S]+?)\]/);
            if (qrMatch) {
              const base64Data = qrMatch[1];
              const cleanText = line.text.replace(/\[QR_CODE_IMAGE_DATA:data:image\/png;base64,[\s\S]+?\]/, "");
              
              // Extract the short link from the stdout
              const urlMatch = line.text.match(/👉\s*(https?:\/\/[^\s\n]+)/);
              const previewUrl = urlMatch ? urlMatch[1] : "";

              return (
                <div key={line.id} className="space-y-3">
                  <div className="text-slate-300 whitespace-pre-wrap leading-relaxed break-all">
                    {cleanText}
                  </div>
                  
                  {/* Glowing custom card for high-resolution QR code rendering */}
                  <div className="my-4 p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl shadow-xl max-w-xs mx-auto flex flex-col items-center text-center space-y-3.5 select-none">
                    <div className="text-emerald-400 font-bold text-xs tracking-wider uppercase flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Smart QR-Portal v2.0</span>
                    </div>
                    
                    <div className="p-3 bg-white rounded-2xl shadow-lg border-2 border-emerald-500/20">
                      <img src={base64Data} alt="QR Code" className="w-40 h-40 select-none" referrerPolicy="no-referrer" />
                    </div>
                    
                    <p className="text-[11px] text-slate-400 leading-relaxed max-w-[240px]">
                      Telefoningiz kamerasi bilan skanerlang va ilovani <b>PWA (Progressive Web App)</b> sifatida to'liq o'rnating.
                    </p>

                    {previewUrl && (
                      <div className="w-full flex flex-col space-y-1.5 pt-1">
                        <a 
                          href={previewUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
                        >
                          <span>🚀</span>
                          <span>Ilovani Brauzerda Ochish</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(previewUrl);
                            alert("Havola va QR-kod manzili nusxalandi!");
                          }}
                          className="w-full py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold text-[10px] rounded-xl border border-slate-800 transition active:scale-95"
                        >
                          🔗 Havolani Nusxalash
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={line.id} className="text-slate-300 whitespace-pre-wrap leading-relaxed break-all">
                {line.text}
              </div>
            );
          } else if (line.type === "stderr") {
            return (
              <div key={line.id} className="text-red-400 whitespace-pre-wrap font-semibold leading-relaxed break-all">
                {line.text}
              </div>
            );
          } else if (line.type === "info") {
            return (
              <div key={line.id} className="text-cyan-400 select-none font-semibold flex items-center space-x-1 py-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{line.text}</span>
              </div>
            );
          } else if (line.type === "success") {
            return (
              <div key={line.id} className="text-emerald-400 select-none font-semibold">
                ✓ {line.text}
              </div>
            );
          }
          return null;
        })}

        {isExecuting && (
          <div className="flex items-center text-slate-500 animate-pulse">
            <span className="mr-2">...</span>
            <span>Running commands asynchronously on remote server...</span>
          </div>
        )}

        <div ref={terminalEndRef} />
      </div>

      {/* Quick Access Actions for Mobile (Extremely Helpful!) */}
      <div className="px-3 py-2 bg-slate-900/60 border-t border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center space-x-1.5 shrink-0">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Tezkor:</span>
        {quickCommands.map((qc, i) => (
          <button
            key={i}
            onClick={() => qc.action ? qc.action() : runQuickCommand(qc.command!)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/60 font-semibold text-[11px] transition active:scale-95"
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* Form Input Line */}
      <form onSubmit={handleSubmit} className="flex items-center bg-slate-900 border-t border-slate-800 p-2 shrink-0">
        <span className="mr-2 select-none text-emerald-500 font-bold pl-2">
          {currentDir ? `${currentProject}/${currentDir}` : `${currentProject}`}$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isExecuting}
          className="flex-1 bg-transparent border-none outline-none text-slate-100 font-mono text-xs md:text-sm placeholder-slate-600 focus:ring-0 disabled:opacity-50 py-1"
          placeholder="Terminal buyrug'ini kiriting... (masalan, python3 main.py)"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="submit"
          disabled={isExecuting || !cmd.trim()}
          className="p-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 rounded-lg transition active:scale-95 flex items-center justify-center mr-1"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
        </button>
      </form>
    </div>
  );
};
