import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronDown, Sparkles } from 'lucide-react';
import { useCollabStore } from '../../stores/collabStore';

export const LiveCollabChat: React.FC = () => {
  const { 
    isLive, 
    chatMessages, 
    unreadCount, 
    isChatOpen, 
    toggleChat, 
    sendChatMessage, 
    myParticipant 
  } = useCollabStore();

  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al recibir mensajes
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  if (!isLive) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendChatMessage(inputMessage);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Inmunidad total contra atajos del canvas UML
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 font-sans select-none">
      {!isChatOpen ? (
        <button
          onClick={toggleChat}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#14171d]/95 hover:bg-[#181c24] text-slate-200 border border-[#242934] shadow-xl shadow-black/50 hover:border-indigo-500/40 transition-all active:scale-95 cursor-pointer group backdrop-blur-md"
          title="Abrir Chat Colaborativo"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare size={16} className="text-indigo-400 group-hover:scale-110 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 px-1.5 py-0.2 bg-rose-500 text-white text-[10px] font-mono font-bold rounded-full animate-bounce shadow-sm">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-200 font-sans">Chat en Vivo</span>
        </button>
      ) : (
        <div 
          className="w-80 h-96 flex flex-col rounded-2xl border border-[#242934] bg-[#14171d]/95 shadow-2xl shadow-black/80 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#242934] bg-[#0f1115]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <MessageSquare size={14} />
              </div>
              <div>
                <h4 className="text-xs font-display font-bold text-slate-200 leading-none">Chat Colaborativo</h4>
                <span className="text-[10px] font-sans text-slate-400">Mensajería en tiempo real</span>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-[#181c24] rounded-lg transition-colors cursor-pointer"
              title="Minimizar chat"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#14171d] scrollbar-thin scrollbar-thumb-[#242934] scrollbar-track-transparent">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500">
                <Sparkles size={22} className="mb-2 text-indigo-400/50" />
                <p className="text-xs font-medium text-slate-300 font-sans">No hay mensajes aún</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-sans">Envía un saludo a los colaboradores de la sala.</p>
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isMe = msg.senderId === myParticipant?.userId;
                const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span 
                        className="text-[10px] font-semibold truncate max-w-[120px] font-sans"
                        style={{ color: msg.senderColor || '#94A3B8' }}
                      >
                        {isMe ? 'Tú' : msg.senderName}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">{timeStr}</span>
                    </div>
                    <div
                      className={`px-3 py-1.5 text-xs max-w-[85%] break-words leading-relaxed font-sans ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-xs shadow-sm'
                          : 'bg-[#181c24] text-slate-200 rounded-2xl rounded-tl-xs border border-[#242934]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form 
            onSubmit={handleSend}
            className="p-2.5 border-t border-[#242934] bg-[#0f1115] flex items-center gap-1.5"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              maxLength={250}
              className="flex-1 bg-[#14171d] border border-[#242934] focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden transition-colors font-sans"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className={`p-2 rounded-lg transition-all ${
                inputMessage.trim()
                  ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 cursor-pointer shadow-sm shadow-indigo-500/20'
                  : 'bg-[#181c24] text-slate-600 cursor-not-allowed border border-[#242934]'
              }`}
              title="Enviar mensaje"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
