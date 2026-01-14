import React, { useState, useEffect } from 'react';
import { QuizQuestion, Question } from '../types';
import { generateQuiz } from '../services/geminiService';
import { CheckCircle2, XCircle, ChevronRight, RotateCw, Trophy, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface QuizInterfaceProps {
  question: Question;
}

const QuizInterface: React.FC<QuizInterfaceProps> = ({ question }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quiz State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [question.id]);

  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setShowResults(false);
    setSelectedOption(null);
    setIsAnswered(false);

    try {
      const data = await generateQuiz(question);
      if (data.length === 0) throw new Error("Не удалось сгенерировать тест");
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || "Ошибка загрузки теста");
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleCheck = () => {
    if (selectedOption === null) return;
    
    setIsAnswered(true);
    if (selectedOption === questions[currentIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] animate-in fade-in">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-xl">🤔</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Составляю тест...</h3>
        <p className="text-slate-500 text-sm mt-1">Придумываю вопросы по теме билета</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center p-6">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
           <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Упс, ошибка</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button 
          onClick={loadQuiz}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-200"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    let message = "";
    let color = "";
    
    if (percentage >= 80) { message = "Отличный результат! 🎓"; color = "text-emerald-600"; }
    else if (percentage >= 60) { message = "Хорошо, но можно лучше 💪"; color = "text-indigo-600"; }
    else { message = "Стоит повторить тему 📚"; color = "text-amber-600"; }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] animate-in zoom-in-95 duration-300">
        <div className="w-24 h-24 bg-gradient-to-tr from-yellow-300 to-amber-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-amber-200">
          <Trophy className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">{score} из {questions.length}</h2>
        <p className={`text-lg font-medium mb-8 ${color}`}>{message}</p>
        
        <button 
          onClick={loadQuiz}
          className="flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
        >
          <RotateCw className="w-5 h-5" /> Пройти еще раз
        </button>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto h-full flex flex-col pb-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <span>Вопрос {currentIndex + 1} из {questions.length}</span>
            <span>Счет: {score}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
                className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 flex-1 flex flex-col animate-in slide-in-from-right-4 duration-300">
        <h3 className="text-xl font-bold text-slate-900 mb-6 leading-relaxed">
            <ReactMarkdown 
                children={currentQ.question}
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                    p: ({node, ...props}) => <span {...props} />
                }}
            />
        </h3>

        <div className="space-y-3 flex-1">
            {currentQ.options.map((option, idx) => {
                let statusClass = "border-slate-200 hover:border-indigo-300 hover:bg-slate-50";
                let icon = null;

                if (isAnswered) {
                    if (idx === currentQ.correctAnswer) {
                        statusClass = "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500";
                        icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
                    } else if (idx === selectedOption) {
                        statusClass = "border-red-400 bg-red-50 text-red-800";
                        icon = <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
                    } else {
                        statusClass = "border-slate-100 bg-slate-50 opacity-50";
                    }
                } else if (idx === selectedOption) {
                    statusClass = "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-600";
                }

                return (
                    <button
                        key={idx}
                        onClick={() => handleOptionClick(idx)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${statusClass}`}
                    >
                        <span className="font-medium text-[15px]">{option}</span>
                        {icon}
                    </button>
                );
            })}
        </div>

        {/* Footer / Actions */}
        <div className="mt-8 pt-6 border-t border-slate-100 min-h-[80px] flex items-end justify-between">
            {isAnswered ? (
                <div className="w-full">
                    <div className="mb-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700">
                        <span className="font-bold block mb-1">Пояснение:</span>
                        <ReactMarkdown children={currentQ.explanation} />
                    </div>
                    <button 
                        onClick={handleNext}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200"
                    >
                        {currentIndex === questions.length - 1 ? "Завершить тест" : "Следующий вопрос"} 
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={handleCheck}
                    disabled={selectedOption === null}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold transition-all"
                >
                    Проверить
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default QuizInterface;
