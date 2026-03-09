'use client'

/**
 * MarkdownRenderer — ReactMarkdown component overrides for bot messages.
 *
 * Provides styled rendering for headings, paragraphs, lists, code blocks,
 * links, tables (mobile-optimized), blockquotes, and inline formatting.
 * Extracted from ChatInterface.tsx for reusability and maintainability.
 */

import React from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Pre-configured ReactMarkdown component overrides.
 * Provides a beautiful, mobile-responsive rendering of bot responses
 * with dark mode support.
 */
export const markdownComponents: Components = {
    // Headings - with visual hierarchy
    h1: ({ node, ...props }) => (
        <h1 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-slate-100 pb-2 border-b border-gray-200 dark:border-slate-700" {...props} />
    ),
    h2: ({ node, ...props }) => (
        <h2 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-slate-100 flex items-center gap-2" {...props} />
    ),
    h3: ({ node, ...props }) => (
        <h3 className="text-base font-semibold mt-3 mb-2 text-gray-800 dark:text-slate-200" {...props} />
    ),
    h4: ({ node, ...props }) => (
        <h4 className="text-sm font-semibold mt-2 mb-1 text-gray-700 dark:text-slate-300" {...props} />
    ),

    // Paragraphs - improved spacing
    p: ({ node, ...props }) => (
        <p className="mb-3 last:mb-0 text-gray-800 dark:text-slate-200 leading-[1.7]" {...props} />
    ),

    // Unordered Lists - custom bullet styling
    ul: ({ node, ...props }) => (
        <ul className="my-3 space-y-2 pl-0 list-none" {...props} />
    ),

    // Ordered Lists - enhanced number styling
    ol: ({ node, ...props }) => (
        <ol className="my-3 space-y-2 pl-0 list-none counter-reset-list" style={{ counterReset: 'list-counter' }} {...props} />
    ),

    // List Items - card-like styling with icons
    li: (props: React.ComponentPropsWithoutRef<'li'> & { node?: unknown; ordered?: boolean }) => {
        const { node, ordered, ...rest } = props
        return (
            <li
                className="relative pl-6 text-gray-800 dark:text-slate-200 leading-[1.65] py-0.5 list-item-custom"
                style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
                {...rest}
            />
        )
    },

    // Code - enhanced with better contrast
    code: (props: React.ComponentPropsWithoutRef<'code'> & { node?: unknown; inline?: boolean; className?: string }) => {
        const { node, inline, className, children, ...rest } = props
        return inline ? (
            <code
                className="bg-blue-50 dark:bg-slate-700 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[0.9em] font-mono border border-blue-100 dark:border-slate-600"
                {...rest}
            >
                {children}
            </code>
        ) : (
            <code
                className="block bg-gray-900 dark:bg-slate-950 text-gray-100 dark:text-slate-200 p-4 rounded-xl text-sm font-mono overflow-x-auto my-4 shadow-lg border border-gray-700 dark:border-slate-700"
                {...rest}
            >
                {children}
            </code>
        )
    },
    pre: ({ node, ...props }) => <pre className="my-4" {...props} />,

    // Links - more visible
    a: ({ node, ...props }) => (
        <a
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-300 dark:decoration-blue-600 underline-offset-2 transition-colors font-medium"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
        />
    ),

    // Tables - Mobile-optimized with scroll hint
    table: ({ node, ...props }) => (
        <div className="table-wrapper my-4 -mx-4 sm:mx-0">
            <div className="table-scroll-hint text-xs text-gray-400 dark:text-slate-500 text-center pb-1 sm:hidden flex items-center justify-center gap-1">
                <span>←</span>
                <span>Wischen zum Scrollen</span>
                <span>→</span>
            </div>
            <div className="overflow-x-auto rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-600 shadow-md bg-white dark:bg-slate-800/90 mx-2 sm:mx-0">
                <table className="w-full border-collapse text-sm" style={{ minWidth: '400px' }} {...props} />
            </div>
        </div>
    ),
    thead: ({ node, ...props }) => (
        <thead className="bg-blue-600 dark:bg-blue-700 text-white sticky top-0" {...props} />
    ),
    tbody: ({ node, ...props }) => (
        <tbody className="divide-y divide-gray-100 dark:divide-slate-700 bg-white dark:bg-slate-800" {...props} />
    ),
    tr: ({ node, ...props }) => (
        <tr className="hover:bg-blue-50 dark:hover:bg-slate-700/70 transition-colors" {...props} />
    ),
    th: ({ node, ...props }) => (
        <th className="px-3 py-2.5 sm:px-4 sm:py-3 text-left text-[11px] sm:text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap" {...props} />
    ),
    td: ({ node, ...props }) => (
        <td
            className="px-3 py-2.5 sm:px-4 sm:py-3 text-[13px] sm:text-sm text-gray-800 dark:text-slate-200 whitespace-nowrap"
            {...props}
        />
    ),

    // Blockquotes - improved styling
    blockquote: ({ node, ...props }) => (
        <blockquote
            className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-3 my-4 text-gray-700 dark:text-slate-300 bg-gradient-to-r from-blue-50 to-transparent dark:from-slate-800 dark:to-transparent rounded-r-lg"
            {...props}
        />
    ),

    // Strong & Em - enhanced visibility
    strong: ({ node, ...props }) => (
        <strong className="font-semibold text-gray-900 dark:text-white" {...props} />
    ),
    em: ({ node, ...props }) => (
        <em className="italic text-gray-700 dark:text-slate-300" {...props} />
    ),

    // Horizontal Rule - styled divider
    hr: ({ node, ...props }) => (
        <hr className="my-6 border-none h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-slate-600 to-transparent" {...props} />
    ),
}

interface MarkdownRendererProps {
    content: string
    sanitize?: (text: string) => string
}

/**
 * Renders bot message content with styled ReactMarkdown.
 *
 * @param content   - The raw markdown string to render.
 * @param sanitize  - Optional sanitizer function applied before rendering.
 */
export default function MarkdownRenderer({ content, sanitize }: MarkdownRendererProps) {
    const processedContent = sanitize ? sanitize(content) : content

    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {processedContent}
        </ReactMarkdown>
    )
}
