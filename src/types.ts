export interface WorkspaceItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  extension?: string;
  children?: WorkspaceItem[];
}

export interface FileTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
}

export interface TerminalLine {
  id: string;
  type: "input" | "stdout" | "stderr" | "info" | "success";
  text: string;
  timestamp: string;
  dir?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
