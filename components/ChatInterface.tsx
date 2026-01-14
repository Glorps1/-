import React, { useState, useEffect, useRef } from 'react';
import { Chat } from "@google/genai";
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface ChatInterfaceProps {
  chatSession: Chat | null;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatSession }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Привет! Я твой AI тьютор. Я помогу разобраться в деталях этого билета. Что именно тебе непонятно?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset chat when session changes (new question selected)
  useEffect(() => {
    setMessages([{ role: 'model', text: 'Привет! Я твой AI тьютор. Я помогу разобраться в деталях этого билета. Что именно тебе непонятно?' }]);
  }, [chatSession]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "..." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Ошибка соединения. Попробуй позже." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
        <div className="bg-indigo-100 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
            <h3 className="font-semibold text-slate-800 text-sm">AI Тьютор</h3>
            <p className="text-xs text-slate-500">Всегда онлайн</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} group`}>
            
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'model' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
              {msg.role === 'model' ? <Sparkles size={16} /> : <User size={18} />}
            </div>

            <div className={`max-w-[85%] sm:max-w-[75%] space-y-1`}>
                <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                    <ReactMarkdown 
                        children={msg.text} 
                        remarkPlugins={[remarkMath]} 
                        rehypePlugins={[rehypeKatex]}
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            a: ({node, ...props}) => <a className="underline decoration-indigo-300 underline-offset-2" {...props} />,
                            code: ({node, ...props}) => <code className={`px-1 rounded ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-slate-100'}`} {...props} />,
                        }}
                    />
                </div>
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex gap-4">
             <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm">
               <Sparkles size={16} />
             </div>
             <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
               <span className="text-sm text-slate-500">Печатает</span>
               <div className="flex gap-1">
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                 <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
               </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex gap-3 relative"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спроси что-нибудь..."
            className="flex-1 bg-slate-100 border-0 rounded-xl px-5 py-3.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all placeholder:text-slate-400"
          />
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-0 disabled:scale-90 transition-all flex items-center justify-center shadow-md shadow-indigo-200"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;