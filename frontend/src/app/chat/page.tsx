"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, MapPin, Trash2, ArrowLeft, MessageSquare, Info, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  timestamp: Date;
}

const API_BASE_URL = "https://ahmed-ayman-nawy-property-recommender.hf.space";

export default function ChatPage() {
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
    // This runs only on the client
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
      text: "Welcome to the **Nawy Location Intelligence** center.\r\n\r\nI'm here to help you explore the finest neighborhoods and investment hotspots in Egypt. Ask me about:\r\n\r\n*   **Neighborhood Vibes**: What's it like living in New Cairo vs. Sheikh Zayed?\r\n*   **Commute & Connectivity**: How easy is it to get to the New Capital?\r\n*   **Lifestyle & Amenities**: Where can I find the best schools or sporting clubs?\r\n*   **Investment Potential**: Which areas are showing the fastest growth?\r\n\r\nHow can I guide your search today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch history when page loads
  useEffect(() => {
    if (!sessionId) return; // Wait for sessionId to be initialized on client

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/location/${sessionId}/history`);
        if (response.ok) {
          const data = await response.json();
          if (data.history && data.history.length > 0) {
            const formattedMessages: Message[] = data.history.map((msg: { role: string; content: string }, index: number) => ({
              id: `history_${index}`,
              type: msg.role === 'human' ? 'user' : 'bot',
              text: msg.content,
              timestamp: new Date(),
            }));
            setMessages(formattedMessages);
          }
        }
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    };
    
    fetchHistory();
  }, [sessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      const response = await fetch(`${API_BASE_URL}/chat/location`, {
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
        text: "My apologies, I'm experiencing a temporary connection issue with the database. Please try your question again shortly.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
    // Use a small timeout to let state update before sending
    setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSend(fakeEvent);
    }, 100);
  };

  const clearChat = async () => {
    if (confirm("Are you sure you want to clear this conversation?")) {
      try {
        await fetch(`${API_BASE_URL}/chat/location/${sessionId}`, {
          method: "DELETE"
        });
        
        setMessages([
          {
            id: "welcome",
            type: "bot",
            text: "Welcome back! I'm ready for your next question about Egypt's premier locations. What area shall we explore?",
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        console.error("Failed to clear chat history:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header Area */}
      <header className="text-white pt-20 sm:pt-24 pb-8 sm:pb-12 px-4 shadow-2xl relative z-10 shrink-0 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/luxury_hero.jpg"
            alt="Luxury Property Background"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#003D6B]/95 via-[#003D6B]/80 to-[#1A365D]" />
        </div>
        
        <div className="max-w-5xl mx-auto relative z-10 w-full flex flex-col items-center text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-4 group bg-white/10 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Return to Discovery</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 mb-2">
            <div className="bg-[#5DBDB6] p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg shadow-[#5DBDB6]/20">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
              Location <span className="text-[#5DBDB6]">Intelligence</span>
            </h1>
          </div>
          <p className="text-slate-300 max-w-xl text-xs sm:text-sm font-medium px-4">
            Personalized insights on neighborhoods, market trends, and lifestyle in Egypt powered by Nawy AI.
          </p>
        </div>
      </header>

      {/* Chat Area Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-2 sm:px-6 -mt-6 sm:-mt-10 pb-4 sm:pb-10 relative z-20 flex flex-col overflow-hidden">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-[400px]">
          
          {/* Messages Wrapper */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50/30 custom-scrollbar flex flex-col">
            <style jsx>{`
              .chat-markdown :global(p) { margin-bottom: 0.75rem; line-height: 1.6; }
              .chat-markdown :global(ul) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
              .chat-markdown :global(ol) { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
              .chat-markdown :global(strong) { font-weight: 800; color: #1A365D; }
              .chat-markdown :global(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; border-radius: 8px; overflow: hidden; }
              .chat-markdown :global(th), .chat-markdown :global(td) { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
              .chat-markdown :global(th) { background-color: #f8fafc; font-weight: 700; color: #003D6B; }
            `}</style>
            
             {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 sm:gap-4 ${m.type === "user" ? "flex-row-reverse" : "justify-start"}`}
              >
                <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm ${
                  m.type === "user" ? "bg-[#003D6B]" : "bg-[#5DBDB6]"
                }`}>
                  {m.type === "user" ? (
                    <span className="text-[9px] sm:text-[10px] font-black text-white">YOU</span>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  )}
                </div>
                
                <div
                  className={`max-w-[88%] sm:max-w-2xl px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl text-xs sm:text-sm ${
                    m.type === "user"
                      ? "bg-[#003D6B] text-white rounded-tr-none shadow-xl"
                      : "bg-white text-slate-700 rounded-tl-none shadow-md border border-slate-100"
                  }`}
                >
                  <div className="chat-markdown prose prose-slate max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                    </ReactMarkdown>
                  </div>
                  <div className={`text-[10px] mt-3 opacity-40 font-bold ${m.type === "user" ? "text-right" : "text-left"}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#5DBDB6] flex items-center justify-center opacity-50">
                   <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white px-6 py-4 rounded-3xl rounded-tl-none border border-slate-100 shadow-md flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[#5DBDB6] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-[#5DBDB6] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-[#5DBDB6] rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Analyzing Data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

           {/* User Input Area */}
          <div className="p-3 sm:p-6 bg-white border-t border-slate-100 shrink-0">
            {/* Suggestions Chips */}
            <div className="max-w-4xl mx-auto mb-4 flex flex-col gap-2">
                {suggestedQuestions.map((s, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSuggestionClick(s.question)}
                        disabled={isLoading}
                        className="w-full px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-50 hover:bg-[#5DBDB6]/10 border border-slate-200 hover:border-[#5DBDB6]/30 rounded-xl sm:rounded-2xl transition-all duration-300 flex items-center gap-2 group text-left active:scale-95"
                    >
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-[#5DBDB6] group-hover:text-white transition-colors">
                            <Info className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[8px] sm:text-[9px] font-black text-[#5DBDB6] uppercase tracking-wider leading-none mb-0.5">{s.category}</span>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 group-hover:text-[#003D6B]">
                                {s.question}
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            <form 
              onSubmit={handleSend}
              className="max-w-4xl mx-auto flex items-center gap-2 sm:gap-3"
            >
              <button 
                type="button"
                onClick={clearChat}
                className="p-2 sm:p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all duration-300 border border-slate-100 flex-shrink-0"
                title="Reset conversation"
              >
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about New Cairo vibes..."
                  className="w-full pl-4 pr-12 sm:pl-5 sm:pr-14 py-2 sm:py-2.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#003D6B]/5 focus:border-[#003D6B]/40 transition-all placeholder:text-slate-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 bg-[#003D6B] text-white rounded-lg sm:rounded-xl hover:bg-[#1A365D] disabled:opacity-20 disabled:grayscale transition-all shadow-md active:scale-95 group-focus-within:bg-[#5DBDB6] group-focus-within:shadow-[#5DBDB6]/20"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-spin" /> : <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                </button>
              </div>
            </form>
            <div className="hidden xs:flex items-center justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 opacity-40">
                <div className="flex items-center gap-1.5 grayscale shrink-0">
                    <MapPin className="w-3 h-3" />
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight">Expert Insights</span>
                </div>
                <div className="flex items-center gap-1.5 grayscale shrink-0">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight">AI Powered</span>
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating hints or badges could go here */}
    </div>
  );
}
