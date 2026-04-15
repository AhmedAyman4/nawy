"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, MapPin, Trash2, ArrowLeft, MessageSquare, Info, Sparkles, User, Tag, Home, DollarSign, Activity, FileText, X, Copy, Check, Bot } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { PropertyData } from "@/types/property";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyModal } from "@/components/PropertyModal";

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  timestamp: Date;
  properties?: PropertyData[];
  sources?: string[];
  responseTime?: number;
}

interface UserPreferences {
  preferred_locations: string[];
  property_specs: {
    types: string[];
    beds: number | null;
    baths: number | null;
    m2: number | null;
  };
  budget_range: {
    min: number | null;
    max: number | null;
  };
  lifestyle_preferences: string[];
  investment_intent: string | null;
  summary_of_intent: string;
  last_updated: string | null;
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

  const WELCOME_MESSAGE: Message = {
    id: "welcome",
    type: "bot",
    text: "Welcome! I'm here to help you explore the best locations and compounds in Egypt. Feel free to ask about any area or project listed on Nawy!",
    timestamp: new Date(),
  };

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSourcesId, setShowSourcesId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const [selectedProperty, setSelectedProperty] = useState<{
    property: PropertyData;
    index: number;
    total: number;
    messageId: string;
  } | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isFetchingPrefs, setIsFetchingPrefs] = useState(false);
  const [isDeletingPrefs, setIsDeletingPrefs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch history when page loads
  useEffect(() => {
    if (!sessionId) return; // Wait for sessionId to be initialized on client

    const fetchHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/${sessionId}/history`);
        if (response.ok) {
          const data = await response.json();
          if (data.history && data.history.length > 0) {
            const historyMessages: Message[] = data.history.map((msg: { role: string; content: string; properties?: PropertyData[]; sources?: string[]; responseTime?: number }, index: number) => ({
              id: `history_${index}`,
              type: msg.role === 'human' ? 'user' : 'bot',
              text: msg.content,
              timestamp: new Date(),
              properties: msg.properties,
              sources: msg.sources,
            }));
            
            // Keep welcome message at the top, then add history
            setMessages([WELCOME_MESSAGE, ...historyMessages]);
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
    setElapsedSeconds(0);
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: currentInput,
          session_id: sessionId
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: data.answer,
        timestamp: new Date(),
        properties: data.properties,
        sources: data.sources,
        responseTime: duration,
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
        await fetch(`${API_BASE_URL}/chat/${sessionId}`, {
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
        setPreferences(null);
      } catch (err) {
        console.error("Failed to clear chat history:", err);
      }
    }
  };

  const fetchPreferences = async () => {
    if (!sessionId) return;
    setIsFetchingPrefs(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/${sessionId}/preferences`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        setIsPreferencesOpen(true);
      }
    } catch (err) {
      console.error("Failed to fetch preferences:", err);
    } finally {
      setIsFetchingPrefs(false);
    }
  };

  const deletePreferences = async () => {
    if (!sessionId) return;
    if (confirm("Are you sure you want to reset your search profile? This will delete all AI-inferred preferences for this session.")) {
      setIsDeletingPrefs(true);
      try {
        const response = await fetch(`${API_BASE_URL}/chat/${sessionId}/preferences`, {
          method: "DELETE"
        });
        if (response.ok) {
          setPreferences(null);
          setIsPreferencesOpen(false);
        }
      } catch (err) {
        console.error("Failed to delete preferences:", err);
      } finally {
        setIsDeletingPrefs(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Header Area */}
      <header className="text-white pt-28 sm:pt-32 pb-8 sm:pb-12 px-4 shadow-2xl relative z-10 shrink-0 overflow-hidden">
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1.5 sm:space-y-2.5 bg-slate-50/30 custom-scrollbar flex flex-col">
            <style jsx>{`
              .chat-markdown :global(p) { margin-bottom: 0.75rem; line-height: 1.6; }
              .chat-markdown :global(ul) { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
              .chat-markdown :global(ol) { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
              .chat-markdown :global(strong) { font-weight: 800; color: #1A365D; }
              .chat-markdown :global(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.95rem; border-radius: 8px; overflow: hidden; }
              .chat-markdown :global(th), .chat-markdown :global(td) { border: 1px solid #e2e8f0; padding: 0.75rem; text-align: left; }
              .chat-markdown :global(th) { background-color: #f8fafc; font-weight: 700; color: #003D6B; }
            `}</style>
            
             {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2 sm:gap-4 group ${m.type === "user" ? "flex-row-reverse" : "justify-start"}`}
              >
                <div className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm ${
                  m.type === "user" ? "bg-[#003D6B]" : "bg-[#5DBDB6]"
                }`}>
                  {m.type === "user" ? (
                    <span className="text-[9px] sm:text-[10px] font-black text-white">YOU</span>
                  ) : (
                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  )}
                </div>
                
                <div className={`flex flex-col ${m.type === "user" ? "items-end" : "items-start"} max-w-[88%] sm:max-w-2xl`}>
                  <div
                    className={`w-full px-4 py-3 sm:px-6 sm:py-4 rounded-2xl sm:rounded-3xl text-sm sm:text-base ${
                      m.type === "user"
                        ? "bg-[#003D6B] text-white rounded-tr-none shadow-xl"
                        : "bg-white text-slate-700 rounded-tl-none shadow-md border border-slate-100"
                    }`}
                  >
                    <div className="chat-markdown prose prose-sm sm:prose-base prose-slate max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.text}
                      </ReactMarkdown>
                    </div>
                    {m.properties && m.properties.length > 0 && (
                      <div className="mt-4 overflow-x-auto pb-4 custom-scrollbar">
                        <div className="flex gap-3 min-w-max">
                          {m.properties.map((prop, idx) => (
                            <div key={prop.id || idx} className="w-48 sm:w-56">
                              <PropertyCard 
                                property={prop} 
                                onClick={() => setSelectedProperty({
                                  property: prop,
                                  index: idx,
                                  total: m.properties!.length,
                                  messageId: m.id
                                })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`text-[10px] mt-3 opacity-40 font-bold flex items-center gap-2 ${m.type === "user" ? "justify-end" : "justify-start"}`}>
                      <span>{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {m.type === "bot" && m.responseTime !== undefined && (
                        <>
                          <span className="w-1 h-1 bg-slate-400 rounded-full" />
                          <span className="text-[#5DBDB6]">{m.responseTime}s</span>
                        </>
                      )}
                      {m.properties && m.properties.length > 0 && (
                        <>
                          <span className="w-1 h-1 bg-slate-400 rounded-full" />
                          <span className="text-slate-400">
                            Horizontal Scroll &rarr;
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 mx-2 sm:mx-4`}>
                    <button
                      onClick={() => handleCopy(m.text, m.id)}
                      className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${
                        copiedId === m.id 
                          ? "bg-[#5DBDB6]/10 border-[#5DBDB6]/20 text-[#5DBDB6] opacity-100 shadow-sm" 
                          : "bg-slate-50/50 border-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-[#003D6B] hover:bg-white hover:border-slate-200 hover:shadow-sm"
                      }`}
                      title="Copy message text"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span className="text-[10px] font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px] font-bold">Copy</span>
                        </>
                      )}
                    </button>

                    {m.sources && m.sources.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowSourcesId(showSourcesId === m.id ? null : m.id)}
                          className={`mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${
                            showSourcesId === m.id
                              ? "bg-[#5DBDB6]/10 border-[#5DBDB6]/20 text-[#5DBDB6] opacity-100 shadow-sm"
                              : "bg-slate-50/50 border-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-[#5DBDB6] hover:bg-white hover:border-[#5DBDB6]/20 hover:shadow-sm"
                          }`}
                          title="View sources"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="text-[10px] font-bold">Sources</span>
                        </button>
                        
                        {showSourcesId === m.id && (
                          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-[#003D6B] uppercase tracking-wider">Citations & Sources</span>
                              <button onClick={() => setShowSourcesId(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                              {m.sources.map((src, i) => (
                                <a 
                                  key={i} 
                                  href={src} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block p-2 text-[10px] text-slate-600 hover:bg-[#5DBDB6]/5 hover:text-[#5DBDB6] rounded-lg border border-transparent hover:border-[#5DBDB6]/10 transition-all truncate"
                                >
                                  {src.replace('https://', '').replace('www.', '')}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start gap-4">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[#5DBDB6] flex items-center justify-center opacity-50">
                   <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white px-6 py-4 rounded-3xl rounded-tl-none border border-slate-100 shadow-md flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[#5DBDB6] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-[#5DBDB6] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-[#5DBDB6] rounded-full animate-bounce"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400">Analyzing Data...</span>
                        <span className="text-[10px] font-black text-[#5DBDB6] mt-0.5 animate-pulse">{elapsedSeconds}s elapsed</span>
                    </div>
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

              <button 
                type="button"
                onClick={fetchPreferences}
                disabled={isFetchingPrefs}
                className="p-2 sm:p-2.5 text-slate-300 hover:text-[#5DBDB6] hover:bg-[#5DBDB6]/10 rounded-xl transition-all duration-300 border border-slate-100 flex-shrink-0"
                title="View your preferences"
              >
                {isFetchingPrefs ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <User className="w-4 h-4 sm:w-5 sm:h-5" />}
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

      {/* Property Details Modal */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty.property}
          currentIndex={selectedProperty.index}
          total={selectedProperty.total}
          onClose={() => setSelectedProperty(null)}
          onNext={
            selectedProperty.index < selectedProperty.total - 1
              ? () => {
                  const msg = messages.find(m => m.id === selectedProperty.messageId);
                  if (msg?.properties) {
                    const nextIdx = selectedProperty.index + 1;
                    setSelectedProperty({
                      ...selectedProperty,
                      index: nextIdx,
                      property: msg.properties[nextIdx]
                    });
                  }
                }
              : undefined
          }
          onPrev={
            selectedProperty.index > 0
              ? () => {
                  const msg = messages.find(m => m.id === selectedProperty.messageId);
                  if (msg?.properties) {
                    const prevIdx = selectedProperty.index - 1;
                    setSelectedProperty({
                      ...selectedProperty,
                      index: prevIdx,
                      property: msg.properties[prevIdx]
                    });
                  }
                }
              : undefined
          }
        />
      )}

      {/* User Preferences Modal */}
      {isPreferencesOpen && preferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4" onClick={() => setIsPreferencesOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#003D6B] to-[#1A365D] text-white">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="bg-white/10 p-1.5 sm:p-2 rounded-xl backdrop-blur-md">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#5DBDB6]" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-black tracking-tight">Your Search Profile</h2>
                    <p className="text-[#5DBDB6] text-[8px] sm:text-[10px] font-bold uppercase tracking-widest">AI-Inferred Preferences</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPreferencesOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar">
                {/* Summary Section */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-[#003D6B]" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#003D6B]">Intent Summary</h3>
                    </div>
                    <div className="bg-slate-50 border-l-4 border-[#5DBDB6] p-3 sm:p-4 rounded-r-xl sm:rounded-r-2xl italic text-slate-600 text-xs sm:text-sm leading-relaxed">
                        &quot;{preferences.summary_of_intent || "Discuss your property requirements and I'll build your profile here."}&quot;
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {/* Locations */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Tag className="w-4 h-4 text-[#003D6B]" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#003D6B]">Preferred Areas</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {preferences.preferred_locations.length > 0 ? (
                                preferences.preferred_locations.map((loc, i) => (
                                    <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-[#5DBDB6]">
                                        {loc}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400 font-medium italic">No locations identified yet.</span>
                            )}
                        </div>
                    </section>

                    {/* Specs */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Home className="w-4 h-4 text-[#003D6B]" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#003D6B]">Home Requirements</h3>
                        </div>
                        <div className="space-y-2">
                             <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Property Types</span>
                                <span className="text-[#003D6B] font-black">{preferences.property_specs.types.join(", ") || "Any"}</span>
                             </div>
                             <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Bedrooms</span>
                                <span className="text-[#003D6B] font-black">{preferences.property_specs.beds || "Flexible"}</span>
                             </div>
                             <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500 font-bold uppercase tracking-wider">Bathrooms</span>
                                <span className="text-[#003D6B] font-black">{preferences.property_specs.baths || "Flexible"}</span>
                             </div>
                        </div>
                    </section>

                    {/* Budget */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <DollarSign className="w-4 h-4 text-[#003D6B]" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-[#003D6B]">Budget Range</h3>
                        </div>
                        <div className="bg-[#5DBDB6]/5 p-4 rounded-2xl border border-[#5DBDB6]/10">
                            <div className="flex justify-between items-end">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-[#5DBDB6] font-black uppercase tracking-tighter">Budget</span>
                                    <span className="text-base sm:text-lg font-black text-[#003D6B]">
                                        {preferences.budget_range.min ? `${preferences.budget_range.min.toLocaleString()} - ` : ""}
                                        {preferences.budget_range.max ? `${preferences.budget_range.max.toLocaleString()} EGP` : "Flexible"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Lifestyle and Intent */}
                    <section className="space-y-6">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-4 h-4 text-[#003D6B]" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-[#003D6B]">Lifestyle Features</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {preferences.lifestyle_preferences.length > 0 ? (
                                    preferences.lifestyle_preferences.map((pref, i) => (
                                        <span key={i} className="px-3 py-1 bg-slate-50 text-[#003D6B] rounded-lg text-xs font-bold border border-slate-100">
                                            {pref}
                                        </span>
                                    ))
                                ) : (
                                    <span className="text-xs text-slate-400 font-medium italic">Learning your lifestyle...</span>
                                )}
                            </div>
                        </div>

                        {preferences.investment_intent && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-[#003D6B]" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#003D6B]">Investment Intent</h3>
                                </div>
                                <div className="bg-[#003D6B]/5 p-3 rounded-xl border border-[#003D6B]/10 text-xs font-bold text-[#003D6B]">
                                    {preferences.investment_intent}
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Last sync: {preferences.last_updated ? new Date(preferences.last_updated).toLocaleString() : "Never"}
                </span>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={deletePreferences}
                        disabled={isDeletingPrefs}
                        className="px-4 py-2 text-red-500 hover:bg-red-50 font-bold rounded-xl text-xs transition-all flex items-center gap-2 border border-red-100 disabled:opacity-50"
                    >
                        {isDeletingPrefs ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Reset Profile
                    </button>
                    <button 
                        onClick={() => setIsPreferencesOpen(false)}
                        className="px-6 py-2 bg-[#003D6B] text-white font-black rounded-xl text-xs shadow-lg shadow-[#003D6B]/20 active:scale-95 transition-all"
                    >
                        Close Profile
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
