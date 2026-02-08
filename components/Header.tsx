import React from 'react';
import { Box, Sun, Moon, Github, ChevronLeft } from 'lucide-react';
import { ToolMode } from '../types';

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
  activeTool?: ToolMode;
  onBackHome?: () => void;
}

const Header: React.FC<HeaderProps> = ({ darkMode, toggleDarkMode, activeTool, onBackHome }) => {
  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            {activeTool && activeTool !== 'home' ? (
              <button 
                onClick={onBackHome}
                className="mr-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                title="Back to Home"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : null}
            
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={onBackHome}
            >
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Box className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-400 dark:to-indigo-200">
                PDFBull
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Pricing
            </a>
            <a href="#" className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              About
            </a>
            
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;