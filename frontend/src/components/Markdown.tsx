"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { FiCheck, FiCopy } from "react-icons/fi";

interface MarkdownProps {
  children: string;
  className?: string;
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="relative group my-3 rounded-lg border border-border bg-background overflow-hidden">
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 px-2 h-7 rounded-md bg-surface border border-border text-[11px] text-muted-foreground hover:text-crimson inline-flex items-center gap-1"
      >
        {copied ? <FiCheck size={11} /> : <FiCopy size={11} />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto px-4 py-3 text-[12.5px] leading-relaxed font-mono text-white/90">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={
        "text-[14px] text-white/90 leading-relaxed " +
        "[&_p]:my-2.5 [&_p]:text-white/85 " +
        "[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:text-white " +
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-white " +
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-white " +
        "[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1 [&_h4]:text-white/90 " +
        "[&_ul]:my-2.5 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1.5 " +
        "[&_ol]:my-2.5 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 " +
        "[&_li]:text-white/85 [&_li_p]:my-0 " +
        "[&_li::marker]:text-crimson " +
        "[&_strong]:text-white [&_strong]:font-semibold " +
        "[&_em]:italic [&_em]:text-white/90 " +
        "[&_a]:text-crimson [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-crimson-dark " +
        "[&_blockquote]:border-l-2 [&_blockquote]:border-crimson/50 [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:text-muted-foreground [&_blockquote]:italic " +
        "[&_hr]:border-border [&_hr]:my-5 " +
        "[&_table]:my-3 [&_table]:w-full [&_table]:text-[12.5px] [&_table]:border [&_table]:border-border [&_table]:rounded-md [&_table]:overflow-hidden " +
        "[&_th]:bg-background [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-border " +
        "[&_td]:px-3 [&_td]:py-2 [&_td]:border-b [&_td]:border-border [&_td]:text-white/85 " +
        "[&>:first-child]:mt-0 [&>:last-child]:mb-0 " +
        (className || "")
      }
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: cls, children: c, ...props }) {
            const isBlock = /language-/.test(cls || "");
            const text = String(c).replace(/\n$/, "");
            if (isBlock) {
              return <CodeBlock>{text}</CodeBlock>;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-crimson/10 border border-crimson/20 text-crimson font-mono text-[12.5px]"
                {...props}
              >
                {c}
              </code>
            );
          },
          pre({ children }) {
            // react-markdown wraps fenced code in <pre><code>; let CodeBlock handle styling
            return <>{children}</>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
