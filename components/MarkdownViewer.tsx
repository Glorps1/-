import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownViewerProps {
  content: string;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <div className="prose prose-slate max-w-none 
        prose-headings:font-bold prose-headings:text-slate-900 
        prose-h1:text-2xl prose-h1:mb-6
        prose-h2:text-xl prose-h2:text-indigo-800 prose-h2:mt-8 prose-h2:mb-4 prose-h2:flex prose-h2:items-center prose-h2:gap-2
        prose-p:text-slate-700 prose-p:leading-7 prose-p:text-[16px]
        prose-li:text-slate-700 
        prose-strong:text-slate-900 prose-strong:font-bold
        prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono
        prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl
        prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-slate-700
        prose-ul:list-disc prose-ul:pl-5
        prose-ol:list-decimal prose-ol:pl-5
        prose-img:rounded-xl prose-img:shadow-md
    ">
      <ReactMarkdown
        children={content}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
            table: ({node, ...props}) => <div className="overflow-x-auto my-6 rounded-xl border border-slate-200 shadow-sm"><table className="min-w-full divide-y divide-slate-200" {...props} /></div>,
            th: ({node, ...props}) => <th className="px-4 py-3 bg-slate-50 font-semibold text-left text-sm text-slate-900" {...props} />,
            td: ({node, ...props}) => <td className="px-4 py-3 border-t border-slate-100 text-sm" {...props} />,
            hr: ({node, ...props}) => <hr className="border-slate-100 my-8" {...props} />,
            // Customize math blocks container
            div: ({node, className, ...props}) => {
                if (className?.includes('math-display')) {
                    return <div className="overflow-x-auto my-4 py-2 text-center" {...props} />
                }
                return <div className={className} {...props} />
            }
        }}
      />
    </div>
  );
};

export default MarkdownViewer;