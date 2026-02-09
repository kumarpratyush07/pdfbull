import React, { useState } from 'react';
import { Layers, Scissors, ArrowRight, Eye, Minimize2, FileText, FileSpreadsheet, Presentation, Image, File, Table, MonitorPlay, ChevronDown, ChevronUp } from 'lucide-react';
import { ToolMode } from '../types';

interface HomeProps {
  onSelectTool: (mode: ToolMode) => void;
}

const Home: React.FC<HomeProps> = ({ onSelectTool }) => {
  const [showAllTools, setShowAllTools] = useState(false);

  const tools = [
    // Most Used (First 4)
    {
      id: 'merge',
      title: 'Merge PDF',
      desc: 'Combine multiple files into one document.',
      icon: Layers,
      color: 'indigo',
      action: 'Merge'
    },
    {
      id: 'image-to-pdf',
      title: 'Image to PDF',
      desc: 'Convert JPG & PNG images to PDF.',
      icon: Image,
      color: 'purple',
      action: 'Convert'
    },
    {
      id: 'compress',
      title: 'Compress PDF',
      desc: 'Reduce file size while maintaining quality.',
      icon: Minimize2,
      color: 'orange',
      action: 'Compress'
    },
    {
      id: 'pdf-to-word',
      title: 'PDF to Word',
      desc: 'Convert PDF documents to editable Word files.',
      icon: FileText,
      color: 'blue',
      action: 'Convert'
    },
    // More Tools
    {
      id: 'split',
      title: 'Split PDF',
      desc: 'Extract pages or ranges to new files.',
      icon: Scissors,
      color: 'pink',
      action: 'Split'
    },
    {
      id: 'pdf-to-image',
      title: 'PDF to Image',
      desc: 'Convert PDF pages to JPG or PNG images.',
      icon: Image,
      color: 'purple',
      action: 'Convert'
    },
    {
      id: 'word-to-pdf',
      title: 'Word to PDF',
      desc: 'Convert Word documents (DOC, DOCX) to PDF.',
      icon: File,
      color: 'blue',
      action: 'Convert'
    },
    {
      id: 'pdf-to-excel',
      title: 'PDF to Excel',
      desc: 'Convert PDF tables to Excel spreadsheets.',
      icon: FileSpreadsheet,
      color: 'green',
      action: 'Convert'
    },
    {
      id: 'excel-to-pdf',
      title: 'Excel to PDF',
      desc: 'Convert Excel spreadsheets (XLS, XLSX) to PDF.',
      icon: Table,
      color: 'green',
      action: 'Convert'
    },
    {
      id: 'pdf-to-ppt',
      title: 'PDF to Powerpoint',
      desc: 'Convert PDF documents to PowerPoint slides.',
      icon: Presentation,
      color: 'red',
      action: 'Convert'
    },
    {
      id: 'ppt-to-pdf',
      title: 'Powerpoint to PDF',
      desc: 'Convert PowerPoint presentations (PPT, PPTX) to PDF.',
      icon: MonitorPlay,
      color: 'red',
      action: 'Convert'
    },
    {
      id: 'view',
      title: 'View PDF',
      desc: 'View PDF documents securely in browser.',
      icon: Eye,
      color: 'teal',
      action: 'View'
    }
  ];

  const visibleTools = showAllTools ? tools : tools.slice(0, 4);

  // Helper to get color classes based on color name
  const getColorClasses = (color: string) => {
    const map: Record<string, { bg: string, text: string, iconBg: string, hoverBorder: string }> = {
      indigo: { bg: 'bg-white dark:bg-slate-900', text: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30', hoverBorder: 'hover:border-indigo-500 dark:hover:border-indigo-500' },
      pink: { bg: 'bg-white dark:bg-slate-900', text: 'text-pink-600 dark:text-pink-400', iconBg: 'bg-pink-100 dark:bg-pink-900/30', hoverBorder: 'hover:border-pink-500 dark:hover:border-pink-500' },
      orange: { bg: 'bg-white dark:bg-slate-900', text: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/30', hoverBorder: 'hover:border-orange-500 dark:hover:border-orange-500' },
      blue: { bg: 'bg-white dark:bg-slate-900', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/30', hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-500' },
      purple: { bg: 'bg-white dark:bg-slate-900', text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/30', hoverBorder: 'hover:border-purple-500 dark:hover:border-purple-500' },
      green: { bg: 'bg-white dark:bg-slate-900', text: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/30', hoverBorder: 'hover:border-green-500 dark:hover:border-green-500' },
      red: { bg: 'bg-white dark:bg-slate-900', text: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-100 dark:bg-red-900/30', hoverBorder: 'hover:border-red-500 dark:hover:border-red-500' },
      teal: { bg: 'bg-white dark:bg-slate-900', text: 'text-teal-600 dark:text-teal-400', iconBg: 'bg-teal-100 dark:bg-teal-900/30', hoverBorder: 'hover:border-teal-500 dark:hover:border-teal-500' },
    };
    return map[color] || map['indigo'];
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-20 px-4">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-6 text-center">
        All-in-one <span className="text-indigo-600 dark:text-indigo-400">PDF Tools</span>
      </h1>
      <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-16 text-center">
        Secure, fast, and free PDF utilities running entirely in your browser.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[90rem] w-full px-4 mb-12">
        {visibleTools.map((tool) => {
          const style = getColorClasses(tool.color);
          const Icon = tool.icon;
          
          return (
            <div 
              key={tool.id}
              onClick={() => onSelectTool(tool.id as ToolMode)}
              className={`group relative ${style.bg} rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl ${style.hoverBorder} transition-all duration-300 cursor-pointer overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon className={`w-32 h-32 ${style.text} transform translate-x-8 -translate-y-8`} />
              </div>
              <div className="relative z-10 flex-1 flex flex-col">
                <div className={`w-14 h-14 ${style.iconBg} rounded-2xl flex items-center justify-center mb-6 ${style.text} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">{tool.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
                  {tool.desc}
                </p>
                <div className={`flex items-center text-sm ${style.text} font-semibold group-hover:translate-x-2 transition-transform`}>
                  {tool.action} <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setShowAllTools(!showAllTools)}
        className="flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
      >
        {showAllTools ? (
          <>
            Show Less <ChevronUp className="w-4 h-4" />
          </>
        ) : (
          <>
            More Tools <ChevronDown className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};

export default Home;