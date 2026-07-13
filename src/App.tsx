import React, { useState, useEffect, useRef } from "react";
import {
  FolderTree,
  FileCode,
  Terminal as TerminalIcon,
  Play,
  Sparkles,
  Eye,
  Plus,
  Save,
  Trash2,
  RefreshCw,
  Info,
  Menu,
  X,
  Code2,
  Share2,
  BookOpen,
  Keyboard,
  Settings,
  ChevronRight,
  Download,
  Layers,
  User,
  LogIn,
  LogOut,
  Key,
  ShieldCheck,
  BarChart2,
  Users,
  Search,
  Cloud,
  ExternalLink,
  Activity,
  FileText,
  Smartphone,
  QrCode,
  Copy,
  Check
} from "lucide-react";
import { WorkspaceItem, FileTab, TerminalLine, ChatMessage } from "./types";
import { FileTree } from "./components/FileTree";
import { Terminal } from "./components/Terminal";
import { AIChat } from "./components/AIChat";
import { LanguageLogo } from "./components/LanguageLogo";
import { getSuggestions, AutocompleteSuggestion } from "./lib/autocomplete";
import { highlightCode } from "./lib/highlighter";
import { db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function App() {
  const getFlattenedFiles = (items: WorkspaceItem[]): { name: string; path: string; isFolder: boolean }[] => {
    let result: { name: string; path: string; isFolder: boolean }[] = [];
    const traverse = (list: WorkspaceItem[]) => {
      for (const item of list) {
        result.push({ name: item.name, path: item.path, isFolder: item.type === "directory" });
        if (item.children) {
          traverse(item.children);
        }
      }
    };
    traverse(items);
    return result;
  };

  // Mobile UI Tabs / Panel state
  const [activeMobileTab, setActiveMobileTab] = useState<"files" | "editor" | "terminal" | "preview" | "ai">("editor");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Workspace file state
  const [files, setFiles] = useState<WorkspaceItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Editor State
  const [openTabs, setOpenTabs] = useState<FileTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string>("");
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Terminal State
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSendingAI, setIsSendingAI] = useState(false);

  // Status and Alerts
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Preview State
  const [previewUrl, setPreviewUrl] = useState<string>("/api/workspace/preview?path=index.html");
  const [previewKey, setPreviewKey] = useState(0);

  // Settings
  const [fontSize, setFontSize] = useState<number>(14);

  // Custom modal dialog states for iframe safe interactions
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalType, setCreateModalType] = useState<"file" | "folder">("file");
  const [createModalParentDir, setCreateModalParentDir] = useState("");
  const [createModalName, setCreateModalName] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetPath, setDeleteTargetPath] = useState("");

  const [dirtyTabToClose, setDirtyTabToClose] = useState<string | null>(null);

  // Project Switcher & Projects list states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("react_tsx");
  const [isResettingProject, setIsResettingProject] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProject, setCurrentProject] = useState<string>(() => {
    try {
      const query = new URLSearchParams(window.location.search);
      const urlProject = query.get("projectName");
      if (urlProject && urlProject.trim()) {
        const proj = urlProject.trim();
        localStorage.setItem("vigron_current_project", proj);
        return proj;
      }
    } catch (e) {}
    return localStorage.getItem("vigron_current_project") || "default";
  });
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectTemplate, setNewProjectTemplate] = useState("blank");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Authentication states
  const [user, setUser] = useState<{ email: string; name: string; avatar: string; plan: string } | null>(() => {
    try {
      // Check query string first for account syncing
      const query = new URLSearchParams(window.location.search);
      const urlEmail = query.get("userEmail");
      if (urlEmail && urlEmail.trim()) {
        const email = urlEmail.trim();
        const randId = email.startsWith("guest_") ? email.split("_")[1]?.split("@")[0] || "999" : "999";
        const name = email.startsWith("guest_") ? `Guest #${randId}` : email.split("@")[0];
        const loadedUser = {
          email,
          name,
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${email.replace(/[^a-zA-Z0-9]/g, "")}`,
          plan: "FREE"
        };
        localStorage.setItem("vigron_user", JSON.stringify(loadedUser));
        return loadedUser;
      }

      const saved = localStorage.getItem("vigron_user");
      if (saved && saved !== "undefined") {
        return JSON.parse(saved);
      }
      
      // Auto-generate guest user so every phone/device gets its own isolated personal account and workspace
      const randId = Math.floor(100000 + Math.random() * 900000);
      const guestUser = {
        email: `guest_${randId}@vigron.com`,
        name: `Guest #${randId}`,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=guest_${randId}`,
        plan: "FREE"
      };
      localStorage.setItem("vigron_user", JSON.stringify(guestUser));
      return guestUser;
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
    }
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  // Profile & Theme States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editorTheme, setEditorTheme] = useState<string>(() => localStorage.getItem("vigron_editor_theme") || "vscode");
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileAvatarSeed, setProfileAvatarSeed] = useState("");
  const [profileAvatarStyle, setProfileAvatarStyle] = useState<string>("shapes");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"explorer" | "search" | "templates">("explorer");
  const [fileSearchQuery, setFileSearchQuery] = useState("");

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);

  // Cloud Deployment States
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "success" | "error">("idle");
  const [deployLogs, setDeployLogs] = useState<string>("Tizim loglari yuklanmoqda...");
  const [deployedInfo, setDeployedInfo] = useState<{
    deployed: boolean;
    type?: string;
    deployedAt?: string;
    port?: number;
    isRunning?: boolean;
    url?: string;
  } | null>(null);
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [activeLine, setActiveLine] = useState(1);
  const isTabsLoadedRef = useRef(false);

  // Cleanup URL query params after load to keep it neat
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.has("userEmail") || query.has("projectName")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Save open tabs to localStorage when they change
  useEffect(() => {
    if (isTabsLoadedRef.current && user !== undefined) {
      const emailKey = user?.email || "anonymous";
      const savedTabsKey = `vigron_open_tabs_${emailKey}_${currentProject}`;
      localStorage.setItem(savedTabsKey, JSON.stringify(openTabs));
    }
  }, [openTabs, user, currentProject]);

  // Save active tab path to localStorage when it changes
  useEffect(() => {
    if (isTabsLoadedRef.current && user !== undefined) {
      const emailKey = user?.email || "anonymous";
      const savedActiveTabKey = `vigron_active_tab_path_${emailKey}_${currentProject}`;
      if (activeTabPath) {
        localStorage.setItem(savedActiveTabKey, activeTabPath);
      } else {
        localStorage.removeItem(savedActiveTabKey);
      }
    }
  }, [activeTabPath, user, currentProject]);

  // Sync preview URL when project, user, or active tab changes
  useEffect(() => {
    const email = user ? user.email : "";
    setPreviewUrl(`/api/workspace/preview?path=${encodeURIComponent(activeTabPath || "index.html")}&userEmail=${encodeURIComponent(email)}&projectName=${encodeURIComponent(currentProject)}&key=${Date.now()}`);
  }, [activeTabPath, currentProject, user]);

  // Debounced Autosave Effect: Automatically save file content to workspace on the server 1.2s after user stops typing
  useEffect(() => {
    if (!activeTabPath || !editorContent) return;

    // Only autosave if the tab is dirty
    const activeTab = openTabs.find((t) => t.path === activeTabPath);
    if (!activeTab || !activeTab.isDirty) return;

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch("/api/workspace/file", {
          method: "POST",
          body: JSON.stringify({ path: activeTabPath, content: editorContent }),
        });
        if (res.ok) {
          setOpenTabs((prev) =>
            prev.map((tab) => (tab.path === activeTabPath ? { ...tab, isDirty: false } : tab))
          );
          fetchFiles();
          const ext = activeTabPath.split(".").pop()?.toLowerCase();
          if (ext === "html" || ext === "css" || ext === "js") {
            refreshPreview();
          }
        }
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [editorContent, activeTabPath, openTabs]);

  const handleScroll = () => {
    if (textareaRef.current) {
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  }, [editorContent, activeTabPath]);

  // --- Core API fetch wrapper to automatically attach tenant context headers ---
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...(options.headers || {}),
      "Content-Type": options.body instanceof FormData ? undefined : "application/json",
      "x-user-email": user ? user.email : "",
      "x-project-name": currentProject
    };
    
    // Remove Content-Type if uploading FormData to let the browser set boundary
    if (options.body instanceof FormData) {
      delete (headers as any)["Content-Type"];
    }

    return fetch(url, { ...options, headers });
  };

  enum ChatOperationType {
    GET = "get",
    WRITE = "write",
  }

  const handleChatFirestoreError = (error: unknown, operationType: ChatOperationType, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operationType,
      path,
      userEmail: user?.email,
    };
    console.error("Firestore Chat Error: ", JSON.stringify(errInfo));
  };

  const saveChatHistory = async (messages: ChatMessage[]) => {
    try {
      if (user && user.email) {
        const historyId = `${user.email.replace(/[^a-zA-Z0-9_.-]/g, "_")}_${currentProject}`;
        const localKey = `vigron_chat_history_${user.email}_${currentProject}`;
        localStorage.setItem(localKey, JSON.stringify(messages));

        try {
          const docRef = doc(db, "chat_histories", historyId);
          await setDoc(docRef, {
            userEmail: user.email,
            projectName: currentProject,
            messages: messages,
            updatedAt: new Date().toISOString()
          });
        } catch (error) {
          handleChatFirestoreError(error, ChatOperationType.WRITE, `chat_histories/${historyId}`);
        }
      } else {
        const localKey = `vigron_chat_history_anonymous_${currentProject}`;
        localStorage.setItem(localKey, JSON.stringify(messages));
      }
    } catch (err) {
      console.error("Local save error:", err);
    }
  };

  // Load chat history on mount or when user/project changes
  useEffect(() => {
    const loadChat = async () => {
      try {
        if (user && user.email) {
          const historyId = `${user.email.replace(/[^a-zA-Z0-9_.-]/g, "_")}_${currentProject}`;
          const localKey = `vigron_chat_history_${user.email}_${currentProject}`;
          
          try {
            const docRef = doc(db, "chat_histories", historyId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              setChatMessages(docSnap.data().messages || []);
              // Sync to local storage for offline fallback
              localStorage.setItem(localKey, JSON.stringify(docSnap.data().messages || []));
            } else {
              const savedLocal = localStorage.getItem(localKey);
              if (savedLocal) {
                const parsed = JSON.parse(savedLocal);
                setChatMessages(parsed);
                // Try saving to remote since it is not there
                await setDoc(docRef, {
                  userEmail: user.email,
                  projectName: currentProject,
                  messages: parsed,
                  updatedAt: new Date().toISOString()
                });
              } else {
                setChatMessages([]);
              }
            }
          } catch (firestoreErr) {
            handleChatFirestoreError(firestoreErr, ChatOperationType.GET, `chat_histories/${historyId}`);
            // Fallback to local storage
            const savedLocal = localStorage.getItem(localKey);
            if (savedLocal) {
              setChatMessages(JSON.parse(savedLocal));
            } else {
              setChatMessages([]);
            }
          }
        } else {
          const localKey = `vigron_chat_history_anonymous_${currentProject}`;
          const savedLocal = localStorage.getItem(localKey);
          if (savedLocal) {
            setChatMessages(JSON.parse(savedLocal));
          } else {
            setChatMessages([]);
          }
        }
      } catch (err) {
        console.error("Global chat load error:", err);
        setChatMessages([]);
      }
    };
    loadChat();
  }, [user, currentProject]);

  const showStatus = (text: string, type: "success" | "error" | "info" = "info") => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  // Fetch projects list
  const fetchProjects = async () => {
    try {
      const res = await apiFetch("/api/workspace/projects");
      const data = await res.json();
      if (res.ok && data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  // Cloud Deployment Helpers
  const fetchDeployStatus = async () => {
    try {
      const email = user ? user.email : "";
      const res = await fetch(`/api/workspace/deploy/status?projectName=${encodeURIComponent(currentProject)}&userEmail=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.deployed) {
        // Build robust absolute URL using the current browser's host to prevent localhost mismatch issues
        let finalUrl = data.url;
        if (finalUrl) {
          if (finalUrl.startsWith("http")) {
            const parsed = new URL(finalUrl);
            if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
              finalUrl = window.location.origin + parsed.pathname + parsed.search;
            }
          } else {
            finalUrl = window.location.origin + (finalUrl.startsWith("/") ? finalUrl : "/" + finalUrl);
          }
        } else {
          const safeEmail = email.toLowerCase().replace(/[^a-z0-9_@.-]/g, "_");
          finalUrl = `${window.location.origin}/api/deployed/${safeEmail}/${currentProject}/`;
        }
        setDeployedInfo({
          ...data,
          url: finalUrl
        });
      } else {
        setDeployedInfo(null);
      }
    } catch (err) {
      console.error("Failed to fetch deploy status:", err);
    }
  };

  const handleCopySyncLink = () => {
    const shareUrl = `${window.location.origin}/?userEmail=${encodeURIComponent(user?.email || "")}&projectName=${encodeURIComponent(currentProject)}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(err => {
      console.error("Link copy failed:", err);
    });
  };

  const handleDeploy = async () => {
    setDeployStatus("deploying");
    try {
      const email = user ? user.email : "";
      const res = await fetch(`/api/workspace/deploy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email,
          "x-project-name": currentProject,
        },
        body: JSON.stringify({
          userEmail: email,
          projectName: currentProject,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDeployStatus("success");
        fetchDeployStatus();
        fetchDeployLogs();
      } else {
        setDeployStatus("error");
      }
    } catch (err) {
      setDeployStatus("error");
    }
  };

  const fetchDeployLogs = async () => {
    setIsFetchingLogs(true);
    try {
      const email = user ? user.email : "";
      const res = await fetch(`/api/workspace/deploy/logs?projectName=${encodeURIComponent(currentProject)}&userEmail=${encodeURIComponent(email)}`);
      const data = await res.json();
      setDeployLogs(data.logs || "Loglar topilmadi.");
    } catch (err) {
      setDeployLogs("Loglarni olishda xatolik yuz berdi.");
    } finally {
      setIsFetchingLogs(false);
    }
  };

  // Poll deployment logs & status when modal is open
  useEffect(() => {
    let interval: any;
    if (isDeployModalOpen) {
      fetchDeployStatus();
      fetchDeployLogs();
      interval = setInterval(() => {
        fetchDeployLogs();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isDeployModalOpen, currentProject, user]);

  const fetchFiles = async (projName = currentProject) => {
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/workspace/files?projectName=${encodeURIComponent(projName)}&userEmail=${encodeURIComponent(user ? user.email : "")}`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (err: any) {
      showStatus("Fayllarni yuklashda xatolik yuz berdi", "error");
    } finally {
      setLoadingFiles(false);
    }
  };

  // Load files list on mount, project change, or user change, and restore open tabs / active tab
  useEffect(() => {
    isTabsLoadedRef.current = false; // Reset loaded flag while changing context
    
    const emailKey = user?.email || "anonymous";
    const dirKey = `vigron_terminal_dir_${emailKey}_${currentProject}`;
    const historyKey = `vigron_terminal_history_${emailKey}_${currentProject}`;

    const savedDir = localStorage.getItem(dirKey) || "";
    setCurrentDir(savedDir);

    const savedHistoryRaw = localStorage.getItem(historyKey);
    let loadedHistory: TerminalLine[] = [];
    let shouldAutoLs = false;

    if (savedHistoryRaw) {
      try {
        loadedHistory = JSON.parse(savedHistoryRaw);
      } catch (e) {
        console.error("Failed to parse saved terminal history:", e);
      }
    }

    if (loadedHistory.length === 0) {
      loadedHistory = [
        {
          id: "switch-" + Date.now(),
          type: "stdout",
          text: `📂 "${currentProject}" loyihasiga o'tildi.\n💻 Terminal ishga tushdi.\n`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
      ];
      shouldAutoLs = true;
    }

    setTerminalHistory(loadedHistory);

    fetchProjects();

    const savedTabsKey = `vigron_open_tabs_${emailKey}_${currentProject}`;
    const savedActiveTabKey = `vigron_active_tab_path_${emailKey}_${currentProject}`;

    const savedTabsRaw = localStorage.getItem(savedTabsKey);
    const savedActiveTab = localStorage.getItem(savedActiveTabKey);

    const initContext = async () => {
      // Fetch files first
      let filesData: WorkspaceItem[] = [];
      try {
        const res = await fetch(`/api/workspace/files?projectName=${encodeURIComponent(currentProject)}&userEmail=${encodeURIComponent(user ? user.email : "")}`);
        const data = await res.json();
        if (data.files) {
          setFiles(data.files);
          filesData = data.files;
        }
      } catch (err) {
        console.error("Failed to fetch initial files list", err);
      }

      // Automatically trigger "ls" in terminal after context switch if no saved history was restored
      if (shouldAutoLs) {
        setTimeout(() => {
          runTerminalCommand("ls", savedDir);
        }, 500);
      }

      // If we have saved tabs, restore them
      if (savedTabsRaw) {
        try {
          const parsedTabs = JSON.parse(savedTabsRaw) as FileTab[];
          if (parsedTabs.length > 0) {
            setOpenTabs(parsedTabs);
            if (savedActiveTab && parsedTabs.some((t) => t.path === savedActiveTab)) {
              setActiveTabPath(savedActiveTab);
              const activeTab = parsedTabs.find((t) => t.path === savedActiveTab);
              setEditorContent(activeTab ? activeTab.content : "");
            } else {
              setActiveTabPath(parsedTabs[0].path);
              setEditorContent(parsedTabs[0].content);
            }
            isTabsLoadedRef.current = true;
            return;
          }
        } catch (e) {
          console.error("Failed to restore open tabs from localStorage:", e);
        }
      }

      // Default fallback: scan directory structure and auto-open primary template code files!
      if (filesData.length > 0) {
        const getAllFiles = (items: WorkspaceItem[]): string[] => {
          let paths: string[] = [];
          for (const item of items) {
            if (item.type === "file") {
              paths.push(item.path);
            } else if (item.children) {
              paths.push(...getAllFiles(item.children));
            }
          }
          return paths;
        };

        const allFiles = getAllFiles(filesData);
        const preferred = [
          "src/App.tsx",
          "lib/main.dart",
          "main.py",
          "app.js",
          "index.html",
          "README.md"
        ];

        let fileToOpen = preferred.find(p => allFiles.includes(p));
        if (!fileToOpen && allFiles.length > 0) {
          // Fallback to first non-keep file if available
          fileToOpen = allFiles.find(f => !f.endsWith(".keep")) || allFiles[0];
        }

        if (fileToOpen) {
          await openFile(fileToOpen);
          isTabsLoadedRef.current = true;
          return;
        }
      }

      // Ultimate fallback: open README.md or reset
      setOpenTabs([]);
      setActiveTabPath("");
      setEditorContent("");
      await openFile("README.md");
      isTabsLoadedRef.current = true;
    };

    initContext();
  }, [user, currentProject]);

  const openFile = async (path: string) => {
    // Check if file is already open
    const existingTab = openTabs.find((tab) => tab.path === path);
    if (existingTab) {
      setActiveTabPath(path);
      setEditorContent(existingTab.content);
      setActiveMobileTab("editor");
      return;
    }

    try {
      const res = await apiFetch(`/api/workspace/file?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (res.ok) {
        const newTab: FileTab = {
          path,
          name: path.split("/").pop() || path,
          content: data.content,
          isDirty: false,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabPath(path);
        setEditorContent(data.content);
        setActiveMobileTab("editor");
      } else {
        // Create tab on failure or simply ignore
        if (path === "README.md") {
          // Fallback if README doesn't exist yet
          setEditorContent("# Vigron Code Studio\n\nYozishni boshlang...");
        } else {
          showStatus(data.error || "Faylni ochishda xatolik", "error");
        }
      }
    } catch (err: any) {
      showStatus("Fayl tarkibini olishda xatolik", "error");
    }
  };

  const closeTab = (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tabIndex = openTabs.findIndex((tab) => tab.path === path);
    if (tabIndex === -1) return;

    const tabToClose = openTabs[tabIndex];
    if (tabToClose.isDirty && dirtyTabToClose !== path) {
      setDirtyTabToClose(path);
      return;
    }

    const nextTabs = openTabs.filter((tab) => tab.path !== path);
    setOpenTabs(nextTabs);
    setDirtyTabToClose(null);

    if (activeTabPath === path) {
      if (nextTabs.length > 0) {
        const nextActive = nextTabs[Math.max(0, tabIndex - 1)];
        setActiveTabPath(nextActive.path);
        setEditorContent(nextActive.content);
      } else {
        setActiveTabPath("");
        setEditorContent("");
      }
    }
  };

  const handleCursorActivity = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const val = textarea.value;
    const selectionStart = textarea.selectionStart;
    const linesBefore = val.substring(0, selectionStart).split("\n");
    setActiveLine(linesBefore.length);
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorContent(val);
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: val, isDirty: true } : tab))
    );

    // Update active line
    const selectionStart = e.target.selectionStart;
    const linesBefore = val.substring(0, selectionStart).split("\n");
    setActiveLine(linesBefore.length);

    // Autocomplete triggers
    const textarea = e.target;
    const start = textarea.selectionStart;
    const textBeforeCursor = val.substring(0, start);
    const match = textBeforeCursor.match(/[\w\-.]*$/);
    const lastWord = match ? match[0] : "";
    const extension = activeTabPath ? activeTabPath.split(".").pop() || "" : "";

    if (lastWord.length >= 1) {
      const filtered = getSuggestions(lastWord, extension);
      setSuggestions(filtered);
      setIsAutocompleteOpen(filtered.length > 0);
    } else {
      setIsAutocompleteOpen(false);
      setSuggestions([]);
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 1. Tab key (Indentation / Outdentation)
    if (e.key === "Tab") {
      e.preventDefault();
      
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      const isMultiLine = value.substring(selectionStart, selectionEnd).includes("\n");

      if (isMultiLine) {
        // Multi-line indent/outdent
        const lines = value.split("\n");
        let charOffset = 0;
        let startLineIdx = value.substring(0, selectionStart).split("\n").length - 1;
        let endLineIdx = value.substring(0, selectionEnd).split("\n").length - 1;

        const updatedLines = lines.map((line, idx) => {
          if (idx >= startLineIdx && idx <= endLineIdx) {
            if (e.shiftKey) {
              // Outdent: remove up to 2 spaces
              if (line.startsWith("  ")) {
                charOffset -= 2;
                return line.substring(2);
              } else if (line.startsWith(" ")) {
                charOffset -= 1;
                return line.substring(1);
              }
            } else {
              // Indent: add 2 spaces
              charOffset += 2;
              return "  " + line;
            }
          }
          return line;
        });

        const newValue = updatedLines.join("\n");
        setEditorContent(newValue);
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
        );

        // Maintain selection
        setTimeout(() => {
          textarea.setSelectionRange(
            Math.max(0, selectionStart + (e.shiftKey ? -2 : 2)),
            Math.max(0, selectionEnd + charOffset)
          );
        }, 0);
      } else {
        // Single line tab
        if (e.shiftKey) {
          // Single line outdent: remove up to 2 spaces at start of current line
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const currentLine = value.substring(lineStart, start);
          if (currentLine.startsWith("  ")) {
            const newValue = value.substring(0, lineStart) + currentLine.substring(2) + value.substring(start);
            setEditorContent(newValue);
            setOpenTabs((prev) =>
              prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
            );
            setTimeout(() => {
              textarea.setSelectionRange(start - 2, start - 2);
            }, 0);
          } else if (currentLine.startsWith(" ")) {
            const newValue = value.substring(0, lineStart) + currentLine.substring(1) + value.substring(start);
            setEditorContent(newValue);
            setOpenTabs((prev) =>
              prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
            );
            setTimeout(() => {
              textarea.setSelectionRange(start - 1, start - 1);
            }, 0);
          }
        } else {
          // Normal single tab: insert 2 spaces
          const newValue = value.substring(0, start) + "  " + value.substring(end);
          setEditorContent(newValue);
          setOpenTabs((prev) =>
            prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
          );
          setTimeout(() => {
            textarea.setSelectionRange(start + 2, start + 2);
          }, 0);
        }
      }
      return;
    }

    // 2. Enter key (Smart Auto-Indentation)
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Get current line
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      
      // Check current line indentation
      const indentMatch = currentLine.match(/^(\s*)/);
      const indentation = indentMatch ? indentMatch[1] : "";
      
      // Detect block openers (Python colon, brackets/braces)
      const isBlockOpen = currentLine.trim().endsWith(":") || 
                          currentLine.trim().endsWith("{") || 
                          currentLine.trim().endsWith("[") || 
                          currentLine.trim().endsWith("(");
                          
      const extraIndent = isBlockOpen ? "  " : "";
      
      // Enter pressed between matching braces
      const nextChar = value.charAt(start);
      const isBraceSplit = (currentLine.trim().endsWith("{") && nextChar === "}") ||
                           (currentLine.trim().endsWith("[") && nextChar === "]") ||
                           (currentLine.trim().endsWith("(") && nextChar === ")");
      
      let newValue = "";
      let newCursorPos = 0;
      
      if (isBraceSplit) {
        newValue = value.substring(0, start) + "\n" + indentation + "  \n" + indentation + value.substring(end);
        newCursorPos = start + 1 + indentation.length + 2;
      } else {
        newValue = value.substring(0, start) + "\n" + indentation + extraIndent + value.substring(end);
        newCursorPos = start + 1 + indentation.length + extraIndent.length;
      }
      
      setEditorContent(newValue);
      setOpenTabs((prev) =>
        prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
      );
      
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        // Force scroll alignment
        if (highlightRef.current && lineNumbersRef.current) {
          highlightRef.current.scrollTop = textarea.scrollTop;
          lineNumbersRef.current.scrollTop = textarea.scrollTop;
        }
      }, 0);
      return;
    }

    // 3. Auto-closing pairs
    const matchingPairs: Record<string, string> = {
      "{": "}",
      "[": "]",
      "(": ")",
      '"': '"',
      "'": "'",
      "`": "`",
    };

    if (matchingPairs[e.key] !== undefined) {
      e.preventDefault();
      const openChar = e.key;
      const closeChar = matchingPairs[openChar];
      const nextChar = value.charAt(start);

      // Selected text wrapper
      if (start !== end) {
        const selectedText = value.substring(start, end);
        const newValue = value.substring(0, start) + openChar + selectedText + closeChar + value.substring(end);
        setEditorContent(newValue);
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
        );
        setTimeout(() => {
          textarea.setSelectionRange(start + 1, end + 1);
        }, 0);
        return;
      }

      // Skip over closing quote/character
      if (openChar === closeChar && nextChar === closeChar) {
        textarea.setSelectionRange(start + 1, start + 1);
        return;
      }

      // Insert matching pair
      const newValue = value.substring(0, start) + openChar + closeChar + value.substring(end);
      setEditorContent(newValue);
      setOpenTabs((prev) =>
        prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
      );
      setTimeout(() => {
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
      return;
    }

    // Over-type closing bracket if typed
    const closingChars = ["}", "]", ")"];
    if (closingChars.includes(e.key)) {
      const nextChar = value.charAt(start);
      if (nextChar === e.key) {
        e.preventDefault();
        textarea.setSelectionRange(start + 1, start + 1);
        return;
      }
    }

    // 4. Backspace deletions of brackets pairs
    if (e.key === "Backspace" && start === end && start > 0) {
      const prevChar = value.charAt(start - 1);
      const nextChar = value.charAt(start);
      const pairs: Record<string, string> = {
        "(": ")",
        "[": "]",
        "{": "}",
        '"': '"',
        "'": "'",
        "`": "`",
      };

      if (pairs[prevChar] === nextChar) {
        e.preventDefault();
        const newValue = value.substring(0, start - 1) + value.substring(start + 1);
        setEditorContent(newValue);
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
        );
        setTimeout(() => {
          textarea.setSelectionRange(start - 1, start - 1);
        }, 0);
        return;
      }
    }
  };

  const applySuggestion = (suggestion: AutocompleteSuggestion) => {
    const textarea = document.getElementById("code-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const value = textarea.value;
    const textBeforeCursor = value.substring(0, start);

    const match = textBeforeCursor.match(/[\w\-.]*$/);
    const lastWord = match ? match[0] : "";

    const prefix = value.substring(0, start - lastWord.length);
    const suffix = value.substring(start);

    const insertText = suggestion.insertText;
    const newValue = prefix + insertText + suffix;

    setEditorContent(newValue);
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
    );

    setIsAutocompleteOpen(false);
    setSuggestions([]);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start - lastWord.length + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const saveCurrentFile = async () => {
    if (!activeTabPath) return;
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/workspace/file", {
        method: "POST",
        body: JSON.stringify({ path: activeTabPath, content: editorContent }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus(`Muvaffaqiyatli saqlandi: user_workspace/${activeTabPath}`, "success");
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.path === activeTabPath ? { ...tab, isDirty: false } : tab))
        );
        fetchFiles();
        // Update live preview if active tab is HTML or CSS
        const ext = activeTabPath.split(".").pop();
        if (ext === "html" || ext === "css" || ext === "js") {
          refreshPreview();
        }
      } else {
        showStatus(data.error || "Faylni saqlashda xatolik", "error");
      }
    } catch (err: any) {
      showStatus("Server bilan aloqada xatolik", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetProjectTemplate = async (templateName: string) => {
    setIsResettingProject(true);
    try {
      const res = await apiFetch("/api/workspace/project/reset", {
        method: "POST",
        body: JSON.stringify({ template: templateName }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus("Loyiha muvaffaqiyatli yangi andozaga o'zgartirildi!", "success");
        setOpenTabs([]);
        setActiveTabPath("");
        setEditorContent("");
        setIsProjectModalOpen(false);
        await fetchFiles();
        
        // Auto-open primary entry file based on template
        if (templateName === "react_tsx") {
          openFile("src/App.tsx");
        } else if (templateName === "flutter_sim") {
          openFile("lib/main.dart");
        } else if (templateName === "python_script") {
          openFile("main.py");
        } else if (templateName === "node_js") {
          openFile("app.js");
        } else {
          openFile("README.md");
        }
      } else {
        showStatus(data.error || "Loyiha andozasini o'rnatishda xatolik", "error");
      }
    } catch (err) {
      showStatus("Loyiha andozasini o'rnatishda xatolik", "error");
    } finally {
      setIsResettingProject(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      showStatus("Iltimos, barcha maydonlarni to'ldiring!", "error");
      return;
    }
    
    if (isSignUp && !authName) {
      showStatus("Iltimos, ismingizni kiriting!", "error");
      return;
    }

    try {
      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
      const payload = isSignUp 
        ? { email: authEmail, password: authPassword, name: authName }
        : { email: authEmail, password: authPassword };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        localStorage.setItem("vigron_user", JSON.stringify(data.user));
        setUser(data.user);
        setIsAuthModalOpen(false);
        showStatus(`Xush kelibsiz, ${data.user.name}!`, "success");
        
        // Clean inputs
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
        
        // Reload projects & files lists
        fetchProjects();
        fetchFiles(currentProject);
      } else {
        showStatus(data.error || "Tizimga kirishda xatolik yuz berdi", "error");
      }
    } catch (err: any) {
      showStatus("Tizim bilan bog'lanishda xatolik yuz berdi", "error");
    }
  };

  const handleGoogleLoginClick = async () => {
    showStatus("Google tizimi yuklanmoqda...", "info");
    try {
      const { auth, googleProvider, signInWithPopup } = await import("./lib/firebase");
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      
      if (fbUser && fbUser.email) {
        showStatus("Google orqali muvaffaqiyatli kirildi!", "success");
        
        const res = await fetch("/api/auth/google-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: fbUser.email, 
            name: fbUser.displayName || fbUser.email.split("@")[0],
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.email)}`
          }),
        });
        
        const data = await res.json();
        if (res.ok && data.user) {
          localStorage.setItem("vigron_user", JSON.stringify(data.user));
          setUser(data.user);
          setIsAuthModalOpen(false);
          showStatus(`Google orqali kirdingiz: ${data.user.name}!`, "success");
          
          fetchProjects();
          fetchFiles(currentProject);
        } else {
          showStatus(data.error || "Google orqali kirishda xatolik yuz berdi", "error");
        }
      }
    } catch (err: any) {
      console.warn("Firebase sign-in error (possible iframe restrictions):", err);
      showStatus("Iframe cheklovlari tufayli Google pop-up ishlamadi. Muqobil usulda kirish taklif etiladi...", "info");
      
      const inputEmail = prompt("Google (Gmail) pochtangizni kiriting:", "news45608@gmail.com");
      if (!inputEmail) return;
      
      if (!inputEmail.includes("@") || !inputEmail.includes(".")) {
        showStatus("Yaroqsiz email manzili kiritildi", "error");
        return;
      }
      
      try {
        const res = await fetch("/api/auth/google-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inputEmail.trim(), name: inputEmail.split("@")[0] }),
        });
        const data = await res.json();
        if (res.ok && data.user) {
          localStorage.setItem("vigron_user", JSON.stringify(data.user));
          setUser(data.user);
          setIsAuthModalOpen(false);
          showStatus(`Google orqali kirdingiz: ${data.user.name}!`, "success");
          
          fetchProjects();
          fetchFiles(currentProject);
        } else {
          showStatus(data.error || "Google orqali kirishda xatolik yuz berdi", "error");
        }
      } catch (innerErr) {
        showStatus("Tizim bilan bog'lanishda xatolik yuz berdi", "error");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vigron_user");
    // Generate a new guest account on logout so they stay in their own isolated workspace
    const randId = Math.floor(100000 + Math.random() * 900000);
    const guestUser = {
      email: `guest_${randId}@vigron.com`,
      name: `Guest #${randId}`,
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=guest_${randId}`,
      plan: "FREE"
    };
    localStorage.setItem("vigron_user", JSON.stringify(guestUser));
    setUser(guestUser);
    showStatus("Tizimdan muvaffaqiyatli chiqdingiz", "info");
  };

  const getFileTemplate = (filename: string): string => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "dart":
        return `void main() {
  var country = "O'zbekiston";
  print("Salom, \${country}!");
  
  var x = 10;
  var y = 20;
  print("Arifmetika: x + y = \${x + y}");
}
`;
      case "tsx":
        return `import React, { useState } from "react";

export default function App() {
  const [clicks, setClicks] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl max-w-md text-center">
        <span className="text-5xl">⚛️</span>
        <h1 className="text-2xl font-black mt-4 text-emerald-400">Salom, React & TSX!</h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">
          Bu siz yaratgan yangi .tsx komponentidir. Tailwind CSS hamda TypeScript yordamida interfeyslarni bemalol quring!
        </p>
        <div className="mt-6">
          <p className="text-xs text-slate-500">Siz tugmani shuncha marta bosdingiz:</p>
          <p className="text-3xl font-extrabold text-white mt-1">{clicks}</p>
        </div>
        <button
          onClick={() => setClicks(clicks + 1)}
          className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold rounded-xl transition"
        >
          Kattalashtirish
        </button>
      </div>
    </div>
  );
}
`;
      case "jsx":
        return `import React from "react";

export default function App() {
  return (
    <div className="p-8 bg-slate-900 rounded-xl border border-slate-800 text-center text-white">
      <h1 className="text-xl font-bold text-amber-400">Salom, JSX!</h1>
      <p className="text-sm text-slate-400 mt-2">Ushbu komponent JSX formatida yaratildi.</p>
    </div>
  );
}
`;
      case "py":
        return `# Python 3 Dasturi
def salom(nom):
    print(f"Salom, {nom}!")
    print("Dasturlash va Python bilan ishlash juda ajoyib!")

if __name__ == "__main__":
    salom("Dasturchi")
`;
      case "js":
        return `// JavaScript Dasturi
function salom(nom) {
  console.log("Salom, " + nom + "!");
  console.log("Node.js muhitida kod muvaffaqiyatli ishlamoqda.");
}

salom("Vigron Code");
`;
      default:
        return "";
    }
  };

  const createFile = async (parentDir: string, name: string, isFolder: boolean) => {
    const sanitizedName = name.trim();
    if (!sanitizedName) {
      showStatus("Nomi bo'sh bo'lishi mumkin emas", "error");
      return;
    }
    const fullPath = parentDir ? `${parentDir}/${sanitizedName}` : sanitizedName;
    try {
      if (isFolder) {
        // Create folder by creating a placeholder file or sending empty payload
        const res = await apiFetch("/api/workspace/file", {
          method: "POST",
          body: JSON.stringify({ path: `${fullPath}/.keep`, content: "" }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showStatus("Papka muvaffaqiyatli yaratildi", "success");
          fetchFiles();
        } else {
          showStatus(data.error || "Papkani yaratishda xatolik yuz berdi", "error");
        }
      } else {
        const initialContent = getFileTemplate(sanitizedName);
        const res = await apiFetch("/api/workspace/file", {
          method: "POST",
          body: JSON.stringify({ path: fullPath, content: initialContent }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showStatus("Fayl muvaffaqiyatli yaratildi", "success");
          fetchFiles();
          openFile(fullPath);
        } else {
          showStatus(data.error || "Faylni yaratishda xatolik yuz berdi", "error");
        }
      }
    } catch (err) {
      showStatus("Yaratishda xatolik yuz berdi", "error");
    }
  };

  const triggerCreateModal = (parentDir: string, type: "file" | "folder") => {
    setCreateModalParentDir(parentDir);
    setCreateModalType(type);
    setCreateModalName("");
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createModalName.trim()) return;
    await createFile(createModalParentDir, createModalName.trim(), createModalType === "folder");
    setIsCreateModalOpen(false);
    setCreateModalName("");
  };

  const handleDeleteTrigger = (path: string) => {
    setDeleteTargetPath(path);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetPath) return;
    try {
      const res = await apiFetch("/api/workspace/delete", {
        method: "POST",
        body: JSON.stringify({ path: deleteTargetPath }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus("Muvaffaqiyatli o'chirildi!", "success");
        // Recursively close all open tabs inside the deleted path (directory or file)
        setOpenTabs((prev) => prev.filter((tab) => tab.path !== deleteTargetPath && !tab.path.startsWith(deleteTargetPath + "/")));
        if (activeTabPath === deleteTargetPath || activeTabPath.startsWith(deleteTargetPath + "/")) {
          setActiveTabPath("");
          setEditorContent("");
        }
        fetchFiles();
      } else {
        showStatus(data.error || "O'chirishda xatolik", "error");
      }
    } catch (err) {
      showStatus("O'chirishda xatolik yuz berdi", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTargetPath("");
    }
  };

  const killTerminalProcesses = async () => {
    try {
      const res = await apiFetch("/api/workspace/terminal/kill", {
        method: "POST"
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showStatus("Python va fon jarayonlari to'xtatildi", "success");
        setTerminalHistory((prev) => [
          ...prev,
          {
            id: String(Date.now()),
            type: "success",
            text: "Barcha faol Python va fon jarayonlari muvaffaqiyatli to'xtatildi.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          }
        ]);
      } else {
        showStatus(data.error || "Jarayonlarni to'xtatishda xatolik", "error");
      }
    } catch (err) {
      showStatus("Jarayonlarni to'xtatishda xatolik yuz berdi", "error");
    }
  };

  // Run Terminal Command
  const runTerminalCommand = async (command: string, dirOverride?: string) => {
    setIsExecuting(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    const activeDir = dirOverride !== undefined ? dirOverride : currentDir;
    const emailKey = user?.email || "anonymous";
    const historyKey = `vigron_terminal_history_${emailKey}_${currentProject}`;
    const dirKey = `vigron_terminal_dir_${emailKey}_${currentProject}`;

    // Add command to history
    const inputLine: TerminalLine = {
      id: Math.random().toString(),
      type: "input",
      text: command,
      timestamp,
      dir: activeDir
    };
    
    setTerminalHistory((prev) => {
      const nextHistory = [...prev, inputLine];
      localStorage.setItem(historyKey, JSON.stringify(nextHistory));
      return nextHistory;
    });

    try {
      const res = await apiFetch("/api/workspace/terminal", {
        method: "POST",
        body: JSON.stringify({ command, currentDir: activeDir, activeFile: activeTabPath }),
      });
      const data = await res.json();
      
      let responseLines: TerminalLine[] = [];
      if (data.stdout) {
        responseLines.push({
          id: Math.random().toString(),
          type: "stdout",
          text: data.stdout,
          timestamp,
        });
      }
      
      if (data.stderr) {
        responseLines.push({
          id: Math.random().toString(),
          type: "stderr",
          text: data.stderr,
          timestamp,
        });
      }

      setTerminalHistory((prev) => {
        const nextHistory = [...prev, ...responseLines];
        localStorage.setItem(historyKey, JSON.stringify(nextHistory));
        return nextHistory;
      });

      if (data.downloadUrl) {
        // Trigger browser file download directly into the phone memory!
        const link = document.createElement("a");
        link.href = data.downloadUrl;
        link.download = data.downloadFilename || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      if (data.newDir !== undefined) {
        setCurrentDir(data.newDir);
        localStorage.setItem(dirKey, data.newDir);
      }
    } catch (err: any) {
      setTerminalHistory((prev) => {
        const nextHistory = [
          ...prev,
          {
            id: Math.random().toString(),
            type: "stderr",
            text: `Xatolik: Terminal buyrug'ini ishga tushirib bo'lmadi.`,
            timestamp,
          }
        ];
        localStorage.setItem(historyKey, JSON.stringify(nextHistory));
        return nextHistory;
      });
    } finally {
      setIsExecuting(false);
      // Automatically refresh files list to pick up any changes made in terminal
      fetchFiles();
    }
  };

  const clearTerminalHistory = () => {
    setTerminalHistory([]);
    const emailKey = user?.email || "anonymous";
    localStorage.removeItem(`vigron_terminal_history_${emailKey}_${currentProject}`);
  };

  // Send AI Chat Message
  const sendAIMessage = async (content: string) => {
    if (!content.trim()) return;
    setIsSendingAI(true);

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString(),
    };

    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    saveChatHistory(updatedMessages);

    try {
      const res = await apiFetch("/api/gemini/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          currentFile: activeTabPath,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const assistantMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "assistant",
          content: data.text,
          timestamp: new Date().toLocaleTimeString(),
        };
        const finalMessages = [...updatedMessages, assistantMsg];
        setChatMessages(finalMessages);
        saveChatHistory(finalMessages);

        // Reload workspace and open editor files if AI performed actions
        if (data.executedActions && data.executedActions.length > 0) {
          fetchFiles();
          
          let hasUpdatedActiveTab = false;
          let newEditorContent = editorContent;

          for (const action of data.executedActions) {
            if (action.type === "write") {
              setOpenTabs((prev) =>
                prev.map((tab) => {
                  if (tab.path === action.path) {
                    if (activeTabPath === action.path) {
                      hasUpdatedActiveTab = true;
                      newEditorContent = action.content;
                    }
                    return { ...tab, content: action.content, isDirty: false };
                  }
                  return tab;
                })
              );
            } else if (action.type === "delete") {
              setOpenTabs((prev) => prev.filter((tab) => tab.path !== action.path));
              if (activeTabPath === action.path) {
                setActiveTabPath("");
                setEditorContent("");
                hasUpdatedActiveTab = true;
              }
            }
          }

          if (hasUpdatedActiveTab && activeTabPath) {
            setEditorContent(newEditorContent);
          }

          showStatus(`AI Agent ${data.executedActions.length} ta fayl operatsiyasini bajardi!`, "success");
        }
      } else {
        const errorMsg = data.error || "Gemini javob berishda noma'lum xatolik yuz berdi.";
        showStatus(errorMsg, "error");

        const assistantErrorMsg: ChatMessage = {
          id: Math.random().toString(),
          role: "assistant",
          content: `⚠️ **Xatolik yuz berdi:**\n\n${errorMsg}\n\n*Tavsiya:* Muammoni bartaraf etish uchun brauzerni yangilang yoki loyiha sozlamalarida **Secrets (GEMINI_API_KEY)** to'g'ri sozlanganligini tekshiring.`,
          timestamp: new Date().toLocaleTimeString(),
        };
        const finalMessages = [...updatedMessages, assistantErrorMsg];
        setChatMessages(finalMessages);
        saveChatHistory(finalMessages);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Server bilan aloqa o'rnatib bo'lmadi.";
      showStatus("AI xizmati bilan aloqa o'rnatilmadi", "error");

      const assistantErrorMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "assistant",
        content: `❌ **Aloqa xatosi:**\n\n${errorMsg}\n\n*Tavsiya:* Serveringiz faol ekanligini va internetingiz ishlayotganini tekshiring.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      const finalMessages = [...updatedMessages, assistantErrorMsg];
      setChatMessages(finalMessages);
      saveChatHistory(finalMessages);
    } finally {
      setIsSendingAI(false);
    }
  };

  // --- Project CRUD & Switcher Helpers ---
  const handleSwitchProject = (projName: string) => {
    setCurrentProject(projName);
    localStorage.setItem("vigron_current_project", projName);
    showStatus(`Loyiha muvaffaqiyatli o'zgartirildi: ${projName}`, "success");
    setOpenTabs([]);
    setActiveTabPath("");
    setEditorContent("");
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreatingProject(true);
    try {
      const res = await apiFetch("/api/workspace/projects/create", {
        method: "POST",
        body: JSON.stringify({ name: newProjectName.trim(), template: newProjectTemplate }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus(`"${newProjectName}" loyihasi muvaffaqiyatli yaratildi!`, "success");
        setNewProjectName("");
        setIsProjectModalOpen(false);
        await fetchProjects();
        handleSwitchProject(newProjectName.trim());
      } else {
        showStatus(data.error || "Loyihani yaratishda xatolik", "error");
      }
    } catch (err) {
      showStatus("Server bilan bog'lanishda xatolik", "error");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (projName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projName === "default") {
      showStatus("Tizimning asosiy loyihasini o'chirib bo'lmaydi!", "error");
      return;
    }
    if (!confirm(`Haqiqatan ham "${projName}" loyihasini va uning barcha fayllarini butunlay o'chirib tashlamoqchimisiz?`)) {
      return;
    }
    try {
      const res = await apiFetch("/api/workspace/projects/delete", {
        method: "POST",
        body: JSON.stringify({ name: projName }),
      });
      const data = await res.json();
      if (res.ok) {
        showStatus("Loyiha muvaffaqiyatli o'chirildi!", "success");
        await fetchProjects();
        if (currentProject === projName) {
          handleSwitchProject("default");
        }
      } else {
        showStatus(data.error || "Loyihani o'chirishda xatolik", "error");
      }
    } catch (err) {
      showStatus("Server bilan bog'lanishda xatolik", "error");
    }
  };

  const handleImportProjectZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      if (!base64String) {
        showStatus("Faylni o'qishda xatolik yuz berdi", "error");
        return;
      }
      
      const zipBase64 = base64String.split(",")[1];
      const projectName = file.name.replace(/\.[^/.]+$/, ""); // strip extension

      showStatus("Loyiha yuklanmoqda...", "info");
      try {
        const res = await apiFetch("/api/workspace/projects/import", {
          method: "POST",
          body: JSON.stringify({ name: projectName, zipBase64 }),
        });
        const data = await res.json();
        if (res.ok) {
          showStatus("Loyiha muvaffaqiyatli yuklandi!", "success");
          await fetchProjects();
          handleSwitchProject(projectName);
        } else {
          showStatus(data.error || "Yuklashda xatolik yuz berdi", "error");
        }
      } catch (err) {
        showStatus("Yuklashda server xatoligi", "error");
      }
    };
    reader.onerror = () => {
      showStatus("Faylni o'qishda xatolik yuz berdi", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleImportProjectFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    showStatus("Papka tahlil qilinmoqda...", "info");

    try {
      const firstFile = fileList[0];
      const relativePath = firstFile.webkitRelativePath || "";
      const folderName = relativePath.split("/")[0] || "imported_project";

      const filesArray: Array<{ path: string; base64: string }> = [];

      const readPromises = Array.from(fileList).map((file: any) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string || "";
            const base64Data = dataUrl.split(",")[1] || "";
            const parts = file.webkitRelativePath.split("/");
            parts.shift(); // remove root folder segment
            const innerPath = parts.join("/");
            
            if (innerPath) {
              filesArray.push({
                path: innerPath,
                base64: base64Data
              });
            }
            resolve();
          };
          reader.onerror = () => reject(new Error(`Faylni o'qishda xatolik: ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      await Promise.all(readPromises);

      showStatus(`Papka yuklanmoqda (${filesArray.length} ta fayl)...`, "info");

      const res = await apiFetch("/api/workspace/projects/import-folder", {
        method: "POST",
        body: JSON.stringify({ name: folderName, files: filesArray }),
      });

      const data = await res.json();
      if (res.ok) {
        showStatus(`"${folderName}" loyihasi muvaffaqiyatli import qilindi!`, "success");
        await fetchProjects();
        handleSwitchProject(folderName);
        setIsProjectModalOpen(false);
      } else {
        showStatus(data.error || "Yuklashda xatolik yuz berdi", "error");
      }
    } catch (err: any) {
      showStatus("Papka import qilishda xatolik: " + err.message, "error");
    }
  };

  const handleExportProjectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        showStatus("Sizning brauzeringiz ochiq papka saqlashni (File System Access API) qo'llab-quvvatlamaydi. Chrome yoki Edge brauzeridan foydalaning.", "error");
        return;
      }

      showStatus("Loyihani saqlash uchun kompyuteringizdan bo'sh papkani tanlang...", "info");
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });

      showStatus("Loyiha fayllari saqlanmoqda...", "info");

      // We need to write files recursively. But we need their contents.
      const writeItemToDir = async (item: WorkspaceItem, currentHandle: any) => {
        if (item.type === "directory") {
          const subDirHandle = await currentHandle.getDirectoryHandle(item.name, { create: true });
          if (item.children) {
            for (const child of item.children) {
              await writeItemToDir(child, subDirHandle);
            }
          }
        } else {
          try {
            const res = await apiFetch(`/api/workspace/file?path=${encodeURIComponent(item.path)}`);
            if (res.ok) {
              const data = await res.json();
              const fileHandle = await currentHandle.getFileHandle(item.name, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(data.content || "");
              await writable.close();
            }
          } catch (fileErr: any) {
            console.error("Fayl saqlashda xatolik: " + item.path, fileErr);
          }
        }
      };

      for (const item of files) {
        await writeItemToDir(item, dirHandle);
      }

      showStatus("Loyiha kompyuteringizga ochiq papka shaklida muvaffaqiyatli saqlandi!", "success");
    } catch (err: any) {
      console.error("Folder export failed:", err);
      if (err.name === "AbortError") {
        showStatus("Papka tanlash bekor qilindi.", "info");
      } else {
        showStatus("Loyihani papka ko'rinishida saqlashda xatolik: " + err.message, "error");
      }
    }
  };

  // Quick helper to insert character in editor at cursor position
  const insertTextAtCursor = (text: string) => {
    const textarea = document.getElementById("code-editor-textarea") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    const newValue = value.substring(0, start) + text + value.substring(end);
    setEditorContent(newValue);

    // Update active tab contents
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: newValue, isDirty: true } : tab))
    );

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 50);
  };

  // Mobile code helpers list
  const helperKeys = ["{", "}", "(", ")", "[", "]", ";", "<", ">", "=", "\"", "'", "/", "\t"];

  const refreshPreview = () => {
    setPreviewKey((prev) => prev + 1);
    const email = user ? user.email : "";
    setPreviewUrl(`/api/workspace/preview?path=${encodeURIComponent(activeTabPath || "index.html")}&userEmail=${encodeURIComponent(email)}&projectName=${encodeURIComponent(currentProject)}&key=${Date.now()}`);
  };

  const applySuggestedCode = (code: string) => {
    if (!activeTabPath) {
      showStatus("Kodni kiritish uchun avval biron bir faylni oching!", "info");
      return;
    }
    setEditorContent(code);
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.path === activeTabPath ? { ...tab, content: code, isDirty: true } : tab))
    );
    showStatus("AI taklif qilgan kod muharrirga joylandi!", "success");
    setActiveMobileTab("editor");
  };

  const triggerLiveRun = async () => {
    if (!activeTabPath) {
      showStatus("Kodni kiritish uchun avval biron bir faylni oching!", "info");
      return;
    }

    // Save the file first to ensure we run the latest code
    setIsSaving(true);
    try {
      const saveRes = await apiFetch("/api/workspace/file", {
        method: "POST",
        body: JSON.stringify({ path: activeTabPath, content: editorContent }),
      });
      if (saveRes.ok) {
        setOpenTabs((prev) =>
          prev.map((tab) => (tab.path === activeTabPath ? { ...tab, isDirty: false } : tab))
        );
        fetchFiles();
      }
    } catch (err) {
      console.error("Auto-save before run failed:", err);
    } finally {
      setIsSaving(false);
    }

    const ext = activeTabPath.split(".").pop()?.toLowerCase();
    const lastSlash = activeTabPath.lastIndexOf("/");
    const fileDir = lastSlash !== -1 ? activeTabPath.substring(0, lastSlash) : "";
    const fileName = lastSlash !== -1 ? activeTabPath.substring(lastSlash + 1) : activeTabPath;
    const extIndex = fileName.lastIndexOf(".");
    const fileNameWithoutExt = extIndex !== -1 ? fileName.substring(0, extIndex) : fileName;

    if (ext === "py") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`python3 ${fileName}`, fileDir);
    } else if (ext === "js") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`node ${fileName}`, fileDir);
    } else if (ext === "ts" || ext === "tsx") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`npx tsx ${fileName}`, fileDir);
    } else if (ext === "c") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`gcc -o ${fileNameWithoutExt} ${fileName} && ./${fileNameWithoutExt}`, fileDir);
    } else if (ext === "cpp" || ext === "cc" || ext === "cxx") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`g++ -std=c++17 -o ${fileNameWithoutExt} ${fileName} && ./${fileNameWithoutExt}`, fileDir);
    } else if (ext === "java") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`javac ${fileName} && java ${fileNameWithoutExt}`, fileDir);
    } else if (ext === "go") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`go run ${fileName}`, fileDir);
    } else if (ext === "rs") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`rustc ${fileName} && ./${fileNameWithoutExt}`, fileDir);
    } else if (ext === "php") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`php ${fileName}`, fileDir);
    } else if (ext === "rb") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`ruby ${fileName}`, fileDir);
    } else if (ext === "sh") {
      setActiveMobileTab("terminal");
      runTerminalCommand(`bash ${fileName}`, fileDir);
    } else if (ext === "html") {
      refreshPreview();
      setActiveMobileTab("preview");
    } else if (ext === "dart") {
      setActiveMobileTab("terminal");
      const hasPubspec = files.some(f => f.name === "pubspec.yaml");
      if (hasPubspec) {
        runTerminalCommand(`flutter run`, fileDir);
      } else {
        runTerminalCommand(`dart ${fileName}`, fileDir);
      }
    } else {
      showStatus(`Ushbu fayl formatini (.${ext}) to'g'ridan-to'g'ri ishga tushirish qo'llab-quvvatlanmaydi, lekin uni terminal orqali ishlatishingiz mumkin.`, "info");
    }
  };

  const getThemeClasses = () => {
    switch (editorTheme) {
      case "emerald":
        return {
          wrapper: "bg-emerald-50/70 backdrop-blur-md border-emerald-500/20 shadow-emerald-100/30",
          border: "border-emerald-200",
          editorBg: "bg-emerald-50/30",
          text: "text-emerald-950",
          accent: "text-emerald-600"
        };
      case "ocean":
        return {
          wrapper: "bg-cyan-50/80 backdrop-blur-md border-cyan-500/20 shadow-cyan-100/30",
          border: "border-cyan-200",
          editorBg: "bg-cyan-50/40",
          text: "text-cyan-950",
          accent: "text-cyan-600"
        };
      case "monokai":
        return {
          wrapper: "bg-amber-50/85 backdrop-blur-md border-amber-500/20 shadow-amber-100/30",
          border: "border-amber-200",
          editorBg: "bg-amber-50/40",
          text: "text-amber-950",
          accent: "text-amber-700"
        };
      case "cyberpunk":
        return {
          wrapper: "bg-fuchsia-50/80 backdrop-blur-md border-fuchsia-500/20 shadow-fuchsia-100/30",
          border: "border-fuchsia-200",
          editorBg: "bg-fuchsia-50/40",
          text: "text-fuchsia-950",
          accent: "text-fuchsia-600"
        };
      case "vscode":
      case "slate":
      default:
        return {
          wrapper: "bg-slate-50/75 backdrop-blur-md border-indigo-500/20 shadow-indigo-100/30 glow-indigo-pulse",
          border: "border-indigo-200",
          editorBg: "bg-slate-100/50",
          text: "text-slate-900",
          accent: "text-indigo-600"
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className="flex flex-col h-screen bg-[#030712] text-slate-100 overflow-hidden font-sans relative">
      {/* Ambient background glows for premium visual depth */}
      <div className="ambient-glow-cyan top-4 left-10 opacity-70"></div>
      <div className="ambient-glow-indigo bottom-16 right-10 opacity-60"></div>
      <div className="ambient-glow-pink top-1/3 right-1/4 opacity-40"></div>
      
      {/* Dynamic Status Notifications */}
      {statusMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2.5 px-4.5 py-3 rounded-2xl shadow-2xl border text-sm transition-all duration-350 backdrop-blur-md animate-slide-in ${
          statusMessage.type === "success" 
            ? "bg-emerald-950/85 text-emerald-300 border-emerald-500/20" 
            : statusMessage.type === "error" 
            ? "bg-red-950/85 text-red-300 border-red-500/20" 
            : "bg-indigo-950/85 text-cyan-300 border-cyan-500/20"
        }`}>
          <Info className="w-4 h-4 shrink-0 animate-bounce" />
          <span className="font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Header / Brand Nav */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 bg-gray-950/70 backdrop-blur-md border-b border-white/5 shrink-0 gap-3 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-float">
              <Code2 className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Vigron Code Studio
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Professional dasturlash muhiti</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:hidden">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-cyan-400 rounded-xl border border-white/5 flex items-center transition"
              title="Mobil Sinxronizatsiya"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-emerald-400 rounded-xl border border-white/5 flex items-center space-x-1 transition"
              title="Loyiha andozalari"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 bg-white/5 text-slate-300 rounded-xl border border-white/5 transition"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2.5">
          {/* Mobil Ulashish Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95"
            title="Ushbu kod va loyihani boshqa telefonda ochish"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mobil Ulashish</span>
          </button>

          {/* Projects Switcher - Visible always on desktop, can trigger from here */}
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-emerald-400 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95"
            title="Loyiha andozasini o'zgartirish"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Loyihalar</span>
          </button>

          {/* Cloud Server Deployer Button */}
          <button
            onClick={() => {
              setIsDeployModalOpen(true);
              fetchDeployStatus();
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-200 hover:text-sky-400 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95"
            title="Bulutli bepul serverga joylash"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Bulutli Server</span>
          </button>

          {/* User auth badge */}
          {user && !user.email.startsWith("guest_") ? (
            <div 
              onClick={() => {
                setProfileNameInput(user.name);
                let style = "shapes";
                let seed = user.email.split("@")[0];
                if (user.avatar && user.avatar.startsWith("https://api.dicebear.com/7.x/")) {
                  const match = user.avatar.match(/7\.x\/([^/]+)\/svg\?seed=([^&]+)/);
                  if (match) {
                    style = match[1];
                    seed = decodeURIComponent(match[2]);
                  }
                }
                setProfileAvatarStyle(style);
                setProfileAvatarSeed(seed);
                setIsProfileModalOpen(true);
              }}
              className="flex items-center space-x-2 bg-slate-850 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-xl cursor-pointer transition active:scale-95"
              title="Profil va statistika"
            >
              <img src={user.avatar} alt="User Avatar" className="w-5 h-5 rounded-full bg-slate-800" />
              <div className="hidden xs:block text-left leading-none">
                <p className="text-[10px] font-bold text-slate-200">{user.name}</p>
                <p className="text-[8px] text-emerald-400 font-medium uppercase tracking-wider">{user.plan}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5">
              {user && (
                <div 
                  onClick={() => {
                    setProfileNameInput(user.name);
                    let style = "shapes";
                    let seed = user.email.split("@")[0];
                    if (user.avatar && user.avatar.startsWith("https://api.dicebear.com/7.x/")) {
                      const match = user.avatar.match(/7\.x\/([^/]+)\/svg\?seed=([^&]+)/);
                      if (match) {
                        style = match[1];
                        seed = decodeURIComponent(match[2]);
                      }
                    }
                    setProfileAvatarStyle(style);
                    setProfileAvatarSeed(seed);
                    setIsProfileModalOpen(true);
                  }}
                  className="flex items-center space-x-1 bg-slate-850 hover:bg-slate-800 border border-slate-800 px-2 py-1 rounded-xl cursor-pointer transition active:scale-95 opacity-80"
                  title="Mehmon profili"
                >
                  <img src={user.avatar} alt="User Avatar" className="w-4 h-4 rounded-full bg-slate-800" />
                  <span className="hidden xs:inline text-[9px] font-semibold text-slate-400">Mehmon</span>
                </div>
              )}
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-emerald-400 rounded-xl text-xs font-bold transition active:scale-95"
              >
                <LogIn className="w-3 h-3 text-emerald-400" />
                <span>Kirish</span>
              </button>
            </div>
          )}

          {/* Main Action Trigger */}
          {activeTabPath && (
            <button
              onClick={triggerLiveRun}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs rounded-xl transition duration-150 transform active:scale-95 shadow-lg shadow-emerald-500/10"
              title="Kodni ishga tushirish"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Ishga tushirish</span>
            </button>
          )}

          {activeTabPath && (
            <button
              onClick={saveCurrentFile}
              disabled={isSaving}
              className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-emerald-400 rounded-xl transition duration-150 border border-slate-700/60"
              title="Saqlash (Ctrl+S)"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* VS Code Left Activity Bar - Sleek vertical bar on desktop */}
        <div className="hidden md:flex w-12 bg-[#181818] border-r border-[#2d2d2d] flex-col justify-between items-center py-3 shrink-0 select-none z-40">
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* Explorer (Files) Icon */}
            <button
              onClick={() => {
                if (activeSidebarTab === "explorer" && sidebarOpen) {
                  setSidebarOpen(false);
                } else {
                  setActiveSidebarTab("explorer");
                  setSidebarOpen(true);
                }
              }}
              className={`p-2 rounded-lg transition-colors relative group ${
                sidebarOpen && activeSidebarTab === "explorer" 
                  ? "text-sky-400 bg-[#2d2d2d]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d]"
              }`}
              title="Fayl Explorer"
            >
              <FolderTree className="w-5 h-5" />
              <div className="absolute left-14 bg-[#252526] border border-[#2d2d2d] text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                Explorer
              </div>
            </button>

            {/* Search Icon */}
            <button
              onClick={() => {
                if (activeSidebarTab === "search" && sidebarOpen) {
                  setSidebarOpen(false);
                } else {
                  setActiveSidebarTab("search");
                  setSidebarOpen(true);
                }
              }}
              className={`p-2 rounded-lg transition-colors relative group ${
                sidebarOpen && activeSidebarTab === "search" 
                  ? "text-sky-400 bg-[#2d2d2d]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d]"
              }`}
              title="Fayllarni qidirish"
            >
              <Search className="w-5 h-5" />
              <div className="absolute left-14 bg-[#252526] border border-[#2d2d2d] text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                Qidiruv
              </div>
            </button>

            {/* Projects Icon */}
            <button
              onClick={() => setIsProjectModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d] rounded-lg transition relative group"
              title="Loyiha andozalari"
            >
              <Layers className="w-5 h-5" />
              <div className="absolute left-14 bg-[#252526] border border-[#2d2d2d] text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                Loyihalar
              </div>
            </button>

            {/* AI Assistant Icon */}
            <button
              onClick={() => {
                setActiveMobileTab("ai");
                showStatus("Vigron Copilot AI yordamchisi faollashtirildi", "info");
              }}
              className={`p-2 rounded-lg transition relative group ${
                activeMobileTab === "ai"
                  ? "text-purple-400 bg-purple-950/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d]"
              }`}
              title="Copilot AI Assistant"
            >
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              <div className="absolute left-14 bg-[#252526] border border-[#2d2d2d] text-slate-200 text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-50">
                AI Copilot
              </div>
            </button>
          </div>

          <div className="flex flex-col items-center space-y-4 w-full">
            {/* User Profile */}
            <button
              onClick={() => {
                if (user) {
                  setProfileNameInput(user.name);
                  let style = "shapes";
                  let seed = user.email.split("@")[0];
                  if (user.avatar && user.avatar.startsWith("https://api.dicebear.com/7.x/")) {
                    const match = user.avatar.match(/7\.x\/([^/]+)\/svg\?seed=([^&]+)/);
                    if (match) {
                      style = match[1];
                      seed = decodeURIComponent(match[2]);
                    }
                  }
                  setProfileAvatarStyle(style);
                  setProfileAvatarSeed(seed);
                }
                setIsProfileModalOpen(true);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d] rounded-lg transition"
              title="Profil"
            >
              {user ? (
                <img src={user.avatar} alt="Avatar" className="w-5 h-5 rounded-full bg-slate-800" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>

            {/* Settings */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d] rounded-lg transition"
              title="Sozlamalar va Mavzu"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Left Sidebar (VS Code inspired explorer/search sidebar) */}
        <aside className={`
          absolute md:static inset-y-0 left-0 z-40 w-64 bg-[#252526] border-r border-[#2d2d2d] flex flex-col shrink-0 transition-transform duration-300 md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          {/* Sidebar Section Header */}
          <div className="p-3 border-b border-[#2d2d2d] bg-[#1e1e1e]/40 flex items-center justify-between select-none shrink-0">
            {activeSidebarTab === "explorer" ? (
              <>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center">
                  <FolderTree className="w-3.5 h-3.5 mr-1.5 text-sky-400" /> EXPLORER: {currentProject.toUpperCase()}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => triggerCreateModal("", "file")}
                    className="p-1 hover:bg-[#2d2d2d] rounded text-slate-400 hover:text-sky-400 transition"
                    title="Yangi fayl"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => triggerCreateModal("", "folder")}
                    className="p-1 hover:bg-[#2d2d2d] rounded text-slate-400 hover:text-sky-400 transition"
                    title="Yangi papka"
                  >
                    <FolderTree className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center">
                <Search className="w-3.5 h-3.5 mr-1.5 text-sky-400" /> QIDIRUV (SEARCH)
              </span>
            )}
          </div>

          {/* Sidebar Body */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeSidebarTab === "explorer" ? (
              <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar min-h-0">
                {loadingFiles ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-2">
                    <RefreshCw className="w-6 h-6 text-sky-500 animate-spin" />
                    <span className="text-xs text-slate-500">Yuklanmoqda...</span>
                  </div>
                ) : (
                  <FileTree
                    files={files}
                    onOpenFile={(path) => {
                      openFile(path);
                      if (window.innerWidth < 768) setSidebarOpen(false); // Auto close sidebar on mobile
                    }}
                    onDeleteFile={handleDeleteTrigger}
                    onCreateFile={createFile}
                    activeFilePath={activeTabPath}
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-3 overflow-hidden space-y-3 bg-[#252526] min-h-0">
                <div className="relative shrink-0">
                  <input
                    type="text"
                    value={fileSearchQuery}
                    onChange={(e) => setFileSearchQuery(e.target.value)}
                    placeholder="Fayllarni qidirish..."
                    className="w-full pl-8 pr-7 py-1.5 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  {fileSearchQuery && (
                    <button 
                      onClick={() => setFileSearchQuery("")}
                      className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-200 text-sm font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 min-h-0">
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mb-2">
                    {fileSearchQuery ? "MOS KELUVCHI FAYLLAR" : "LOYIHA FAYLLARI RO'YXATI"}
                  </p>

                  {(() => {
                    const flat = getFlattenedFiles(files);
                    const filtered = flat.filter(item => 
                      !item.isFolder && 
                      (!fileSearchQuery || item.name.toLowerCase().includes(fileSearchQuery.toLowerCase()) || item.path.toLowerCase().includes(fileSearchQuery.toLowerCase()))
                    );

                    if (filtered.length === 0) {
                      return <p className="text-xs text-slate-500 italic p-2">Mos fayl topilmadi</p>;
                    }

                    return filtered.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          openFile(item.path);
                          if (window.innerWidth < 768) setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-left transition text-xs font-mono group ${
                          activeTabPath === item.path 
                            ? "bg-sky-950/30 text-sky-400 border-l border-sky-400" 
                            : "text-slate-400 hover:text-slate-200 hover:bg-[#2d2d2d]"
                        }`}
                      >
                        <LanguageLogo fileName={item.path} className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-bold text-slate-300 group-hover:text-sky-400">{item.name}</span>
                          <span className="text-[9px] text-slate-500 truncate">{item.path}</span>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Guest Sync Guidance Alert */}
            {user && user.email.startsWith("guest_") && (
              <div className="mx-2 mb-2 p-2.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl space-y-1.5 shrink-0 select-none">
                <div className="flex items-center space-x-1.5 text-cyan-400 font-bold text-[10px]">
                  <Smartphone className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                  <span>Qurilmalarni ulash (Sync)</span>
                </div>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Boshqa telefonlarda loyiha fayllarini va ishingizni davom ettirish uchun <b>"Mobil Ulashish"</b> QR-kodidan foydalaning!
                </p>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-full py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-extrabold text-[9px] rounded-lg border border-cyan-500/20 transition active:scale-95"
                >
                  Sinxronizatsiya havolasi (QR)
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Workspace Path Indicator */}
          <div className="p-3 bg-[#1e1e1e]/80 border-t border-[#2d2d2d] text-[10px] text-slate-400 space-y-2 shrink-0 select-none">
            <p className="flex items-center text-slate-400 font-semibold">
              <Info className="w-3.5 h-3.5 mr-1 text-sky-400 shrink-0" /> Ish stoli: <span className="font-mono bg-[#181818] px-1.5 py-0.5 rounded ml-1 border border-[#2d2d2d] text-slate-300">workspace/</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <button
                onClick={() => setIsProjectModalOpen(true)}
                className="flex items-center justify-center space-x-1 px-1.5 py-1.5 bg-[#181818] hover:bg-[#2d2d2d] border border-[#2d2d2d] hover:border-[#3c3c3c] text-slate-300 hover:text-sky-400 rounded text-[9px] font-extrabold transition active:scale-95"
                title="Loyiha andozasini o'zgartirish"
              >
                <Layers className="w-3 h-3 text-sky-400 shrink-0" />
                <span>LOYIHALAR</span>
              </button>
              <button
                onClick={() => window.open(`${window.location.origin}/api/workspace/project/export`, "_blank")}
                className="flex items-center justify-center space-x-1 px-1.5 py-1.5 bg-[#181818] hover:bg-[#2d2d2d] border border-[#2d2d2d] hover:border-[#3c3c3c] text-slate-300 hover:text-sky-400 rounded text-[9px] font-extrabold transition active:scale-95"
                title="Butun loyihani ZIP shaklida yuklab olish"
              >
                <Download className="w-3 h-3 text-sky-400 shrink-0" />
                <span>ZIP YUKLASH</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content Box (Editor, Terminal, AI, Preview) */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
          
          {/* Multi-view switcher bar for tablet & desktop */}
          <div className="hidden md:flex items-center justify-between px-4 py-2 bg-slate-900/40 border-b border-slate-800/80">
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
              {openTabs.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => {
                    setActiveTabPath(tab.path);
                    setEditorContent(tab.content);
                  }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition duration-150 ${
                    activeTabPath === tab.path
                      ? "bg-slate-800 border-slate-700 text-emerald-400"
                      : "bg-transparent border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <LanguageLogo fileName={tab.name} className="w-3.5 h-3.5" />
                  <span>{currentProject}/{tab.path}</span>
                  {tab.isDirty && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                  <span
                    onClick={(e) => closeTab(tab.path, e)}
                    className="p-0.5 hover:bg-slate-700 rounded-md text-slate-500 hover:text-slate-200 transition"
                  >
                    ×
                  </span>
                </button>
              ))}
              {openTabs.length === 0 && (
                <span className="text-xs text-slate-500 italic">Hech qanday fayl ochilmagan</span>
              )}
            </div>

            {/* Font Control Settings & Direct File Download */}
            <div className="flex items-center space-x-2">
              {activeTabPath && (
                <button
                  onClick={() => {
                    const downloadUrl = `/api/workspace/file/download?path=${encodeURIComponent(activeTabPath)}`;
                    const link = document.createElement("a");
                    link.href = downloadUrl;
                    link.download = activeTabPath.split("/").pop() || "download";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    showStatus("📥 Fayl telefon xotirasiga saqlash uchun yuklab olindi!", "success");
                  }}
                  className="mr-3 flex items-center space-x-1 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30 transition duration-150 active:scale-95"
                  title="Ushbu faol faylni to'g'ridan-to'g'ri telefoningizga yuklab oling"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>TEL xotirasiga saqlash</span>
                </button>
              )}
              <span className="text-xs text-slate-500 font-semibold">Shrift o'lchami:</span>
              <button
                onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs"
              >
                A-
              </button>
              <span className="text-xs text-slate-300 font-mono font-bold">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs"
              >
                A+
              </button>
            </div>
          </div>

          {/* Core Panel Screens */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-3 gap-3">

            {/* Mobile File Explorer View - Displayed when "fayllar" tab is selected on mobile */}
            <div className={`
              flex-1 flex flex-col overflow-hidden md:hidden
              ${activeMobileTab === "files" ? "flex" : "hidden"}
            `}>
              <div className="flex-1 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/60 shrink-0">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center">
                    <FolderTree className="w-4 h-4 mr-2 text-emerald-400 animate-pulse" /> Loyiha Fayllari
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => triggerCreateModal("", "file")}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-emerald-400 rounded-xl border border-slate-700/50 flex items-center space-x-1 text-[10px] font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Fayl</span>
                    </button>
                    <button
                      onClick={() => triggerCreateModal("", "folder")}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-emerald-400 rounded-xl border border-slate-700/50 flex items-center space-x-1 text-[10px] font-bold"
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                      <span>Papka</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-slate-950/40">
                  {loadingFiles ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                      <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">Fayllar yuklanmoqda...</span>
                    </div>
                  ) : (
                    <FileTree
                      files={files}
                      onOpenFile={(path) => {
                        openFile(path);
                        setActiveMobileTab("editor"); // Auto switch to editor when user taps a file
                      }}
                      onDeleteFile={handleDeleteTrigger}
                      onCreateFile={createFile}
                      activeFilePath={activeTabPath}
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Desktop split view: Left Editor, Right Side depending on state / tabs */}
            <div className={`
              flex-1 flex flex-col overflow-hidden min-w-0
              ${activeMobileTab === "editor" ? "flex" : "hidden md:flex"}
            `}>
              
              {/* Specialized Mobile Tab Bar inside editor panel if needed */}
              <div className="flex md:hidden items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-400 flex items-center">
                  <LanguageLogo fileName={activeTabPath} className="w-4 h-4 mr-1" />
                  {activeTabPath ? `${currentProject}/${activeTabPath}` : "Muharrir"}
                </span>
                {activeTabPath && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        const downloadUrl = `/api/workspace/file/download?path=${encodeURIComponent(activeTabPath)}`;
                        const link = document.createElement("a");
                        link.href = downloadUrl;
                        link.download = activeTabPath.split("/").pop() || "download";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showStatus("📥 Fayl telefon xotirasiga yuklab olindi!", "success");
                      }}
                      className="flex items-center space-x-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-xl font-bold active:scale-95 transition"
                      title="Yuklash"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Yuklash</span>
                    </button>
                    <button
                      onClick={saveCurrentFile}
                      className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-xl font-bold active:scale-95 transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Saqlash</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Editor Workspace Area */}
              <div className={`flex-1 ${theme.wrapper} rounded-2xl flex flex-col overflow-hidden shadow-xl border`}>
                {activeTabPath ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Real-time Code Editor Input with line numbering */}
                    <div className="flex-1 flex overflow-hidden font-mono p-0 bg-[#1e1e1e]">
                      {/* Line Numbers column with Scroll Sync and Active line highlight */}
                      <div 
                        ref={lineNumbersRef}
                        className={`w-12 text-right pr-2.5 select-none text-slate-500/80 border-r border-[#2d2d2d] py-3 text-xs md:text-sm shrink-0 overflow-y-hidden bg-[#181818]/60`}
                        style={{ fontSize: `${fontSize}px`, lineHeight: '22px' }}
                      >
                        {editorContent.split("\n").map((_, i) => {
                          const isCurrent = i + 1 === activeLine;
                          return (
                            <div 
                              key={i} 
                              className={`transition-colors duration-150 ${
                                isCurrent 
                                  ? "text-slate-200 font-extrabold bg-[#2d2d2d] border-r-2 border-sky-500" 
                                  : "hover:text-slate-400"
                              }`}
                              style={{ height: '22px' }}
                            >
                              {i + 1}
                            </div>
                          );
                        })}
                      </div>

                      {/* Editor Content Area with Overlay Highlighting */}
                      <div className="flex-1 relative overflow-hidden h-full">
                        {/* Highlighting pre/code underlayer */}
                        <pre
                          ref={highlightRef}
                          className="absolute inset-0 pointer-events-none p-3 m-0 border-0 whitespace-pre overflow-hidden bg-transparent z-0 select-none"
                          style={{ 
                            fontSize: `${fontSize}px`, 
                            lineHeight: '22px',
                            fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            tabSize: 4,
                            MozTabSize: 4
                          }}
                        >
                          <code
                            dangerouslySetInnerHTML={{ __html: highlightCode(editorContent, activeTabPath ? activeTabPath.split(".").pop() || "" : "") }}
                            className="block w-full h-full p-0 m-0 border-0 bg-transparent"
                            style={{ 
                              fontSize: `${fontSize}px`, 
                              lineHeight: '22px',
                              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                            }}
                          />
                        </pre>

                        {/* Main interactive transparent Textarea */}
                        <textarea
                          ref={textareaRef}
                          id="code-editor-textarea"
                          value={editorContent}
                          onChange={handleEditorChange}
                          onKeyDown={handleEditorKeyDown}
                          onScroll={handleScroll}
                          onKeyUp={handleCursorActivity}
                          onMouseUp={handleCursorActivity}
                          onSelect={handleCursorActivity}
                          onFocus={handleCursorActivity}
                          style={{ 
                            fontSize: `${fontSize}px`, 
                            lineHeight: '22px',
                            fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            tabSize: 4,
                            MozTabSize: 4
                          }}
                          className="absolute inset-0 w-full h-full p-3 m-0 border-0 outline-none resize-none bg-transparent text-transparent caret-slate-100 overflow-y-auto overflow-x-auto focus:ring-0 custom-scrollbar whitespace-pre z-10"
                          placeholder="Ushbu yerda kod yozing..."
                          spellCheck={false}
                          autoCapitalize="off"
                          autoComplete="off"
                          autoCorrect="off"
                        />
                      </div>
                    </div>

                    {/* Intellisense Autocomplete Helper */}
                    {isAutocompleteOpen && suggestions.length > 0 && (
                      <div className="px-3 py-2 bg-slate-950/95 border-t border-b border-slate-800/90 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0 animate-fade-in backdrop-blur">
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold uppercase tracking-widest px-1.5 py-1 rounded border border-emerald-500/20 flex items-center space-x-1 shrink-0">
                          <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                          <span>Yordamchi Kodlar:</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          {suggestions.map((s) => (
                            <button
                              key={s.word}
                              type="button"
                              onClick={() => applySuggestion(s)}
                              className="group flex items-center space-x-2 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl transition text-left shrink-0 max-w-[200px]"
                              title={s.description}
                            >
                              <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded uppercase tracking-wider ${
                                s.type === "keyword" ? "bg-blue-500/20 text-blue-400" :
                                s.type === "function" ? "bg-purple-500/20 text-purple-400" :
                                s.type === "tag" ? "bg-orange-500/20 text-orange-400" :
                                "bg-amber-500/20 text-amber-400"
                              }`}>
                                {s.type.substring(0, 3)}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-emerald-400 truncate">{s.word}</span>
                                <span className="text-[9px] text-slate-400 truncate">{s.description}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Highly Polished Mobile Code Helper Bar (Unique feature!) */}
                    <div className="px-2 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto scrollbar-none shrink-0">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">Tugmalar:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const ext = activeTabPath ? activeTabPath.split(".").pop() || "" : "";
                          const suggestionsList = getSuggestions("", ext);
                          setSuggestions(suggestionsList);
                          setIsAutocompleteOpen(suggestionsList.length > 0);
                          showStatus("💡 Takliflar ro'yxati faollashtirildi!", "info");
                        }}
                        className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-extrabold border border-emerald-500/30 transition shrink-0 flex items-center space-x-1 animate-pulse"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>💡 Takliflar</span>
                      </button>
                      {helperKeys.map((char) => (
                        <button
                          key={char}
                          onClick={() => insertTextAtCursor(char)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-emerald-400 rounded-lg text-xs font-bold border border-slate-800 transition"
                        >
                          {char === "\t" ? "Tab" : char}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-850 flex items-center justify-center border border-slate-800 text-slate-500 animate-pulse">
                      <Code2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-300 text-sm">Hech qanday fayl ochilmagan</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-xs">
                        Chap tomondagi loyiha fayllaridan birini tanlang yoki yangi fayl yarating.
                      </p>
                    </div>
                    <button
                      onClick={() => openFile("README.md")}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl font-bold text-xs border border-slate-700 transition"
                    >
                      README.md faylini ochish
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Terminal Window */}
            <div className={`
              flex-1 md:max-w-xl flex flex-col overflow-hidden min-h-[300px] md:min-h-0
              ${activeMobileTab === "terminal" ? "flex" : "hidden md:flex"}
            `}>
              <Terminal
                history={terminalHistory}
                onRunCommand={runTerminalCommand}
                onClearHistory={clearTerminalHistory}
                onKillProcesses={killTerminalProcesses}
                currentDir={currentDir}
                isExecuting={isExecuting}
                currentProject={currentProject}
                activeTabPath={activeTabPath}
              />
            </div>

            {/* AI Assistant Chat Panel */}
            <div className={`
              flex-1 md:max-w-md flex flex-col overflow-hidden
              ${activeMobileTab === "ai" ? "flex" : "hidden md:flex"}
            `}>
              <AIChat
                messages={chatMessages}
                onSendMessage={sendAIMessage}
                isSending={isSendingAI}
                activeFileName={activeTabPath ? activeTabPath.split("/").pop() : undefined}
                onApplySuggestedCode={applySuggestedCode}
              />
            </div>

            {/* Live Web Preview Window */}
            <div className={`
              flex-1 flex flex-col overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-xl
              ${activeMobileTab === "preview" ? "flex" : "hidden"}
            `}>
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-850 border-b border-slate-800 shrink-0">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs md:text-sm text-slate-300">Jonli sahifa (Live Preview)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshPreview}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition"
                    title="Yangilash"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white relative">
                <iframe
                  key={previewKey}
                  src={previewUrl}
                  title="Web Live Preview"
                  className="w-full h-full border-none"
                />
              </div>
            </div>

          </div>

          {/* Bottom Dock Navigation for Mobile layout */}
          <nav className="md:hidden flex items-center justify-around bg-[#181818] border-t border-[#2d2d2d] px-2 py-2 shrink-0 z-40 select-none">
            <button
              onClick={() => {
                setActiveMobileTab("files");
                setActiveSidebarTab("explorer");
                setSidebarOpen(true);
              }}
              className={`flex flex-col items-center space-y-0.5 p-1 transition ${
                activeMobileTab === "files" ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span className="text-[9px] font-bold">Fayllar</span>
            </button>

            <button
              onClick={() => {
                setActiveMobileTab("files");
                setActiveSidebarTab("search");
                setSidebarOpen(true);
              }}
              className={`flex flex-col items-center space-y-0.5 p-1 transition ${
                activeMobileTab === "files" && activeSidebarTab === "search" ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="text-[9px] font-bold">Qidiruv</span>
            </button>

            <button
              onClick={() => {
                setActiveMobileTab("editor");
                setSidebarOpen(false);
              }}
              className={`flex flex-col items-center space-y-0.5 p-1 transition ${
                activeMobileTab === "editor" ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span className="text-[9px] font-bold">Kod</span>
            </button>

            <button
              onClick={() => {
                setActiveMobileTab("terminal");
                setSidebarOpen(false);
              }}
              className={`flex flex-col items-center space-y-0.5 p-1 transition relative ${
                activeMobileTab === "terminal" ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              <span className="text-[9px] font-bold">Terminal</span>
              {isExecuting && (
                <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveMobileTab("preview");
                setSidebarOpen(false);
                refreshPreview();
              }}
              className={`flex flex-col items-center space-y-0.5 p-1 transition ${
                activeMobileTab === "preview" ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-[9px] font-bold">Preview</span>
            </button>

            <button
              onClick={() => {
                setActiveMobileTab("ai");
                setSidebarOpen(false);
              }}
              className={`flex flex-col items-center space-y-0.5 p-1 transition relative ${
                activeMobileTab === "ai" ? "text-purple-400 font-extrabold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-[9px] font-bold">AI Copilot</span>
            </button>
          </nav>

        </main>
      </div>

      {/* VS Code Real Status Bar */}
      <footer className="h-6 bg-[#007acc] text-slate-100 flex items-center justify-between px-3 text-[10px] sm:text-xs shrink-0 select-none font-mono z-40 shadow-inner">
        <div className="flex items-center space-x-3">
          <div className="bg-[#1e1e1e]/20 px-1.5 py-0.5 rounded flex items-center space-x-1 font-sans text-[9px] font-extrabold text-white">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
            <span>LIVE: VIGRON</span>
          </div>
          <span className="text-[10px] text-sky-100 hidden sm:inline">Tayyor (Ready)</span>
          {activeTabPath && (
            <span className="text-[10px] text-sky-100/90 flex items-center">
              <span className="w-1 h-1 bg-sky-200 rounded-full mr-1.5"></span>
              Fayl: <strong className="ml-1 text-white">{activeTabPath.split("/").pop()}</strong>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3 text-[10px] sm:text-[11px]">
          {activeTabPath && (
            <div className="flex items-center space-x-2.5 text-sky-100/95">
              <span>Ln {activeLine}, Col 1</span>
              <span className="hidden xs:inline">Spaces: 4</span>
              <span className="hidden sm:inline">UTF-8</span>
              <span className="bg-[#1e1e1e]/20 px-1.5 py-0.5 rounded font-bold text-[9px] uppercase text-white">
                {activeTabPath.split(".").pop() || "TEXT"}
              </span>
            </div>
          )}
          <span className="text-white font-semibold bg-emerald-600 px-2 py-0.5 rounded text-[9px]">
            {currentProject}
          </span>
        </div>
      </footer>

      {/* 1. Custom File/Folder Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              {createModalType === "folder" ? (
                <FolderTree className="w-6 h-6" />
              ) : (
                <FileCode className="w-6 h-6" />
              )}
              <h3 className="font-extrabold text-base text-slate-100">
                Yangi {createModalType === "folder" ? "Papka" : "Fayl"} yaratish
              </h3>
            </div>
            
            <form onSubmit={handleConfirmCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  {createModalParentDir ? `Joylashuv: user_workspace/${createModalParentDir}/` : "Katalog: Root (Asosiy)"}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder={createModalType === "folder" ? "Masalan: components" : "Masalan: main.js"}
                  value={createModalName}
                  onChange={(e) => setCreateModalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded-xl text-xs font-bold transition hover:opacity-90 active:scale-95"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Custom File/Folder Deletion Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-100">O'chirishni tasdiqlang</h3>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Haqiqatan ham ushbu elementni o'chirib tashlamoqchimisiz?</p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-red-400 truncate">
                {deleteTargetPath}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteTargetPath("");
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Orqaga qaytish
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition active:scale-95"
              >
                Ha, o'chirilsin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Custom Unsaved Changes Warn Modal */}
      {dirtyTabToClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <Info className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-slate-100">Saqlanmagan o'zgarishlar</h3>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Bu faylda saqlanmagan o'zgarishlar bor. Baribir yopib yuborilsinmi? Barcha kiritilgan tahrirlar yo'qolishi mumkin.
              </p>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-400 truncate">
                {dirtyTabToClose.split("/").pop()}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDirtyTabToClose(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Saqlash uchun qolish
              </button>
              <button
                type="button"
                onClick={() => {
                  // Bypass dirty check by forcing close
                  const nextTabs = openTabs.filter((tab) => tab.path !== dirtyTabToClose);
                  setOpenTabs(nextTabs);
                  
                  const tabIndex = openTabs.findIndex((tab) => tab.path === dirtyTabToClose);
                  if (activeTabPath === dirtyTabToClose) {
                    if (nextTabs.length > 0) {
                      const nextActive = nextTabs[Math.max(0, tabIndex - 1)];
                      setActiveTabPath(nextActive.path);
                      setEditorContent(nextActive.content);
                    } else {
                      setActiveTabPath("");
                      setEditorContent("");
                    }
                  }
                  setDirtyTabToClose(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs transition active:scale-95"
              >
                Yopib yuborilsin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vigron Cloud Deployment Manager Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 bg-sky-500/10 rounded-2xl flex items-center justify-center border border-sky-500/20">
                  <Cloud className="w-5 h-5 text-sky-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">Bulutli Server (Vigron Cloud Host)</h3>
                  <p className="text-[10px] text-slate-400">Loyihalaringizni 24/7 ishlaydigan bepul serverda bevosita ishga tushiring</p>
                </div>
              </div>
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Actions & Info */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Loyiha:</span>
                    <span className="font-extrabold text-slate-200 truncate max-w-[120px]" title={currentProject}>
                      {currentProject}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Turi:</span>
                    <span className="text-[10px] bg-slate-800 text-sky-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
                      {deployedInfo?.type || "Static"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Holati:</span>
                    {deployedInfo?.deployed ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center space-x-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>24/7 Online</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Joylanmagan
                      </span>
                    )}
                  </div>
                </div>

                {deployedInfo?.deployed ? (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-2xl space-y-4 text-center">
                    <div className="space-y-1">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">🎉 Muvaffaqiyatli joylandi</span>
                      <p className="text-[10px] text-slate-400">Sizning loyihangiz bepul bulutli serverda muvaffaqiyatli ishga tushirildi va istalgan joydan kirish mumkin.</p>
                    </div>

                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
                      <span className="text-emerald-400 truncate max-w-[140px]" title={deployedInfo.url}>
                        {deployedInfo.url}
                      </span>
                      <button
                        onClick={() => {
                          if (deployedInfo?.url) {
                            navigator.clipboard.writeText(deployedInfo.url);
                            showStatus("Havola nusxalandi!", "success");
                          }
                        }}
                        className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                      >
                        Nusxalash
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={deployedInfo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-[11px] font-extrabold transition active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ochish</span>
                      </a>
                    </div>

                    {/* QR Code for instant phone view */}
                    <div className="bg-white p-2.5 rounded-xl inline-block shadow-lg mx-auto border border-slate-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(deployedInfo.url || "")}`}
                        alt="QR-Code"
                        className="w-[120px] h-[120px]"
                      />
                      <span className="text-[8px] text-slate-500 font-mono font-bold block mt-1">Mobil Skanerlash</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/50 border border-slate-850 p-4 rounded-2xl space-y-3 text-left">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold text-slate-300">💡 Qanday ishlaydi?</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Loyihangizdagi barcha fayllar serverga nusxalanadi va mos muhit yaratiladi:
                      </p>
                      <ul className="text-[9px] text-slate-400 space-y-1 pl-3 list-disc">
                        <li><b>Veb (HTML/CSS/JS)</b> - to'g'ridan-to'g'ri statik sahifa sifatida ishlaydi.</li>
                        <li><b>Node.js / Python</b> - veb serveringiz <b>process.env.PORT</b> (yoki <b>PORT</b> env) orqali avtomatik portga bog'lanadi va ishga tushadi.</li>
                      </ul>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDeploy}
                  disabled={deployStatus === "deploying"}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                    deployStatus === "deploying"
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-sky-500 hover:bg-sky-600 text-slate-950 active:scale-95 cursor-pointer"
                  }`}
                >
                  {deployStatus === "deploying" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Serverga yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      <span>{deployedInfo?.deployed ? "Qayta joylashtirish (Redeploy)" : "Serverga joylashtirish (Deploy)"}</span>
                    </>
                  )}
                </button>

                {deployStatus === "success" && (
                  <p className="text-[10px] text-emerald-400 font-bold text-center">✓ Joylashtirish muvaffaqiyatli yakunlandi!</p>
                )}
                {deployStatus === "error" && (
                  <p className="text-[10px] text-red-400 font-bold text-center">❌ Joylashtirishda xatolik yuz berdi. Kodni tekshirib qayta urining.</p>
                )}
              </div>

              {/* Right Column: Console / Terminal Logs */}
              <div className="md:col-span-7 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-400 text-xs">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    <span className="font-bold">Real-vaqt Tizim Loglari (24/7 Console)</span>
                  </div>
                  <button
                    onClick={fetchDeployLogs}
                    disabled={isFetchingLogs}
                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition text-[10px] flex items-center space-x-1"
                    title="Loglarni yangilash"
                  >
                    <RefreshCw className={`w-3 h-3 ${isFetchingLogs ? "animate-spin" : ""}`} />
                    <span>Yangilash</span>
                  </button>
                </div>

                <div className="flex-1 bg-slate-950 border border-slate-850 rounded-2xl p-4 font-mono text-xs text-slate-300 h-[280px] md:h-[350px] overflow-y-auto space-y-1.5 no-scrollbar flex flex-col">
                  <div className="mt-auto">
                    {deployLogs ? (
                      deployLogs.split("\n").map((line, idx) => {
                        let colorClass = "text-slate-400";
                        if (line.includes("[Vigron Error]") || line.includes("Error:") || line.includes("xatosi")) {
                          colorClass = "text-red-400";
                        } else if (line.includes("[Vigron System]") || line.includes("✓")) {
                          colorClass = "text-emerald-400 font-bold";
                        } else if (line.includes("Deploying") || line.includes("Starting")) {
                          colorClass = "text-sky-400 font-bold";
                        }
                        return (
                          <div key={idx} className={`${colorClass} whitespace-pre-wrap leading-relaxed`}>
                            {line}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-500 italic text-center py-10">Tizimda hozircha hech qanday loglar yozilmagan.</div>
                    )}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between px-1">
                  <span>● Avtomatik yangilanish: faol (har 3 soniyada)</span>
                  <span>Port: {deployedInfo?.port || "Static N/A"}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold rounded-xl text-xs transition active:scale-95"
              >
                Panelni Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Mobil Sinxronizatsiya va Ulashish Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Smartphone className="w-5 h-5 text-cyan-400 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">Mobil Sinxronizatsiya</h3>
                  <p className="text-[10px] text-slate-400">Telefoningizda bir xil akkauntda ishlash</p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Ushbu QR kodni telefoningiz orqali skanerlang. Kompyuter va telefoningizda <b>bir xil shaxsiy akkaunt (sessiya)</b> ochiladi, barcha yozgan fayllaringiz va loyihalaringiz bir zumda sinxronlashadi!
              </p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl border border-slate-200 mx-auto transform transition duration-300 hover:scale-105">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}/?userEmail=${encodeURIComponent(user?.email || "")}&projectName=${encodeURIComponent(currentProject)}`
                  )}`}
                  alt="Sync QR Code"
                  className="w-[160px] h-[160px] mx-auto"
                />
                <span className="text-[9px] text-slate-500 font-bold block mt-2 tracking-wider">TELEFON ORQALI SKANERLASH</span>
              </div>

              {/* Copy URL Section */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest text-left">
                  Sinxronizatsiya havolasi (Sync Link)
                </label>
                <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-850">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/?userEmail=${encodeURIComponent(user?.email || "")}&projectName=${encodeURIComponent(currentProject)}`}
                    className="flex-1 bg-transparent text-slate-400 font-mono text-[10px] select-all outline-none border-none overflow-x-auto"
                  />
                  <button
                    onClick={handleCopySyncLink}
                    className="p-2 bg-slate-800 hover:bg-slate-750 text-cyan-400 rounded-lg transition active:scale-90"
                    title="Nusxalash"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {copiedLink && (
                  <p className="text-[10px] text-emerald-400 font-bold text-left animate-pulse">✓ Havola buferga muvaffaqiyatli nusxalandi!</p>
                )}
              </div>
            </div>

            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-850 text-left space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
                <QrCode className="w-3.5 h-3.5" />
                <span>Nega sinxronizatsiya kerak?</span>
              </div>
              <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
                <li>Boshqa telefon yoki qurilmada <b>404 / Fayl topilmadi</b> xatoligi bartaraf etiladi.</li>
                <li>Ikkala qurilma ham <b>bir xil loyiha fayllari</b> ustida to'liq ishlaydi.</li>
                <li>Haqiqiy vaqtda yozayotgan kodlaringizni jonli tekshirib olasiz.</li>
              </ul>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 font-extrabold rounded-xl text-xs transition active:scale-95"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Custom Project Manager Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Layers className="w-5 h-5 text-emerald-400 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">Loyiha Markazi (Multi-Project Hub)</h3>
                  <p className="text-[10px] text-slate-400">Loyihalaringizni boshqaring, yuklang va saqlang</p>
                </div>
              </div>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-section 1: Active Projects List */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                📁 Loyihalar Ro'yxati ({Array.isArray(projects) ? projects.length : 0})
              </h4>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {Array.isArray(projects) && projects.map((proj) => {
                  const projName = typeof proj === "string" ? proj : (proj?.name || "default");
                  const isActive = currentProject === projName;
                  return (
                    <div
                      key={projName}
                      onClick={() => handleSwitchProject(projName)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition cursor-pointer ${
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500/40 text-slate-100"
                          : "bg-slate-950/35 border-slate-800/80 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-lg">📂</span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold truncate">{projName}</p>
                          <p className="text-[9px] text-slate-500">
                            {isActive ? "Hozirgi faol loyiha" : "Saqlangan loyiha"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {isActive && (
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0">
                            Faol
                          </span>
                        )}
                        {projName !== "default" && (
                          <button
                            onClick={(e) => handleDeleteProject(projName, e)}
                            className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-lg transition"
                            title="Loyihani butunlay o'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sub-section 2: Create New Project */}
            <form onSubmit={handleCreateProject} className="p-3 bg-slate-950/50 border border-slate-800/70 rounded-2xl space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                ➕ Yangi Bo'sh Loyiha Yaratish
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Loyiha nomi..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isCreatingProject || !newProjectName.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shrink-0"
                >
                  {isCreatingProject ? "Yaratilmoqda..." : "Yaratish"}
                </button>
              </div>
            </form>

            {/* Sub-section 3: Import Project from Local PC/Phone */}
            <div className="p-3 bg-slate-950/50 border border-slate-800/70 rounded-2xl space-y-3">
              <div className="text-left">
                <h4 className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                  📥 Loyihani Chaqirish (Import)
                </h4>
                <p className="text-[9px] text-slate-500 mt-0.5">Kompyuter yoki telefondagi loyihani ZIP yoki Ochiq Papka ko'rinishida yuklang</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {/* ZIP Import button */}
                <label className="cursor-pointer flex-1">
                  <span className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 font-bold text-xs rounded-xl transition">
                    <Download className="w-3.5 h-3.5 rotate-180" />
                    <span>ZIP Import qilish</span>
                  </span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleImportProjectZip}
                    className="hidden"
                  />
                </label>

                {/* Folder Import button */}
                <label className="cursor-pointer flex-1">
                  <span className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl transition">
                    <FolderTree className="w-3.5 h-3.5" />
                    <span>Papkani Import qilish</span>
                  </span>
                  <input
                    type="file"
                    {...({
                      webkitdirectory: "",
                      directory: "",
                      multiple: true
                    } as any)}
                    onChange={handleImportProjectFolder}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Sub-section 4: Export Project */}
            <div className="p-3 bg-slate-950/50 border border-slate-800/70 rounded-2xl space-y-3 pt-2">
              <div className="text-left">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  💾 Loyihani Kompyuterga Saqlash (Export)
                </h4>
                <p className="text-[9px] text-slate-500 mt-0.5">Faol loyihani kompyuterga ZIP shaklida yoki to'g'ridan-to'g'ri ochiq papka sifatida saqlang</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    window.open(`${window.location.origin}/api/workspace/projects/export?projectName=${encodeURIComponent(currentProject)}`, "_blank");
                  }}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                  title="Faol loyihani ZIP shaklida yuklab olish"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>ZIP formatda saqlash</span>
                </button>

                <button
                  onClick={handleExportProjectFolder}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition"
                  title="Faol loyihani ochiq papka shaklida saqlash"
                >
                  <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ochiq papka shaklida saqlash</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Custom Authentication Modal (Sign In / Sign Up) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-base text-slate-100">
                  {isSignUp ? "Ro'yxatdan o'tish" : "Tizimga kirish"}
                </h3>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Ismingiz</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Alisher"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Email manzili</label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Maxfiy kalit</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-slate-950 font-bold text-xs rounded-xl transition active:scale-95 shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-1"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isSignUp ? "Hisob yaratish" : "Tizimga xavfsiz kirish"}</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-wider">Yoki</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLoginClick}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl transition active:scale-95 flex items-center justify-center space-x-2 shadow-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Google orqali kirish</span>
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[11px] text-slate-400 hover:text-emerald-400 transition font-medium"
              >
                {isSignUp 
                  ? "Sizda allaqachon hisob bormi? Kirish" 
                  : "Yangi hisob yaratishni xohlaysizmi? Ro'yxatdan o'tish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Profile & Statistics Modal - Premium Design Edition */}
      {isProfileModalOpen && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#141417]/95 border border-[#2b2b35]/80 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6 my-8 animate-slide-in relative overflow-hidden">
            
            {/* Glowing background decor */}
            <div className="absolute top-[-20%] left-[-20%] w-72 h-72 bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-72 h-72 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#24242d] pb-5 relative z-10">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/15">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-lg text-slate-100 tracking-tight">Dasturchi Profili</h3>
                    <span className="text-[9px] bg-sky-500/15 border border-sky-400/30 text-sky-400 font-extrabold px-2 py-0.5 rounded-full tracking-widest uppercase">
                      PRO LEVEL
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Hisob ma'lumotlari, unikal avatar generatori va ish stoli statistikasi</p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="p-2 hover:bg-[#202025] rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
              {/* Left Column: Personal info & Avatar Customizer (5 cols on md) */}
              <div className="md:col-span-5 space-y-5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                  <span>Avatar & Identifikatsiya</span>
                </h4>

                {/* Premium Interactive ID Card */}
                <div className="bg-gradient-to-b from-[#1c1c24] to-[#121216] border border-[#2d2d3a] rounded-2xl p-4 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-500/20 to-transparent rounded-bl-full pointer-events-none" />
                  
                  <div className="flex flex-col items-center text-center">
                    {/* Glowing Avatar frame */}
                    <div className="relative group/avatar mb-3">
                      <div className="absolute -inset-1.5 bg-gradient-to-r from-sky-400 to-indigo-500 rounded-2xl opacity-75 blur-[4px] group-hover/avatar:opacity-100 transition duration-500" />
                      <img 
                        src={profileAvatarSeed ? `https://api.dicebear.com/7.x/${profileAvatarStyle}/svg?seed=${encodeURIComponent(profileAvatarSeed.trim())}` : user.avatar} 
                        alt="Profile Avatar" 
                        className="w-20 h-20 rounded-2xl bg-[#141417] border border-[#252530] p-1.5 object-cover relative z-10 transition duration-300" 
                      />
                    </div>

                    <h5 className="font-extrabold text-base text-slate-100 tracking-tight">{profileNameInput || user.name}</h5>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-full">{user.email}</p>
                    
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {user.plan} PLAN
                      </span>
                      <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Uzbekistan
                      </span>
                    </div>
                  </div>
                </div>

                {/* Avatar Style Picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Avatar Uslubi (Style)</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "shapes", label: "Geometric Art" },
                      { id: "bottts-neutral", label: "Sleek Robot" },
                      { id: "initials", label: "Monogram" },
                      { id: "adventurer-neutral", label: "Minimal Face" },
                      { id: "pixel-art", label: "Retro Pixel" }
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setProfileAvatarStyle(style.id);
                          showStatus(`Avatar uslubi o'zgartirildi: ${style.label}`, "info");
                        }}
                        className={`px-2 py-1.5 rounded-xl border text-[10px] font-extrabold transition-all duration-200 text-center ${
                          profileAvatarStyle === style.id 
                            ? "bg-sky-500/15 border-sky-400/50 text-sky-400 shadow-md shadow-sky-500/5" 
                            : "bg-[#18181c] border-[#252530] text-slate-400 hover:text-slate-200 hover:border-[#353545]"
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Inputs area */}
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Ko'rsatiladigan Ism</label>
                    <input
                      type="text"
                      placeholder="Ismingizni kiriting..."
                      value={profileNameInput}
                      onChange={(e) => setProfileNameInput(e.target.value)}
                      className="w-full bg-[#18181c] border border-[#252530] rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Avatar kalit so'zi (Seed)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Kalit so'z..."
                        value={profileAvatarSeed}
                        onChange={(e) => setProfileAvatarSeed(e.target.value)}
                        className="flex-1 bg-[#18181c] border border-[#252530] rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newSeed = Math.random().toString(36).substring(7);
                          setProfileAvatarSeed(newSeed);
                        }}
                        className="px-3 bg-[#1e1e24] hover:bg-[#252530] border border-[#2d2d3a] text-slate-200 rounded-xl text-xs font-bold transition duration-200 flex items-center justify-center hover:scale-105 active:scale-95 group/dice"
                        title="Tasodifiy kalit so'z"
                      >
                        <span className="group-hover/dice:rotate-180 transition-transform duration-300">🎲</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const updatedUser = {
                          ...user,
                          name: profileNameInput.trim() || user.name,
                          avatar: profileAvatarSeed 
                            ? `https://api.dicebear.com/7.x/${profileAvatarStyle}/svg?seed=${encodeURIComponent(profileAvatarSeed.trim())}` 
                            : user.avatar
                        };
                        localStorage.setItem("vigron_user", JSON.stringify(updatedUser));
                        setUser(updatedUser);
                        showStatus("Profil muvaffaqiyatli saqlandi!", "success");
                        setIsProfileModalOpen(false);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-600 text-white rounded-xl text-xs font-extrabold transition duration-300 hover:shadow-lg hover:shadow-sky-500/20 hover:brightness-110 active:scale-95 flex items-center justify-center space-x-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Profilni Saqlash</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Statistics & Theme Swatches (7 cols on md) */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Gamified Level Progress Widget */}
                {(() => {
                  const countWorkspaceFiles = (items: WorkspaceItem[]): number => {
                    let count = 0;
                    const processItems = (list: WorkspaceItem[]) => {
                      for (const item of list) {
                        if (item.type === "file") count++;
                        else if (item.children) processItems(item.children);
                      }
                    };
                    processItems(items);
                    return count;
                  };

                  const totalFiles = countWorkspaceFiles(files);
                  const points = (projects.length * 100) + (totalFiles * 20);
                  const level = Math.floor(points / 200) + 1;
                  const levelXP = points % 200;
                  const levelProgress = Math.min(100, Math.floor((levelXP / 200) * 100));

                  let levelTitle = "Yosh Dasturchi";
                  if (level >= 8) levelTitle = "Tizim Me'mori (System Architect)";
                  else if (level >= 6) levelTitle = "Katta Muhandis (Staff Engineer)";
                  else if (level >= 4) levelTitle = "Full-Stack Dev Ops";
                  else if (level >= 2) levelTitle = "Professional Kodlovchi";

                  return (
                    <div className="bg-gradient-to-r from-[#171720] to-[#1c1c24] border border-[#2d2d3a] rounded-2xl p-4.5 space-y-3 shadow-xl relative overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-extrabold text-sky-400 uppercase tracking-widest">LOYIHA DARAJASI (LEVEL)</p>
                          <h5 className="text-sm font-black text-slate-100 mt-1 flex items-center">
                            <Sparkles className="w-4 h-4 text-amber-400 mr-1.5 animate-pulse" />
                            Daraja {level}: {levelTitle}
                          </h5>
                        </div>
                        <span className="text-[10px] font-mono font-extrabold text-slate-400 bg-[#252530] border border-[#303040] px-2 py-0.5 rounded-full">
                          {points} XP
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] text-slate-500 font-extrabold font-mono uppercase">
                          <span>Keyingi darajaga {200 - levelXP} XP kerak</span>
                          <span>{levelProgress}%</span>
                        </div>
                        {/* Progress Bar Container */}
                        <div className="w-full h-2 bg-[#121216] border border-[#22222d] rounded-full overflow-hidden p-[2px]">
                          <div 
                            className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${levelProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Grid Stats Widgets */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                    <span>Ish Stoli Statistikasi</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#18181c] border border-[#252530] hover:border-[#353545] rounded-xl transition duration-200">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Loyihalar</p>
                      <p className="text-lg font-black text-sky-400 mt-0.5">{projects.length}</p>
                    </div>
                    <div className="p-3 bg-[#18181c] border border-[#252530] hover:border-[#353545] rounded-xl transition duration-200">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Fayllar</p>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">
                        {(() => {
                          const countWorkspaceFiles = (items: WorkspaceItem[]): number => {
                            let count = 0;
                            const processItems = (list: WorkspaceItem[]) => {
                              for (const item of list) {
                                if (item.type === "file") count++;
                                else if (item.children) processItems(item.children);
                              }
                            };
                            processItems(items);
                            return count;
                          };
                          return countWorkspaceFiles(files);
                        })()}
                      </p>
                    </div>
                    <div className="p-3 bg-[#18181c] border border-[#252530] hover:border-[#353545] rounded-xl transition duration-200">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Faol Satrlar</p>
                      <p className="text-lg font-black text-indigo-400 mt-0.5">
                        {activeTabPath ? editorContent.split("\n").length : 0}
                      </p>
                    </div>
                    <div className="p-3 bg-[#18181c] border border-[#252530] hover:border-[#353545] rounded-xl transition duration-200 overflow-hidden">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Faol Loyiha</p>
                      <p className="text-[10px] font-mono font-black text-amber-400 truncate mt-1" title={currentProject}>
                        {currentProject}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Theme Selection Section */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                    <span>Dasturlash Muharriri Mavzusi</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: "vscode", label: "Studio Light", color: "bg-white border-slate-200", preview: "bg-indigo-600" },
                      { id: "slate", label: "Elegant Silk", color: "bg-slate-50 border-slate-200", preview: "bg-slate-400" },
                      { id: "emerald", label: "Mint Glass", color: "bg-emerald-50/50 border-emerald-200", preview: "bg-emerald-600" },
                      { id: "ocean", label: "Soft Aqua", color: "bg-cyan-50/50 border-cyan-200", preview: "bg-cyan-600" },
                      { id: "monokai", label: "Warm Sepia", color: "bg-amber-50/50 border-amber-200", preview: "bg-amber-600" },
                      { id: "cyberpunk", label: "Orchid Mist", color: "bg-fuchsia-50/50 border-fuchsia-200", preview: "bg-fuchsia-600" }
                    ].map((t) => {
                      const isActive = editorTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setEditorTheme(t.id);
                            localStorage.setItem("vigron_editor_theme", t.id);
                            showStatus(`Mavzu yangilandi: ${t.label}`, "success");
                          }}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all duration-350 relative overflow-hidden active:scale-95 ${t.color} ${
                            isActive 
                              ? "ring-2 ring-sky-500 border-sky-500 shadow-lg shadow-sky-500/10" 
                              : "hover:border-[#3c3c4a]"
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="text-[10px] font-black text-slate-100 truncate">{t.label}</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5 tracking-wider">
                              {isActive ? "TANLANGAN" : "MAVJUD"}
                            </span>
                          </div>
                          
                          {/* Color Dot swatch */}
                          <div className={`w-3 h-3 rounded-full shrink-0 shadow ${t.preview} ${isActive ? "scale-110 animate-pulse" : "opacity-80"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between border-t border-[#24242d] pt-5 text-xs relative z-10">
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setIsProfileModalOpen(false);
                }}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-extrabold rounded-xl transition duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Tizimdan Chiqish</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-6 py-2.5 bg-[#1e1e24] hover:bg-[#252530] border border-[#2d2d3a] hover:border-[#35354a] text-slate-200 rounded-xl font-extrabold transition duration-200"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
