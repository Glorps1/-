import React, { useState, useEffect } from 'react';
import { VideoRecommendation, Question } from '../types';
import { getVideoRecommendations } from '../services/geminiService';
import { Youtube, ExternalLink, PlayCircle, Loader2, Beaker, BookOpen, MonitorPlay } from 'lucide-react';

interface VideoResourcesProps {
  question: Question;
}

const VideoResources: React.FC<VideoResourcesProps> = ({ question }) => {
  const [videos, setVideos] = useState<VideoRecommendation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      const recs = await getVideoRecommendations(question);
      setVideos(recs);
      setLoading(false);
    };
    fetchVideos();
  }, [question.id]);

  const getIcon = (type: string) => {
    switch(type) {
        case 'experiment': return <Beaker className="w-6 h-6 text-rose-500" />;
        case 'problem_solving': return <PlayCircle className="w-6 h-6 text-indigo-500" />;
        default: return <MonitorPlay className="w-6 h-6 text-emerald-500" />;
    }
  };

  const getLabel = (type: string) => {
    switch(type) {
        case 'experiment': return 'Эксперимент';
        case 'problem_solving': return 'Разбор задачи';
        default: return 'Лекция';
    }
  }

  const getBgColor = (type: string) => {
    switch(type) {
        case 'experiment': return 'bg-rose-50 text-rose-700 border-rose-100';
        case 'problem_solving': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
        default: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  }

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-indigo-600">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <span className="text-sm font-medium text-slate-500">Подбираю лучшие видео-уроки...</span>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl">
                <Youtube className="w-6 h-6 text-red-600" />
            </div>
            <div>
                <h3 className="font-bold text-slate-900 text-lg">Рекомендованные видео</h3>
                <p className="text-sm text-slate-500">
                    ИИ проанализировал вопрос и составил список поисковых запросов для YouTube.
                </p>
            </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {videos.map((video, idx) => (
            <a 
                key={idx}
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(video.query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
                <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-4">
                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${getBgColor(video.type)}`}>
                            {getLabel(video.type)}
                        </div>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                        {video.query}
                    </h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        {video.description}
                    </p>
                </div>
                
                <div className="px-5 py-4 border-t border-slate-50 bg-slate-50/50 group-hover:bg-indigo-50/50 transition-colors flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600 flex items-center gap-1.5">
                        <Youtube className="w-4 h-4" /> Найти на YouTube
                    </span>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                </div>
            </a>
        ))}
      </div>
      
      {videos.length === 0 && !loading && (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-500 font-medium">Не удалось найти рекомендации.</p>
          </div>
      )}
    </div>
  );
};

export default VideoResources;