import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../store/useStore";
import { MessageSquare, Send, Check, Trash, CornerDownRight, Smile, User, AtSign, Mic, StopCircle } from "lucide-react";
import { Comment } from "../types";

interface CommentsPaneProps {
  onClose: () => void;
}

export default function CommentsPane({ onClose }: CommentsPaneProps) {
  const { 
    activeDocumentId, 
    comments, 
    fetchComments, 
    addComment, 
    resolveComment,
    workspaces,
    activeWorkspaceId,
    submitVoiceComment
  } = useStore();

  const [commentText, setCommentText] = useState("");
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [showReplyForm, setShowReplyForm] = useState<Record<string, boolean>>({});
  
  // Mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState(0);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (activeDocumentId) {
      fetchComments(activeDocumentId);
    }
  }, [activeDocumentId]);

  // Extract collaborators available for @mentions
  const activeWs = workspaces.find(w => w.id === activeWorkspaceId);
  const workspaceTeammates = activeWs?.members || [];

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCommentText(text);

    // Detect @ symbol for autocomplete trigger
    const cursorIndex = e.target.selectionStart || 0;
    const textBeforeCursor = text.slice(0, cursorIndex);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx !== -1 && lastAtIdx === textBeforeCursor.length - 1) {
      setShowMentions(true);
      setMentionQuery("");
      setMentionPosition(lastAtIdx);
    } else if (showMentions) {
      // If we are already tracking a mention
      const query = textBeforeCursor.slice(mentionPosition + 1);
      if (query.includes(" ")) {
        setShowMentions(false);
      } else {
        setMentionQuery(query);
      }
    }
  };

  const handleSelectMention = (teammateEmail: string) => {
    const handle = teammateEmail.split("@")[0];
    const textBeforeMention = commentText.slice(0, mentionPosition);
    const textAfterMention = commentText.slice(commentInputRef.current?.selectionStart || 0);
    const newText = `${textBeforeMention}@${handle} ${textAfterMention}`;
    
    setCommentText(newText);
    setShowMentions(false);
    commentInputRef.current?.focus();
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeDocumentId) return;

    await addComment(commentText, null);
    setCommentText("");
  };

  const handleVoiceComment = async () => {
    if (!activeDocumentId) return;
    if (isRecording) {
      setIsRecording(false);
      // Simulate posting voice comment log
      await submitVoiceComment(
        activeDocumentId, 
        "🎤 [Voice Note] Audio annotation attached. Click to stream playback...", 
        "data:audio/mp3;base64,mock", 
        8
      );
    } else {
      setIsRecording(true);
    }
  };

  const handleSendReply = async (parentId: string) => {
    const rText = replyTexts[parentId];
    if (!rText?.trim() || !activeDocumentId) return;

    await addComment(rText, parentId);
    setReplyTexts(prev => ({ ...prev, [parentId]: "" }));
    setShowReplyForm(prev => ({ ...prev, [parentId]: false }));
  };

  // Organize comments into parent threads and child replies
  const docComments = comments.filter(c => c.docId === activeDocumentId);
  const parentComments = docComments.filter(c => !c.parentId);
  const replies = docComments.filter(c => c.parentId);

  return (
    <div className="h-full flex flex-col bg-[#0c0c0e] border-l border-white/10 w-80 text-white relative">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white/80">Discussions</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 px-2 py-1 rounded"
        >
          Close
        </button>
      </div>

      {/* Comment Threads area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {parentComments.length === 0 ? (
          <div className="py-24 text-center text-xs text-white/30 italic">
            No active discussion notes pinned on this specification.
          </div>
        ) : (
          parentComments.map((cmt) => {
            const threadReplies = replies.filter(r => r.parentId === cmt.id);
            return (
              <div key={cmt.id} className="space-y-2.5 p-3.5 rounded-2xl bg-white/3 border border-white/5">
                {/* Main Comment Node */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <img
                      src={cmt.authorPhoto || "https://api.dicebear.com/7.x/initials/svg?seed=Teammate"}
                      alt="avatar"
                      className="w-5 h-5 rounded-full object-cover border border-white/10"
                    />
                    <span className="text-[10px] font-bold text-white/90">{cmt.author}</span>
                    <span className="text-[8px] text-white/30 font-mono ml-auto">
                      {new Date(cmt.createdAt).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => resolveComment(cmt.id)}
                      className="p-1 rounded hover:bg-emerald-500/10 text-white/20 hover:text-emerald-400 transition-colors"
                      title="Resolve Thread"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-white/70 leading-normal pl-0.5">{cmt.text}</p>
                </div>

                {/* Sub-Replies inside Thread */}
                {threadReplies.length > 0 && (
                  <div className="space-y-2.5 pl-4 border-l border-white/5 pt-1.5">
                    {threadReplies.map((rep) => (
                      <div key={rep.id} className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <CornerDownRight className="w-3 h-3 text-white/20 shrink-0" />
                          <img
                            src={rep.authorPhoto || "https://api.dicebear.com/7.x/initials/svg?seed=Reply"}
                            alt="avatar"
                            className="w-4.5 h-4.5 rounded-full object-cover border border-white/5"
                          />
                          <span className="text-[9px] font-bold text-white/80">{rep.author}</span>
                          <span className="text-[7px] text-white/30 font-mono ml-auto">
                            {new Date(rep.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 leading-normal pl-4.5">{rep.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply triggers and simple inline sheets */}
                <div className="pt-1 flex items-center justify-between">
                  {!showReplyForm[cmt.id] ? (
                    <button
                      onClick={() => setShowReplyForm(prev => ({ ...prev, [cmt.id]: true }))}
                      className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wide flex items-center gap-1"
                    >
                      Reply to thread
                    </button>
                  ) : (
                    <div className="w-full flex gap-1.5 mt-1.5">
                      <input
                        type="text"
                        placeholder="Type threaded reply..."
                        value={replyTexts[cmt.id] || ""}
                        onChange={e => setReplyTexts(prev => ({ ...prev, [cmt.id]: e.target.value }))}
                        className="flex-grow px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] placeholder-white/20 focus:outline-none focus:border-indigo-500/50 text-white font-medium"
                      />
                      <button
                        onClick={() => handleSendReply(cmt.id)}
                        className="px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition-colors text-[10px]"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Autocomplete suggestion drop sheet */}
      {showMentions && (
        <div className="absolute bottom-16 left-4 right-4 bg-[#141417]/95 border border-white/10 rounded-xl shadow-2xl p-1 z-30 space-y-0.5">
          <div className="px-2.5 py-1 text-[8px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1 border-b border-white/5 mb-1 select-none">
            <AtSign className="w-3 h-3 text-indigo-400" /> Mention Workspace Teammate
          </div>
          {workspaceTeammates
            .filter(t => t.email.toLowerCase().includes(mentionQuery.toLowerCase()))
            .slice(0, 5)
            .map(mate => (
              <button
                key={mate.userId}
                onClick={() => handleSelectMention(mate.email)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all text-[10px] font-semibold flex items-center gap-2 group"
              >
                <div className="w-4 h-4 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[8px] text-indigo-300">
                  {mate.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-white/80 group-hover:text-indigo-400 truncate">{mate.email}</span>
                <span className="text-[8px] text-white/20 ml-auto uppercase tracking-wider">{mate.role}</span>
              </button>
            ))}
        </div>
      )}

      {/* Send Global discussion box */}
      <div className="p-4 border-t border-white/10 bg-white/2 shrink-0">
        <form onSubmit={handleSendComment} className="flex gap-2">
          <input
            ref={commentInputRef}
            type="text"
            value={commentText}
            onChange={handleTextChange}
            placeholder={isRecording ? "Recording voice note..." : "Write collaborative note... (type @)"}
            disabled={isRecording}
            className="flex-grow px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs placeholder-white/20 focus:outline-none focus:border-indigo-500/50 text-white font-medium disabled:opacity-40"
          />
          <button
            type="button"
            onClick={handleVoiceComment}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 border ${isRecording ? "bg-rose-600/20 text-rose-400 border-rose-500/30 animate-pulse" : "bg-white/5 text-white/55 border-white/10 hover:text-white"}`}
            title="Attach Voice Note Comment"
          >
            {isRecording ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            type="submit"
            disabled={!commentText.trim() || isRecording}
            className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl transition-all flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
