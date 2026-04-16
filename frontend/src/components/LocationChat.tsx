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
  const [suggestedQuestions] = useState([
    {
      category: "Real Estate Projects",
      question: "What are some of the top residential compounds located in the 6th Settlement of New Cairo?"
    },
    {
      category: "Education",
      question: "Which international schools and universities are available for residents living in El Shorouk City?"
    }
  ]);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("nawy_location_chat_session_id");
    if (stored) {
      setSessionId(stored);
    } else {
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem("nawy_location_chat_session_id", newId);
      setSessionId(newId);
    }
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "bot",
      text: "Hi there! I'm your Location Assistant. Ask me anything about areas, locations, or neighborhood vibes in Egypt!",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isNearFooter, setIsNearFooter] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch history when chat opens
  useEffect(() => {
    if (isOpen && sessionId) {
      const fetchHistory = async () => {
        try {
          const response = await fetch(`${apiBaseUrl}/chat/${sessionId}/history`);
          if (response.ok) {
            const data = await response.json();
            if (data.history && data.history.length > 0) {
              const formattedMessages: Message[] = data.history.map((msg: { role: string; content: string }, index: number) => ({
                id: `history_${index}`,
                type: msg.role === 'human' ? 'user' : 'bot',
                text: msg.content,
                timestamp: new Date(), // Backend doesn't store timestamps yet, so we use current session's "now"
              }));
              setMessages(formattedMessages);
            }
          }
        } catch (err) {
          console.error("Failed to fetch chat history:", err);
        }
      };
      
      fetchHistory();
    }
  }, [isOpen, sessionId, apiBaseUrl]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.innerHeight + window.pageYOffset;
      const pageHeight = document.documentElement.scrollHeight;
      // If we are within ~150px of the bottom (where the thin footer is)
      setIsNearFooter(pageHeight - scrollPosition < 120);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: currentInput,
          session_id: sessionId
        }),
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

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSend(fakeEvent);
    }, 100);
  };

  const clearChat = async () => {
    try {
      // Clear history on backend
      await fetch(`${apiBaseUrl}/chat/${sessionId}`, {
        method: "DELETE"
      });
      
      // Clear history on frontend
      setMessages([
          {
            id: "welcome",
            type: "bot",
            text: "Hi there! I'm your Location Assistant. Ask me anything about areas, locations, or neighborhood vibes in Egypt!",
            timestamp: new Date(),
          },
        ]);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
    }
  }

  const bottomOffset = isNearFooter ? (isCompareBarVisible ? 'bottom-40 sm:bottom-44' : 'bottom-32 sm:bottom-36') : (isCompareBarVisible ? 'bottom-20 sm:bottom-24' : 'bottom-6 sm:bottom-8');

  return (
    <div className={`hidden sm:flex fixed ${bottomOffset} right-6 z-[100] flex-col items-end gap-4 pointer-events-none transition-all duration-500`}>
      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`pointer-events-auto bg-white border border-slate-100 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col transition-all duration-300 ${
            isMinimized ? "h-12 w-48 sm:h-16 sm:w-64" : "h-[400px] sm:h-[500px] w-[280px] xs:w-[320px] sm:w-[350px] md:w-[400px]"
          } animate-in slide-in-from-bottom-10 fade-in`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003D6B] to-[#1A365D] p-3 sm:p-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-[#5DBDB6]/20 p-1.5 sm:p-2 rounded-lg sm:rounded-xl backdrop-blur-md border border-white/10">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#5DBDB6]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-tight leading-none sm:leading-normal">Location Guide</h3>
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
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-slate-50/50 custom-scrollbar flex flex-col">
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
                      className={`max-w-[88%] px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm ${
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
              <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
                {/* Suggestions Chips */}
                <div className="mb-3 flex flex-col gap-1.5">
                    {suggestedQuestions.map((s, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSuggestionClick(s.question)}
                            disabled={isLoading}
                            className="w-full px-2.5 py-1.5 bg-slate-50 hover:bg-[#5DBDB6]/10 border border-slate-200 hover:border-[#5DBDB6]/30 rounded-lg transition-all flex flex-col text-left active:scale-95 group"
                        >
                            <span className="text-[7px] font-black text-[#5DBDB6] uppercase tracking-wider mb-0.5 leading-none">{s.category}</span>
                            <span className="text-[9px] font-bold text-slate-600 leading-tight group-hover:text-[#003D6B]">
                                {s.question}
                            </span>
                        </button>
                    ))}
                </div>

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
                      placeholder="Ask me anything..."
                      className="w-full pl-3 pr-10 py-2 sm:pl-4 sm:pr-12 sm:py-3 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-[11px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003D6B]/10 focus:border-[#003D6B]/30 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-0.5 top-0.5 p-1.5 sm:right-1 sm:top-1 sm:p-2 bg-[#003D6B] text-white rounded-lg sm:rounded-xl hover:bg-[#1A365D] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Send className="w-4 h-4 sm:w-5 sm:h-5" />}
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
          className="pointer-events-auto bg-[#003D6B] hover:bg-[#1A365D] text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-90 group relative"
        >
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E94E3D] rounded-full border-2 border-white animate-pulse"></div>
          <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
}
