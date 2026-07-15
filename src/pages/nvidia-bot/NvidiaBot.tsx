import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { 
    Send, 
    Trash2, 
    Copy, 
    Check, 
    Cpu, 
    ArrowLeft, 
    Bot, 
    User, 
    Sliders, 
    Moon,
    Sun,
    ExternalLink
} from 'lucide-react';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useThemeStore } from '../../store/themeStore';

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    model?: string;
};

const generateId = () => {
    if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const AVAILABLE_MODELS = [
    { id: 'z-ai/glm-5.2', name: 'GLM 5.2 (Default)', provider: 'Zhipu', description: 'Highly capable multilingual model' },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Nemotron 70B', provider: 'NVIDIA', description: 'NVIDIA-customized Llama 3.1 with advanced reasoning' },
    { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta', description: 'State-of-the-art flagship foundation model' },
    { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta', description: 'Excellent balance of speed and reasoning quality' },
    { id: 'microsoft/phi-3-medium-128k-instruct', name: 'Phi 3 Medium', provider: 'Microsoft', description: 'Lightweight, fast, and highly efficient model' }
];

const SUGGESTED_PROMPTS = [
    { text: 'Explain the difference between CUDA cores and Tensor cores.', label: 'Hardware' },
    { text: 'Write a TypeScript function to implement a debounced search input.', label: 'Code' },
    { text: 'What is RAG (Retrieval-Augmented Generation) and why is it useful?', label: 'AI Concepts' },
    { text: 'Draft a short, professional email requesting a project update.', label: 'Writing' }
];

export const NvidiaBot = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
    const [temperature, setTemperature] = useState(0.7);
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful, advanced AI assistant powered by the NVIDIA API.');
    const [loading, setLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Load initial messages from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('nvidia_bot_messages');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setMessages(parsed.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp)
                })));
            } catch (e) {
                console.error("Failed to parse stored chat history", e);
            }
        }
    }, []);

    // Save messages to localStorage
    const saveMessages = (msgs: Message[]) => {
        localStorage.setItem('nvidia_bot_messages', JSON.stringify(msgs));
    };

    // Auto scroll to bottom
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    }, []);

    useEffect(() => {
        scrollToBottom('smooth');
    }, [messages, loading, scrollToBottom]);

    // Handle textarea autosize
    const adjustInputHeight = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
    };

    useEffect(() => {
        adjustInputHeight();
    }, [input]);

    const handleSendMessage = async (textToSend = input) => {
        const trimmed = textToSend.trim();
        if (!trimmed || loading) return;

        const userMsg: Message = {
            id: generateId(),
            role: 'user',
            content: trimmed,
            timestamp: new Date()
        };

        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        saveMessages(updatedMessages);
        setInput('');
        setLoading(true);

        try {
            // Build the payload including the system prompt
            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...updatedMessages.map(m => ({
                    role: m.role,
                    content: m.content
                }))
            ];

            const response = await fetch('/api/nvidia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    model: selectedModel,
                    temperature: temperature
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch response from NVIDIA server');
            }

            const assistantMsg: Message = {
                id: generateId(),
                role: 'assistant',
                content: data.response || 'Empty response received.',
                timestamp: new Date(),
                model: selectedModel
            };

            const finalMessages = [...updatedMessages, assistantMsg];
            setMessages(finalMessages);
            saveMessages(finalMessages);
        } catch (err: any) {
            const errorMsg: Message = {
                id: generateId(),
                role: 'assistant',
                content: `⚠️ **Error calling NVIDIA API:**\n\n${err.message || 'Unknown network error. Please verify that the `NVIDIA` key is configured in your `.env` file.'}`,
                timestamp: new Date()
            };
            const finalMessages = [...updatedMessages, errorMsg];
            setMessages(finalMessages);
            saveMessages(finalMessages);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleClearChat = () => {
        if (confirm("Are you sure you want to clear the conversation history?")) {
            setMessages([]);
            localStorage.removeItem('nvidia_bot_messages');
        }
    };

    const activeModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel);

    return (
        <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <a 
                            href="/" 
                            className="flex h-9 w-9 items-center justify-between rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                            title="Back to Home"
                        >
                            <ArrowLeft size={18} className="mx-auto" />
                        </a>
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-white shadow-md shadow-emerald-500/20">
                                <Cpu size={22} className="animate-pulse" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight sm:text-lg flex items-center gap-1.5">
                                    NVIDIA Chatbot
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
                                        API
                                    </span>
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                                    Running on {activeModelInfo?.name || selectedModel}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`rounded-lg border p-2 transition active:scale-95 ${
                                showSettings 
                                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                            title="Toggle Settings"
                        >
                            <Sliders size={16} />
                        </button>
                        
                        {messages.length > 0 && (
                            <button
                                onClick={handleClearChat}
                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-red-50 hover:text-red-600 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                title="Clear Conversation"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}

                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Main Chat Area */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 custom-scrollbar"
                    >
                        <div className="mx-auto max-w-4xl space-y-6">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center sm:py-20">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-lime-500/10 text-emerald-500 dark:from-emerald-500/20 dark:to-lime-500/20">
                                        <Bot size={36} />
                                    </div>
                                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                                        Welcome to NVIDIA API Chatbot
                                    </h2>
                                    <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                                        A clean, responsive playground integrated with the NVIDIA AI Foundation Models. Start a conversation below!
                                    </p>

                                    <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
                                        {SUGGESTED_PROMPTS.map((prompt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setInput(prompt.text);
                                                    handleSendMessage(prompt.text);
                                                }}
                                                className="flex flex-col items-start rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500"
                                            >
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                    {prompt.label}
                                                </span>
                                                <span className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2">
                                                    {prompt.text}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex gap-3 sm:gap-4 ${
                                                message.role === 'user' ? 'justify-end' : 'justify-start'
                                            }`}
                                        >
                                            {message.role === 'assistant' && (
                                                <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-white shadow-sm">
                                                    <Cpu size={16} />
                                                </div>
                                            )}

                                            <div
                                                className={`group relative flex flex-col max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                                    message.role === 'user'
                                                        ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200 rounded-tr-none shadow-md'
                                                        : 'bg-slate-800 text-white dark:bg-slate-950 dark:border dark:border-slate-800/80 dark:text-slate-100 rounded-tl-none'
                                                }`}
                                            >
                                                {/* Meta Info */}
                                                <div className="flex items-center justify-between gap-4 mb-1 text-[10px] opacity-60">
                                                    <span className="font-semibold uppercase tracking-wider">
                                                        {message.role === 'user' ? 'You' : 'NVIDIA Bot'}
                                                    </span>
                                                    <span>
                                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>

                                                {/* Content */}
                                                <div className="prose prose-slate dark:prose-invert max-w-none break-words leading-relaxed text-inherit">
                                                    {message.role === 'user' ? (
                                                        <p className="whitespace-pre-wrap">{message.content}</p>
                                                    ) : (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            rehypePlugins={[rehypeRaw]}
                                                            components={{
                                                                code({ node, className, children, ...props }) {
                                                                    const match = /language-(\w+)/.exec(className || '');
                                                                    const isInline = !match;
                                                                    return isInline ? (
                                                                        <code className="bg-slate-100 dark:bg-slate-850 text-emerald-600 dark:text-emerald-400 px-1 py-0.5 rounded font-mono text-xs" {...props}>
                                                                            {children}
                                                                        </code>
                                                                    ) : (
                                                                        <div className="relative my-2 rounded-lg bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto border border-slate-800">
                                                                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => handleCopy(String(children), message.id + '-code')}
                                                                                    className="rounded bg-slate-800 p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                                                                                    title="Copy code"
                                                                                >
                                                                                    {copiedId === message.id + '-code' ? <Check size={14} /> : <Copy size={14} />}
                                                                                </button>
                                                                            </div>
                                                                            <code className={className} {...props}>
                                                                                {children}
                                                                            </code>
                                                                        </div>
                                                                    );
                                                                },
                                                                table({ children }) {
                                                                    return (
                                                                        <div className="overflow-x-auto my-3 border border-slate-200 dark:border-slate-800 rounded-lg">
                                                                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-850 text-left text-xs">
                                                                                {children}
                                                                            </table>
                                                                        </div>
                                                                    );
                                                                },
                                                                thead({ children }) {
                                                                    return <thead className="bg-slate-50 dark:bg-slate-900/50 font-semibold">{children}</thead>;
                                                                },
                                                                th({ children }) {
                                                                    return <th className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">{children}</th>;
                                                                },
                                                                td({ children }) {
                                                                    return <td className="px-3 py-2 border-t border-slate-100 dark:border-slate-850">{children}</td>;
                                                                }
                                                            }}
                                                        >
                                                            {message.content}
                                                        </ReactMarkdown>
                                                    )}
                                                </div>

                                                {/* Floating Actions for Assistant bubbles */}
                                                {message.role === 'assistant' && (
                                                    <div className="absolute right-2 bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleCopy(message.content, message.id)}
                                                            className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                                                            title="Copy message"
                                                        >
                                                            {copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Model Attribution tag */}
                                                {message.model && (
                                                    <div className="mt-2 text-[9px] font-mono opacity-40 self-start">
                                                        model: {message.model.split('/').pop()}
                                                    </div>
                                                )}
                                            </div>

                                            {message.role === 'user' && (
                                                <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                    <User size={16} />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Loading State */}
                                    {loading && (
                                        <div className="flex gap-3 sm:gap-4 justify-start">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-white shadow-sm">
                                                <Cpu size={16} className="animate-spin" />
                                            </div>
                                            <div className="flex flex-col bg-slate-800 text-white dark:bg-slate-950 dark:border dark:border-slate-800/80 dark:text-slate-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm min-w-[120px]">
                                                <div className="flex items-center gap-1 mb-1 text-[10px] opacity-60">
                                                    <span className="font-semibold uppercase tracking-wider">NVIDIA Bot</span>
                                                    <span className="animate-pulse">thinking...</span>
                                                </div>
                                                <div className="flex space-x-1.5 py-2 items-center">
                                                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                    <div className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Composer Form */}
                    <div className="border-t border-slate-200/80 bg-white px-4 py-4 dark:border-slate-800/80 dark:bg-slate-950 sm:px-6">
                        <div className="mx-auto max-w-4xl">
                            <div className="relative flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-2 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900/50">
                                <textarea
                                    ref={textareaRef}
                                    rows={1}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type a message or Ask NVIDIA..."
                                    className="flex-1 max-h-[180px] min-h-[36px] overflow-y-auto bg-transparent px-3 py-1.5 text-sm focus:outline-none resize-none custom-scrollbar text-slate-850 dark:text-slate-100"
                                    disabled={loading}
                                />
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!input.trim() || loading}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-lime-500 text-white shadow transition-all hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
                                Powered by NVIDIA AI Foundation Models. Chat history is saved locally.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar Drawer Settings (Settings Panel) */}
                <div 
                    className={`absolute bottom-0 top-0 right-0 z-20 w-80 max-w-[90%] border-l border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-md transition-transform duration-300 dark:border-slate-800/80 dark:bg-slate-950/95 sm:relative sm:translate-x-0 ${
                        showSettings ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    <div className="flex h-full flex-col p-5">
                        <div className="flex items-center justify-between border-b border-slate-150 pb-3 dark:border-slate-800">
                            <h2 className="text-sm font-bold flex items-center gap-1.5">
                                <Sliders size={16} className="text-emerald-500" />
                                Chat Parameters
                            </h2>
                            <button 
                                onClick={() => setShowSettings(false)}
                                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 sm:hidden"
                            >
                                Close
                            </button>
                        </div>

                        <div className="flex-1 space-y-6 py-4 overflow-y-auto custom-scrollbar">
                            {/* Model Select */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                                    NVIDIA Model
                                </label>
                                <div className="space-y-2">
                                    {AVAILABLE_MODELS.map((model) => (
                                        <button
                                            key={model.id}
                                            onClick={() => setSelectedModel(model.id)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all text-xs ${
                                                selectedModel === model.id
                                                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-450'
                                                    : 'border-slate-200 hover:border-slate-350 dark:border-slate-800 dark:hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="font-bold flex items-center justify-between">
                                                <span>{model.name}</span>
                                                <span className="text-[9px] opacity-60 font-medium px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded">
                                                    {model.provider}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-[10px] opacity-75 leading-snug">
                                                {model.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Temperature Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <label className="font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                                        Temperature
                                    </label>
                                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        {temperature.toFixed(1)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1.5"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between text-[9px] opacity-50 font-mono">
                                    <span>Precise</span>
                                    <span>Creative</span>
                                </div>
                            </div>

                            {/* System Instructions */}
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                                    System Prompt
                                </label>
                                <textarea
                                    rows={4}
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900/60 text-slate-850 dark:text-slate-100 resize-none leading-relaxed"
                                    placeholder="Enter system prompt instructions..."
                                />
                            </div>
                        </div>

                        {/* Settings Footer */}
                        <div className="border-t border-slate-150 pt-4 dark:border-slate-800 space-y-3">
                            <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/10 p-3 text-[11px] text-slate-600 dark:text-slate-400">
                                <span className="font-bold text-emerald-800 dark:text-emerald-400">API Key Active:</span> Ensure your <code className="bg-emerald-100 dark:bg-emerald-950 px-1 rounded text-emerald-800 dark:text-emerald-400">.env</code> contains the key <code className="bg-emerald-100 dark:bg-emerald-950 px-1 rounded text-emerald-800 dark:text-emerald-400">NVIDIA=nvapi-...</code>.
                            </div>
                            <a 
                                href="https://build.nvidia.com"
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-1.5 w-full text-center text-xs py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 font-semibold"
                            >
                                Get NVIDIA Keys <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
