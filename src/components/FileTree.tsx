import React, { useState } from "react";
import { Folder, FolderOpen, File, Plus, Trash2, ChevronDown, ChevronRight, FileCode, Check, X, FolderPlus } from "lucide-react";
import { WorkspaceItem } from "../types";
import { LanguageLogo } from "./LanguageLogo";

interface FileTreeProps {
  files: WorkspaceItem[];
  onOpenFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onCreateFile: (parentDir: string, name: string, isFolder: boolean) => Promise<void>;
  activeFilePath?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  onOpenFile,
  onDeleteFile,
  onCreateFile,
  activeFilePath,
}) => {
  return (
    <div className="space-y-1">
      {Array.isArray(files) && files.map((item) => (
        <FileNode
          key={item.path}
          item={item}
          onOpenFile={onOpenFile}
          onDeleteFile={onDeleteFile}
          onCreateFile={onCreateFile}
          activeFilePath={activeFilePath}
          depth={0}
        />
      ))}
      {(!files || files.length === 0) && (
        <p className="text-sm text-slate-500 italic p-3 text-center">Fayllar topilmadi.</p>
      )}
    </div>
  );
};

interface FileNodeProps {
  item: WorkspaceItem;
  onOpenFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onCreateFile: (parentDir: string, name: string, isFolder: boolean) => Promise<void>;
  activeFilePath?: string;
  depth: number;
}

const FileNode: React.FC<FileNodeProps> = ({
  item,
  onOpenFile,
  onDeleteFile,
  onCreateFile,
  activeFilePath,
  depth,
}) => {
  const [isOpen, setIsOpen] = useState(depth === 0); // Open top-level folders by default
  const [isCreating, setIsCreating] = useState(false);
  const [createType, setCreateType] = useState<"file" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const isFolder = item.type === "directory";
  const isActive = activeFilePath === item.path;

  const handleToggle = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onOpenFile(item.path);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !createType) return;

    const parentDir = isFolder ? item.path : "";
    await onCreateFile(parentDir, newItemName.trim(), createType === "folder");
    setNewItemName("");
    setIsCreating(false);
    setCreateType(null);
    setIsOpen(true);
  };

  const handleDelete = () => {
    onDeleteFile(item.path);
    setIsDeleting(false);
  };

  return (
    <div className="select-none">
      <div
        className={`group flex items-center justify-between py-2 px-3 rounded-xl transition duration-200 cursor-pointer ${
          isActive
            ? "bg-slate-800 border-l-2 border-emerald-500 text-emerald-400"
            : "hover:bg-slate-800 text-slate-300 hover:text-slate-100"
        }`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        onClick={handleToggle}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          {isFolder ? (
            <span className="text-slate-500 hover:text-slate-300">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          ) : (
            <span className="w-4" />
          )}

          <span className="flex-shrink-0">
            {isFolder ? (
              isOpen ? (
                <FolderOpen className="w-4 h-4 text-emerald-400 fill-emerald-500/10" />
              ) : (
                <Folder className="w-4 h-4 text-emerald-500 fill-emerald-500/15" />
              )
            ) : (
              <LanguageLogo extension={item.extension} fileName={item.name} className="w-4 h-4" />
            )}
          </span>

          <span className="text-sm font-medium truncate">{item.name}</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2 md:space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition duration-150 shrink-0">
          {isFolder && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateType("file");
                  setIsCreating(true);
                }}
                className="p-2 md:p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 transition"
                title="Yangi fayl"
              >
                <Plus className="w-4 h-4 text-slate-300 md:text-inherit" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCreateType("folder");
                  setIsCreating(true);
                }}
                className="p-2 md:p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-emerald-400 transition"
                title="Yangi papka"
              >
                <FolderPlus className="w-4 h-4 text-slate-300 md:text-inherit" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="p-2 md:p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition"
            title="O'chirish"
          >
            <Trash2 className="w-4 h-4 text-slate-300 md:text-inherit" />
          </button>
        </div>
      </div>

      {/* Item Creation Input */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="flex items-center space-x-2 py-1.5 px-3 mt-1 bg-slate-800 rounded-xl border border-slate-700"
          style={{ marginLeft: `${depth * 12 + 24}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="flex-shrink-0">
            {createType === "folder" ? (
              <Folder className="w-4 h-4 text-emerald-500" />
            ) : (
              <File className="w-4 h-4 text-slate-400" />
            )}
          </span>
          <input
            type="text"
            autoFocus
            placeholder={createType === "folder" ? "Papka nomi..." : "Fayl nomi..."}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder-slate-500"
          />
          <button type="submit" className="p-1 text-emerald-400 hover:bg-slate-700 rounded">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreating(false);
              setCreateType(null);
            }}
            className="p-1 text-slate-400 hover:bg-slate-700 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Directory Children */}
      {isFolder && isOpen && item.children && (
        <div className="mt-0.5 space-y-0.5">
          {Array.isArray(item.children) && item.children.map((child) => (
            <FileNode
              key={child.path}
              item={child}
              onOpenFile={onOpenFile}
              onDeleteFile={onDeleteFile}
              onCreateFile={onCreateFile}
              activeFilePath={activeFilePath}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
