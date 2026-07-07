import React from "react";
import { useStore } from "../store/useStore";

export default function CollaboratorWidget() {
  const { activeCollaborators, user } = useStore();

  return (
    <div className="flex items-center gap-1">
      {(activeCollaborators || []).map((col) => (
        <div
          key={col.userId}
          className="relative group"
          title={`${col.name || 'Collaborator'} ${col.userId === user?.uid ? "(You)" : ""}`}
        >
          <img
            src={col.photo || 'https://via.placeholder.com/28'}
            alt={col.name || 'Collaborator'}
            className="w-7 h-7 rounded-full border-2 border-[#0c0c0e] object-cover"
          />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0c0c0e]" />
        </div>
      ))}
    </div>
  );
}
