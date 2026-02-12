'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants, Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MobileNav } from '@/components/ui/navbar'
import { useTheme } from 'next-themes'
import { BellIcon, PlusCircleIcon, SettingsIcon, Search as SearchIcon, Home as HomeIcon, ChevronLeft } from 'lucide-react'
import { ToolMode } from '../types'

/* ------------------ Sample nav (replace with real links) ------------------ */
const navigationLinks = [
    {
        name: 'Menu',
        items: [
            { href: '#', label: 'Home' },
            { href: '#', label: 'Tools' },
            { href: '#', label: 'About' },
            { href: '#', label: 'Github' },
        ],
    },
]

/* -------------------------------- Search --------------------------------- */
export function Search({ className }: React.ComponentProps<'button'>) {
    // safe client-side detection of mac
    const isMac =
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        navigator.platform?.toUpperCase().includes('MAC')

    return (
        <Button
            variant="secondary"
            className={cn(
                'bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-500 dark:text-slate-400 relative h-9 w-full justify-start pl-3 font-normal shadow-none sm:pr-12 md:w-40 lg:w-64 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors',
                className
            )}
            aria-label="Search"
        >
            <SearchIcon className="mr-2 h-4 w-4" />
            <span className="hidden lg:inline-flex">Search tools...</span>
            <span className="inline-flex lg:hidden">Search...</span>

            <div className="absolute top-2 right-2 hidden gap-1 sm:flex">
                <CommandMenuKbd>{isMac ? '⌘' : 'Ctrl'}</CommandMenuKbd>
                <CommandMenuKbd className="h-5">K</CommandMenuKbd>
            </div>
        </Button>
    )
}

function CommandMenuKbd({ className, ...props }: React.ComponentProps<'kbd'>) {
    return (
        <kbd
            className={cn(
                'bg-background text-muted-foreground pointer-events-none flex h-5 items-center justify-center gap-1 rounded border px-1 font-sans text-[0.7rem] font-medium select-none',
                className
            )}
            {...props}
        />
    )
}

/* ----------------------------- ModeSwitcher ------------------------------ */
export function ModeSwitcher() {
    const { setTheme, resolvedTheme } = useTheme()

    const toggleTheme = React.useCallback(() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }, [resolvedTheme, setTheme])

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex items-center justify-center cursor-pointer rounded-full"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle theme"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                aria-hidden
            >
                <circle cx="12" cy="12" r="5" />
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-slate-100"
                aria-hidden
            >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}

interface NavbarProps {
    activeTool: ToolMode;
    onBackHome: () => void;
}

/* -------------------------------- Navbar --------------------------------- */
export default function Navbar({ activeTool, onBackHome }: NavbarProps) {

    return (
        <header className="w-full bg-transparent backdrop-blur-sm sticky top-0 z-50 border-b border-transparent transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

                <div className="flex items-center justify-start gap-2 md:flex-1 md:gap-4">
                    <MobileNav nav={navigationLinks.map(cat => ({
                        ...cat,
                        items: cat.items.map(item => ({
                            ...item,
                            onClick: item.label === 'Home' ? onBackHome : undefined
                        }))
                    }))} />

                    {activeTool !== 'home' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="mr-2 md:hidden"
                            onClick={onBackHome}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}

                    <div
                        className="flex items-center gap-2.5 cursor-pointer group"
                        onClick={onBackHome}
                    >
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20 transition-all duration-300 group-hover:shadow-indigo-500/40 group-hover:scale-105">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                            </svg>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            PDFBull
                        </span>
                    </div>

                    {activeTool !== 'home' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="hidden md:flex items-center gap-2 text-slate-600 dark:text-slate-300 ml-2"
                            onClick={onBackHome}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Tools
                        </Button>
                    )}


                </div>

                <nav className="flex items-center justify-end gap-2">


                    <Separator orientation="vertical" className="hidden md:flex h-6 mx-2" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden h-9 w-9 items-center justify-center sm:flex rounded-full text-slate-500 dark:text-slate-400"
                        aria-label="Settings"
                    >
                        <SettingsIcon className="h-5 w-5" />
                    </Button>

                    <ModeSwitcher />

                    <div className="hidden sm:flex ml-2">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                            Sign In
                        </Button>
                    </div>
                </nav>
            </div>
        </header>
    )
}
