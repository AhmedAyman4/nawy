import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Loader2, MapPin, Minimize2, Maximize2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  timestamp: Date;
}

interface LocationChatProps {
  apiBaseUrl: string;
  isCompareBarVisible?: boolean;
}

export function LocationChat({ apiBaseUrl, isCompareBarVisible = false }: LocationChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "bot",
      text: "Hi there! I'm your Nawy Location Assistant. Ask me anything about areas, locations, or neighborhood vibes in Egypt!",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentInput }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: data.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: "Sorry, I'm having trouble connecting to my location database. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
        {
          id: "welcome",
          type: "bot",
          text: "Hi there! I'm your Nawy Location Assistant. Ask me anything about areas, locations, or neighborhood vibes in Egypt!",
          timestamp: new Date(),
        },
      ]);
  }

  return (
    <div className={`fixed ${isCompareBarVisible ? 'bottom-24 sm:bottom-6' : 'bottom-6'} right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none transition-all duration-500`}>
      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`pointer-events-auto bg-white border border-slate-100 shadow-2xl rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimized ? 'h-16 w-64' : 'h-[500px] w-[350px] md:w-[400px]'
          } animate-in slide-in-from-bottom-10 fade-in`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003D6B] to-[#1A365D] p-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-[#5DBDB6]/20 p-2 rounded-xl backdrop-blur-md border border-white/10">
                <MapPin className="w-4 h-4 text-[#5DBDB6]" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tight">Location Guide</h3>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5DBDB6] animate-pulse"></span>
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">AI Agent Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 custom-scrollbar flex flex-col">
                <style jsx>{`
                  .chat-markdown :global(p) { margin-bottom: 0.5rem; }
                  .chat-markdown :global(ul) { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.5rem; }
                  .chat-markdown :global(ol) { list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 0.5rem; }
                  .chat-markdown :global(strong) { font-weight: 800; color: inherit; }
                  .chat-markdown :global(table) { width: 100%; border-collapse: collapse; margin: 0.5rem 0; font-size: 0.75rem; }
                  .chat-markdown :global(th), .chat-markdown :global(td) { border: 1px solid #e2e8f0; padding: 0.4rem; text-align: left; }
                  .chat-markdown :global(th) { background-color: #f8fafc; }
                `}</style>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                        m.type === "user"
                          ? "bg-[#003D6B] text-white rounded-tr-none shadow-md"
                          : "bg-white text-slate-700 rounded-tl-none shadow-sm border border-slate-100"
                      }`}
                    >
                      <div className="chat-markdown prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.text}
                        </ReactMarkdown>
                      </div>
                      <div className={`text-[10px] mt-1 opacity-50 ${m.type === "user" ? "text-right" : "text-left"}`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-2">
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-[#5DBDB6] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-[#5DBDB6] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-[#5DBDB6] rounded-full animate-bounce"></div>
                        </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-slate-100">
                <form 
                  onSubmit={handleSend}
                  className="relative flex items-center gap-2"
                >
                  <button 
                    type="button"
                    onClick={clearChat}
                    className="p-2.5 text-slate-300 hover:text-red-400 transition-colors"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about New Cairo, North Coast..."
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003D6B]/10 focus:border-[#003D6B]/30 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-1 top-1 p-2 bg-[#003D6B] text-white rounded-xl hover:bg-[#1A365D] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </form>
                <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                  Powered by <span className="text-[#5DBDB6] font-bold">Nawy AI</span> • Expert insights on Egyptian real estate
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button / Toggle */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto bg-[#003D6B] hover:bg-[#1A365D] text-white p-5 rounded-3xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 group relative"
        >
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#E94E3D] rounded-full border-2 border-white animate-pulse"></div>
          <MessageCircle className="w-8 h-8 group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
}
