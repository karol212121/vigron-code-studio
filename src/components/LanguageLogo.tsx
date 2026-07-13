import React from "react";

interface LanguageLogoProps {
  extension?: string;
  className?: string;
  fileName?: string;
}

export const LanguageLogo: React.FC<LanguageLogoProps> = ({
  extension,
  className = "w-4 h-4",
  fileName,
}) => {
  let ext = extension?.toLowerCase();

  if (!ext && fileName) {
    const parts = fileName.split(".");
    if (parts.length > 1) {
      ext = parts.pop()?.toLowerCase();
    }
  }

  // Define custom styles and SVG/logos for all popular languages
  switch (ext) {
    case "py":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2C6.48 2 6 3.5 6 5.5V7H12V8.5H5C3.5 8.5 2 9.5 2 12C2 14.5 3.5 15.5 5.5 15.5H7V13.5C7 11 9 9 11.5 9H17C19 9 20 8 20 5.5C20 3 18.5 2 12 2Z"
            fill="#3776AB"
          />
          <path
            d="M12 22C17.52 22 18 20.5 18 18.5V17H12V15.5H19C20.5 15.5 22 14.5 22 12C22 9.5 20.5 8.5 18.5 8.5H17V10.5C17 13 15 15 12.5 15H7C5 15 4 16 4 18.5C4 21 5.5 22 12 22Z"
            fill="#FFD343"
          />
          <circle cx="9" cy="5.5" r="0.75" fill="#FFFFFF" />
          <circle cx="15" cy="18.5" r="0.75" fill="#111111" />
        </svg>
      );

    case "js":
      return (
        <div className={`${className} bg-[#F7DF1E] text-slate-900 rounded-md flex items-center justify-center font-black text-[9px] tracking-tight shadow-sm border border-[#f0d611]`}>
          JS
        </div>
      );

    case "jsx":
      return (
        <div className={`${className} bg-[#4f5d75] text-[#61DAFB] rounded-md flex items-center justify-center font-extrabold text-[8px] tracking-tight shadow-sm border border-[#3b485c]`}>
          JSX
        </div>
      );

    case "ts":
      return (
        <div className={`${className} bg-[#3178C6] text-white rounded-md flex items-center justify-center font-extrabold text-[9px] tracking-tight shadow-sm border border-[#235da0]`}>
          TS
        </div>
      );

    case "tsx":
      return (
        <div className={`${className} bg-[#2d3748] text-[#3178C6] rounded-md flex items-center justify-center font-black text-[8px] tracking-tight shadow-sm border border-[#1a202c]`}>
          TSX
        </div>
      );

    case "dart":
      return (
        <div className={`${className} bg-[#01579B] text-[#00B0FF] rounded-md flex items-center justify-center font-extrabold text-[8px] tracking-tight shadow-sm`}>
          DART
        </div>
      );

    case "flutter":
      return (
        <div className={`${className} bg-[#02569B] text-[#01C6FC] rounded-md flex items-center justify-center font-extrabold text-[7px] tracking-tight shadow-sm`}>
          FLUT
        </div>
      );

    case "kt":
    case "kts":
      return (
        <div className={`${className} bg-gradient-to-tr from-[#E24429] via-[#B125EA] to-[#7F52FF] text-white rounded-md flex items-center justify-center font-extrabold text-[9px] shadow-sm`}>
          KT
        </div>
      );

    case "swift":
      return (
        <div className={`${className} bg-[#FA7343] text-white rounded-md flex items-center justify-center font-extrabold text-[9px] shadow-sm`}>
          SW
        </div>
      );

    case "cs":
      return (
        <div className={`${className} bg-[#178600] text-white rounded-md flex items-center justify-center font-bold text-[8px] border border-[#126b00]`}>
          C#
        </div>
      );

    case "rb":
      return (
        <div className={`${className} bg-[#701516] text-[#E11418] rounded-md flex items-center justify-center font-black text-[9px]`}>
          💎
        </div>
      );

    case "yaml":
    case "yml":
      return (
        <div className={`${className} bg-[#CB171E] text-white rounded-md flex items-center justify-center font-bold text-[8px]`}>
          YML
        </div>
      );

    case "xml":
      return (
        <div className={`${className} bg-[#4B6584] text-white rounded-md flex items-center justify-center font-extrabold text-[8px]`}>
          XML
        </div>
      );

    case "gradle":
      return (
        <div className={`${className} bg-[#02303A] text-[#02C29B] rounded-md flex items-center justify-center font-extrabold text-[7px]`}>
          GRAD
        </div>
      );

    case "html":
    case "htm":
      return (
        <div className={`${className} bg-[#E34F26] text-white rounded-md flex items-center justify-center font-extrabold text-[8px] shadow-sm border border-[#c43c17]`}>
          &lt;/&gt;
        </div>
      );

    case "css":
      return (
        <div className={`${className} bg-[#1572B6] text-white rounded-md flex items-center justify-center font-extrabold text-[9px] shadow-sm border border-[#0f5488]`}>
          #
        </div>
      );

    case "json":
      return (
        <div className={`${className} bg-[#F5A623] text-slate-950 rounded-md flex items-center justify-center font-bold text-[9px] shadow-sm border border-[#df9213]`}>
          &#123;&#125;
        </div>
      );

    case "md":
      return (
        <div className={`${className} bg-[#007ACC] text-white rounded-md flex items-center justify-center font-extrabold text-[9px] shadow-sm`}>
          M↓
        </div>
      );

    case "sh":
    case "bash":
    case "cmd":
    case "bat":
      return (
        <div className={`${className} bg-[#2F4F4F] text-emerald-400 rounded-md flex items-center justify-center font-bold text-[8px] border border-slate-700`}>
          &gt;_
        </div>
      );

    case "sql":
    case "db":
    case "sqlite":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00BCD4"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      );

    case "cpp":
    case "hpp":
    case "cc":
    case "h":
      return (
        <div className={`${className} bg-[#00599C] text-white rounded-md flex items-center justify-center font-bold text-[8px] border border-[#004b85]`}>
          C++
        </div>
      );

    case "java":
    case "jar":
      return (
        <div className={`${className} bg-[#ED8B00] text-white rounded-md flex items-center justify-center font-bold text-[9px]`}>
          ☕
        </div>
      );

    case "php":
      return (
        <div className={`${className} bg-[#777BB4] text-white rounded-md flex items-center justify-center font-extrabold text-[8px]`}>
          PHP
        </div>
      );

    case "rs":
      return (
        <div className={`${className} bg-[#000000] text-[#E05D44] rounded-md flex items-center justify-center font-extrabold text-[9px] border border-[#E05D44]`}>
          🦀
        </div>
      );

    case "go":
      return (
        <div className={`${className} bg-[#00ADD8] text-slate-950 rounded-md flex items-center justify-center font-extrabold text-[9px]`}>
          GO
        </div>
      );

    default:
      // Generic document page icon as fallback
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
  }
};
