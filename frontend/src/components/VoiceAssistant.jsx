import React, { useState, useCallback, useEffect } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { Conversation } from '@elevenlabs/client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "pWl97V7Z56tM8N7X2B5p"; // Placeholder

export function VoiceAssistant({ hospitalId }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversation, setConversation] = useState(null);

  const startConversation = useCallback(async () => {
    try {
      setIsConnecting(true);
      
      // Request microphone access
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Fetch the current hospital's inventory and global items catalog to provide context to the LLM
      let inventoryContext = "No inventory data available.";
      try {
        const [invRes, itemsRes] = await Promise.all([
          fetch(`http://localhost:5000/api/hospitals/${hospitalId}/inventory`),
          fetch(`http://localhost:5000/api/items`),
        ]);
        if (invRes.ok && itemsRes.ok) {
          const invData = await invRes.json();
          const itemsData = await itemsRes.json();
          const itemMap = Object.fromEntries(itemsData.items.map(i => [i.id, i.name]));
          inventoryContext = invData.inventory.map(entry =>
            `${itemMap[entry.itemId] || entry.itemId} (entryId: ${entry.id})`
          ).join(", ");
        }
      } catch (err) {
        console.error("[Voice] Failed to fetch inventory context:", err);
      }

      const conv = await Conversation.startSession({
        agentId: AGENT_ID,
        onConnect: () => {
          setIsConnected(true);
          setIsConnecting(false);
          console.log("[Voice] Connected to ElevenLabs");
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsConnecting(false);
          setConversation(null);
          console.log("[Voice] Disconnected from ElevenLabs");
        },
        onError: (error) => {
          console.error("[Voice] Error:", error);
          setIsConnecting(false);
        },
        onModeChange: (mode) => {
          setIsSpeaking(mode.mode === 'speaking');
        },
        // Pass hospital context so the agent knows who we are and what items exist
        dynamicVariables: {
          hospitalId: hospitalId,
          inventoryList: inventoryContext,
        },
      });

      setConversation(conv);
    } catch (error) {
      console.error("[Voice] Failed to start conversation:", error);
      setIsConnecting(false);
    }
  }, [hospitalId]);

  const stopConversation = useCallback(async () => {
    if (conversation) {
      await conversation.endSession();
      setConversation(null);
    }
  }, [conversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversation) {
        conversation.endSession();
      }
    };
  }, [conversation]);

  return (
    <div className="fixed bottom-10 right-10 z-50 flex flex-col items-end gap-4">
      {/* Active Conversation Indicator */}
      {isConnected && (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-300">
          <div className="relative">
            <div className={cn(
              "w-3 h-3 rounded-full bg-emerald-500",
              isSpeaking && "animate-ping"
            )} />
            {isSpeaking && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 opacity-50 animate-pulse" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Beacon Assistant</span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {isSpeaking ? "Beacon is speaking..." : "Listening..."}
            </span>
          </div>
          <button 
            onClick={stopConversation}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      )}

      {/* Main Action Button */}
      <button
        onClick={isConnected ? stopConversation : startConversation}
        disabled={isConnecting}
        className={cn(
          "relative group p-6 rounded-full shadow-2xl transition-all duration-500 active:scale-95",
          isConnected 
            ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" 
            : "bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-zinc-950/20",
          isConnecting && "opacity-50 cursor-not-allowed"
        )}
      >
        {/* Pulsing rings when connected */}
        {isConnected && (
          <>
            <div className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full bg-rose-500 animate-pulse opacity-40" />
          </>
        )}

        <div className="relative z-10">
          {isConnecting ? (
            <div className="w-8 h-8 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
          ) : isConnected ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white dark:text-zinc-900" />
          )}
        </div>

        {/* Tooltip */}
        {!isConnected && (
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            Talk to Beacon
          </div>
        )}
      </button>
    </div>
  );
}
