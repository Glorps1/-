import React from 'react';
import { Category, Question } from '../types';
import { Search, BookOpen, CheckCircle2, Bookmark, Filter } from 'lucide-react';

interface QuestionListProps {
  questions: Question[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCategory: Category | 'All';
  onCategoryChange: (cat: Category | 'All') => void;
  completedIds: number[];
  bookmarkedIds: number[];
}

const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  completedIds,
  bookmarkedIds
}) => {
  const categories = ['All', ...Object.values(Category)];

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) || q.id.toString().includes(searchTerm);
    const matchesCategory = selectedCategory === 'All' || q.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-full md:w-[420px] shadow-xl shadow-slate-200/50 z-20">
      <div className="p-6 border-b border-slate-100 bg-white z-10 sticky top-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md shadow-indigo-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>Physics AI</span>
          </h1>
          <div className="text-xs font-medium px-2.5 py-1 bg-slate-100 rounded-full text-slate-500">
             v1.0
          </div>
        </div>
        
        <div className="space-y-3">
            <div className="relative group">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
                type="text"
                placeholder="Поиск по вопросам..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 hover:bg-slate-100 focus:bg-white"
            />
            </div>

            <div className="relative">
                <Filter className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <select
                value={selectedCategory}
                onChange={(e) => onCategoryChange(e.target.value as Category | 'All')}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer hover:bg-slate-100 focus:bg-white transition-colors appearance-none"
                >
                {categories.map((cat) => (
                    <option key={cat} value={cat}>
                    {cat === 'All' ? 'Все темы' : cat}
                    </option>
                ))}
                </select>
                <div className="absolute right-3.5 top-3.5 pointer-events-none">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredQuestions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                 <Search className="w-8 h-8 opacity-40" />
            </div>
            <p className="font-medium text-slate-600">Ничего не найдено</p>
            <p className="text-sm mt-1">Попробуйте изменить запрос</p>
          </div>
        ) : (
          <>
            {filteredQuestions.map((q) => {
              const isCompleted = completedIds.includes(q.id);
              const isBookmarked = bookmarkedIds.includes(q.id);
              const isSelected = selectedId === q.id;
              
              return (
              <button
                key={q.id}
                onClick={() => onSelect(q.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 group relative border
                  ${isSelected 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                  }`}
              >
                <div className="flex items-start gap-3.5">
                    <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold mt-0.5 transition-colors border ${
                        isSelected 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : isCompleted 
                                ? 'bg-emerald-100 border-emerald-200 text-emerald-600' 
                                : 'bg-slate-100 border-slate-200 text-slate-500 group-hover:border-indigo-200 group-hover:text-indigo-600'
                    }`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : q.id}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug mb-2 ${isSelected ? 'text-indigo-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                            {q.text}
                        </p>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] truncate max-w-[150px] px-2 py-0.5 rounded-md font-medium ${
                                isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {q.category}
                            </span>
                            {isBookmarked && (
                                <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Active Indicator Bar */}
                {isSelected && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-indigo-600" />
                )}
              </button>
            )})}
          </>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 backdrop-blur-sm text-xs font-medium text-slate-500 flex justify-between items-center px-6">
        <span className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                    style={{width: `${(completedIds.length / questions.length) * 100}%`}}
                />
            </div>
            {Math.round((completedIds.length / questions.length) * 100)}%
        </span>
        <span>{questions.length} вопросов</span>
      </div>
    </div>
  );
};

export default QuestionList;