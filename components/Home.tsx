import React from 'react';
import { Layers, Scissors, ArrowRight, Eye, Minimize2 } from 'lucide-react';
import { ToolMode } from '../types';

interface HomeProps {
  onSelectTool: (mode: ToolMode) => void;
}

const Home: React.FC<HomeProps> = ({ onSelectTool }) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center py-20 px-4">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-6 text-center">
        All-in-one <span className="text-indigo-600 dark:text-indigo-400">PDF Tools</span>
      </h1>
      <p className="max-w-2xl text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-16 text-center">
        Secure, fast, and free PDF utilities running entirely in your browser.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-[90rem] w-full px-4">
        {/* Merge Tile */}
        <div 
          onClick={() => onSelectTool('merge')}
          className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Layers className="w-32 h-32 text-indigo-600 dark:text-indigo-400 transform translate-x-8 -translate-y-8" />
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-300">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Merge PDF</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
              Combine multiple files into one document.
            </p>
            <div className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 font-semibold group-hover:translate-x-2 transition-transform">
              Merge <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>

        {/* Split Tile */}
        <div 
          onClick={() => onSelectTool('split')}
          className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Scissors className="w-32 h-32 text-indigo-600 dark:text-indigo-400 transform translate-x-8 -translate-y-8" />
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-14 h-14 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mb-6 text-pink-600 dark:text-pink-400 group-hover:scale-110 transition-transform duration-300">
              <Scissors className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Split PDF</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
              Extract pages or ranges to new files.
            </p>
            <div className="flex items-center text-sm text-pink-600 dark:text-pink-400 font-semibold group-hover:translate-x-2 transition-transform">
              Split <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>

        {/* Compress Tile */}
        <div 
          onClick={() => onSelectTool('compress')}
          className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Minimize2 className="w-32 h-32 text-indigo-600 dark:text-indigo-400 transform translate-x-8 -translate-y-8" />
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mb-6 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform duration-300">
              <Minimize2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">Compress PDF</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
              Reduce file size while maintaining quality.
            </p>
            <div className="flex items-center text-sm text-orange-600 dark:text-orange-400 font-semibold group-hover:translate-x-2 transition-transform">
              Compress <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>

        {/* View Tile */}
        <div 
          onClick={() => onSelectTool('view')}
          className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl hover:shadow-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Eye className="w-32 h-32 text-indigo-600 dark:text-indigo-400 transform translate-x-8 -translate-y-8" />
          </div>
          
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="w-14 h-14 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center mb-6 text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform duration-300">
              <Eye className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">View PDF</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-1">
              View PDF documents securely in browser.
            </p>
            <div className="flex items-center text-sm text-teal-600 dark:text-teal-400 font-semibold group-hover:translate-x-2 transition-transform">
              View <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;