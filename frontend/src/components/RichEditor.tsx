import React, { useRef, useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { 
  Bold, 
  Italic, 
  Code, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Quote, 
  Link as LinkIcon, 
  Table, 
  Eye, 
  FileEdit, 
  Columns, 
  Check, 
  Cloud, 
  Cpu, 
  Clock 
} from "lucide-react";
import Markdown from "react-markdown";
import CollaboratorWidget from "./CollaboratorWidget";

interface RichEditorProps {
  content: string;
  onUpdate: (val: string) => void;
  title: string;
}

export default function RichEditor({ content, onUpdate, title }: RichEditorProps) {
  const { 
    activeCollaborators, 
    sendTyping, 
    sendCursorMove, 
    user, 
    activeDocumentId 
  } = useStore();

  const [editorMode, setEditorMode] = useState<"edit" | "preview" | "split">("split");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const typingTimerRef = useRef<any>(null);

  // Compute stats
  const characterCount = content.length;
  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200); // 200 words/min average

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);

    // Trigger real-time co-authoring typing updates
    if (activeDocumentId) {
      sendTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        sendTyping(false);
      }, 1500);
    }
  };

  const handleCursorOrSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea || !activeDocumentId) return;

    // Send cursor position updates
    const selectionStart = textarea.selectionStart;
    sendCursorMove(selectionStart, 0);
  };

  const insertMarkdown = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    let replacement = "";
    if (syntax === "bold") replacement = `**${selection || "bold text"}**`;
    else if (syntax === "italic") replacement = `*${selection || "italic text"}*`;
    else if (syntax === "code") replacement = `\`\`\`javascript\n${selection || "console.log('CollabDocs');"}\n\`\`\``;
    else if (syntax === "h1") replacement = `# ${selection || "Heading 1"}`;
    else if (syntax === "h2") replacement = `## ${selection || "Heading 2"}`;
    else if (syntax === "list") replacement = `- `;
    else if (syntax === "numbered-list") replacement = `1. `;
    else if (syntax === "quote") replacement = `\n> ${selection || "Blockquote"}`;
    else if (syntax === "table") {
      const rows = parseInt(prompt("Rows:", "3") || "3");
      const cols = parseInt(prompt("Cols:", "3") || "3");
      
      let table = "\n";
      // Header row
      table += "|" + Array(cols).fill(" Header ").join("|") + "|\n";
      // Separator row
      table += "|" + Array(cols).fill("---").join("|") + "|\n";
      // Content rows
      for (let i = 0; i < rows; i++) {
        table += "|" + Array(cols).fill(" Content ").join("|") + "|\n";
      }
      replacement = table;
    }
    else if (syntax === "link") replacement = `[${selection || "Link description"}](https://veltora.com)`;

    const newText = text.substring(0, start) + replacement + text.substring(end);
    onUpdate(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  return (
    <div className="flex-grow flex flex-col min-w-0 bg-[#070708] text-white">
      {/* Floating Toolbar and View controls */}
      <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#0c0c0e]/60 backdrop-blur-md select-none">
        {/* Markdown Action Items */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertMarkdown("bold")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Bold text"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("italic")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Italic text"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("h1")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("h2")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("code")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Code block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("list")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Bullet list"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("numbered-list")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Numbered list"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("quote")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Blockquote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("link")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Insert link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertMarkdown("table")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all"
            title="Markdown table"
          >
            <Table className="w-4 h-4" />
          </button>
        </div>

        {/* Sync Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 font-semibold bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10">
          <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Synced with Veltora Core Caches</span>
        </div>

        <CollaboratorWidget />

        {/* View Layout Controls */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-1 flex gap-1">
          <button
            onClick={() => setEditorMode("edit")}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${editorMode === "edit" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
          >
            <FileEdit className="w-3 h-3" /> Edit
          </button>
          <button
            onClick={() => setEditorMode("split")}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${editorMode === "split" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
          >
            <Columns className="w-3 h-3" /> Split
          </button>
          <button
            onClick={() => setEditorMode("preview")}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${editorMode === "preview" ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
          >
            <Eye className="w-3 h-3" /> View
          </button>
        </div>
      </div>

      {/* Editor & Preview stage */}
      <div className="flex-grow flex min-h-0 relative overflow-hidden">
        {/* Editor Side */}
        {(editorMode === "edit" || editorMode === "split") && (
          <div className="flex-1 flex flex-col relative h-full">
            {/* Typing collaborators indicators */}
            <div className="absolute top-2 right-4 z-20 flex flex-col gap-1 select-none pointer-events-none">
              {activeCollaborators
                .filter(col => col.userId !== user?.uid && col.isTyping)
                .map(col => (
                  <div key={col.userId} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#000]/80 border border-indigo-500/30 text-[9px] font-mono text-indigo-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
                    <span>{col.email.split("@")[0]} is typing...</span>
                  </div>
                ))}
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              onSelect={handleCursorOrSelect}
              placeholder="Draft documentation spec here using standard Markdown layout..."
              className="w-full h-full p-8 bg-transparent text-sm font-mono text-white/95 focus:outline-none placeholder-white/10 resize-none leading-relaxed overflow-y-auto"
            />
          </div>
        )}

        {/* Divider block in split mode */}
        {editorMode === "split" && <div className="w-[1px] bg-white/10 shrink-0" />}

        {/* Preview Side */}
        {(editorMode === "preview" || editorMode === "split") && (
          <div className="flex-1 overflow-y-auto p-8 prose prose-invert max-w-none text-white/90 bg-[#040405] leading-relaxed select-text">
            {content.trim() === "" ? (
              <div className="py-24 text-center text-xs text-white/20 italic">
                Awaiting specification input... View compiled preview instantly.
              </div>
            ) : (
              <div className="markdown-body">
                <Markdown>{content}</Markdown>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats and metadata footer bar */}
      <div className="px-6 py-2 border-t border-white/5 bg-[#09090b]/80 shrink-0 text-[10px] font-mono text-white/40 flex items-center justify-between select-none">
        <div className="flex items-center gap-4">
          <span>Words: <strong className="text-white/60">{wordCount}</strong></span>
          <span>Chars: <strong className="text-white/60">{characterCount}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-white/30" />
          <span>Est. Reading Time: <strong className="text-indigo-400">{readingTime} min</strong></span>
        </div>
      </div>
    </div>
  );
}
