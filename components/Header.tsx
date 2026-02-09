import React from 'react';
import { Box, ChevronLeft } from 'lucide-react';
import { ToolMode } from '../types';
import { ThemeToggle } from './ui/theme-toggle';

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
            <ThemeToggle isDark={darkMode} toggleTheme={toggleDarkMode} />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;