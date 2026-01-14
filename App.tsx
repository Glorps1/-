import React, { useState, useEffect } from 'react';
import QuestionList from './components/QuestionList';
import MarkdownViewer from './components/MarkdownViewer';
import ChatInterface from './components/ChatInterface';
import VideoResources from './components/VideoResources';
import AudioPlayer from './components/AudioPlayer';
import QuizInterface from './components/QuizInterface';
import { QUESTIONS } from './constants';
import { Category, ExplanationState } from './types';
import { generateExplanation, createChatSession, saveApiKey, getStoredApiKey } from './services/geminiService';
import { Chat } from "@google/genai";
import { 
    Sparkles, ArrowRight, BookOpenCheck, BrainCircuit, AlertCircle, 
    RotateCw, MessageSquare, Youtube, CheckCircle2, Bookmark, Menu, 
    Maximize, Minimize, ChevronDown, ChevronUp, KeyRound, GraduationCap, X
} from 'lucide-react';

const App: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'explanation' | 'chat' | 'video' | 'quiz'>('explanation');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Settings Modal State
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  
  // Persistent State
  const [completedIds, setCompletedIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('completed');
    return saved ? JSON.parse(saved) : [];
  });
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('bookmarked');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('completed', JSON.stringify(completedIds)); }, [completedIds]);
  useEffect(() => { localStorage.setItem('bookmarked', JSON.stringify(bookmarkedIds)); }, [bookmarkedIds]);

  // Init API Key input
  useEffect(() => {
    setApiKeyInput(getStoredApiKey());
  }, []);

  const handleSaveKey = () => {
    saveApiKey(apiKeyInput.trim());
    setShowSettings(false);
    // If we have a selected question but error state, retry
    if (selectedId && explanation.error) {
        fetchExplanation(selectedId, true);
    }
  };

  const toggleComplete = (id: number) => {
    setCompletedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleBookmark = (id: number) => {
    setBookmarkedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Explanation State
  const [cache, setCache] = useState<Record<number, string>>({});
  const [explanation, setExplanation] = useState<ExplanationState>({ loading: false, content: null, error: null });
  
  // Chat State
  const [chatSession, setChatSession] = useState<Chat | null>(null);

  const selectedQuestion = QUESTIONS.find((q) => q.id === selectedId);

  const fetchExplanation = async (id: number, force: boolean = false) => {
    if (!force && cache[id]) {
      setExplanation({ loading: false, content: cache[id], error: null });
      return;
    }

    setExplanation({ loading: true, content: null, error: null });
    try {
        const question = QUESTIONS.find(q => q.id === id);
        if(!question) throw new Error("Question not found");
        const result = await generateExplanation(question);
        setCache(prev => ({ ...prev, [id]: result }));
        setExplanation({ loading: false, content: result, error: null });
    } catch (err: any) {
        setExplanation({ loading: false, content: null, error: err.message });
        if (err.message.includes('403') || err.message.includes('Key')) {
            setShowSettings(true);
        }
    }
  };

  const handleSelectQuestion = (id: number) => {
    setSelectedId(id);
    setActiveTab('explanation');
    setIsHeaderExpanded(false); // Reset expansion on new question
    fetchExplanation(id);
    try {
        const q = QUESTIONS.find(x => x.id === id);
        if (q) setChatSession(createChatSession(q));
    } catch(e) {
        console.error("Chat init failed (likely no key)");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((e) => {
            console.log(e);
        });
        setIsFullscreen(true);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }
  };

  // Update fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const [showSidebar, setShowSidebar] = useState(true);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setShowSidebar(!selectedId);
      else setShowSidebar(true);
    };
    if (window.innerWidth < 768 && selectedId) setShowSidebar(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedId]);

  return (
    <div className="flex h-screen overflow-hidden font-sans relative">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-indigo-600" /> Настройка API
                    </h3>
                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        Чтобы приложение работало на этом устройстве, введите ваш Gemini API Key. Он сохранится только в вашем браузере.
                    </p>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Gemini API Key</label>
                    <input 
                        type="password" 
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 font-mono text-sm mb-4"
                    />
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-6">
                        <p className="text-xs text-amber-700">
                            Получить ключ бесплатно: <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline font-bold">Google AI Studio</a>
                        </p>
                    </div>
                    <button 
                        onClick={handleSaveKey}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200"
                    >
                        Сохранить и продолжить
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      {showSidebar && window.innerWidth < 768 && (
        <div className="fixed inset-0 bg-slate-900/50 z-20" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full absolute md:static md:translate-x-0'} z-30 transition-transform duration-300 absolute inset-y-0 left-0 md:relative h-full`}>
        <QuestionList
          questions={QUESTIONS}
          selectedId={selectedId}
          onSelect={(id) => {
            handleSelectQuestion(id);
            if (window.innerWidth < 768) setShowSidebar(false);
          }}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          completedIds={completedIds}
          bookmarkedIds={bookmarkedIds}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Mobile Navbar */}
        <div className="md:hidden h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 justify-between z-20 sticky top-0">
           {selectedId ? (
               <button onClick={() => setShowSidebar(true)} className="flex items-center text-slate-600 font-medium text-sm">
                   <ArrowRight className="w-4 h-4 mr-1.5 rotate-180" /> Назад
               </button>
           ) : (
               <div className="font-bold text-slate-800">Physics AI</div>
           )}
           <div className="flex items-center gap-1">
                <button onClick={() => setShowSettings(true)} className="p-2 text-slate-500 hover:text-indigo-600">
                    <KeyRound className="w-5 h-5" />
                </button>
                {selectedId && (
                    <button onClick={toggleFullscreen} className="p-2 text-slate-500 hover:text-indigo-600">
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                )}
                <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 -mr-2 text-slate-600">
                    <Menu className="w-6 h-6" />
                </button>
           </div>
        </div>

        {selectedQuestion ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
             {/* Header */}
             <div className="bg-white border-b border-slate-200 px-6 py-5 z-10 shrink-0">
                <div className="max-w-4xl mx-auto w-full">
                    <div className="flex items-start justify-between gap-6 mb-6">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full tracking-wide uppercase">
                                    Билет #{selectedQuestion.id}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                                    {selectedQuestion.category}
                                </span>
                            </div>
                            
                            {/* Collapsible Question Title */}
                            <div 
                                onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                                className="group cursor-pointer select-none"
                            >
                                <h2 className={`text-xl md:text-2xl font-bold text-slate-900 leading-snug transition-all ${isHeaderExpanded ? '' : 'line-clamp-2'}`}>
                                    {selectedQuestion.text}
                                </h2>
                                <button className="mt-1.5 flex items-center text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
                                    {isHeaderExpanded ? (
                                        <>Свернуть вопрос <ChevronUp className="w-3 h-3 ml-1" /></>
                                    ) : (
                                        <>Показать полностью <ChevronDown className="w-3 h-3 ml-1" /></>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex gap-2 shrink-0 flex-col md:flex-row">
                             <div className="hidden md:flex gap-2">
                                <button 
                                    onClick={() => setShowSettings(true)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl border bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-indigo-600 transition-all"
                                    title="Настройки API"
                                >
                                    <KeyRound className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={toggleFullscreen}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl border bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-indigo-600 transition-all"
                                    title={isFullscreen ? "Выйти из полноэкранного" : "На весь экран"}
                                >
                                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                </button>
                             </div>

                            <button 
                                onClick={() => toggleBookmark(selectedQuestion.id)}
                                className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all ${
                                    bookmarkedIds.includes(selectedQuestion.id) 
                                        ? 'bg-amber-50 border-amber-200 text-amber-500' 
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                }`}
                                title="В избранное"
                            >
                                <Bookmark className={`w-5 h-5 ${bookmarkedIds.includes(selectedQuestion.id) ? 'fill-current' : ''}`} />
                            </button>
                            <button 
                                onClick={() => toggleComplete(selectedQuestion.id)}
                                className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all ${
                                    completedIds.includes(selectedQuestion.id) 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                                        : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                                }`}
                                title="Отметить изученным"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Modern Segmented Control Tabs */}
                    <div className="flex p-1 bg-slate-100 rounded-xl self-start inline-flex max-w-full overflow-x-auto no-scrollbar">
                        {[
                            { id: 'explanation', icon: Sparkles, label: 'Объяснение' },
                            { id: 'quiz', icon: GraduationCap, label: 'Тест' },
                            { id: 'chat', icon: MessageSquare, label: 'AI Тьютор' },
                            { id: 'video', icon: Youtube, label: 'Видео' },
                        ].map((tab) => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap
                                    ${activeTab === tab.id 
                                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }
                                `}
                            >
                                <tab.icon className="w-4 h-4" /> 
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
                    {activeTab === 'explanation' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                             
                             <AudioPlayer question={selectedQuestion} />

                             <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10 min-h-[400px]">
                                {explanation.loading ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-center">
                                        <div className="relative">
                                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center animate-pulse">
                                                <BrainCircuit className="w-8 h-8 text-indigo-600" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1">
                                                <span className="relative flex h-3 w-3">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-900 mt-4">Анализирую вопрос...</h3>
                                        <p className="text-slate-500 text-sm mt-1 max-w-xs">Формирую структуру ответа, подбираю формулы и примеры.</p>
                                    </div>
                                ) : explanation.error ? (
                                    <div className="p-8 bg-red-50 text-red-700 rounded-xl border border-red-100 flex flex-col items-center text-center">
                                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                                            <AlertCircle className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-semibold mb-1">Ошибка генерации</h3>
                                        <p className="text-sm mb-4 max-w-md">{explanation.error}</p>
                                        
                                        <div className="flex gap-2">
                                            <button onClick={() => setShowSettings(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm text-sm font-medium hover:bg-indigo-700 transition-colors">
                                                Ввести API Ключ
                                            </button>
                                            <button onClick={() => fetchExplanation(selectedQuestion.id, true)} className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg shadow-sm text-sm font-medium hover:bg-red-50 transition-colors">
                                                Попробовать снова
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                                            <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Сгенерированный ответ</span>
                                            <button onClick={() => fetchExplanation(selectedQuestion.id, true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors">
                                                <RotateCw className="w-3.5 h-3.5" /> Пересоздать
                                            </button>
                                        </div>
                                        {explanation.content && <MarkdownViewer content={explanation.content} />}
                                    </>
                                )}
                             </div>
                        </div>
                    )}

                    {activeTab === 'quiz' && (
                        <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                            <QuizInterface question={selectedQuestion} />
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div className="h-[calc(100vh-280px)] min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <ChatInterface chatSession={chatSession} />
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
                            <VideoResources question={selectedQuestion} />
                        </div>
                    )}
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
             <div className="max-w-2xl w-full text-center">
                <div className="inline-flex items-center justify-center p-4 bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 mb-8 transform rotate-3 hover:rotate-6 transition-transform duration-500">
                    <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                    Готовься к экзамену <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500">с умом и AI</span>
                </h1>
                
                <p className="text-lg text-slate-500 mb-12 max-w-lg mx-auto leading-relaxed">
                    Выбери билет из списка слева, чтобы получить мгновенный разбор, видео-уроки и помощь виртуального репетитора.
                </p>

                <div className="flex justify-center mb-12">
                     <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-full font-semibold shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all">
                        <KeyRound className="w-4 h-4" /> Настроить API Ключ
                     </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: BookOpenCheck, label: "81 Билет", sub: "Вся база", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
                        { icon: GraduationCap, label: "Тесты", sub: "Проверка", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
                        { icon: Youtube, label: "Видео", sub: "Подборки", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
                        { icon: BrainCircuit, label: "Понятно", sub: "Без воды", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" }
                    ].map((item, i) => (
                        <div key={i} className={`bg-white p-5 rounded-2xl border ${item.border} shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center group`}>
                            <div className={`p-3 rounded-xl ${item.bg} ${item.color} mb-3 group-hover:scale-110 transition-transform`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-slate-800">{item.label}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{item.sub}</span>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;