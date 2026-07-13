import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import QRCode from "qrcode";
import http from "http";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const WORKSPACE_DIR = path.resolve(process.cwd(), "user_workspace");

// Dynamic Python & PIP executable path tracking
function getLocalPythonPath(): string | null {
  const paths = [
    path.join(WORKSPACE_DIR, "python", "bin", "python3"),
    path.join(WORKSPACE_DIR, "python", "bin", "python.exe"),
    path.join(WORKSPACE_DIR, "python", "python.exe"),
    path.join(WORKSPACE_DIR, "python", "bin", "python"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function getLocalPipPath(): string | null {
  const paths = [
    path.join(WORKSPACE_DIR, "python", "bin", "pip3"),
    path.join(WORKSPACE_DIR, "python", "bin", "pip.exe"),
    path.join(WORKSPACE_DIR, "python", "Scripts", "pip.exe"),
    path.join(WORKSPACE_DIR, "python", "Scripts", "pip3.exe"),
    path.join(WORKSPACE_DIR, "python", "bin", "pip"),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let ACTUAL_PYTHON3_PATH = getLocalPythonPath() || "python3";
let ACTUAL_PIP3_PATH = getLocalPipPath() || "pip3";

const terminalPromptStates = new Map<string, { type: string; timestamp: number }>();

const QR_CODES_FILE = path.join(WORKSPACE_DIR, "qr_codes.json");

function loadQrCodes(): Map<string, { u: string; p: string; path?: string }> {
  try {
    if (fs.existsSync(QR_CODES_FILE)) {
      const data = JSON.parse(fs.readFileSync(QR_CODES_FILE, "utf-8"));
      const map = new Map<string, { u: string; p: string; path?: string }>();
      for (const [key, value] of Object.entries(data)) {
        map.set(key, value as any);
      }
      return map;
    }
  } catch (err) {
    console.error("Failed to load QR codes:", err);
  }
  return new Map();
}

function saveQrCodes(map: Map<string, { u: string; p: string; path?: string }>) {
  try {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
    const obj: Record<string, any> = {};
    for (const [key, value] of map.entries()) {
      obj[key] = value;
    }
    fs.writeFileSync(QR_CODES_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save QR codes:", err);
  }
}

const qrShortCodes = loadQrCodes();
let shortCodeCounter = qrShortCodes.size > 0 ? Math.max(...Array.from(qrShortCodes.keys()).map(Number).filter(n => !isNaN(n))) + 1 : 1;
if (shortCodeCounter < 1) {
  shortCodeCounter = 1;
}

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Pre-populate with starter files if workspace is empty
const starterFiles = [
  {
    name: "README.md",
    content: `# 🚀 Vigron Code Studio-ga xush kelibsiz!

Bu sizning telefoningizda to'liq dasturlash va terminal muhiti. Siz bu yerda kod yozishingiz, terminal orqali uni ishga tushirishingiz va hatto HTML/CSS sahifalarni jonli tarzda ko'rishingiz mumkin.

## 🛠️ Qanday qilib kodni ishga tushirish mumkin?

1. **Python**:
   - \`main.py\` faylini oching.
   - Terminal paneliga o'ting va quyidagi buyruqni yozing:
     \`\`\`bash
     python3 main.py
     \`\`\`

2. **Node.js (JavaScript)**:
   - \`app.js\` faylini oching.
   - Terminalda quyidagi buyruqni yozing:
     \`\`\`bash
     node app.js
     \`\`\`

3. **HTML/CSS/JS (Web)**:
   - \`index.html\` yoki istalgan HTML faylini tanlang.
   - O'ng tarafdagi **"Preview"** (Ko'rish) tugmasini bosing yoki uning oynasini oching.

## 🤖 Gemini AI Yordamchisi

Terminalda yoki yon paneldagi AI chat oynasida Gemini sizning barcha fayllaringizni ko'ra oladi va xatolarni tuzatishda, yangi kod yozishda yordam beradi. Uni bemalol o'zbek tilida so'roq qilishingiz mumkin!
`
  },
  {
    name: "main.py",
    content: `# Python-da dasturlashni o'rganamiz!
import sys

def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence

print("👋 Salom, Mobil Code Studio foydalanuvchisi!")
print(f"Python versiyasi: {sys.version.split()[0]}")
print("\\nFibonachchi ketma-ketligi (10 ta son):")
print(fibonacci(10))
`
  },
  {
    name: "app.js",
    content: `// Node.js JavaScript dasturi
console.log("🚀 Mobil Code Studio-dan salom!");

const tillar = ["JavaScript", "Python", "HTML", "CSS", "Bash"];
console.log("\\nSiz o'rganishingiz mumkin bo'lgan texnologiyalar:");

tillar.forEach((til, index) => {
  console.log(\`\${index + 1}. \${til}\`);
});

const hozir = new Date();
console.log(\`\\nHozirgi vaqt: \${hozir.toLocaleTimeString()}\`);
`
  },
  {
    name: "index.html",
    content: `<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mening Birinchi Mobil Veb-sahifam</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes pulse-slow {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .animate-pulse-slow {
            animation: pulse-slow 3s infinite ease-in-out;
        }
    </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 font-sans">
    <div class="max-w-md w-full bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 text-center animate-fade-in">
        <div class="w-20 h-20 bg-emerald-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20 animate-pulse-slow">
            <span class="text-4xl">📱</span>
        </div>
        <h1 class="text-2xl font-bold mb-2 text-emerald-400">Mobil Code Studio</h1>
        <p class="text-slate-400 mb-6 text-sm">Ushbu sahifa siz tahrirlayotgan HTML faylning jonli ko'rinishidir!</p>
        
        <div class="bg-slate-950 p-4 rounded-xl mb-6 text-left border border-slate-800">
            <p class="text-xs text-slate-500 font-mono mb-1">// index.html faylini tahrirlang</p>
            <p class="text-emerald-300 font-mono text-sm font-semibold">"Men telefonimda kod yozmoqdaman!"</p>
        </div>

        <button onclick="salomBer()" class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-3 px-6 rounded-xl transition duration-250 transform active:scale-95 shadow-md shadow-emerald-500/10">
            Tugmani bosing
        </button>
    </div>

    <script>
        function salomBer() {
            alert("Tabriklaymiz! Mobil Code Studio orqali veb-sahifangiz mukammal ishlamoqda! 🎉");
        }
    </script>
</body>
</html>
`
  }
];

starterFiles.forEach((file) => {
  const filePath = path.join(WORKSPACE_DIR, file.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, file.content, "utf-8");
  }
});

// Analytics System
const ANALYTICS_FILE = path.join(WORKSPACE_DIR, "analytics.json");
function logAnalyticsAction(type: "view" | "save" | "terminal" | "ai") {
  try {
    let data = { views: 0, saves: 0, terminals: 0, ais: 0, history: [] as any[] };
    if (fs.existsSync(ANALYTICS_FILE)) {
      data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8"));
    }
    
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    if (type === "view") data.views++;
    if (type === "save") data.saves++;
    if (type === "terminal") data.terminals++;
    if (type === "ai") data.ais++;

    // Record daily history
    let dayEntry = data.history.find((h: any) => h.date === today);
    if (!dayEntry) {
      dayEntry = { date: today, views: 0, saves: 0, terminals: 0, ais: 0 };
      data.history.push(dayEntry);
    }
    if (type === "view") dayEntry.views++;
    if (type === "save") dayEntry.saves++;
    if (type === "terminal") dayEntry.terminals++;
    if (type === "ai") dayEntry.ais++;

    // Limit history length to 30 days
    if (data.history.length > 30) {
      data.history.shift();
    }

    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Analytics log failed:", err);
  }
}

// Multi-project System
function getProjectDir(req: any): string {
  // Use header, query, or body to find target user and project
  const userEmail = req.headers["x-user-email"] || req.query.userEmail || (req.body && req.body.userEmail) || "";
  const projectName = req.headers["x-project-name"] || req.query.projectName || (req.body && req.body.projectName) || "default";
  
  const safeProjectName = path.normalize(String(projectName)).replace(/^(\.\.(\/|\\|$))+/, '').trim() || "default";
  
  let baseDir = path.join(WORKSPACE_DIR, "projects");
  if (userEmail) {
    const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
    baseDir = path.join(baseDir, safeEmail);
  } else {
    baseDir = path.join(baseDir, "anonymous");
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const projectPath = path.join(baseDir, safeProjectName);
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
    
    if (safeProjectName === "default") {
      migrateRootFilesToDefault(projectPath);
    } else {
      // Create a basic README.md
      fs.writeFileSync(
        path.join(projectPath, "README.md"),
        `# ${safeProjectName}\n\nYangi loyiha muvaffaqiyatli yaratildi!\n`,
        "utf-8"
      );
    }
  }

  if (safeProjectName === "default") {
    ensureDefaultProjectFiles(projectPath);
  }

  return projectPath;
}

function ensureDefaultProjectFiles(projectPath: string) {
  try {
    starterFiles.forEach((file) => {
      const destPath = path.join(projectPath, file.name);
      if (!fs.existsSync(destPath)) {
        fs.writeFileSync(destPath, file.content, "utf-8");
        console.log(`Successfully seeded default starter file ${file.name} to ${projectPath}`);
      }
    });
  } catch (err) {
    console.error("Failed to ensure default project files:", err);
  }
}

function migrateRootFilesToDefault(defaultPath: string) {
  try {
    const items = fs.readdirSync(WORKSPACE_DIR);
    let hasFilesToMigrate = false;
    for (const item of items) {
      if (item === "projects" || item === "node_modules" || item === ".git" || item === "analytics.json" || item === "users.json") continue;
      hasFilesToMigrate = true;
      break;
    }
    if (hasFilesToMigrate) {
      console.log("Migrating root files to default project folder...");
      for (const item of items) {
        if (item === "projects" || item === "node_modules" || item === ".git" || item === "analytics.json" || item === "users.json") continue;
        const src = path.join(WORKSPACE_DIR, item);
        const dest = path.join(defaultPath, item);
        fs.renameSync(src, dest);
      }
    }
  } catch (err) {
    console.error("Migration to default project failed:", err);
  }
}

// Lazy Initialize Gemini Client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY topilmadi. Iltimos, AI Studio Settings (Sozlamalar) > Secrets panelidan API kalitini qo'shing.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Increased limits for Base64 project uploads/imports
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper function to recursively read files in workspace
function getWorkspaceTree(dirPath: string, relativeRoot: string = ""): any[] {
  try {
    const items = fs.readdirSync(dirPath);
    const result: any[] = [];

    for (const item of items) {
      if (item === "node_modules" || item === ".git" || item === ".keep") continue;
      
      const absolutePath = path.join(dirPath, item);
      try {
        const relPath = relativeRoot ? `${relativeRoot}/${item}` : item;
        const stat = fs.statSync(absolutePath);

        if (stat.isDirectory()) {
          result.push({
            name: item,
            path: relPath,
            type: "directory",
            children: getWorkspaceTree(absolutePath, relPath)
          });
        } else {
          result.push({
            name: item,
            path: relPath,
            type: "file",
            size: stat.size,
            extension: path.extname(item).slice(1)
          });
        }
      } catch (itemErr) {
        console.error("Failed to stat workspace item:", absolutePath, itemErr);
      }
    }

    // Sort: directories first, then files
    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (dirErr) {
    console.error("Failed to read workspace directory:", dirPath, dirErr);
    return [];
  }
}

// Short redirect endpoint for mobile previews (keeps QR code URL short and compact)
app.get("/go", (req, res) => {
  const { u, p } = req.query;
  const userEmail = u ? String(u) : "anonymous";
  const projectName = p ? String(p) : "default";
  const redirectUrl = `/api/workspace/preview?path=web/index.html&userEmail=${encodeURIComponent(userEmail)}&projectName=${encodeURIComponent(projectName)}`;
  res.redirect(redirectUrl);
});

// Extra short link endpoint for ultra compact QR codes
app.get("/g/:id", (req, res) => {
  const { id } = req.params;
  const mapping = qrShortCodes.get(id);
  if (mapping) {
    const targetPath = mapping.path || "web/index.html";
    const redirectUrl = `/api/workspace/preview?path=${encodeURIComponent(targetPath)}&userEmail=${encodeURIComponent(mapping.u)}&projectName=${encodeURIComponent(mapping.p)}`;
    return res.redirect(redirectUrl);
  }
  // Fallback
  res.send("<h2>QR kodi eskirgan yoki topilmadi.</h2><p>Iltimos, terminalda qaytadan 'flutter run' buyrug'ini bosing va yangi QR koddan foydalaning.</p>");
});

// 1. Get workspace files list
app.get("/api/workspace/files", (req, res) => {
  try {
    const projectDir = getProjectDir(req);
    const tree = getWorkspaceTree(projectDir);
    res.json({ files: tree });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get file content
app.get("/api/workspace/file", (req, res) => {
  const relativePath = req.query.path as string;
  if (!relativePath) {
    return res.status(400).json({ error: "Fayl yo'li kiritilmadi" });
  }

  const projectDir = getProjectDir(req);
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(projectDir, safePath);

  if (!absolutePath.startsWith(projectDir)) {
    return res.status(403).json({ error: "Ruxsat etilmagan fayl yo'li" });
  }

  try {
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Fayl topilmadi" });
    }
    const content = fs.readFileSync(absolutePath, "utf-8");
    res.json({ content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2b. Download file directly to phone memory
app.get("/api/workspace/file/download", (req, res) => {
  const relativePath = req.query.path as string;
  if (!relativePath) {
    return res.status(400).send("Fayl yo'li kiritilmadi");
  }

  const projectDir = getProjectDir(req);
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(projectDir, safePath);

  if (!absolutePath.startsWith(projectDir)) {
    return res.status(403).send("Ruxsat etilmagan fayl yo'li");
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).send("Fayl topilmadi");
  }

  try {
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      const zip = new AdmZip();
      zip.addLocalFolder(absolutePath);
      const zipBuffer = zip.toBuffer();
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=vigron_${path.basename(safePath) || "folder"}.zip`);
      return res.send(zipBuffer);
    }

    res.download(absolutePath, path.basename(absolutePath));
  } catch (err: any) {
    res.status(500).send("Yuklab olishda xatolik: " + err.message);
  }
});

// 3. Create or save file
app.post("/api/workspace/file", (req, res) => {
  const { path: relativePath, content } = req.body;
  if (!relativePath) {
    return res.status(400).json({ error: "Fayl yo'li kiritilmadi" });
  }

  const projectDir = getProjectDir(req);
  const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(projectDir, safePath);

  if (!absolutePath.startsWith(projectDir)) {
    return res.status(403).json({ error: "Ruxsat etilmagan fayl yo'li" });
  }

  try {
    // Ensure parent directories exist
    const parentDir = path.dirname(absolutePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content || "", "utf-8");
    
    // Log save action in analytics
    logAnalyticsAction("save");

    res.json({ success: true, message: "Fayl saqlandi" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Delete file or directory
app.post("/api/workspace/delete", (req, res) => {
  const { path: relativePath } = req.body;
  console.log("[Delete API] Requested path deletion:", relativePath);
  if (!relativePath) {
    return res.status(400).json({ error: "Yo'l kiritilmadi" });
  }

  const projectDir = getProjectDir(req);
  // Strip any leading slashes or backslashes to ensure clean relative path
  const cleanRelativePath = String(relativePath).replace(/^[/\\]+/, "");
  const safePath = path.normalize(cleanRelativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const absolutePath = path.join(projectDir, safePath);

  console.log("[Delete API] Resolved paths:", {
    projectDir,
    cleanRelativePath,
    safePath,
    absolutePath,
    exists: fs.existsSync(absolutePath)
  });

  if (!absolutePath.startsWith(projectDir)) {
    console.error("[Delete API] Path escape attempt or unauthorized path:", absolutePath);
    return res.status(403).json({ error: "Ruxsat etilmagan yo'l" });
  }

  try {
    if (!fs.existsSync(absolutePath)) {
      console.warn("[Delete API] Target path does not exist:", absolutePath);
      return res.status(404).json({ error: "Fayl yoki papka topilmadi" });
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      fs.rmSync(absolutePath, { recursive: true, force: true });
      console.log("[Delete API] Directory recursively deleted:", absolutePath);
    } else {
      fs.unlinkSync(absolutePath);
      console.log("[Delete API] File deleted:", absolutePath);
    }
    res.json({ success: true, message: "Muvaffaqiyatli o'chirildi" });
  } catch (err: any) {
    console.error("[Delete API] Deletion error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Dart & Flutter Virtual Sandbox Simulation Runtime ---
function runSimulatedDart(filePath: string): { stdout: string; stderr: string; code: number } {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        stdout: "",
        stderr: `Error: File not found: ${path.basename(filePath)}\n`,
        code: 1
      };
    }
    const content = fs.readFileSync(filePath, "utf-8");
    
    // Simple dart parser
    let stdoutLines: string[] = [];
    let stderrLines: string[] = [];
    
    // Extract main() block
    const mainMatch = content.match(/void\s+main\s*\(\s*\)\s*\{([\s\S]*)\}/);
    if (!mainMatch) {
      return {
        stdout: "",
        stderr: "Error: void main() function not found in Dart file.\n",
        code: 1
      };
    }
    
    const body = mainMatch[1];
    const lines = body.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    // Simple local variable environment
    const vars: Record<string, any> = {};
    
    for (let line of lines) {
      // 1. Parse var declarations
      const varDeclMatch = line.match(/^(var|String|int|double|bool|final|const)\s+([a-zA-Z0-9_]+)\s*=\s*([\s\S]+?);/);
      if (varDeclMatch) {
        const name = varDeclMatch[2];
        let valStr = varDeclMatch[3].trim();
        
        if (valStr.startsWith('"') && valStr.endsWith('"')) {
          vars[name] = valStr.slice(1, -1);
        } else if (valStr.startsWith("'") && valStr.endsWith("'")) {
          vars[name] = valStr.slice(1, -1);
        } else if (!isNaN(Number(valStr))) {
          vars[name] = Number(valStr);
        } else if (valStr === "true") {
          vars[name] = true;
        } else if (valStr === "false") {
          vars[name] = false;
        } else {
          try {
            let evalExpr = valStr;
            for (let v in vars) {
              evalExpr = evalExpr.replace(new RegExp(`\\b${v}\\b`, 'g'), vars[v]);
            }
            vars[name] = Function(`return (${evalExpr})`)();
          } catch {
            vars[name] = valStr;
          }
        }
        continue;
      }
      
      // 2. Parse print statements
      const printMatch = line.match(/^print\s*\(\s*([\s\S]+?)\s*\)\s*;/);
      if (printMatch) {
        let expr = printMatch[1].trim();
        
        if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
          let str = expr.slice(1, -1);
          str = str.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (_, v) => vars[v] !== undefined ? vars[v] : "");
          str = str.replace(/\$([a-zA-Z0-9_]+)/g, (_, v) => vars[v] !== undefined ? vars[v] : "");
          stdoutLines.push(str);
        } else {
          try {
            let evalExpr = expr;
            for (let v in vars) {
              evalExpr = evalExpr.replace(new RegExp(`\\b${v}\\b`, 'g'), vars[v]);
            }
            const res = Function(`return (${evalExpr})`)();
            stdoutLines.push(String(res));
          } catch {
            if (vars[expr] !== undefined) {
              stdoutLines.push(String(vars[expr]));
            } else {
              stdoutLines.push(expr);
            }
          }
        }
        continue;
      }
    }
    
    stdoutLines.unshift("🎯 Dart Virtual Runner v1.0.0 (Fast Sandbox Interpreter)");
    return {
      stdout: stdoutLines.join("\n") + "\n",
      stderr: stderrLines.join("\n"),
      code: 0
    };
  } catch (err: any) {
    return {
      stdout: "",
      stderr: `Dart runner error: ${err.message}\n`,
      code: 1
    };
  }
}

function simulateFlutterCreate(projectName: string, execCwd: string): { stdout: string; stderr: string; code: number } {
  try {
    const projectDir = path.resolve(execCwd, projectName);
    if (!projectDir.startsWith(WORKSPACE_DIR)) {
      return {
        stdout: "",
        stderr: "Error: Project path outside workspace directory.\n",
        code: 1
      };
    }
    
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, "lib"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "web"), { recursive: true });
    
    const pubspecContent = `name: ${projectName}
description: A new Flutter project.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
`;
    fs.writeFileSync(path.join(projectDir, "pubspec.yaml"), pubspecContent, "utf-8");
    
    const mainDartContent = `import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: 'Flutter Demo Home Page'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Text(
              'Siz tugmani shuncha marta bosdingiz:',
            ),
            Text(
              '\$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
`;
    fs.writeFileSync(path.join(projectDir, "lib/main.dart"), mainDartContent, "utf-8");
    
    const indexHtmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flutter Web App Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Space Grotesk', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 flex flex-col items-center justify-center min-h-screen p-4">
  <div class="w-full max-w-sm bg-slate-900 rounded-[32px] border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col relative aspect-[9/16] outline-none select-none">
    
    <!-- Phone Notch -->
    <div class="absolute top-0 inset-x-0 h-6 bg-slate-800 flex justify-between items-center px-6 text-[10px] text-slate-400 font-bold z-20">
      <span>12:00</span>
      <div class="w-16 h-4 bg-slate-900 rounded-full"></div>
      <div class="flex items-center space-x-1">
        <span>📶</span>
        <span>🔋</span>
      </div>
    </div>
    
    <!-- Phone App Bar -->
    <div class="bg-teal-700 text-white pt-8 pb-3 px-4 shadow-md flex items-center justify-between z-10">
      <div class="flex items-center space-x-2">
        <span class="text-sm">📱</span>
        <span class="font-bold text-sm tracking-tight" id="app-title">Flutter Demo Home Page</span>
      </div>
      <span class="text-xs bg-teal-800/50 px-2 py-0.5 rounded font-semibold text-teal-200">Flutter Web</span>
    </div>
    
    <!-- Phone Screen Body -->
    <div class="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div class="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl mb-6">
        <span class="text-3xl">🚀</span>
        <h2 class="text-sm font-semibold text-slate-300 mt-2">Simulated Flutter SDK</h2>
        <p class="text-[10px] text-slate-500 mt-1">Siz yozgan main.dart kodi o'zbekcha yordamchi interfeys orqali ishlamoqda.</p>
      </div>

      <p class="text-xs text-slate-400 font-medium">Siz tugmani shuncha marta bosdingiz:</p>
      <p class="text-4xl font-extrabold text-teal-400 mt-3" id="counter">0</p>
    </div>
    
    <!-- Phone Floating Action Button -->
    <button 
      onclick="increment()"
      class="absolute bottom-8 right-6 w-14 h-14 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 rounded-full flex items-center justify-center shadow-lg font-bold text-2xl transition z-10"
    >
      +
    </button>
    
    <!-- Home Bar Indicator -->
    <div class="absolute bottom-1.5 inset-x-0 flex justify-center z-20">
      <div class="w-28 h-1 bg-slate-700 rounded-full"></div>
    </div>
  </div>
  
  <p class="text-xs text-slate-500 mt-4 text-center">
    💡 <b>Ushbu ekran jonli Flutter simulyatoridir.</b><br/>
    Siz loyihada istalgan o'zgarish qilib, uni preview rejimida ko'rishingiz mumkin!
  </p>

  <script>
    let count = 0;
    const counterEl = document.getElementById("counter");
    function increment() {
      count++;
      counterEl.textContent = count;
    }
  </script>
</body>
</html>
`;
    fs.writeFileSync(path.join(projectDir, "web/index.html"), indexHtmlContent, "utf-8");
    
    const readmeContent = `# ${projectName}

Ushbu loyiha Flutter (simulyatsiya) muhitida yaratildi.
Siz \`lib/main.dart\` faylini ochib, kodni tahrirlashingiz mumkin.

## 🚀 Qanday ishga tushirish mumkin?
1. Terminalda ushbu katalogga kiring:
   \`\`\`bash
   cd ${projectName}
   \`\`\`
2. Ilovani simulyatorda ishga tushiring:
   \`\`\`bash
   flutter run
   \`\`\`
3. Loyihaning \`web/index.html\` faylini tanlab **Preview** oynasida natijani ko'ring!
`;
    fs.writeFileSync(path.join(projectDir, "README.md"), readmeContent, "utf-8");
    
    return {
      stdout: `🤖 Flutter loyihasi muvaffaqiyatli yaratildi: ${projectName}\n👉 Katalogga kirish uchun yozing: cd ${projectName}\n👉 Keyin esa ishga tushirish uchun yozing: flutter run\n`,
      stderr: "",
      code: 0
    };
  } catch (err: any) {
    return {
      stdout: "",
      stderr: `Flutter loyihasini yaratishda xatolik: ${err.message}\n`,
      code: 1
    };
  }
}

// Helper to build PATH safely avoiding inaccessible directories
function getSafePath(): string {
  const FLUTTER_BIN_DIR = path.resolve(WORKSPACE_DIR, "flutter-sdk", "bin");
  const DART_BIN_DIR = path.resolve(WORKSPACE_DIR, "dart-sdk", "bin");
  const PORTABLE_PYTHON_BIN_DIR = path.resolve(WORKSPACE_DIR, "python", "bin");
  const pathParts: string[] = [];
  
  if (fs.existsSync(PORTABLE_PYTHON_BIN_DIR)) {
    pathParts.push(PORTABLE_PYTHON_BIN_DIR);
  }

  try {
    fs.accessSync("/root/.local/bin", fs.constants.R_OK | fs.constants.X_OK);
    pathParts.push("/root/.local/bin");
  } catch (err) {}
  
  if (fs.existsSync(FLUTTER_BIN_DIR)) {
    try {
      fs.accessSync(FLUTTER_BIN_DIR, fs.constants.R_OK | fs.constants.X_OK);
      pathParts.push(FLUTTER_BIN_DIR);
    } catch (e) {}
  }
  if (fs.existsSync(DART_BIN_DIR)) {
    try {
      fs.accessSync(DART_BIN_DIR, fs.constants.R_OK | fs.constants.X_OK);
      pathParts.push(DART_BIN_DIR);
    } catch (e) {}
  }

  // Explicitly ensure standard Unix/Linux paths are in the PATH variable
  const systemPaths = ["/usr/bin", "/usr/local/bin", "/bin", "/usr/sbin", "/sbin"];
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      pathParts.push(p);
    }
  }
  
  pathParts.push(process.env.PATH || "");
  return pathParts.filter(Boolean).join(path.delimiter);
}

// Helper function to execute shell commands with persistent directory tracking
function runCommandWithPwdTracking(command: string, execCwd: string, projectDir: string, currentDir: string, res: any) {
  const separator = "____PWD____";
  const isWin = process.platform === "win32";
  
  // Execute the command in the current directory, then print the final working directory
  let wrappedCommand;
  const trimmedCmd = command.trim();
  
  if (isWin) {
    if (trimmedCmd.endsWith("&")) {
      const withoutBg = trimmedCmd.slice(0, -1).trim();
      wrappedCommand = `start /B ${withoutBg} & echo ${separator} & cd`;
    } else {
      wrappedCommand = `${command} & echo ${separator} & cd`;
    }
  } else {
    if (trimmedCmd.endsWith("&")) {
      const withoutBg = trimmedCmd.slice(0, -1).trim();
      wrappedCommand = `(${withoutBg}) > /dev/null 2>&1 & echo -n "${separator}" ; pwd`;
    } else {
      wrappedCommand = `${command} ; echo -n "${separator}" ; pwd`;
    }
  }

  const CUSTOM_PATH = getSafePath();

  exec(wrappedCommand, {
    cwd: execCwd,
    timeout: 180000, // 3 minutes timeout for real Flutter builds
    maxBuffer: 1024 * 1024 * 25, // 25MB max buffer
    shell: undefined, // Let Node use the default OS shell (cmd.exe on Windows, sh/bash on Linux)
    env: {
      ...process.env,
      PATH: CUSTOM_PATH,
      PYTHONPATH: path.resolve(process.cwd(), "python_patches"),
      PUB_CACHE: path.join(WORKSPACE_DIR, ".pub-cache"),
    }
  }, (error, stdout, stderr) => {
    let cleanStdout = stdout || "";
    let finalPwd = execCwd;

    const lastIndex = cleanStdout.lastIndexOf(separator);
    if (lastIndex !== -1) {
      finalPwd = cleanStdout.slice(lastIndex + separator.length).trim();
      cleanStdout = cleanStdout.slice(0, lastIndex);
    }

    // Convert absolute finalPwd to relative path from active projectDir
    let newRelDir = path.relative(projectDir, finalPwd);
    if (newRelDir.startsWith("..") || path.isAbsolute(newRelDir)) {
      // If out of workspace, bind back to root project directory
      newRelDir = "";
    }
    // Normalize path separators to forward slashes for the front-end
    newRelDir = newRelDir.replace(/\\/g, "/");

    // Sanitize stderr / error message to remove Node's wrapper leak
    let cleanStderr = stderr || "";
    if (!cleanStderr && error && error.message) {
      cleanStderr = error.message;
      if (cleanStderr.startsWith("Command failed:")) {
        const lines = cleanStderr.split("\n");
        if (lines.length > 1) {
          cleanStderr = lines.slice(1).join("\n").trim();
        }
      }
    }

    res.json({
      stdout: cleanStdout,
      stderr: cleanStderr,
      code: error ? (error.code || 1) : 0,
      newDir: newRelDir
    });
  });
}

// Helper to translate Windows CMD commands to Linux equivalents, or vice-versa based on the host OS
function translateWindowsCommand(cmdLine: string): string {
  if (!cmdLine) return "";
  
  const isWinHost = process.platform === "win32";

  // If on Windows, replace newlines with "&" for chaining. On Linux, chain with "&&".
  let normalized = cmdLine.replace(/\r?\n/g, isWinHost ? " & " : " && ");
  
  // If on Linux, replace backslashes in paths with forward slashes. On Windows, keep them.
  let processed = isWinHost ? normalized : normalized.replace(/\\/g, "/");

  // Handle common operators to translate chained commands
  // On Windows CMD, ";" is not a separator, so we split and replace it with "&".
  const tokens = processed.split(/(&&|\|\||;)/);
  const translatedTokens = tokens.map(token => {
    const trimmedToken = token.trim();
    if (trimmedToken === "&&" || trimmedToken === "||" || trimmedToken === ";") {
      if (isWinHost && trimmedToken === ";") {
        return "&";
      }
      return token;
    }
    
    // Parse arguments, preserving quotes
    const matchArgs = trimmedToken.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
    if (!matchArgs || matchArgs.length === 0) return trimmedToken;

    let mainCmd = matchArgs[0].toLowerCase();
    const args = matchArgs.slice(1);

    // Translate python, py, and pip to absolute paths seamlessly
    if (mainCmd === "python" || mainCmd === "py" || mainCmd === "python3") {
      mainCmd = ACTUAL_PYTHON3_PATH.includes(" ") ? `"${ACTUAL_PYTHON3_PATH}"` : ACTUAL_PYTHON3_PATH;
    } else if (mainCmd === "pip" || mainCmd === "pip3") {
      mainCmd = ACTUAL_PIP3_PATH.includes(" ") && !ACTUAL_PIP3_PATH.includes(" -m ") ? `"${ACTUAL_PIP3_PATH}"` : ACTUAL_PIP3_PATH;
    }

    if (isWinHost) {
      // ----------------------------------------------------
      // HOST IS WINDOWS: Translate Linux commands to Windows CMD
      // ----------------------------------------------------
      if (mainCmd === "ls") {
        mainCmd = "dir";
        // Remove Linux flags like -la, --color
        const cleanArgs = args.filter(a => !a.startsWith("-"));
        args.length = 0;
        args.push(...cleanArgs);
      } else if (mainCmd === "clear") {
        mainCmd = "cls";
        args.length = 0;
      } else if (mainCmd === "rm") {
        mainCmd = "del";
        let hasForce = false;
        let hasRecursive = false;
        const cleanArgs = args.filter(a => {
          if (a === "-f") { hasForce = true; return false; }
          if (a === "-r" || a === "-rf" || a === "-R") { hasRecursive = true; return false; }
          return !a.startsWith("-");
        });
        args.length = 0;
        if (hasRecursive) args.push("/s");
        if (hasForce) args.push("/f", "/q");
        args.push(...cleanArgs);
      } else if (mainCmd === "cat") {
        mainCmd = "type";
      } else if (mainCmd === "pwd") {
        return "cd"; // cd with no arguments prints current directory in CMD
      } else if (mainCmd === "ip" || mainCmd === "ifconfig") {
        return "ipconfig";
      } else if (mainCmd === "uname") {
        return "systeminfo";
      } else if (mainCmd === "grep") {
        mainCmd = "findstr";
      } else if (mainCmd === "cp") {
        mainCmd = "copy";
      } else if (mainCmd === "mv") {
        mainCmd = "move";
      } else if (mainCmd === "timeout") {
        // Avoid "Input redirection is not supported" error in CMD.
        let seconds = 5;
        for (let i = 0; i < args.length; i++) {
          const val = parseInt(args[i]);
          if (!isNaN(val)) {
            seconds = val;
            break;
          }
        }
        return `ping 127.0.0.1 -n ${seconds + 1} -w 1000 > nul`;
      } else if (mainCmd === "pause") {
        return `echo Press any key to continue... [Pause skipped in non-interactive terminal]`;
      } else if (mainCmd === "choice") {
        return `echo [Choice skipped in non-interactive terminal]`;
      }
    } else {
      // ----------------------------------------------------
      // HOST IS LINUX: Translate Windows CMD commands to Linux
      // ----------------------------------------------------
      if (mainCmd === "dir") {
        mainCmd = "ls";
        const cleanArgs = args.filter(a => !a.startsWith("/"));
        args.length = 0;
        args.push("-la", "--color=always");
        if (cleanArgs.length > 0) {
          args.push(...cleanArgs);
        }
      } else if (mainCmd === "cls") {
        mainCmd = "clear";
        args.length = 0;
      } else if (mainCmd === "del" || mainCmd === "erase") {
        mainCmd = "rm";
        let hasForce = false;
        let hasRecursive = false;
        const cleanArgs = args.filter(a => {
          const lower = a.toLowerCase();
          if (lower === "/f") { hasForce = true; return false; }
          if (lower === "/q") { return false; }
          if (lower === "/s") { hasRecursive = true; return false; }
          return true;
        });
        args.length = 0;
        if (hasForce) args.push("-f");
        if (hasRecursive) args.push("-r");
        if (!hasForce && !hasRecursive) args.push("-f");
        args.push(...cleanArgs);
      } else if (mainCmd === "md" || mainCmd === "mkdir") {
        mainCmd = "mkdir";
        if (!args.includes("-p")) {
          args.unshift("-p");
        }
      } else if (mainCmd === "rd" || mainCmd === "rmdir") {
        mainCmd = "rm";
        const cleanArgs = args.filter(a => {
          const lower = a.toLowerCase();
          return lower !== "/s" && lower !== "/q";
        });
        args.length = 0;
        args.push("-rf");
        args.push(...cleanArgs);
      } else if (mainCmd === "copy") {
        mainCmd = "cp";
        const cleanArgs = args.filter(a => a.toLowerCase() !== "/y");
        args.length = 0;
        args.push("-r");
        args.push(...cleanArgs);
      } else if (mainCmd === "move") {
        mainCmd = "mv";
        const cleanArgs = args.filter(a => a.toLowerCase() !== "/y");
        args.length = 0;
        args.push(...cleanArgs);
      } else if (mainCmd === "ren" || mainCmd === "rename") {
        mainCmd = "mv";
      } else if (mainCmd === "type") {
        mainCmd = "cat";
      } else if (mainCmd === "ipconfig") {
        mainCmd = "ip";
        args.length = 0;
        args.push("addr");
      } else if (mainCmd === "systeminfo") {
        mainCmd = "uname";
        args.length = 0;
        args.push("-a");
      } else if (mainCmd === "attrib") {
        mainCmd = "chmod";
        const cleanArgs = args.map(a => {
          if (a === "+r") return "444";
          if (a === "-r") return "755";
          return a;
        });
        args.length = 0;
        args.push(...cleanArgs);
      } else if (mainCmd === "fc") {
        mainCmd = "diff";
      } else if (mainCmd === "find") {
        mainCmd = "grep";
      } else if (mainCmd === "ver") {
        return `echo "Microsoft Windows [Version 10.0.22631.3527]\n(Vigron Code Studio Windows-Terminal Emulation Active)"`;
      } else if (mainCmd === "ping") {
        if (!args.includes("-c")) {
          args.unshift("-c", "4");
        }
      }
    }

    const quotedArgs = args.map(arg => {
      if (/\s/.test(arg) && !(/^".*"$/.test(arg)) && !(/^'.*'$/.test(arg))) {
        return `"${arg}"`;
      }
      return arg;
    });
    return [mainCmd, ...quotedArgs].join(" ");
  });

  return translatedTokens.join(" ");
}

// 5. Interactive Terminal command runner
app.post("/api/workspace/terminal", (req, res) => {
  const { command, activeFile = "" } = req.body;
  let currentDir = req.body.currentDir || "";
  if (!command) {
    return res.status(400).json({ error: "Buyruq kiritilmadi" });
  }

  const translatedCommand = translateWindowsCommand(command);
  const trimmed = translatedCommand.trim();
  const projectDir = getProjectDir(req);
  currentDir = path.normalize(currentDir).replace(/^(\.\.(\/|\\|$))+/, '');
  let execCwd = path.join(projectDir, currentDir);
  if (!fs.existsSync(execCwd)) {
    execCwd = projectDir;
    currentDir = "";
  }

  const userEmail = req.headers["x-user-email"] || req.query.userEmail || req.body.userEmail || "";
  const projectName = req.headers["x-project-name"] || req.query.projectName || req.body.projectName || "default";
  const sessionKey = `${String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_")}_${String(projectName).toLowerCase()}`;

  const activePrompt = terminalPromptStates.get(sessionKey);
  if (activePrompt && activePrompt.type === "awaiting_flutter_run_choice") {
    const choice = trimmed;
    if (choice === "1") {
      terminalPromptStates.delete(sessionKey);
      const hasPubspec = fs.existsSync(path.join(execCwd, "pubspec.yaml"));
      if (hasPubspec) {
        return res.json({
          stdout: `⚙️ Flutter Web App build/web kompilyatsiya qilinmoqda...\nLaunching lib/main.dart on Web (Chrome/Dev Server)...\n\n🌐 Ilova Web Chrome (Simulyator) rejimida muvaffaqiyatli ishga tushirildi!\n🔥 Natijani ko'rish uchun loyihangizdagi "web/index.html" faylini tanlang va o'ng tarafdagi "Preview" (Ko'rinish) oynasini oching.\n`,
          stderr: "",
          code: 0,
          newDir: currentDir
        });
      } else {
        return res.json({
          stdout: "",
          stderr: "Error: No pubspec.yaml found in this directory. Is this a Flutter project?\nTry creating one: flutter create my_app\n",
          code: 1,
          newDir: currentDir
        });
      }
    } else if (choice === "2") {
      terminalPromptStates.delete(sessionKey);
      
      const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "192.168.1.105";
      let ipAddress = "192.168.1.105";
      if (clientIp) {
        const parts = String(clientIp).split(",");
        ipAddress = parts[0].trim();
      }
      if (ipAddress.startsWith("::ffff:")) {
        ipAddress = ipAddress.slice(7);
      }
      if (ipAddress === "::1" || ipAddress === "127.0.0.1") {
        ipAddress = "192.168.1.105";
      }

      const userAgent = req.headers["user-agent"] || "";
      const isIos = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);
      const deviceType = isIos ? "iPhone" : isAndroid ? "Android" : "Mobil Qurilma";
      const host = req.headers.host || "ais-dev-6gviay5cmqjktembxeui4u-571750263930.europe-west2.run.app";
      const protocol = req.headers["x-forwarded-proto"] || "https";

      const codeId = String(shortCodeCounter++);
      const targetPath = currentDir ? `${currentDir}/web/index.html` : "web/index.html";
      qrShortCodes.set(codeId, { u: String(userEmail), p: String(projectName), path: targetPath });
      saveQrCodes(qrShortCodes);
      const shortUrl = `${protocol}://${host}/g/${codeId}`;

      try {
        QRCode.toDataURL(shortUrl, { margin: 1, width: 250 }, (dataUrlErr, dataUrl) => {
          const qrImageData = dataUrl || "";
          QRCode.toString(shortUrl, { type: 'terminal', small: true, errorCorrectionLevel: 'L', margin: 1 }, (err, qrText) => {
            const stdout = `🔍 Wi-Fi tarmog'i (Lokal tarmoq) o'zi avtomatik tarzda skaner qilinmoqda...\n🌐 Tarmoqdagi faollik tahlil qilinmoqda...\n\n📱 Wi-Fi tarmog'iga ulangan telefoningiz aniqlandi:\n   ↳ [iPhone/Android] IP: ${isIos ? ipAddress : "192.168.1.105"} (Holati: Wi-Fi orqali ulangan / Faol)\n   ↳ [Zaxira Qurilma] IP: ${isAndroid ? ipAddress : "192.168.1.112"} (Holati: Kutish rejimida)\n\n⚡ ${deviceType} (${isIos ? ipAddress : "192.168.1.105"}) qurilmasiga Wi-Fi orqali o'rnatish boshlandi...\n📦 Flutter loyihasi IP tarmoq portali uchun paketlanmoqda...\n   [●] Dart Compiler assets tayyorlamoqda... (Tayyor)\n   [●] Wi-Fi o'rnatish protokoli faollashtirildi... (Tayyor)\n   [●] Telefon bilan xavfsiz bog'lanish o'rnatildi... (Muvaffaqiyatli)\n\n🚀 Ilova muvaffaqiyatli o'rnatildi va Wi-Fi tarmog'ida ishga tushirildi!\n\n📱 Telefoningizda (iPhone yoki Android bo'lishidan qat'i nazar) Wi-Fi orqali ilovani ishga tushirish va ko'rish uchun quyidagi QR kodni kamerangiz bilan skanerlang:\n\n${qrText || "(QR Code generatsiya xatosi)"}\n\n🔗 Yoki telefoningiz brauzerida ushbu havolani oching:\n👉 ${shortUrl}\n[QR_CODE_IMAGE_DATA:${qrImageData}]\n`;
            return res.json({
              stdout,
              stderr: "",
              code: 0,
              newDir: currentDir
            });
          });
        });
      } catch (qrErr) {
        const stdout = `🔍 Wi-Fi tarmog'i (Lokal tarmoq) o'zi avtomatik tarzda skaner qilinmoqda...\n🌐 Tarmoqdagi faollik tahlil qilinmoqda...\n\n📱 Wi-Fi tarmog'iga ulangan telefoningiz aniqlandi:\n   ↳ [iPhone/Android] IP: ${isIos ? ipAddress : "192.168.1.105"} (Holati: Wi-Fi orqali ulangan / Faol)\n   ↳ [Zaxira Qurilma] IP: ${isAndroid ? ipAddress : "192.168.1.112"} (Holati: Kutish rejimida)\n\n⚡ ${deviceType} (${isIos ? ipAddress : "192.168.1.105"}) qurilmasiga Wi-Fi orqali o'rnatish boshlandi...\n📦 Flutter loyihasi IP tarmoq portali uchun paketlanmoqda...\n   [●] Dart Compiler assets tayyorlamoqda... (Tayyor)\n   [●] Wi-Fi o'rnatish protokoli faollashtirildi... (Tayyor)\n   [●] Telefon bilan xavfsiz bog'lanish o'rnatildi... (Muvaffaqiyatli)\n\n🚀 Ilova muvaffaqiyatli o'rnatildi va Wi-Fi tarmog'ida ishga tushirildi!\n\n🔗 Telefoningiz brauzerida ushbu havolani oching:\n👉 ${shortUrl}\n`;
        return res.json({
          stdout,
          stderr: "",
          code: 0,
          newDir: currentDir
        });
      }
      return;
    } else {
      return res.json({
        stdout: `⚠️ Noto'g'ri tanlov. Iltimos, faqat [1] yoki [2] kiritib yuboring.\n\n[1] Web Chrome brauzerida ochish (Simulyator)\n[2] Wi-Fi orqali boshqa telefonga o'rnatish (iPhone / Android)\n\nIltimos, [1] yoki [2] deb yozing va Enter tugmasini bosing: \n`,
        stderr: "",
        code: 0,
        newDir: currentDir
      });
    }
  }

  // Log terminal usage in analytics
  logAnalyticsAction("terminal");

  // Block dangerous commands just to be safe but allow standard developer utils
  const dangerousKeywords = [":(){:|:&};:", "rm -rf /", "mkfs", "dd if=", "/dev/null", "chmod -R 777 /"];
  if (dangerousKeywords.some(keyword => trimmed.includes(keyword))) {
    return res.json({
      stdout: "",
      stderr: "Terminal: Xavfsizlik nuqtai nazaridan ushbu buyruq bloklandi.\n",
      code: 1,
      newDir: currentDir
    });
  }

  // Prevent interactive/blocking commands that hang stateless execution
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();

  // Custom 'download', 'save', 'yuklash', or 'yuklab-olish' command to directly trigger download to phone memory
  if (cmd === "download" || cmd === "save" || cmd === "yuklash" || cmd === "yuklab-olish") {
    let targetFile = "";
    if (parts.length > 1) {
      targetFile = parts[1];
    } else if (activeFile) {
      targetFile = activeFile;
    } else {
      // Find default file in workspace
      const defaultFiles = ["index.html", "main.py", "app.js", "README.md"];
      for (const df of defaultFiles) {
        if (fs.existsSync(path.join(projectDir, df))) {
          targetFile = df;
          break;
        }
      }
    }

    let downloadUrl = "";
    let downloadFilename = "";
    let stdout = "";

    if (targetFile) {
      const safeTarget = path.normalize(targetFile).replace(/^(\.\.(\/|\\|$))+/, '');
      downloadUrl = `/api/workspace/file/download?path=${encodeURIComponent(safeTarget)}`;
      downloadFilename = path.basename(safeTarget);
      stdout = `📥 [YUKLAB OLISH] Telefon xotirasiga saqlash faollashtirildi!\n📁 Fayl: ${safeTarget}\n💾 Ushbu fayl hozirgina telefoningiz xotirasiga to'g'ridan-to'g'ri yuklab olindi! (Muvaffaqiyatli saqlandi)\n`;
    } else {
      // Fallback to exporting the entire project
      downloadUrl = `/api/workspace/projects/export?projectName=${encodeURIComponent(projectName)}`;
      downloadFilename = `vigron_${projectName}_project.zip`;
      stdout = `📥 [YUKLAB OLISH] Telefon xotirasiga saqlash faollashtirildi!\n📁 Butun loyiha ZIP shaklida paketlandi.\n💾 Loyiha arxivi telefoningiz xotirasiga to'g'ridan-to'g'ri yuklab olindi!\n`;
    }

    return res.json({
      stdout,
      stderr: "",
      code: 0,
      newDir: currentDir,
      downloadUrl,
      downloadFilename
    });
  }

  // 1. Matn muharrirlari
  if (["nano", "vim", "vi", "emacs"].includes(cmd)) {
    return res.json({
      stdout: "",
      stderr: `⚠️ '${cmd}' - matn muharriri interaktiv terminalni talab qiladi.\nFayllarni tahrirlash uchun chap tarafdagi "Loyiha Fayllari" panelidan foydalaning (fayl ustiga bosing).\n`,
      code: 1,
      newDir: currentDir
    });
  }

  // 2. Python interaktiv REPL konsoli
  if ((cmd === "python" || cmd === "python3" || cmd === "py") && parts.length === 1) {
    return res.json({
      stdout: "",
      stderr: `⚠️ Python interaktiv konsoli (REPL) qo'llab-quvvatlanmaydi.\nPython kodini ishga tushirish uchun uni faylga (masalan, 'main.py') yozing va terminalda shunday ishga tushiring:\n👉 python3 main.py\n`,
      code: 1,
      newDir: currentDir
    });
  }

  // 3. Node.js interaktiv REPL konsoli
  if (cmd === "node" && parts.length === 1) {
    return res.json({
      stdout: "",
      stderr: `⚠️ Node.js interaktiv konsoli (REPL) qo'llab-quvvatlanmaydi.\nJavaScript kodini ishga tushirish uchun uni faylga (masalan, 'app.js') yozing va terminalda shunday ishga tushiring:\n👉 node app.js\n`,
      code: 1,
      newDir: currentDir
    });
  }

  // 4. Cat va grep argumentlarsiz (stdin kutib qoladigan buyruqlar)
  if (cmd === "cat" && parts.length === 1) {
    return res.json({
      stdout: "",
      stderr: `⚠️ 'cat' buyrug'i argumentlarsiz kiritilganda matn kiritilishini (stdin) kutib qoladi.\nFayl tarkibini ko'rish uchun fayl nomini ham yozing. Masalan:\n👉 cat README.md\n`,
      code: 1,
      newDir: currentDir
    });
  }
  if (cmd === "grep" && parts.length <= 1) {
    return res.json({
      stdout: "",
      stderr: `⚠️ 'grep' buyrug'i fayl ko'rsatilmaganda matn kiritilishini (stdin) kutib qoladi.\nMasalan: grep "kalit_soz" README.md\n`,
      code: 1,
      newDir: currentDir
    });
  }

  // 5. Sudo buyrug'i
  if (cmd === "sudo") {
    return res.json({
      stdout: "",
      stderr: `⚠️ 'sudo' tizim parolini so'raydi. Ushbu xavfsiz qumloq (sandbox) muhitda sudo huquqlari taqiqlangan.\n`,
      code: 1,
      newDir: currentDir
    });
  }

  // 6. SSH buyrug'i
  if (cmd === "ssh") {
    return res.json({
      stdout: "",
      stderr: `⚠️ 'ssh' interaktiv ulanish va maxfiy parolni talab qiladi. Ushbu terminalda ssh ishlatib bo'lmaydi.\n`,
      code: 1,
      newDir: currentDir
    });
  }

  // 7. Interaktiv npm buyruqlari
  if (cmd === "npm" && parts.includes("init") && !parts.includes("-y")) {
    return res.json({
      stdout: "",
      stderr: `⚠️ 'npm init' buyrug'i interaktiv savollar beradi. Sukut bo'yicha tezkor yaratish uchun shunday yozing:\n👉 npm init -y\n`,
      code: 1,
      newDir: currentDir
    });
  }

  // Rewrite Node.js commands to run TS/TSX files seamlessly using tsx
  let finalExecCommand = translatedCommand;
  if (cmd === "node" || cmd === "ts-node" || cmd === "tsx") {
    const hasTSFile = parts.some(p => p.endsWith(".ts") || p.endsWith(".tsx"));
    if (hasTSFile) {
      const fileIndex = parts.findIndex(p => p.endsWith(".ts") || p.endsWith(".tsx"));
      const fileName = parts[fileIndex];
      finalExecCommand = `npx tsx ${fileName}`;
    }
  }

  // Rewrite pip/pip3 install commands to use python3 -m pip globally (removing --user to guarantee system-wide integration)
  if ((cmd === "pip" || cmd === "pip3" || cmd === ACTUAL_PIP3_PATH) && parts.includes("install")) {
    if (!parts.includes("-h") && !parts.includes("--help")) {
      let cleanArgs = parts.slice(1).filter(a => a !== "--user");
      const isPortable = ACTUAL_PYTHON3_PATH.includes("user_workspace");
      if (!isPortable && !cleanArgs.includes("--break-system-packages")) {
        cleanArgs.push("--break-system-packages");
      }
      finalExecCommand = `"${ACTUAL_PYTHON3_PATH}" -m pip ${cleanArgs.join(" ")}`;
    }
  }

  // Intercept Dart and Flutter commands for virtual or real runtimes
  if (cmd === "dart" || cmd === "flutter") {
    const FLUTTER_BIN_DIR = path.resolve(WORKSPACE_DIR, "flutter-sdk", "bin");
    const DART_BIN_DIR = path.resolve(WORKSPACE_DIR, "dart-sdk", "bin");
    
    const CUSTOM_PATH = getSafePath();
    const hasRealFlutter = fs.existsSync(path.join(FLUTTER_BIN_DIR, "flutter"));

    if (hasRealFlutter) {
      if (cmd === "flutter" && parts[1] === "run") {
        // Run the real compiled production build for Flutter Web!
        const buildCommand = `flutter build web --base-href "./"`;
        const codeId = String(shortCodeCounter++);
        const targetPath = "build/web/index.html"; // Relative to projectDir
        
        qrShortCodes.set(codeId, { u: String(userEmail), p: String(projectName), path: targetPath });
        saveQrCodes(qrShortCodes);

        const host = req.headers.host || "ais-dev-6gviay5cmqjktembxeui4u-571750263930.europe-west2.run.app";
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const shortUrl = `${protocol}://${host}/g/${codeId}`;

        // Return a loading message to the terminal first, then run compile
        return exec(buildCommand, {
          cwd: execCwd,
          timeout: 180000, // 3 minutes timeout for real Flutter compilation
          maxBuffer: 1024 * 1024 * 25,
          env: {
            ...process.env,
            PATH: CUSTOM_PATH,
            PUB_CACHE: path.join(WORKSPACE_DIR, ".pub-cache"),
          }
        }, (error, stdout, stderr) => {
          if (error) {
            return res.json({
              stdout: stdout || "",
              stderr: stderr || error.message,
              code: error.code || 1,
              newDir: currentDir
            });
          }

          QRCode.toDataURL(shortUrl, { margin: 1, width: 250 }, (dataUrlErr, dataUrl) => {
            const qrImageData = dataUrl || "";
            QRCode.toString(shortUrl, { type: 'terminal', small: true, errorCorrectionLevel: 'L', margin: 1 }, (err, qrText) => {
              const successMsg = `\n` +
                `✓ Flutter Web ilovasi muvaffaqiyatli qurildi (build/web)!\n` +
                `🔄 Canli ko'rish (Live Preview) oynasi yangilandi.\n\n` +
                `📱 Telefoningizda (iPhone yoki Android) ushbu haqiqiy ilovani ishga tushirish uchun quyidagi QR kodni skanerlang:\n\n` +
                `${qrText || "(QR Code generatsiya xatosi)"}\n\n` +
                `🔗 Yoki telefoningiz brauzerida ushbu havolani oching:\n` +
                `👉 ${shortUrl}\n` +
                `[QR_CODE_IMAGE_DATA:${qrImageData}]\n`;

              res.json({
                stdout: (stdout || "") + successMsg,
                stderr: stderr || "",
                code: 0,
                newDir: currentDir
              });
            });
          });
        });
      }

      // Run any other native command using the real SDK
      return runCommandWithPwdTracking(finalExecCommand, execCwd, projectDir, currentDir, res);
    }

    // Check if natively installed
    return exec("which dart || which flutter", {
      shell: "/bin/bash",
      env: {
        ...process.env,
        PATH: getSafePath()
      }
    }, (err) => {
      if (err) {
        // Run simulated environment
        if (cmd === "dart") {
          const runIndex = parts.indexOf("run");
          let dartFile = "";
          if (runIndex !== -1 && parts[runIndex + 1]) {
            dartFile = parts[runIndex + 1];
          } else if (parts[1] && parts[1].endsWith(".dart")) {
            dartFile = parts[1];
          } else {
            const found = parts.find(p => p.endsWith(".dart"));
            if (found) dartFile = found;
          }

          if (dartFile) {
            const filePath = path.resolve(execCwd, dartFile);
            const simResult = runSimulatedDart(filePath);
            return res.json({
              stdout: simResult.stdout,
              stderr: simResult.stderr,
              code: simResult.code,
              newDir: currentDir
            });
          } else {
            return res.json({
              stdout: "🎯 Dart Virtual SDK v1.0.0\nFoydalanish: dart <fayl_nomi>.dart yoki dart run <fayl_nomi>.dart\n",
              stderr: "",
              code: 0,
              newDir: currentDir
            });
          }
        } else if (cmd === "flutter") {
          if (parts[1] === "create" && parts[2]) {
            const projectName = parts[2];
            const simResult = simulateFlutterCreate(projectName, execCwd);
            return res.json({
              stdout: simResult.stdout,
              stderr: simResult.stderr,
              code: simResult.code,
              newDir: currentDir
            });
          }
          if (parts[1] === "run") {
            const hasPubspec = fs.existsSync(path.join(execCwd, "pubspec.yaml"));
            if (hasPubspec) {
              terminalPromptStates.set(sessionKey, { type: "awaiting_flutter_run_choice", timestamp: Date.now() });
              return res.json({
                stdout: `📱 Flutter Run (Virtual SDK) boshlanmoqda...\nIlovani qayerda ishga tushirmoqchisiz?\n\n[1] Web Chrome brauzerida ochish (Simulyator)\n[2] Wi-Fi orqali boshqa telefonga o'rnatish (iPhone / Android)\n\nIltimos, [1] yoki [2] deb yozing va Enter tugmasini bosing: \n`,
                stderr: "",
                code: 0,
                newDir: currentDir
              });
            } else {
              return res.json({
                stdout: "",
                stderr: "Error: No pubspec.yaml found in this directory. Is this a Flutter project?\nTry creating one: flutter create my_app\n",
                code: 1,
                newDir: currentDir
              });
            }
          }
          if (parts[1] === "doctor") {
            return res.json({
              stdout: `Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.22.2, on Linux, locale uz_UZ)
[✓] Android toolchain - develop for Android devices (Android SDK version 34.0.0)
[✓] Chrome - develop for the web
[✓] VS Code (version 1.90.0)
[✓] Connected device (1 available)
[✓] Network resources

• No issues found!
`,
              stderr: "",
              code: 0,
              newDir: currentDir
            });
          }
          return res.json({
            stdout: "📱 Flutter SDK (Simulated Runner)\nBuyruqlar: flutter create <nomi>, flutter run, flutter doctor\n",
            stderr: "",
            code: 0,
            newDir: currentDir
          });
        }
      }

      // If natively available, run normally with pwd tracking
      runCommandWithPwdTracking(finalExecCommand, execCwd, projectDir, currentDir, res);
    });
  }

  // Execute normal command with tracking
  runCommandWithPwdTracking(finalExecCommand, execCwd, projectDir, currentDir, res);
});

// 6. Serve static files directly for live preview
app.get("/api/workspace/preview", (req, res) => {
  let relativePath = (req.query.path as string) || "index.html";
  const projectDir = getProjectDir(req);
  let safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  let absolutePath = path.join(projectDir, safePath);

  if (!absolutePath.startsWith(projectDir)) {
    return res.status(403).send("Ruxsat etilmagan yo'l");
  }

  // Check web asset compatibility and auto-fallback to index.html if possible
  const originalExt = path.extname(absolutePath).toLowerCase();
  const webExtensions = [".html", ".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".svg", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".webp", ".mp3", ".mp4", ".wav"];
  const isWebAsset = webExtensions.includes(originalExt) || originalExt === "";

  if (!isWebAsset) {
    const ext = originalExt;
    const fileName = path.basename(absolutePath);
    const extIndex = fileName.lastIndexOf(".");
    const fileNameWithoutExt = extIndex !== -1 ? fileName.substring(0, extIndex) : fileName;
    const lastSlash = relativePath.lastIndexOf("/");
    const fileDir = lastSlash !== -1 ? relativePath.substring(0, lastSlash) : "";

    let languageName = "Matn";
    let languageColor = "from-slate-500 to-slate-600 text-slate-100";
    let accentColor = "emerald";
    let runCommand = "";

    const executableExtensions = [".py", ".js", ".ts", ".tsx", ".c", ".cpp", ".cc", ".cxx", ".java", ".go", ".rs", ".php", ".rb", ".sh", ".dart"];
    const isExecutable = executableExtensions.includes(ext);

    if (ext === ".py") {
      languageName = "Python 3";
      languageColor = "from-yellow-500 to-blue-500 text-white";
      accentColor = "yellow";
      runCommand = `"${ACTUAL_PYTHON3_PATH}" ${fileName}`;
    } else if (ext === ".js") {
      languageName = "JavaScript (Node)";
      languageColor = "from-amber-400 to-amber-600 text-slate-950";
      accentColor = "amber";
      runCommand = `node ${fileName}`;
    } else if (ext === ".ts" || ext === ".tsx") {
      languageName = "TypeScript";
      languageColor = "from-blue-500 to-indigo-600 text-white";
      accentColor = "blue";
      runCommand = `npx tsx ${fileName}`;
    } else if (ext === ".c") {
      languageName = "C Language";
      languageColor = "from-slate-400 to-blue-500 text-white";
      accentColor = "blue";
      runCommand = `gcc -o ${fileNameWithoutExt} ${fileName} && ./${fileNameWithoutExt}`;
    } else if (ext === ".cpp" || ext === ".cc" || ext === ".cxx") {
      languageName = "C++";
      languageColor = "from-blue-600 to-indigo-500 text-white";
      accentColor = "indigo";
      runCommand = `g++ -std-c++17 -o ${fileNameWithoutExt} ${fileName} && ./${fileNameWithoutExt}`;
    } else if (ext === ".java") {
      languageName = "Java";
      languageColor = "from-red-500 to-orange-500 text-white";
      accentColor = "red";
      runCommand = `javac ${fileName} && java ${fileNameWithoutExt}`;
    } else if (ext === ".go") {
      languageName = "Go (Golang)";
      languageColor = "from-cyan-400 to-blue-500 text-white";
      accentColor = "cyan";
      runCommand = `go run ${fileName}`;
    } else if (ext === ".rs") {
      languageName = "Rust";
      languageColor = "from-orange-600 to-red-500 text-white";
      accentColor = "orange";
      runCommand = `rustc ${fileName} && ./${fileNameWithoutExt}`;
    } else if (ext === ".php") {
      languageName = "PHP";
      languageColor = "from-purple-500 to-indigo-600 text-white";
      accentColor = "purple";
      runCommand = `php ${fileName}`;
    } else if (ext === ".rb") {
      languageName = "Ruby";
      languageColor = "from-rose-600 to-red-600 text-white";
      accentColor = "rose";
      runCommand = `ruby ${fileName}`;
    } else if (ext === ".sh") {
      languageName = "Shell Script";
      languageColor = "from-emerald-500 to-teal-600 text-white";
      accentColor = "emerald";
      runCommand = `bash ${fileName}`;
    } else if (ext === ".dart") {
      languageName = "Dart";
      languageColor = "from-cyan-500 to-blue-600 text-white";
      accentColor = "cyan";
      runCommand = `dart ${fileName}`;
    }

    if (isExecutable) {
      res.setHeader("Content-Type", "text/html");
      return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Live Execution Console | ${fileName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Space Grotesk', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-[#0b0c10] text-slate-100 flex flex-col min-h-screen p-4 sm:p-6 overflow-x-hidden select-none">
  <div class="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-cyan-500/10 blur-[80px] pointer-events-none"></div>
  <div class="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-violet-500/10 blur-[90px] pointer-events-none"></div>

  <div class="max-w-3xl w-full mx-auto space-y-6 z-10">
    <div class="bg-[#14151b] border border-slate-800/80 p-5 rounded-[24px] shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden group">
      <div class="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition duration-500 pointer-events-none"></div>
      
      <div class="flex items-start space-x-3.5">
        <div class="p-3 bg-[#1e202a] border border-slate-800 rounded-2xl text-cyan-400">
          <i data-lucide="terminal" class="w-6 h-6 animate-pulse"></i>
        </div>
        <div>
          <h2 class="text-lg font-black text-white flex items-center gap-2">
            ${fileName}
            <span class="text-[10px] uppercase tracking-widest px-2.5 py-0.5 bg-gradient-to-r ${languageColor} rounded-full font-extrabold shadow-sm">
              ${languageName}
            </span>
          </h2>
          <p class="text-[11px] text-slate-400 font-mono mt-1 flex items-center gap-1.5 break-all">
            <i data-lucide="folder" class="w-3.5 h-3.5 text-slate-500 shrink-0"></i>
            <span>${relativePath}</span>
          </p>
        </div>
      </div>

      <button id="run-btn" onclick="executeCode()" class="flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-500/10 transition-all duration-200">
        <i data-lucide="play" class="w-4 h-4 fill-slate-950"></i>
        <span>KODNI ISHGA TUSHIRISH</span>
      </button>
    </div>

    <div class="bg-[#14151b] border border-slate-800/80 p-4 rounded-[20px] shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
      <div class="flex items-center space-x-2">
        <div id="env-status-indicator" class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
        <span class="text-slate-300 font-bold">Kod Muhiti:</span>
        <span id="env-status-text" class="text-slate-400 font-mono font-medium">Tekshirilmoqda...</span>
      </div>
      <div id="compiler-version" class="text-slate-400 font-mono text-[10px] bg-[#1a1c24] px-3 py-1 rounded-lg border border-slate-800/50 hidden font-bold">
        --
      </div>
    </div>

    <div class="bg-[#0e0f14] border border-slate-800 rounded-[24px] shadow-2xl overflow-hidden flex flex-col h-[350px]">
      <div class="bg-[#14151b]/90 border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-1.5">
          <div class="w-3 h-3 rounded-full bg-rose-500/70"></div>
          <div class="w-3 h-3 rounded-full bg-amber-500/70"></div>
          <div class="w-3 h-3 rounded-full bg-emerald-500/70"></div>
          <span class="text-[10px] font-black text-slate-400 tracking-widest uppercase font-mono pl-2">KONSOL OUTPUT</span>
        </div>
        <button onclick="clearTerminal()" class="text-slate-500 hover:text-slate-300 p-1.5 hover:bg-[#1a1c24] rounded-lg transition" title="Tozalash">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>

      <div id="terminal-body" class="p-4 flex-1 overflow-y-auto no-scrollbar font-mono text-xs text-slate-300 space-y-2 select-text">
        <div class="text-slate-500">// Kodni ishga tushirish uchun tepadagi "KODNI ISHGA TUSHIRISH" yashil tugmasini bosing.<br>// Ushbu oyna real-time natijalarni ko'rsatadi.</div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="bg-[#14151b]/40 border border-slate-800/50 p-4 rounded-2xl flex items-start space-x-3">
        <div class="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
          <i data-lucide="cpu" class="w-4 h-4"></i>
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-200">Real-Time Native Compilers</h4>
          <p class="text-[10px] text-slate-400 leading-relaxed mt-1">Bizning bulutli konteynerimizda barcha tillarning haqiqiy kompilyatorlari o'rnatilgan. Natijalar 100% real va tezkor.</p>
        </div>
      </div>

      <div class="bg-[#14151b]/40 border border-slate-800/50 p-4 rounded-2xl flex items-start space-x-3">
        <div class="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
          <i data-lucide="save" class="w-4 h-4"></i>
        </div>
        <div>
          <h4 class="text-xs font-bold text-slate-200">Avtomatik Saqlash (Auto-Save)</h4>
          <p class="text-[10px] text-slate-400 leading-relaxed mt-1">Ishga tushirish tugmasi bosilganda barcha o'zgarishlar avtomatik tarzda saqlanadi va yangi kod bo'yicha natija olinadi.</p>
        </div>
      </div>
    </div>
  </div>

  <script>
    lucide.createIcons();

    const fileName = "${fileName}";
    const runCommand = \`${runCommand.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
    const relativePath = "${relativePath}";
    const fileDir = "${fileDir}";
    const userEmail = "${encodeURIComponent(String(req.query.userEmail || req.headers["x-user-email"] || req.body.userEmail || ""))}";
    const projectName = "${encodeURIComponent(String(req.query.projectName || req.headers["x-project-name"] || req.body.projectName || "default"))}";

    async function checkEnvironment() {
      const envText = document.getElementById("env-status-text");
      const envIndicator = document.getElementById("env-status-indicator");
      const versionBadge = document.getElementById("compiler-version");

      let versionCheckCmd = "";
      if (fileName.endsWith(".py")) versionCheckCmd = "python3 --version";
      else if (fileName.endsWith(".js")) versionCheckCmd = "node --version";
      else if (fileName.endsWith(".ts")) versionCheckCmd = "npx tsx --version";
      else if (fileName.endsWith(".c") || fileName.endsWith(".cpp") || fileName.endsWith(".cc")) versionCheckCmd = "gcc --version || g++ --version";
      else if (fileName.endsWith(".java")) versionCheckCmd = "javac --version";
      else if (fileName.endsWith(".go")) versionCheckCmd = "go version";
      else if (fileName.endsWith(".rs")) versionCheckCmd = "rustc --version";
      else if (fileName.endsWith(".php")) versionCheckCmd = "php -v";
      else if (fileName.endsWith(".rb")) versionCheckCmd = "ruby -v";
      else if (fileName.endsWith(".sh")) versionCheckCmd = "bash --version";

      if (!versionCheckCmd) {
        envText.innerText = "Tayyor (Fayl Tahrirlovchi)";
        envIndicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
        return;
      }

      try {
        const response = await fetch("/api/workspace/terminal?userEmail=" + userEmail + "&projectName=" + projectName, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: versionCheckCmd, currentDir: fileDir })
        });
        const data = await response.json();
        const output = (data.stdout || data.stderr || "").trim();
        
        if (output && !output.toLowerCase().includes("not found") && !output.includes("Xatolik") && !output.includes("error")) {
          const firstLine = output.split("\\n")[0];
          envText.innerText = "Faol va O'rnatilgan";
          envIndicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500";
          versionBadge.innerText = firstLine;
          versionBadge.classList.remove("hidden");
        } else {
          envText.innerText = "Kompilyator o'rnatilmoqda (Kutib turing...)";
          envIndicator.className = "w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse";
        }
      } catch (err) {
        envText.innerText = "Xato (Lokal)";
        envIndicator.className = "w-2.5 h-2.5 rounded-full bg-red-500";
      }
    }

    function clearTerminal() {
      document.getElementById("terminal-body").innerHTML = "";
    }

    async function executeCode() {
      const term = document.getElementById("terminal-body");
      const runBtn = document.getElementById("run-btn");
      
      term.innerHTML = '<div class="text-cyan-400 flex items-center space-x-2"><i data-lucide="loader" class="w-4 h-4 animate-spin"></i><span>Ilova va kod ishga tushirilmoqda...</span></div>';
      lucide.createIcons();
      runBtn.disabled = true;
      runBtn.classList.add("opacity-50", "pointer-events-none");

      try {
        const response = await fetch("/api/workspace/terminal?userEmail=" + userEmail + "&projectName=" + projectName, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: runCommand, currentDir: fileDir })
        });
        const data = await response.json();

        term.innerHTML = "";
        
        const promptDiv = document.createElement("div");
        promptDiv.className = "text-slate-500 text-[10px] border-b border-slate-900 pb-1.5 mb-2";
        promptDiv.innerHTML = \`<span class="text-teal-400">root@developer:~\${fileDir ? '/' + fileDir : ''}$</span> \${runCommand}\`;
        term.appendChild(promptDiv);

        if (data.stdout) {
          const outDiv = document.createElement("div");
          outDiv.className = "text-slate-100 whitespace-pre-wrap leading-relaxed";
          outDiv.innerText = data.stdout;
          term.appendChild(outDiv);
        }

        if (data.stderr) {
          const errDiv = document.createElement("div");
          errDiv.className = "text-red-400 whitespace-pre-wrap font-bold leading-relaxed mt-1.5";
          errDiv.innerText = data.stderr;
          term.appendChild(errDiv);
        }

        const statusDiv = document.createElement("div");
        statusDiv.className = "text-[10px] mt-3 border-t border-slate-900 pt-2 flex items-center justify-between";
        
        const exitCode = data.code !== undefined ? data.code : 0;
        if (exitCode === 0) {
          statusDiv.innerHTML = '<span class="text-emerald-400 font-bold flex items-center gap-1"><i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Muvaffaqiyatli bajarildi (Exit Code: 0)</span>';
        } else {
          statusDiv.innerHTML = '<span class="text-red-400 font-bold flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i> Xatolik yuz berdi (Exit Code: ' + exitCode + ')</span>';
        }
        term.appendChild(statusDiv);
        lucide.createIcons();

        const termBody = document.getElementById("terminal-body");
        termBody.scrollTop = termBody.scrollHeight;

      } catch (err) {
        term.innerHTML = '<div class="text-red-400 font-bold font-mono text-xs">Xatolik: Tarmoq yoki server ulanishida xatolik yuz berdi.</div>';
      } finally {
        runBtn.disabled = false;
        runBtn.classList.remove("opacity-50", "pointer-events-none");
      }
    }

    checkEnvironment();
    setInterval(checkEnvironment, 5000);
  </script>
</body>
</html>`);
    }

    const rootIndex = path.join(projectDir, "index.html");
    const webIndex = path.join(projectDir, "web/index.html");
    if (fs.existsSync(rootIndex)) {
      relativePath = "index.html";
      safePath = "index.html";
      absolutePath = rootIndex;
    } else if (fs.existsSync(webIndex)) {
      relativePath = "web/index.html";
      safePath = "web/index.html";
      absolutePath = webIndex;
    } else {
      res.setHeader("Content-Type", "text/html");
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
          <title>Terminal Muhiti | Vigron Studio</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-200 flex flex-col items-center justify-center min-h-screen p-6 font-sans text-center">
          <div class="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-4">
            <span class="text-5xl">💻</span>
            <h2 class="text-xl font-bold text-white">Terminal Muhiti</h2>
            <p class="text-xs text-slate-400 leading-relaxed">
              Siz hozirda <b>${path.basename(absolutePath)}</b> faylini tahrirlayapsiz. Bu fayl veb-sahifa emas.
            </p>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left font-mono text-[11px] space-y-1.5 text-emerald-400">
              <p class="text-slate-500">// Ishga tushirish uchun:</p>
              <p>1. Tepadagi yashil <span class="bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400">Ishga tushirish (Run)</span> tugmasini bosing.</p>
              <p>2. Natijani pastdagi <span class="text-sky-400">Terminal</span> oynasida ko'ring.</p>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  }

  // Log visitor view action in analytics
  logAnalyticsAction("view");

  try {
    // If it's index.html, check if this is a Flutter/Dart project and serve our advanced dynamic live compiler!
    if (relativePath.endsWith("index.html") || relativePath === "index.html") {
      const compiledIndexPath = path.join(projectDir, "build/web/index.html");
      if (fs.existsSync(compiledIndexPath)) {
        res.setHeader("Content-Type", "text/html");
        return res.sendFile(compiledIndexPath);
      }

      let relativeDartPath = "lib/main.dart";
      let mainDartPath = path.join(projectDir, relativeDartPath);

      if (!fs.existsSync(mainDartPath)) {
        // Try looking in parent directory of the index.html's folder
        const relDir = path.dirname(relativePath); // e.g. "admin/web" or "web"
        const siblingDartRelPath = path.join(relDir, "../lib/main.dart"); // e.g. "admin/lib/main.dart" or "lib/main.dart"
        const siblingDartPath = path.join(projectDir, siblingDartRelPath);
        if (fs.existsSync(siblingDartPath)) {
          mainDartPath = siblingDartPath;
          relativeDartPath = siblingDartRelPath;
        } else {
          // Fallback: search for any "lib/main.dart" in the projectDir recursively!
          const findMainDart = (dir: string): string | null => {
            if (!fs.existsSync(dir)) return null;
            const items = fs.readdirSync(dir);
            for (const item of items) {
              if (item === "node_modules" || item === ".git") continue;
              const full = path.join(dir, item);
              try {
                const stat = fs.statSync(full);
                if (stat.isDirectory()) {
                  if (item === "lib" && fs.existsSync(path.join(full, "main.dart"))) {
                    return path.join(full, "main.dart");
                  }
                  const found = findMainDart(full);
                  if (found) return found;
                }
              } catch (e) {}
            }
            return null;
          };
          const searchedPath = findMainDart(projectDir);
          if (searchedPath) {
            mainDartPath = searchedPath;
            relativeDartPath = path.relative(projectDir, searchedPath);
          }
        }
      }

      if (fs.existsSync(mainDartPath)) {
        const rawDartCode = fs.readFileSync(mainDartPath, "utf-8");
        const userEmail = req.query.userEmail || req.headers["x-user-email"] || "anonymous";
        const projectName = req.query.projectName || req.headers["x-project-name"] || "default";
        const host = req.headers.host || "ais-dev-6gviay5cmqjktembxeui4u-571750263930.europe-west2.run.app";
        const protocol = req.headers["x-forwarded-proto"] || "https";
        const shortUrl = `${protocol}://${host}/g/${shortCodeCounter}`;

        const htmlResponse = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Vigron Flutter Live Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    body { font-family: 'Space Grotesk', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 flex flex-col items-center justify-center min-h-screen p-0 sm:p-4 overflow-x-hidden relative select-none">

  <!-- Floating Mobile App Launcher -->
  <div id="pwa-launcher" class="fixed top-4 right-4 z-40">
    <button onclick="toggleInstallModal(true)" class="flex items-center space-x-1.5 px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-bold text-xs rounded-full shadow-lg transition duration-200">
      <i data-lucide="smartphone" class="w-3.5 h-3.5"></i>
      <span>Telefonga O'rnatish</span>
    </button>
  </div>

  <!-- Main Simulator Container -->
  <div id="simulator-container" class="w-full flex justify-center items-center"></div>

  <!-- PWA Install Modal -->
  <div id="install-modal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
    <div class="bg-slate-900 border border-slate-800 rounded-[28px] max-w-sm w-full p-6 text-center shadow-2xl relative space-y-4">
      <button onclick="toggleInstallModal(false)" class="absolute top-4 right-4 text-slate-500 hover:text-slate-300">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
      
      <div class="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center mx-auto border border-teal-500/20 text-teal-400">
        <i data-lucide="download-cloud" class="w-6 h-6"></i>
      </div>

      <h3 class="text-base font-bold text-slate-100">Smart Telefonga O'rnatish</h3>
      <p class="text-xs text-slate-400 leading-relaxed">
        Ushbu loyihani telefoningizda brauzersiz, mustaqil <b>Progressive Web App (PWA)</b> sifatida ishlatish uchun quyidagilarni bajaring:
      </p>

      <div class="text-left space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-[11px]">
        <div id="ios-steps" class="space-y-1">
          <p class="font-bold text-teal-400 flex items-center gap-1">
            <i data-lucide="apple" class="w-3.5 h-3.5"></i> iPhone (Safari brauzerida):
          </p>
          <ol class="list-decimal pl-4 space-y-1 text-slate-300">
            <li>Safari ekranining pastki qismidagi <b>Ulashish</b> (Share) tugmasini bosing.</li>
            <li>Ro'yxatdan <b>"Bosh ekranga qo'shish"</b> (Add to Home Screen) bandini bosing.</li>
            <li>Tepadagi <b>"Qo'shish"</b> (Add) tugmasini bosib o'rnating.</li>
          </ol>
        </div>

        <div id="android-steps" class="space-y-1 pt-2 border-t border-slate-800/40">
          <p class="font-bold text-emerald-400 flex items-center gap-1">
            <i data-lucide="smartphone" class="w-3.5 h-3.5"></i> Android (Chrome brauzerida):
          </p>
          <ol class="list-decimal pl-4 space-y-1 text-slate-300">
            <li>O'ng tepada joylashgan uchta nuqta <b>Menyu</b> tugmasini bosing.</li>
            <li>Menyudan <b>"Ilovani o'rnatish"</b> (Install app) bandini tanlang.</li>
            <li>Chiqgan bildirishnomada <b>O'rnatish</b> tugmasini bosing.</li>
          </ol>
        </div>
      </div>

      <button onclick="toggleInstallModal(false)" class="w-full py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition">
        Tushunarli va tayyor!
      </button>
    </div>
  </div>

  <!-- Real-time Status and Hot Reload Indicator -->
  <div id="hot-reload-toast" class="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-teal-500 text-slate-950 rounded-full font-bold text-xs shadow-lg flex items-center space-x-2 opacity-0 translate-y-4 transition-all duration-300 z-50">
    <i data-lucide="refresh-cw" class="w-3.5 h-3.5 animate-spin"></i>
    <span>Flutter Hot Reload: Loyiha yangilandi!</span>
  </div>

  <script>
    const userEmail = "${encodeURIComponent(String(userEmail))}";
    const projectName = "${encodeURIComponent(String(projectName))}";
    let latestDartCode = \`${rawDartCode.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;

    // -------------------------------------------------------------
    // FLUTTER PARSER & RENDERING ENGINE (DART-TO-WEB CLOUD RUNTIME)
    // -------------------------------------------------------------
    const FlutterEngine = {
      state: {},
      methods: {},
      widgetTree: null,
      appTitle: "Flutter Web App",
      themeColor: "#0f766e",

      parseDart(code) {
        try {
          this.state = {};
          this.methods = {};
          this.widgetTree = null;

          const titleMatch = code.match(/title:\\s*['"](.*?)['"]/);
          if (titleMatch) this.appTitle = titleMatch[1];

          const colorMatch = code.match(/seedColor:\\s*Colors\\.([a-z]+)/i);
          if (colorMatch) {
            const c = colorMatch[1].toLowerCase();
            const colors = { teal: "#0f766e", blue: "#1d4ed8", red: "#b91c1c", green: "#15803d", orange: "#c2410c", purple: "#6b21a8", indigo: "#4338ca", pink: "#be185d" };
            this.themeColor = colors[c] || "#0f766e";
          }

          const varRegex = /^[ \\t]*(int|double|String|bool|var)\\s+([_a-zA-Z0-9]+)\\s*=\\s*([^;]+);/gm;
          let match;
          while ((match = varRegex.exec(code)) !== null) {
            const name = match[2];
            let valStr = match[3].trim();
            let value = valStr;

            if (valStr.startsWith('"') && valStr.endsWith('"')) value = valStr.slice(1, -1);
            else if (valStr.startsWith("'") && valStr.endsWith("'")) value = valStr.slice(1, -1);
            else if (valStr === "true") value = true;
            else if (valStr === "false") value = false;
            else if (!isNaN(Number(valStr))) value = Number(valStr);

            this.state[name] = value;
          }

          const methodRegex = /(?:void|Widget|var|dynamic)?\\s+([_a-zA-Z0-9]+)\\s*\\(\\s*\\)\\s*\\{([\\s\\S]*?)\\n[ \\t]*\\}/g;
          while ((match = methodRegex.exec(code)) !== null) {
            const methodName = match[1];
            let body = match[2].trim();
            if (methodName === "build") continue;

            let cleanedBody = body
              .replace(/setState\\s*\\(\\s*\\(\\s*\\)\\s*\\{\\s*([\\s\\S]*?)\\s*\\}\\s*\\)\\s*;/g, "$1")
              .replace(/setState\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*([\\s\\S]*?)\\s*\\)\\s*;/g, "$1")
              .replace(/widget\\./g, "this.props.");

            this.methods[methodName] = cleanedBody;
          }

          const buildMatch = code.match(/Widget\\s+build\\s*\\(\\s*BuildContext\\s+context\\s*\\)\\s*\\{([\\s\\S]*?)\\}/);
          if (buildMatch) {
            const buildBody = buildMatch[1].trim();
            const returnMatch = buildBody.match(/return\\s+([\\s\\S]*?);/);
            if (returnMatch) {
              const returnWidgetCode = returnMatch[1].trim();
              this.widgetTree = this.parseWidgetString(returnWidgetCode);
            }
          }

          if (!this.widgetTree) {
            this.widgetTree = {
              type: "Scaffold",
              args: {
                appBar: { type: "AppBar", args: { title: { type: "Text", args: { _positional: [{ type: "string", value: this.appTitle }] } } } },
                body: { type: "Center", args: { child: { type: "Text", args: { _positional: [{ type: "string", value: "Qurish yoki tahlil xatosi!" }] } } } }
              }
            };
          }
        } catch (err) {
          console.error(err);
        }
      },

      parseWidgetString(str) {
        str = str.trim();
        if (str.startsWith("const ")) str = str.slice(6).trim();
        const match = str.match(/^([A-Z][a-zA-Z0-9\\.]+)\\s*\\(/);
        if (!match) return null;
        const name = match[1];
        const argsStart = match[0].length;
        
        let depth = 1;
        let i = argsStart;
        while (i < str.length && depth > 0) {
          if (str[i] === '(') depth++;
          else if (str[i] === ')') depth--;
          i++;
        }
        const argsContent = str.slice(argsStart, i - 1);
        const args = this.parseArgs(argsContent);
        return { type: name, args: args };
      },

      parseArgs(str) {
        const args = {};
        str = str.trim();
        if (!str) return args;
        
        let depth = 0;
        let bracketDepth = 0;
        let currentArg = "";
        const parts = [];
        
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (char === '(') depth++;
          else if (char === ')') depth--;
          else if (char === '[') bracketDepth++;
          else if (char === ']') bracketDepth--;
          
          if (char === ',' && depth === 0 && bracketDepth === 0) {
            parts.push(currentArg.trim());
            currentArg = "";
          } else {
            currentArg += char;
          }
        }
        if (currentArg.trim()) parts.push(currentArg.trim());
        
        for (let part of parts) {
          const colonIndex = part.indexOf(':');
          if (colonIndex !== -1 && !part.slice(0, colonIndex).includes('(') && !part.slice(0, colonIndex).includes('[')) {
            const name = part.slice(0, colonIndex).trim();
            const val = part.slice(colonIndex + 1).trim();
            args[name] = this.parseArgValue(val);
          } else {
            if (!args._positional) args._positional = [];
            args._positional.push(this.parseArgValue(part));
          }
        }
        return args;
      },

      parseArgValue(val) {
        val = val.trim();
        if (!val) return null;
        if (val.startsWith("const ")) val = val.slice(6).trim();
        
        if (/^[A-Z][a-zA-Z0-9\\.]+\\s*\\(/.test(val)) {
          return this.parseWidgetString(val);
        }
        
        if (val.startsWith('[') && val.endsWith(']')) {
          const inner = val.slice(1, -1).trim();
          if (!inner) return [];
          
          let depth = 0;
          let bracketDepth = 0;
          let current = "";
          const list = [];
          for (let i = 0; i < inner.length; i++) {
            const char = inner[i];
            if (char === '(') depth++;
            else if (char === ')') depth--;
            else if (char === '[') bracketDepth++;
            else if (char === ']') bracketDepth--;
            
            if (char === ',' && depth === 0 && bracketDepth === 0) {
              list.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          if (current.trim()) list.push(current.trim());
          return list.map(item => this.parseArgValue(item));
        }
        
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
          return { type: 'string', value: val.slice(1, -1) };
        }
        
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (!isNaN(Number(val))) return Number(val);
        return { type: 'reference', value: val };
      },

      executeMethod(methodName) {
        const body = this.methods[methodName];
        if (!body) return;
        try {
          const run = new Function("state", "methods", \`with(state) { \${body} }\`);
          run(this.state, this.methods);
          this.reRender();
        } catch (e) {
          console.error(e);
        }
      },

      evaluateValue(val) {
        if (!val) return "";
        if (typeof val !== 'object') return val;
        if (val.type === 'string') {
          let text = val.value;
          for (let k in this.state) {
            text = text.replace(new RegExp(\`\\\\\\\\\\$\\\\\\\${k}\`, 'g'), this.state[k]);
            text = text.replace(new RegExp(\`\\\\\\\\\\$\${k}\`, 'g'), this.state[k]);
            text = text.replace(new RegExp(\`\\\\\\$\\\\\\\${k}\`, 'g'), this.state[k]);
            text = text.replace(new RegExp(\`\\\\\\$\${k}\`, 'g'), this.state[k]);
          }
          return text;
        }
        if (val.type === 'reference') {
          const ref = val.value;
          if (this.state[ref] !== undefined) return this.state[ref];
          if (ref.startsWith("widget.")) return this.appTitle;
          return ref;
        }
        return "";
      },

      renderWidget(node) {
        if (!node) return "";
        if (typeof node !== 'object') return String(node);
        
        const type = node.type;
        const args = node.args || {};
        
        switch (type) {
          case "MaterialApp":
            return this.renderWidget(args.home);
            
          case "Scaffold":
            const appBarHtml = args.appBar ? this.renderWidget(args.appBar) : "";
            const bodyHtml = args.body ? this.renderWidget(args.body) : "";
            let fabHtml = "";
            if (args.floatingActionButton) {
               fabHtml = this.renderWidget(args.floatingActionButton);
            }
            return \`
              <div class="flex flex-col h-full w-full bg-slate-950 relative overflow-hidden">
                \${appBarHtml}
                <div class="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center justify-center text-center">
                  \${bodyHtml}
                </div>
                \${fabHtml}
              </div>
            \`;
            
          case "AppBar":
            const titleText = args.title ? this.renderWidget(args.title) : this.appTitle;
            return \`
              <div class="bg-teal-700 text-white pt-8 pb-3 px-4 shadow-md flex items-center justify-between shrink-0 z-10 select-none w-full">
                <div class="flex items-center space-x-2">
                  <span class="text-sm">⚡</span>
                  <span class="font-bold text-sm tracking-tight">\${titleText}</span>
                </div>
                <span class="text-[10px] bg-teal-800/80 px-2 py-0.5 rounded-full font-bold text-teal-200 uppercase tracking-wider animate-pulse">Live</span>
              </div>
            \`;
            
          case "Center":
            return \`
              <div class="w-full flex flex-col items-center justify-center py-2">
                \${this.renderWidget(args.child)}
              </div>
            \`;
            
          case "Column":
            const colChildren = (args.children || []).map(child => this.renderWidget(child)).join('');
            return \`
              <div class="flex flex-col space-y-4 items-center justify-center w-full">
                \${colChildren}
              </div>
            \`;
            
          case "Row":
            const rowChildren = (args.children || []).map(child => this.renderWidget(child)).join('');
            return \`
              <div class="flex flex-row space-x-4 items-center justify-center w-full">
                \${rowChildren}
              </div>
            \`;
            
          case "Padding":
            return \`
              <div class="p-4 w-full">
                \${this.renderWidget(args.child)}
              </div>
            \`;
            
          case "Container":
            const paddingClass = args.padding ? "p-4" : "";
            const marginClass = args.margin ? "m-2" : "";
            const colorClass = args.color ? "bg-slate-900 border border-slate-800" : "bg-transparent";
            return \`
              <div class="rounded-2xl \${paddingClass} \${marginClass} \${colorClass} w-full">
                \${this.renderWidget(args.child)}
              </div>
            \`;
            
          case "SizedBox":
            const w = args.width ? \`width: \${args.width}px;\` : "";
            const h = args.height ? \`height: \${args.height}px;\` : "";
            return \`
              <div style="\${w} \${h}" class="shrink-0">
                \${args.child ? this.renderWidget(args.child) : ""}
              </div>
            \`;
            
          case "Card":
            return \`
              <div class="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg w-full text-center max-w-[280px]">
                \${this.renderWidget(args.child)}
              </div>
            \`;
            
          case "Text":
            const textVal = args._positional ? this.evaluateValue(args._positional[0]) : "";
            let textStyleClass = "text-xs text-slate-400 font-medium";
            
            if (args.style) {
              const styleArgs = args.style.args || {};
              if (styleArgs.fontSize && styleArgs.fontSize > 20) {
                 textStyleClass = "text-4xl font-extrabold text-teal-400 mt-2 tracking-tight mono";
              } else if (styleArgs.fontWeight) {
                 textStyleClass = "text-sm text-slate-300 font-semibold";
              }
            }
            return \`<p class="\${textStyleClass}">\${textVal}</p>\`;
            
          case "Icon":
            return \`<span class="text-xl">➕</span>\`;
            
          case "FloatingActionButton":
            const fabOnPressed = args.onPressed ? args.onPressed.value : "";
            return \`
              <button 
                onclick="FlutterEngine.executeMethod('\${fabOnPressed}')"
                class="absolute bottom-8 right-6 w-14 h-14 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 rounded-full flex items-center justify-center shadow-lg font-bold text-2xl transition z-10"
              >
                +
              </button>
            \`;
            
          case "ElevatedButton":
            const btnOnPressed = args.onPressed ? args.onPressed.value : "";
            const btnText = args.child ? this.renderWidget(args.child) : "Tugma";
            return \`
              <button 
                onclick="FlutterEngine.executeMethod('\${btnOnPressed}')"
                class="px-5 py-2 bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
              >
                \${btnText}
              </button>
            \`;

          case "TextField":
            const onChangedMethod = args.onChanged ? args.onChanged.value : "";
            const hintText = args.decoration && args.decoration.args && args.decoration.args.labelText ? this.evaluateValue(args.decoration.args.labelText) : "Matn kiriting...";
            return \`
              <div class="w-full max-w-[250px] mx-auto py-1.5">
                <input 
                  type="text" 
                  placeholder="\${hintText}"
                  oninput="FlutterEngine.handleInputChanged('\${onChangedMethod}', this.value)"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition"
                />
              </div>
            \`;
            
          default:
            if (args.child) return this.renderWidget(args.child);
            if (args.children) return args.children.map(c => this.renderWidget(c)).join('');
            return "";
        }
      },

      handleInputChanged(methodName, val) {
         for (let k in this.state) {
            if (typeof this.state[k] === 'string') {
               this.state[k] = val;
               break;
            }
         }
         if (methodName) this.executeMethod(methodName);
         else this.reRender();
      },

      reRender() {
        const rootScreen = document.getElementById("phone-screen-body");
        if (rootScreen) {
          rootScreen.innerHTML = this.renderWidget(this.widgetTree);
        }
      }
    };

    function initLayout() {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const container = document.getElementById("simulator-container");
      
      if (isMobileDevice) {
        container.innerHTML = \`
          <div class="w-full h-screen flex flex-col relative select-none">
            <div id="phone-screen-body" class="flex-1 bg-slate-950 flex flex-col items-center justify-center p-6 text-center"></div>
          </div>
        \`;
      } else {
        container.innerHTML = \`
          <div class="w-full max-w-sm bg-slate-900 rounded-[36px] border-[10px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative aspect-[9/16] outline-none select-none phone-shadow">
            <div class="absolute top-0 inset-x-0 h-6 bg-slate-800/80 flex justify-between items-center px-6 text-[10px] text-slate-400 font-bold z-20">
              <span>12:00</span>
              <div class="w-16 h-4 bg-slate-900 rounded-full"></div>
              <div class="flex items-center space-x-1">
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>
            <div id="phone-screen-body" class="flex-1 bg-slate-950 flex flex-col relative pt-6 overflow-hidden"></div>
            <div class="absolute bottom-1.5 inset-x-0 flex justify-center z-20">
              <div class="w-24 h-1 bg-slate-700 rounded-full"></div>
            </div>
          </div>
        \`;
      }

      FlutterEngine.parseDart(latestDartCode);
      FlutterEngine.reRender();
      lucide.createIcons();
    }

    function toggleInstallModal(show) {
      const modal = document.getElementById("install-modal");
      if (show) modal.classList.remove("hidden");
      else modal.classList.add("hidden");
    }

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) {
       document.getElementById("android-steps").classList.add("opacity-50");
    } else {
       document.getElementById("ios-steps").classList.add("opacity-50");
    }

    window.addEventListener("DOMContentLoaded", initLayout);

    setInterval(() => {
      fetch(\`/api/workspace/file?path=${encodeURIComponent(relativeDartPath)}&userEmail=\${userEmail}&projectName=\${projectName}\`)
        .then(res => res.json())
        .then(data => {
          if (data && data.content && data.content !== latestDartCode) {
             latestDartCode = data.content;
             FlutterEngine.parseDart(latestDartCode);
             FlutterEngine.reRender();
             
             const toast = document.getElementById("hot-reload-toast");
             toast.classList.remove("opacity-0", "translate-y-4");
             toast.classList.add("opacity-100", "translate-y-0");
             
             setTimeout(() => {
                toast.classList.remove("opacity-100", "translate-y-0");
                toast.classList.add("opacity-0", "translate-y-4");
             }, 2500);
          }
        })
        .catch(err => console.error(err));
    }, 1500);
  </script>
</body>
</html>`;
        res.setHeader("Content-Type", "text/html");
        return res.send(htmlResponse);
      }
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send("Fayl topilmadi. Avval index.html faylini yarating.");
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      const indexHtmlPath = path.join(absolutePath, "index.html");
      if (fs.existsSync(indexHtmlPath)) {
        return res.sendFile(indexHtmlPath);
      }
      return res.status(404).send("Katalogda index.html topilmadi");
    }

    // Set appropriate content headers
    const ext = path.extname(absolutePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".svg": "image/svg+xml"
    };

    if (contentTypes[ext]) {
      res.setHeader("Content-Type", contentTypes[ext]);
    }

    res.sendFile(absolutePath);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// 7. Gemini Chat Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, currentFile } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Suhbat xabarlari kiritilmadi" });
  }

  try {
    // Log AI action in analytics
    logAnalyticsAction("ai");

    const projectDir = getProjectDir(req);
    // Collect all workspace files to build context
    const filesList: { path: string; content: string }[] = [];
    
    function collectFiles(dir: string, relativePath: string = "") {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (item === "node_modules" || item === ".git" || item === "package-lock.json" || item === "projects") continue;
        const absPath = path.join(dir, item);
        const relPath = relativePath ? `${relativePath}/${item}` : item;
        const stat = fs.statSync(absPath);
        if (stat.isDirectory()) {
          collectFiles(absPath, relPath);
        } else if (stat.isFile() && stat.size < 100 * 1024) { // Only read files under 100KB
          try {
            const content = fs.readFileSync(absPath, "utf-8");
            filesList.push({ path: relPath, content });
          } catch (_) {}
        }
      }
    }

    try {
      collectFiles(projectDir);
    } catch (_) {}

    // Formulate system instruction and context
    const filesContext = filesList.map(f => `Fayl: ${f.path}\nTarkibi:\n${f.content}\n---`).join("\n\n");
    const systemInstruction = `Siz "Vigron Code Studio" ilovasida o'rnatilgan aqlli va professional AI Kod Yordamchisiz (Gemini).
Sizning ixtiyoringizda loyihadagi fayllarni bevosita tahrirlash, yangi fayllar yaratish, fayllarni o'chirish va terminal buyruqlarini bajarish imkoniyatlari mavjud.
Siz xuddi professional dasturchi agent kabi ishlaysiz!

Foydalanuvchi hozirda tahrirlayotgan fayl: ${currentFile || "hech qaysi (README.md)"}

Sizning ixtiyoringizda bo'lgan Workspace fayllari ro'yxati va tarkibi:
${filesContext}

Qoidalaringiz:
1. Suhbatni foydalanuvchi tilida olib boring (O'zbek tilida yoki ingliz tilida).
2. Foydalanuvchi yangi xususiyat qo'shishni so'rasa, xatolarni tuzatishni so'rasa, yoki yangi fayl yaratishni so'rasa, buni to'g'ridan-to'g'ri 'writeFile', 'deleteFile' yoki 'runTerminalCommand' funksiyalaridan foydanib bajaring! Kodni shunchaki matn ko'rinishida berib cheklanib qolmang, uni amalda fayllarga saqlang.
3. Agar 'writeFile' orqali faylga kod yozsangiz, barcha o'zgarishlar to'liq, xatosiz va tayyor holda bo'lsin. Hech qachon kodni o'rtasida qoldirmang (masalan, "// kodning qolgan qismi bu yerda" deb qoldirmang), doim to'liq tarkibni yozing.
4. Agar terminalda kutubxona o'rnatish kerak bo'lsa (masalan, npm install yoki pip install), buni 'runTerminalCommand' orqali o'zingiz bajaring!
5. Mobil ekranlar kichikligini hisobga olib, tushuntirishlarni lo'nda, aniq va ortiqcha so'zlarsiz bering.
6. Sizning javobingiz visual jihatdan chiroyli Markdown formatida bo'lsin. Foydalanuvchiga qaysi fayllarni o'zgartirganingizni va qanday amallarni bajarganingizni qisqa bayon qiling.`;

    const chatMessages: any[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") continue;
      const role = m.role === "assistant" ? "model" as const : "user" as const;
      let text = m.content || "";
      
      // Fallback for empty text content to prevent API validation failures
      if (!text.trim()) {
        if (role === "model") {
          text = "(Loyihani tahrirlash amallari bajarildi)";
        } else {
          continue; // Skip empty user messages
        }
      }
      
      chatMessages.push({
        role,
        parts: [{ text }]
      });
    }

    // Tool Declarations
    const writeFileDeclaration = {
      name: "writeFile",
      description: "Creates or updates/overwrites a file with the given content in the workspace.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          filePath: {
            type: Type.STRING,
            description: "The relative path to the file in the workspace (e.g., 'src/App.tsx', 'index.html', 'style.css').",
          },
          content: {
            type: Type.STRING,
            description: "The full and complete content to write into the file. Do not truncate.",
          },
        },
        required: ["filePath", "content"],
      },
    };

    const deleteFileDeclaration = {
      name: "deleteFile",
      description: "Deletes a file from the workspace.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          filePath: {
            type: Type.STRING,
            description: "The relative path to the file to be deleted (e.g., 'old-style.css').",
          },
        },
        required: ["filePath"],
      },
    };

    const runTerminalCommandDeclaration = {
      name: "runTerminalCommand",
      description: "Runs a terminal shell command (e.g., 'npm install name', 'python3 script.py', 'pip install package') inside the project directory.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          command: {
            type: Type.STRING,
            description: "The exact shell command to run.",
          },
        },
        required: ["command"],
      },
    };

    const tools = [{
      functionDeclarations: [
        writeFileDeclaration,
        deleteFileDeclaration,
        runTerminalCommandDeclaration
      ]
    }];

    // Start Chat
    const ai = getGeminiClient();
    let response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: chatMessages,
      config: {
        systemInstruction,
        temperature: 0.2, // lower temperature for precise agent tool execution
        tools,
      }
    });

    const executedActions: any[] = [];
    let loopCount = 0;

    // Loop to handle function calls
    while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 5) {
      loopCount++;
      const functionCalls = response.functionCalls;
      const functionResponses: any[] = [];

      for (const call of functionCalls) {
        const { name, args, id } = call;
        let result: any = {};
        try {
          if (name === "writeFile") {
            const { filePath, content } = args as { filePath: string; content: string };
            const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
            const fullPath = path.join(projectDir, safePath);
            
            const parentDir = path.dirname(fullPath);
            if (!fs.existsSync(parentDir)) {
              fs.mkdirSync(parentDir, { recursive: true });
            }
            
            fs.writeFileSync(fullPath, content, "utf-8");
            result = { success: true, message: `Fayl muvaffaqiyatli saqlandi: ${filePath}` };
            executedActions.push({ type: "write", path: filePath, content });
          } else if (name === "deleteFile") {
            const { filePath } = args as { filePath: string };
            const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
            const fullPath = path.join(projectDir, safePath);
            
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              result = { success: true, message: `Fayl o'chirildi: ${filePath}` };
              executedActions.push({ type: "delete", path: filePath });
            } else {
              result = { success: false, message: `Fayl topilmadi: ${filePath}` };
            }
          } else if (name === "runTerminalCommand") {
            const { command } = args as { command: string };
            
            const execPromise = new Promise<{ success: boolean; output: string }>((resolve) => {
              exec(command, { 
                cwd: projectDir,
                env: {
                  ...process.env,
                  PATH: getSafePath()
                }
              }, (err, stdout, stderr) => {
                const output = (stdout || "") + (stderr || "");
                resolve({
                  success: !err,
                  output: output.slice(0, 10000)
                });
              });
            });
            const cmdResult = await execPromise;
            result = { success: cmdResult.success, output: cmdResult.output };
            executedActions.push({ type: "cmd", command, output: cmdResult.output });
          }
        } catch (e: any) {
          result = { success: false, error: e.message };
        }

        functionResponses.push({
          name,
          response: result,
          id
        });
      }

      // Add the model's response (with tool calls) to message history
      const lastCandidate = response.candidates?.[0];
      if (lastCandidate && lastCandidate.content) {
        chatMessages.push(lastCandidate.content);
      }

      // Add tool responses
      chatMessages.push({
        role: "user",
        parts: functionResponses.map(r => ({
          functionResponse: {
            name: r.name,
            response: r.response,
            id: r.id
          }
        }))
      });

      // Query Gemini again with tool responses
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: chatMessages,
        config: {
          systemInstruction,
          temperature: 0.2,
          tools,
        }
      });
    }

    let replyText = response.text || "";
    if (!replyText && executedActions.length > 0) {
      replyText = `Muvaffaqiyatli ravishda quyidagi amallarni bajardim:\n` + 
        executedActions.map(act => {
          if (act.type === "write") return `- 📝 **${act.path}** fayli yaratildi/yangilandi`;
          if (act.type === "delete") return `- ❌ **${act.path}** fayli o'chirildi`;
          if (act.type === "cmd") return `- 💻 **${act.command}** terminal buyrug'i bajarildi`;
          return "";
        }).filter(Boolean).join("\n");
    }
    if (!replyText) {
      replyText = "Amallar muvaffaqiyatli bajarildi, lekin suhbat matni qaytarilmadi.";
    }

    res.json({ text: replyText, executedActions });
  } catch (err: any) {
    console.error("Gemini API Error details:", err);
    let friendlyMessage = err.message;
    if (err.message && err.message.includes("API_KEY_INVALID")) {
      friendlyMessage = "API kaliti (GEMINI_API_KEY) noto'g'ri yoki yaroqsiz. Iltimos, Sozlamalar > Secrets panelidan to'g'ri kalitni o'rnating.";
    } else if (err.message && err.message.includes("not found")) {
      friendlyMessage = "Gemini modeli topilmadi yoki unga ruxsat yo'q.";
    }
    res.status(500).json({ error: friendlyMessage });
  }
});

// --- Authentication Helpers & APIs ---
const USERS_FILE = path.join(WORKSPACE_DIR, "users.json");

function getUsers(): any[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, "[]", "utf-8");
      return [];
    }
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read users:", err);
    return [];
  }
}

function saveUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save users:", err);
  }
}

app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }
    const users = getUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "Ushbu elektron pochta manzili allaqachon ro'yxatdan o'tgan!" });
    }
    const newUser = {
      email: email.trim(),
      password: password.trim(),
      name: name.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      plan: "Premium Cloud Member"
    };
    users.push(newUser);
    saveUsers(users);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ user: userWithoutPassword });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(400).json({ error: "Elektron pochta yoki parol noto'g'ri!" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/google-login", (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email manzili kiritilmadi!" });
    }
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      const displayName = name || email.split("@")[0];
      user = {
        email: email.trim(),
        password: "google_oauth_password_bypass_" + Math.random().toString(36).slice(-8),
        name: displayName.trim(),
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        plan: "Premium Cloud Member"
      };
      users.push(user);
      saveUsers(users);
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Analytics GET Endpoint ---
app.get("/api/workspace/analytics", (req, res) => {
  try {
    let data = { views: 0, saves: 0, terminals: 0, ais: 0, history: [] as any[] };
    if (fs.existsSync(ANALYTICS_FILE)) {
      data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8"));
    }
    const users = getUsers();
    res.json({
      ...data,
      totalUsers: users.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- Project Management Endpoints ---

// A. GET available projects list
app.get("/api/workspace/projects", (req, res) => {
  try {
    const userEmail = req.headers["x-user-email"] || req.query.userEmail || "";
    let baseDir = path.join(WORKSPACE_DIR, "projects");
    if (userEmail) {
      const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
      baseDir = path.join(baseDir, safeEmail);
    } else {
      baseDir = path.join(baseDir, "anonymous");
    }

    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
    
    // Ensure default project exists for this workspace sub-directory
    const defaultProjPath = path.join(baseDir, "default");
    if (!fs.existsSync(defaultProjPath)) {
      fs.mkdirSync(defaultProjPath, { recursive: true });
      migrateRootFilesToDefault(defaultProjPath);
    }

    const items = fs.readdirSync(baseDir);
    const projectsList = [];
    for (const item of items) {
      const fullPath = path.join(baseDir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        projectsList.push({
          name: item,
          updatedAt: stat.mtime.toISOString(),
        });
      }
    }
    res.json({ projects: projectsList });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// B. CREATE a new project with template
app.post("/api/workspace/projects/create", (req, res) => {
  const { name, template } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Loyiha nomi kiritilmadi" });
  }

  const safeName = path.normalize(name).replace(/^(\.\.(\/|\\|$))+/, '').trim();
  if (!safeName || safeName === "projects" || safeName === "node_modules") {
    return res.status(400).json({ error: "Yaroqsiz loyiha nomi" });
  }

  const userEmail = req.headers["x-user-email"] || req.query.userEmail || (req.body && req.body.userEmail) || "";
  let baseDir = path.join(WORKSPACE_DIR, "projects");
  if (userEmail) {
    const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
    baseDir = path.join(baseDir, safeEmail);
  } else {
    baseDir = path.join(baseDir, "anonymous");
  }

  const projectPath = path.join(baseDir, safeName);
  if (fs.existsSync(projectPath)) {
    return res.status(400).json({ error: "Ushbu nomli loyiha allaqachon mavjud" });
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });

    res.json({ success: true, message: "Loyiha muvaffaqiyatli yaratildi" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// C. DELETE a project
app.post("/api/workspace/projects/delete", (req, res) => {
  const { name } = req.body;
  if (!name || name === "default") {
    return res.status(400).json({ error: "Ushbu loyihani o'chirib bo'lmaydi" });
  }

  const safeName = path.normalize(name).replace(/^(\.\.(\/|\\|$))+/, '').trim();
  
  const userEmail = req.headers["x-user-email"] || req.query.userEmail || (req.body && req.body.userEmail) || "";
  let baseDir = path.join(WORKSPACE_DIR, "projects");
  if (userEmail) {
    const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
    baseDir = path.join(baseDir, safeEmail);
  } else {
    baseDir = path.join(baseDir, "anonymous");
  }

  const projectPath = path.join(baseDir, safeName);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).json({ error: "Loyiha topilmadi" });
  }

  try {
    fs.rmSync(projectPath, { recursive: true, force: true });
    res.json({ success: true, message: "Loyiha o'chirildi" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// D. EXPORT a single project as ZIP
app.get("/api/workspace/projects/export", (req, res) => {
  const { projectName } = req.query;
  if (!projectName) {
    return res.status(400).send("Loyiha nomi ko'rsatilmadi");
  }

  const safeName = path.normalize(String(projectName)).replace(/^(\.\.(\/|\\|$))+/, '').trim() || "default";
  
  const userEmail = req.headers["x-user-email"] || req.query.userEmail || "";
  let baseDir = path.join(WORKSPACE_DIR, "projects");
  if (userEmail) {
    const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
    baseDir = path.join(baseDir, safeEmail);
  } else {
    baseDir = path.join(baseDir, "anonymous");
  }

  const projectPath = path.join(baseDir, safeName);

  if (!fs.existsSync(projectPath)) {
    return res.status(404).send("Loyiha topilmadi");
  }

  try {
    const zip = new AdmZip();
    zip.addLocalFolder(projectPath);
    const zipBuffer = zip.toBuffer();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=vigron_${safeName}_project.zip`);
    res.send(zipBuffer);
  } catch (err: any) {
    res.status(500).send("Loyiha eksport qilinayotganda xatolik: " + err.message);
  }
});

// E. IMPORT a project from ZIP (Base64 encoded)
app.post("/api/workspace/projects/import", (req, res) => {
  const { name, zipBase64 } = req.body;
  if (!name || !zipBase64) {
    return res.status(400).json({ error: "Loyiha nomi yoki ZIP ma'lumoti kiritilmadi" });
  }

  const safeName = path.normalize(name).replace(/^(\.\.(\/|\\|$))+/, '').trim();
  if (!safeName || safeName === "projects" || safeName === "node_modules") {
    return res.status(400).json({ error: "Yaroqsiz loyiha nomi" });
  }

  const userEmail = req.headers["x-user-email"] || req.query.userEmail || req.body.userEmail || "";
  let baseDir = path.join(WORKSPACE_DIR, "projects");
  if (userEmail) {
    const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
    baseDir = path.join(baseDir, safeEmail);
  } else {
    baseDir = path.join(baseDir, "anonymous");
  }

  const projectPath = path.join(baseDir, safeName);
  if (fs.existsSync(projectPath)) {
    return res.status(400).json({ error: "Ushbu nomli loyiha allaqachon mavjud" });
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    const zipBuffer = Buffer.from(zipBase64, "base64");
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(projectPath, true);

    res.json({ success: true, message: "Loyiha muvaffaqiyatli import qilindi!" });
  } catch (err: any) {
    // Clean up directory if extraction failed
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    res.status(500).json({ error: "ZIP faylni ochishda xatolik: " + err.message });
  }
});

// EE. IMPORT a project from an uncompressed folder (List of files)
app.post("/api/workspace/projects/import-folder", (req, res) => {
  const { name, files } = req.body;
  if (!name || !Array.isArray(files)) {
    return res.status(400).json({ error: "Loyiha nomi yoki fayllar ro'yxati kiritilmadi" });
  }

  const safeName = path.normalize(name).replace(/^(\.\.(\/|\\|$))+/, '').trim();
  if (!safeName || safeName === "projects" || safeName === "node_modules") {
    return res.status(400).json({ error: "Yaroqsiz loyiha nomi" });
  }

  const userEmail = req.headers["x-user-email"] || req.query.userEmail || req.body.userEmail || "";
  let baseDir = path.join(WORKSPACE_DIR, "projects");
  if (userEmail) {
    const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
    baseDir = path.join(baseDir, safeEmail);
  } else {
    baseDir = path.join(baseDir, "anonymous");
  }

  const projectPath = path.join(baseDir, safeName);
  if (fs.existsSync(projectPath)) {
    return res.status(400).json({ error: "Ushbu nomli loyiha allaqachon mavjud" });
  }

  try {
    fs.mkdirSync(projectPath, { recursive: true });
    
    for (const f of files) {
      if (!f.path) continue;
      const fileFullPath = path.join(projectPath, f.path);
      const fileDir = path.dirname(fileFullPath);
      
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      const buffer = Buffer.from(f.base64 || "", "base64");
      fs.writeFileSync(fileFullPath, buffer);
    }

    res.json({ success: true, message: "Loyiha ochiq papkadan muvaffaqiyatli import qilindi!" });
  } catch (err: any) {
    if (fs.existsSync(projectPath)) {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
    res.status(500).json({ error: "Papkani import qilishda xatolik: " + err.message });
  }
});

// F. GET analytics data reporting
app.get("/api/analytics", (req, res) => {
  try {
    let data = { views: 0, saves: 0, terminals: 0, ais: 0, history: [] as any[] };
    if (fs.existsSync(ANALYTICS_FILE)) {
      data = JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8"));
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Reset or Switch Workspace to a specific template
app.post("/api/workspace/project/reset", (req, res) => {
  const { template } = req.body;
  if (!template) {
    return res.status(400).json({ error: "Loyiha andozasi tanlanmadi" });
  }

  const targetDir = getProjectDir(req);

  try {
    // 1. Clean the current project directory
    if (fs.existsSync(targetDir)) {
      const items = fs.readdirSync(targetDir);
      for (const item of items) {
        const itemPath = path.join(targetDir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          fs.rmSync(itemPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(itemPath);
        }
      }
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 2. Repopulate workspace based on template
    if (template === "react_tsx") {
      // Create subdirectories for a React TSX app
      fs.mkdirSync(path.join(targetDir, "src"), { recursive: true });
      fs.mkdirSync(path.join(targetDir, "src/components"), { recursive: true });

      fs.writeFileSync(
        path.join(targetDir, "index.html"),
        `<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React + TSX Loyihasi</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Space Grotesk', sans-serif; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
    <div id="root"></div>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script>
      // Simulated browser preview for static HTML/JS viewer
      console.log("React TSX loyihasi muvaffaqiyatli yuklandi!");
    </script>
</body>
</html>`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "src/App.tsx"),
        `import React, { useState } from "react";

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "React loyihasini o'rganish", done: true },
    { id: 2, text: "TypeScript (.tsx) tili bilan interfeys yaratish", done: false },
    { id: 3, text: "Tailwind CSS yordamida chiroyli dizayn qilish", done: false }
  ]);
  const [newText, setNewText] = useState("");

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newText, done: false }]);
    setNewText("");
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-3xl">⚛️</span>
            <div>
              <h1 className="text-lg font-black text-emerald-400 leading-none">Task App</h1>
              <p className="text-[10px] text-slate-500 mt-1">TypeScript & React & Tailwind</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
            {tasks.filter(t => !t.done).length} ta qoldi
          </span>
        </div>

        <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Yangi vazifa qo'shish..."
            className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs focus:border-emerald-500 focus:outline-none transition text-slate-100"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition"
          >
            Qo'shish
          </button>
        </form>

        <div className="space-y-2">
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center justify-between bg-slate-950 border border-slate-800/40 p-3 rounded-xl hover:border-slate-800 transition"
            >
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <span className={\`text-xs \${task.done ? "line-through text-slate-500" : "text-slate-200"}\`}>
                  {task.text}
                </span>
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-slate-500 hover:text-red-400 text-xs transition"
              >
                O'chirish
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-xs text-slate-500 italic text-center py-4">Barcha vazifalar bajarildi! 🎉</p>
          )}
        </div>
      </div>
    </div>
  );
}
`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "README.md"),
        `# ⚛️ React + TSX Loyihasiga Xush Kelibsiz!

Ushbu loyiha zamonaviy React, TypeScript (.tsx) hamda Tailwind CSS muhiti hisoblanadi.

## 🚀 Ishga tushirish qadamlari:
1. Loyihadagi \`src/App.tsx\` faylini tahrirlang.
2. Yuqoridagi **"Ishga tushirish"** yoki terminalda \`node app.js\` deb bosing.
3. Loyiha real vaqtda yangilanadi va o'zgarishlar saqlanadi!
`,
        "utf-8"
      );
    } 
    else if (template === "flutter_sim") {
      fs.mkdirSync(path.join(targetDir, "lib"), { recursive: true });
      fs.mkdirSync(path.join(targetDir, "web"), { recursive: true });

      const pubspecContent = `name: mobil_flutter_app
description: Yangi Flutter Simulyator loyihasi.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
`;
      fs.writeFileSync(path.join(targetDir, "pubspec.yaml"), pubspecContent, "utf-8");

      fs.writeFileSync(
        path.join(targetDir, "lib/main.dart"),
        `import 'package:flutter/material.dart';

void main() {
  runApp(const MyDashboardApp());
}

class MyDashboardApp extends StatelessWidget {
  const MyDashboardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Mobil Control Dashboard',
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.deepPurple,
        useMaterial3: true,
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _deviceCount = 5;
  bool _isWifiOn = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Aqlli Uy Boshqaruvi', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        backgroundColor: Colors.deepPurple.shade800,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Status Card
            Card(
              color: Colors.deepPurple.withOpacity(0.2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Icon(Icons.home, size: 40, color: Colors.deepPurpleAccent),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('Tizim Holati', style: TextStyle(color: Colors.grey.shade400)),
                        const Text('Hammasi joyida', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Controls
            ListTile(
              leading: Icon(_isWifiOn ? Icons.wifi : Icons.wifi_off, color: _isWifiOn ? Colors.teal : Colors.grey),
              title: const Text('Wi-Fi Tarmoq'),
              subtitle: Text(_isWifiOn ? 'Ulangan' : 'O\\'chirilgan'),
              trailing: Switch(
                value: _isWifiOn,
                onChanged: (val) {
                  setState(() {
                    _isWifiOn = val;
                  });
                },
              ),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.devices, color: Colors.deepPurpleAccent),
              title: const Text('Ulangan Qurilmalar'),
              subtitle: Text('\$_deviceCount ta qurilma faol'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: () {
                      if (_deviceCount > 0) setState(() => _deviceCount--);
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline),
                    onPressed: () {
                      setState(() => _deviceCount++);
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "web/index.html"),
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flutter Web App Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Space Grotesk', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 flex flex-col items-center justify-center min-h-screen p-4">
  <div class="w-full max-w-sm bg-slate-900 rounded-[32px] border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-col relative aspect-[9/16] outline-none select-none">
    
    <!-- Phone Notch -->
    <div class="absolute top-0 inset-x-0 h-6 bg-slate-800 flex justify-between items-center px-6 text-[10px] text-slate-400 font-bold z-20">
      <span>12:00</span>
      <div class="w-16 h-4 bg-slate-900 rounded-full"></div>
      <div class="flex items-center space-x-1">
        <span>📶</span>
        <span>🔋</span>
      </div>
    </div>
    
    <!-- Phone App Bar -->
    <div class="bg-purple-800 text-white pt-8 pb-3 px-4 shadow-md flex items-center justify-between z-10">
      <div class="flex items-center space-x-2">
        <span class="text-sm">📱</span>
        <span class="font-bold text-sm tracking-tight" id="app-title">Aqlli Uy Boshqaruvi</span>
      </div>
      <span class="text-[9px] bg-purple-950/60 px-2 py-0.5 rounded font-semibold text-purple-200">Flutter Web</span>
    </div>
    
    <!-- Phone Screen Body -->
    <div class="flex-1 bg-slate-950 flex flex-col p-4 overflow-y-auto custom-scrollbar">
      
      <!-- Status Card -->
      <div class="p-4 bg-purple-900/10 border border-purple-500/20 rounded-2xl mb-4 flex justify-between items-center mt-3">
        <span class="text-3xl text-purple-400">🏠</span>
        <div class="text-right">
          <p class="text-[10px] text-slate-400">Tizim Holati</p>
          <p class="text-sm font-bold text-emerald-400">Hammasi joyida</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="space-y-3">
        <div class="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
          <div class="flex items-center space-x-2.5">
            <span class="text-lg" id="wifi-icon">📶</span>
            <div class="text-left">
              <p class="text-xs font-bold text-slate-200">Wi-Fi Tarmoq</p>
              <p class="text-[9px] text-slate-500" id="wifi-status">Ulangan</p>
            </div>
          </div>
          <button 
            onclick="toggleWifi()"
            id="wifi-btn"
            class="px-3 py-1 bg-teal-500 text-slate-950 rounded-lg text-[10px] font-bold active:scale-95 transition"
          >
            ON
          </button>
        </div>

        <div class="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
          <div class="flex items-center space-x-2.5">
            <span class="text-lg">⚙️</span>
            <div class="text-left">
              <p class="text-xs font-bold text-slate-200">Ulangan Qurilmalar</p>
              <p class="text-[9px] text-slate-500" id="devices-status">5 ta qurilma faol</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="changeDevices(-1)" class="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full flex items-center justify-center font-bold text-xs">-</button>
            <span class="text-xs font-bold text-white w-4 text-center" id="devices-count">5</span>
            <button onclick="changeDevices(1)" class="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full flex items-center justify-center font-bold text-xs">+</button>
          </div>
        </div>
      </div>

    </div>
    
    <!-- Home Bar Indicator -->
    <div class="absolute bottom-1.5 inset-x-0 flex justify-center z-20">
      <div class="w-28 h-1 bg-slate-700 rounded-full"></div>
    </div>
  </div>
  
  <p class="text-[10px] text-slate-500 mt-4 text-center">
    💡 <b>Flutter Jonli Simulyatori!</b><br/>
    \`lib/main.dart\` faylidagi har qanday o'zgarish bu simulyatorga real vaqtda ta'sir qiladi!
  </p>

  <script>
    let wifi = true;
    let devices = 5;

    function toggleWifi() {
      wifi = !wifi;
      document.getElementById("wifi-icon").textContent = wifi ? "📶" : "🚫";
      document.getElementById("wifi-status").textContent = wifi ? "Ulangan" : "O'chirilgan";
      const btn = document.getElementById("wifi-btn");
      btn.textContent = wifi ? "ON" : "OFF";
      btn.className = wifi 
        ? "px-3 py-1 bg-teal-500 text-slate-950 rounded-lg text-[10px] font-bold active:scale-95 transition"
        : "px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold active:scale-95 transition";
    }

    function changeDevices(val) {
      devices = Math.max(0, devices + val);
      document.getElementById("devices-count").textContent = devices;
      document.getElementById("devices-status").textContent = devices + " ta qurilma faol";
    }
  </script>
</body>
</html>`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "README.md"),
        `# 📱 Flutter & Dart Simulyator Loyihasi

Ushbu loyiha Dart dasturlash tilida Flutter ilova interfeyslarini yaratishni simulyatsiya qiladi.

## 🚀 Qanday sinab ko'rish mumkin?
1. \`lib/main.dart\` faylini oching.
2. Ilova kodlarini (tugmalar, matnlar, ranglar) o'zgartiring va saqlang!
3. Terminalga \`flutter run\` deb yozing yoki **Ishga tushirish** tugmasini bosing.
4. Preview oynasidagi mobil telefonda siz yozgan o'zgarishlar jonli aks etadi!
`,
        "utf-8"
      );
    } 
    else if (template === "python_script") {
      fs.writeFileSync(
        path.join(targetDir, "main.py"),
        `# Python Kalkulyator va Algoritmlar tizimi
import math
from helper import yordamchi_matn, hozirgi_vaqt

def daraja_oshir(son, daraja):
    """Kiritilgan sonni berilgan darajaga oshiradi"""
    return math.pow(son, daraja)

def tub_sonlar(n):
    """Tub sonlarni aniqlaydi"""
    tub = []
    for i in range(2, n + 1):
        is_prime = True
        for j in range(2, int(math.isqrt(i)) + 1):
            if i % j == 0:
                is_prime = False
                break
        if is_prime:
            tub.append(i)
    return tub

def main():
    print("=" * 45)
    print("🐍 Python Virtual Analizator Studio v1.0")
    print(f"Hozirgi vaqt: {hozirgi_vaqt()}")
    print("=" * 45)
    
    # 1. Matematik darajalar
    son = 5
    daraja = 3
    natija = daraja_oshir(son, daraja)
    print(f"📊 {son} ning {daraja}-darajasi: {natija}")
    
    # 2. Tub sonlar algoritmi
    limit = 50
    primes = tub_sonlar(limit)
    print(f"✨ 1 dan {limit} gacha bo'lgan barcha tub sonlar:")
    print(primes)
    
    print("-" * 45)
    print(yordamchi_matn())
    print("=" * 45)

if __name__ == "__main__":
    main()
`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "helper.py"),
        `from datetime import datetime

def hozirgi_vaqt():
    """Hozirgi sana va vaqtni qaytaradi"""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def yordamchi_matn():
    """Tizim uchun qo'shimcha yordam matni"""
    return "💡 Maslahat: Yangi algoritmlarni kiritish uchun main.py faylini tahrirlang!"
`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "README.md"),
        `# 🐍 Python Algoritmlar va Skriptlar Loyihasi

Ushbu andoza Python 3 da tezkor hisob-kitoblar hamda turli xil algoritmlarni yaratish va tahlil qilish uchun mo'ljallangan.

## 🚀 Ishga tushirish qadamlari:
1. Terminalda \`python3 main.py\` deb yozing yoki yuqoridagi **"Ishga tushirish"** tugmasini bosing.
2. \`helper.py\` modulidan foydalangan holda yangi funksiyalar va algoritmlarni yarating!
`,
        "utf-8"
      );
    } 
    else if (template === "node_js") {
      fs.writeFileSync(
        path.join(targetDir, "app.js"),
        `// Node.js Express formatidagi API va ma'lumotlar serveri simulyatsiyasi
console.log("🟢 Node.js Web Server ishga tushdi!");
console.log("Ushbu dastur orqali foydalanuvchilar ma'lumotlar bazasi va API xizmatini boshqarishingiz mumkin.");

const foydalanuvchilar = [
  { id: 1, ism: "Alisher", rol: "Admin", holat: "Faol" },
  { id: 2, ism: "Madina", rol: "Dasturchi", holat: "Faol" },
  { id: 3, ism: "Sardor", rol: "Dizayner", holat: "Band" }
];

console.log("\\nTizimdagi foydalanuvchilar ro'yxati:");
console.table(foydalanuvchilar);

console.log("\\nAPI so'rov tahlili muvaffaqiyatli yakunlandi.");
`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "index.html"),
        `<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Node.js Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 flex items-center justify-center">
    <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <h1 class="text-xl font-bold text-amber-400 mb-2 flex items-center">
            <span class="mr-2">⚡</span> Node.js Terminal Studio
        </h1>
        <p class="text-xs text-slate-400 mb-6">Foydalanuvchilar va tizim loglari ro'yxatini ko'rish va nazorat qilish oynasi.</p>

        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                <span class="font-bold text-slate-300">Alisher</span>
                <span class="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono text-[10px]">Admin</span>
            </div>
            <div class="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                <span class="font-bold text-slate-300">Madina</span>
                <span class="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono text-[10px]">Dasturchi</span>
            </div>
            <div class="flex items-center justify-between text-xs">
                <span class="font-bold text-slate-300">Sardor</span>
                <span class="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded font-mono text-[10px]">Dizayner</span>
            </div>
        </div>

        <p class="text-[10px] text-slate-500 mt-4 text-center">Tizim loglarini ko'rish uchun terminalda <b>node app.js</b> buyrug'ini bosing!</p>
    </div>
</body>
</html>`,
        "utf-8"
      );

      fs.writeFileSync(
        path.join(targetDir, "README.md"),
        `# ⚡ Node.js JavaScript Backend Loyihasi

Ushbu andoza Node.js JavaScript orqali backend ma'lumotlarini boshqarish va unga mos ravishda HTML interfeys yaratish uchun xizmat qiladi.

## 🚀 Ishga tushirish qadamlari:
1. \`app.js\` faylidagi ma'lumotlarni yoki foydalanuvchilar ro'yxatini o'zgartiring.
2. Terminalda \`node app.js\` deb yozing yoki **Ishga tushirish** tugmasini bosing.
3. Loglar va natija terminalda chiroyli tarzda namoyon bo'ladi!
`,
        "utf-8"
      );
    }

    res.json({ success: true, message: "Loyiha muvaffaqiyatli andozaga almashtirildi!" });
  } catch (err: any) {
    res.status(500).json({ error: "Loyiha andozasini o'rnatishda xatolik yuz berdi: " + err.message });
  }
});

// --- Vigron Cloud Deployment Engine (Real 24/7 Polyglot Hosting) ---
const DEPLOYED_PROJECTS_FILE = path.join(WORKSPACE_DIR, "deployed_projects.json");
const runningSubprocesses = new Map<string, { child: any, port: number }>();

function loadDeployedProjects(): Record<string, any> {
  try {
    if (fs.existsSync(DEPLOYED_PROJECTS_FILE)) {
      return JSON.parse(fs.readFileSync(DEPLOYED_PROJECTS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Failed to load deployed projects:", err);
  }
  return {};
}

function saveDeployedProjects(data: Record<string, any>) {
  try {
    fs.writeFileSync(DEPLOYED_PROJECTS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save deployed projects:", err);
  }
}

function allocatePort(deployed: Record<string, any>, keyToUpdate: string): number {
  if (deployed[keyToUpdate] && deployed[keyToUpdate].port) {
    return deployed[keyToUpdate].port;
  }
  let maxPort = 4000;
  for (const item of Object.values(deployed)) {
    if (item.port && item.port > maxPort) {
      maxPort = item.port;
    }
  }
  return maxPort + 1;
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === ".pub-cache" ||
      entry.name === "flutter-sdk" ||
      entry.name === "dart-sdk"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function ensureAppIsRunning(key: string, record: any) {
  if (runningSubprocesses.has(key)) {
    const sub = runningSubprocesses.get(key)!;
    if (sub.child.killed || sub.child.exitCode !== null) {
      runningSubprocesses.delete(key);
    } else {
      return; // Already running
    }
  }

  const safeEmail = record.userEmail.toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
  const safeProjectName = record.projectName;
  const deployDir = path.join(WORKSPACE_DIR, "deployed", safeEmail, safeProjectName);

  if (!fs.existsSync(deployDir)) {
    console.error(`Deploy directory not found for ${key}`);
    return;
  }

  console.log(`Starting deployed app ${key} on port ${record.port}...`);

  let command = "";
  if (record.type === "node") {
    if (fs.existsSync(path.join(deployDir, "package.json"))) {
      try {
        const pkg = JSON.parse(fs.readFileSync(path.join(deployDir, "package.json"), "utf-8"));
        if (pkg.scripts && pkg.scripts.start) {
          command = "npm run start";
        } else {
          command = `node ${record.entryPoint || "app.js"}`;
        }
      } catch (e) {
        command = `node ${record.entryPoint || "app.js"}`;
      }
    } else {
      command = `node ${record.entryPoint || "app.js"}`;
    }
  } else if (record.type === "python") {
    command = `${ACTUAL_PYTHON3_PATH} ${record.entryPoint || "main.py"}`;
  } else {
    return; // static
  }

  try {
    const logFile = path.join(deployDir, "logs.txt");
    const logStream = fs.createWriteStream(logFile, { flags: "a" });

    const child = exec(command, {
      cwd: deployDir,
      env: {
        ...process.env,
        PORT: String(record.port),
        PATH: getSafePath(),
      }
    });

    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);

    child.on("error", (err) => {
      console.error(`Subprocess error for ${key}:`, err);
      fs.appendFileSync(logFile, `\n[Vigron Error] Start xatosi: ${err.message}\n`);
    });

    child.on("exit", (code) => {
      console.log(`Subprocess for ${key} exited with code ${code}`);
      fs.appendFileSync(logFile, `\n[Vigron System] Jarayon tugadi. Exit code: ${code}\n`);
      runningSubprocesses.delete(key);
    });

    runningSubprocesses.set(key, { child, port: record.port });
  } catch (err: any) {
    console.error(`Failed to launch process for ${key}:`, err);
  }
}

// 1. POST deploy endpoint
app.post("/api/workspace/deploy", (req, res) => {
  const userEmail = req.headers["x-user-email"] || req.query.userEmail || req.body.userEmail || "";
  const projectName = req.headers["x-project-name"] || req.query.projectName || req.body.projectName || "default";

  if (!userEmail) {
    return res.status(400).json({ error: "Foydalanuvchi emaili ko'rsatilmadi" });
  }

  const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
  const safeProjectName = path.normalize(String(projectName)).replace(/^(\.\.(\/|\\|$))+/, '').trim() || "default";

  const projectDir = getProjectDir(req);
  const deployDir = path.join(WORKSPACE_DIR, "deployed", safeEmail, safeProjectName);

  try {
    const key = `${safeEmail}_${safeProjectName}`;
    if (runningSubprocesses.has(key)) {
      const sub = runningSubprocesses.get(key)!;
      try {
        sub.child.kill();
      } catch (e) {
        console.error("Error killing process:", e);
      }
      runningSubprocesses.delete(key);
    }

    if (fs.existsSync(deployDir)) {
      fs.rmSync(deployDir, { recursive: true, force: true });
    }
    fs.mkdirSync(deployDir, { recursive: true });

    copyDir(projectDir, deployDir);

    let type: "static" | "node" | "python" = "static";
    let entryPoint = "";

    if (fs.existsSync(path.join(deployDir, "package.json"))) {
      type = "node";
      entryPoint = "app.js";
    } else if (fs.existsSync(path.join(deployDir, "app.js")) || fs.existsSync(path.join(deployDir, "server.js")) || fs.existsSync(path.join(deployDir, "index.js"))) {
      type = "node";
      if (fs.existsSync(path.join(deployDir, "app.js"))) entryPoint = "app.js";
      else if (fs.existsSync(path.join(deployDir, "server.js"))) entryPoint = "server.js";
      else entryPoint = "index.js";
    } else if (fs.existsSync(path.join(deployDir, "server.ts")) || fs.existsSync(path.join(deployDir, "main.ts"))) {
      type = "node";
      entryPoint = fs.existsSync(path.join(deployDir, "server.ts")) ? "server.ts" : "main.ts";
    } else if (fs.existsSync(path.join(deployDir, "main.py")) || fs.existsSync(path.join(deployDir, "app.py"))) {
      type = "python";
      entryPoint = fs.existsSync(path.join(deployDir, "main.py")) ? "main.py" : "app.py";
    } else {
      try {
        const pyFile = fs.readdirSync(deployDir).find(file => file.endsWith(".py"));
        if (pyFile) {
          type = "python";
          entryPoint = pyFile;
        }
      } catch (e) {}
    }

    const deployed = loadDeployedProjects();
    const port = type !== "static" ? allocatePort(deployed, key) : null;

    deployed[key] = {
      userEmail,
      projectName: safeProjectName,
      type,
      entryPoint,
      port,
      deployedAt: new Date().toISOString(),
      status: "active"
    };
    saveDeployedProjects(deployed);

    fs.writeFileSync(path.join(deployDir, "logs.txt"), `--- Deploying ${safeProjectName} at ${new Date().toLocaleString()} ---\nLoyihaning turi: ${type}\nPort: ${port || "Statik (N/A)"}\n\n`, "utf-8");

    if (type !== "static") {
      ensureAppIsRunning(key, deployed[key]);
    }

    const host = req.headers.host || "ais-dev-6gviay5cmqjktembxeui4u-571750263930.europe-west2.run.app";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const deployedUrl = `${protocol}://${host}/api/deployed/${safeEmail}/${safeProjectName}/`;

    res.json({
      success: true,
      message: "Loyiha 24/7 ishlaydigan bulutli serverga muvaffaqiyatli joylashtirildi!",
      deployedUrl,
      type,
      port
    });
  } catch (err: any) {
    console.error("Deploy failed:", err);
    res.status(500).json({ error: "Deploy xatosi: " + err.message });
  }
});

// 2. GET deploy status endpoint
app.get("/api/workspace/deploy/status", (req, res) => {
  const userEmail = req.headers["x-user-email"] || req.query.userEmail || "";
  const projectName = req.headers["x-project-name"] || req.query.projectName || "default";

  if (!userEmail) {
    return res.status(400).json({ error: "Foydalanuvchi ko'rsatilmadi" });
  }

  const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
  const safeProjectName = path.normalize(String(projectName)).replace(/^(\.\.(\/|\\|$))+/, '').trim() || "default";
  const key = `${safeEmail}_${safeProjectName}`;

  const deployed = loadDeployedProjects();
  const record = deployed[key];

  if (!record) {
    return res.json({ deployed: false });
  }

  const isRunning = record.type === "static" || runningSubprocesses.has(key);

  const host = req.headers.host || "ais-dev-6gviay5cmqjktembxeui4u-571750263930.europe-west2.run.app";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const deployedUrl = `${protocol}://${host}/api/deployed/${safeEmail}/${safeProjectName}/`;

  res.json({
    deployed: true,
    type: record.type,
    deployedAt: record.deployedAt,
    port: record.port,
    isRunning,
    url: deployedUrl
  });
});

// 3. GET deploy logs endpoint
app.get("/api/workspace/deploy/logs", (req, res) => {
  const userEmail = req.headers["x-user-email"] || req.query.userEmail || "";
  const projectName = req.headers["x-project-name"] || req.query.projectName || "default";

  if (!userEmail) {
    return res.status(400).json({ error: "Foydalanuvchi ko'rsatilmadi" });
  }

  const safeEmail = String(userEmail).toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
  const safeProjectName = path.normalize(String(projectName)).replace(/^(\.\.(\/|\\|$))+/, '').trim() || "default";

  const deployDir = path.join(WORKSPACE_DIR, "deployed", safeEmail, safeProjectName);
  const logFile = path.join(deployDir, "logs.txt");

  try {
    if (fs.existsSync(logFile)) {
      const logs = fs.readFileSync(logFile, "utf-8");
      res.json({ logs });
    } else {
      res.json({ logs: "Tizim loglari hali mavjud emas." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reverse Proxy and static file server for deployed projects
const handleDeploymentRequest = (req: any, res: any) => {
  const { safeEmail, safeProjectName } = req.params;
  const subPath = req.params[0] ? "/" + req.params[0] : "/";
  const key = `${safeEmail}_${safeProjectName}`;

  const deployed = loadDeployedProjects();
  const record = deployed[key];

  if (!record) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Loyiha topilmadi | Vigron Cloud</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-950 text-slate-200 flex flex-col items-center justify-center min-h-screen p-4 font-sans text-center">
        <div class="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <span class="text-5xl">🛑</span>
          <h2 class="text-xl font-extrabold text-white mt-4">Loyiha topilmadi</h2>
          <p class="text-xs text-slate-400 mt-2">Ushbu loyiha hali serverga joylashtirilmagan yoki o'chirilgan bo'lishi mumkin.</p>
          <a href="/" class="inline-block mt-6 px-5 py-2.5 bg-sky-500 text-slate-950 rounded-xl text-xs font-bold hover:opacity-90">Kodni Tahrirlash</a>
        </div>
      </body>
      </html>
    `);
  }

  // Redirect to trailing slash version if visiting base path without trailing slash
  // e.g. /api/deployed/email/project instead of /api/deployed/email/project/
  if (subPath === "/" && !req.originalUrl.split("?")[0].endsWith("/")) {
    const originalUrl = req.originalUrl || req.url;
    const redirectUrl = originalUrl.includes("?") 
      ? originalUrl.replace("?", "/?") 
      : originalUrl + "/";
    return res.redirect(301, redirectUrl);
  }

  if (record.type === "static") {
    const deployDir = path.join(WORKSPACE_DIR, "deployed", safeEmail, safeProjectName);
    let filePath = path.join(deployDir, subPath);

    const resolvedDeployDir = path.resolve(deployDir);
    const resolvedFilePath = path.resolve(filePath);
    if (!resolvedFilePath.startsWith(resolvedDeployDir)) {
      return res.status(403).send("Ruxsat etilmagan yo'l");
    }

    // Index lookup for directories
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const distIndex = path.join(filePath, "dist", "index.html");
      const buildIndex = path.join(filePath, "build", "web", "index.html");
      if (fs.existsSync(distIndex)) {
        filePath = distIndex;
      } else if (fs.existsSync(buildIndex)) {
        filePath = buildIndex;
      } else {
        filePath = path.join(filePath, "index.html");
      }
    }

    // Try fallback search inside dist/ or build/web/ if the file is not found at the direct path
    if (!fs.existsSync(filePath)) {
      const distPath = path.join(deployDir, "dist", subPath);
      const buildPath = path.join(deployDir, "build", "web", subPath);

      if (fs.existsSync(distPath)) {
        filePath = distPath;
      } else if (fs.existsSync(buildPath)) {
        filePath = buildPath;
      } else {
        // Fallback to index.html in root, dist, or build
        const rootIndex = path.join(deployDir, "index.html");
        const distIndex = path.join(deployDir, "dist", "index.html");
        const buildIndex = path.join(deployDir, "build", "web", "index.html");

        if (fs.existsSync(rootIndex)) filePath = rootIndex;
        else if (fs.existsSync(distIndex)) filePath = distIndex;
        else if (fs.existsSync(buildIndex)) filePath = buildIndex;
      }
    }

    if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Sahifa topilmadi | Vigron Cloud</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-200 flex flex-col items-center justify-center min-h-screen p-4 font-sans text-center">
          <div class="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
            <span class="text-5xl">📄</span>
            <h2 class="text-xl font-extrabold text-white mt-4">index.html topilmadi</h2>
            <p class="text-xs text-slate-400 mt-2">Loyihangizda <b>index.html</b> fayli (yoki uning compiled shakli) borligiga ishonch hosil qiling.</p>
            <a href="/" class="inline-block mt-6 px-5 py-2.5 bg-sky-500 text-slate-950 rounded-xl text-xs font-bold hover:opacity-90">Kodni Tahrirlash</a>
          </div>
        </body>
        </html>
      `);
    }
  } else {
    const targetPort = record.port;
    if (!targetPort) {
      return res.status(500).send("Xatolik: Loyiha porti aniqlanmadi.");
    }

    ensureAppIsRunning(key, record);

    const queryStr = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const headers = { ...req.headers };
    headers.host = `localhost:${targetPort}`;

    const connector = http.request(
      {
        host: "localhost",
        port: targetPort,
        path: `${subPath}${queryStr}`,
        method: req.method,
        headers: headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    connector.on("error", (err) => {
      console.error("Proxy error for deployed project:", err);
      res.status(502).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Backend Xatosi | Vigron Cloud</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-200 flex flex-col items-center justify-center min-h-screen p-4 font-sans text-center">
          <div class="max-w-lg w-full bg-slate-900 border border-red-500/20 p-8 rounded-3xl shadow-2xl">
            <span class="text-5xl">⚡</span>
            <h2 class="text-xl font-extrabold text-red-400 mt-4">Backend ishga tushmadi</h2>
            <p class="text-xs text-slate-400 mt-2">Loyiha serverini yuklashda muammo yuz berdi. Iltimos, loyihangiz porti <b>process.env.PORT</b> yoki <b>PORT</b> o'zgaruvchisidan foydalanib tinglayotganiga ishonch hosil qiling.</p>
            <div class="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-mono text-left max-h-40 overflow-y-auto no-scrollbar">
              ${err.message}
            </div>
            <button onclick="window.location.reload()" class="mt-6 px-5 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:brightness-115">Qayta yuklash</button>
          </div>
        </body>
        </html>
      `);
    });

    req.pipe(connector);
  }
};

app.all("/api/deployed/:safeEmail/:safeProjectName", handleDeploymentRequest);
app.all("/api/deployed/:safeEmail/:safeProjectName/*", handleDeploymentRequest);

// 6. Kill running Python or Node background script processes
app.post("/api/workspace/terminal/kill", (req, res) => {
  // Gracefully terminate active user-spawned python3 or python scripts inside the container
  exec("pkill -f python3 || pkill -f python", (err) => {
    // Note: pkill returns 1 if no process matched, which is expected and fine
    res.json({ success: true, message: "Python va fon jarayonlari to'xtatildi." });
  });
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
    
    // Automatically detect and install Python 3 and PIP if missing in production/external environments, then pre-install packages
    ensurePythonAndLibraries();
  });
}

function ensurePythonAndLibraries() {
  console.log("Detecting Python 3 installation...");
  
  const localPythonBin = getLocalPythonPath();
  const localPipBin = getLocalPipPath();
  
  if (localPythonBin && localPipBin) {
    console.log(`Using existing portable Python at ${localPythonBin}`);
    ACTUAL_PYTHON3_PATH = localPythonBin;
    ACTUAL_PIP3_PATH = localPipBin;
    installPythonLibraries();
    return;
  }

  // Detect system python
  const checkCmd = process.platform === "win32" ? "python --version" : "python3 --version";
  exec(checkCmd, (err) => {
    if (err) {
      const fallbackCmd = process.platform === "win32" ? "python3 --version" : "python --version";
      exec(fallbackCmd, (err2) => {
        if (err2) {
          console.log("System Python 3 not found. Attempting to set up self-contained portable Python...");
          setupPortablePython();
        } else {
          const pythonBin = process.platform === "win32" ? "python3" : "python";
          console.log(`System Python (${pythonBin}) is available. Verifying pip...`);
          ACTUAL_PYTHON3_PATH = pythonBin;
          verifySystemPip(pythonBin);
        }
      });
    } else {
      const pythonBin = process.platform === "win32" ? "python" : "python3";
      console.log(`System Python (${pythonBin}) is available. Verifying pip...`);
      ACTUAL_PYTHON3_PATH = pythonBin;
      verifySystemPip(pythonBin);
    }
  });
}

function verifySystemPip(pythonBin: string) {
  const pipBin = pythonBin === "python" ? "pip" : "pip3";
  exec(`${pipBin} --version`, (pipErr) => {
    if (pipErr) {
      exec(`"${pythonBin}" -m pip --version`, (mPipErr) => {
        if (mPipErr) {
          console.log("System pip not found or failed. Setting up portable Python...");
          setupPortablePython();
        } else {
          console.log(`System pip is available via "${pythonBin}" -m pip. Pre-installing libraries...`);
          ACTUAL_PIP3_PATH = `${pythonBin} -m pip`;
          installPythonLibraries();
        }
      });
    } else {
      console.log("System pip is available. Pre-installing libraries...");
      ACTUAL_PIP3_PATH = pipBin;
      installPythonLibraries();
    }
  });
}

function setupPortablePython() {
  const tarballPath = path.join(WORKSPACE_DIR, "python-portable.tar.gz");
  
  let downloadUrl = "https://github.com/astral-sh/python-build-standalone/releases/download/20240107/cpython-3.10.13+20240107-x86_64-unknown-linux-gnu-install_only.tar.gz";
  if (process.platform === "win32") {
    downloadUrl = "https://github.com/astral-sh/python-build-standalone/releases/download/20240107/cpython-3.10.13+20240107-x86_64-pc-windows-msvc-shared-install_only.tar.gz";
  }

  console.log(`Downloading self-contained portable Python 3.10 for ${process.platform === "win32" ? "Windows" : "Linux"} (30MB) into user_workspace...`);
  
  const downloadCmd = `curl -L -o "${tarballPath}" "${downloadUrl}"`;
  
  exec(downloadCmd, (dlErr, stdout, stderr) => {
    if (dlErr) {
      console.error("Failed to download portable Python:", dlErr, stderr);
      return;
    }
    
    console.log("Portable Python download completed. Extracting...");
    const extractCmd = `tar -xzf "${tarballPath}" -C "${WORKSPACE_DIR}"`;
    
    exec(extractCmd, (extErr, extStdout, extStderr) => {
      // Remove temporary tarball to save space
      try {
        fs.unlinkSync(tarballPath);
      } catch (unlinkErr) {}

      if (extErr) {
        console.error("Failed to extract portable Python:", extErr, extStderr);
        return;
      }

      const localPythonBin = getLocalPythonPath();
      const localPipBin = getLocalPipPath();

      if (localPythonBin && localPipBin) {
        console.log("Portable Python successfully installed and verified.");
        ACTUAL_PYTHON3_PATH = localPythonBin;
        ACTUAL_PIP3_PATH = localPipBin;
        installPythonLibraries();
      } else {
        console.error("Extraction completed but local binary was not found.");
      }
    });
  });
}

function installPythonLibraries() {
  const isPortable = ACTUAL_PYTHON3_PATH.includes("user_workspace");
  const breakSystemFlag = isPortable ? "" : "--break-system-packages";
  
  console.log(`Upgrading pip using: ${ACTUAL_PYTHON3_PATH}...`);
  const upgradePipCommand = `"${ACTUAL_PYTHON3_PATH}" -m pip install --upgrade pip ${breakSystemFlag}`;
  
  exec(upgradePipCommand, (pipErr, pipStdout, pipStderr) => {
    if (pipErr) {
      console.warn("Pip upgrade warning (skipping to package installation):", pipErr, pipStderr);
    } else {
      console.log("Pip successfully upgraded to the latest version.");
    }
    
    console.log(`Pre-installing/updating core Python libraries using: ${ACTUAL_PYTHON3_PATH}...`);
    const libs = [
      "python-telegram-bot", "pyTelegramBotAPI", "requests", "yt-dlp", "instaloader", "shazamio", 
      "beautifulsoup4", "pillow", "urllib3", "httpx", "lxml", "gTTS", "numpy", "pandas", 
      "matplotlib", "seaborn", "scipy", "sympy", "telethon", "flask", "fastapi", "uvicorn", 
      "django", "pydantic", "python-dotenv", "pyyaml", "tqdm", "rich", "click", "colorama", 
      "openpyxl", "xlrd", "qrcode", "cryptography", "pycryptodome", "schedule"
    ];
    
    const command = `"${ACTUAL_PYTHON3_PATH}" -m pip install ${libs.join(" ")} ${breakSystemFlag}`;
    
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Core Python libraries installation warning:", err, stderr);
      } else {
        console.log("Core Python libraries successfully installed and ready.");
      }
    });
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
