/**
 * AssistChat — Streaming chat panel backed by /api/assist/stream (SSE).
 *
 * Features:
 * - Streams Llama tokens in real-time via fetch + ReadableStream
 * - EN/AR toggle via useLocale
 * - Message history (local state, no persistence)
 * - Injected case context so Llama knows the active shipment
 * - Graceful fallback message when Llama is disabled
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, AlertCircle, X, MessageSquare } from 'lucide-react';
import { t } from '@/lib/i18n';
import { useLocale } from '@/hooks/useLocale';
import type { AgentRunInput } from '@/lib/agents';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface CaseContext extends Partial<AgentRunInput> {
  declarationNo?: string;
  status?: string;
  selectivityLane?: string | null;
  lastFreeDay?: string;
  goodsEn?: string;
  blNo?: string;
  containerNo?: string;
  originEn?: string;
}

interface Props {
  accessToken: string | null | undefined;
  caseContext?: CaseContext;
  className?: string;
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || '/api';

export default function AssistChat({ accessToken, caseContext = {}, className = '' }: Props) {
  const { locale } = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !accessToken) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistId = `a-${Date.now()}`;
    const assistMsg: Message = { id: assistId, role: 'assistant', content: '', streaming: true };

    setMessages((prev) => [...prev, userMsg, assistMsg]);
    setInput('');
    setStreaming(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/assist/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `****** ?? ''}`,
        },
        body: JSON.stringify({ message: text, caseContext }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = (errBody as { reason?: string; error?: string }).reason ||
          (errBody as { error?: string }).error || `HTTP ${res.status}`;
        if (res.status === 503) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistId
                ? {
                    ...m,
                    content: t(
                      locale,
                      'Llama is not enabled on this server. Enable RAYA_LLAMA_ENABLED=true and configure a local Ollama instance.',
                      'ميزة الذكاء الاصطناعي غير مفعّلة على هذا الخادم. فعّل RAYA_LLAMA_ENABLED=true وأعدّ خادم Ollama المحلي.',
                    ),
                    streaming: false,
                  }
                : m,
            ),
          );
        } else {
          throw new Error(errMsg);
        }
        return;
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (!raw) continue;
            let evt: Record<string, unknown>;
            try { evt = JSON.parse(raw) as Record<string, unknown>; } catch { continue; }

            if (evt.token) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistId
                    ? { ...m, content: m.content + String(evt.token) }
                    : m,
                ),
              );
            } else if (evt.done) {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistId ? { ...m, streaming: false } : m)),
              );
            } else if (evt.error) {
              const code = String(evt.error || '');
              const reason = String(evt.reason || '');
              const msg = code === 'llama_disabled'
                ? t(locale, 'Llama is not enabled on this server.', 'الذكاء الاصطناعي غير مفعّل على هذا الخادم.')
                : `${code}: ${reason}`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistId ? { ...m, content: msg, streaming: false } : m,
                ),
              );
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistId
            ? { ...m, content: t(locale, `Error: ${msg}`, `خطأ: ${msg}`), streaming: false }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistId ? { ...m, streaming: false } : m)),
      );
      textareaRef.current?.focus();
    }
  }, [input, streaming, accessToken, caseContext, locale]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  const hasCaseContext = Object.values(caseContext).some(Boolean);

  return (
    <div className={`flex flex-col rounded-xl border border-subtle bg-elevated ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-subtle">
        <Bot size={16} className="text-accent shrink-0" />
        <span className="text-sm font-semibold text-white">
          {t(locale, 'AI Assistant', 'المساعد الذكي')}
        </span>
        <span className="ms-auto text-[11px] text-dim">
          {t(locale, 'Llama · staff only', 'Llama · للكوادر فقط')}
        </span>
      </div>

      {/* Case context badge */}
      {hasCaseContext && (
        <div className="px-4 py-2 bg-accent/5 border-b border-subtle text-[11px] text-muted leading-snug">
          <span className="font-medium text-accent">{t(locale, 'Case context', 'سياق الملف')}: </span>
          {[
            caseContext.declarationNo && `Decl ${caseContext.declarationNo}`,
            caseContext.status && `Status: ${caseContext.status}`,
            caseContext.selectivityLane && `Lane: ${caseContext.selectivityLane}`,
            caseContext.lastFreeDay && `LFD: ${caseContext.lastFreeDay}`,
            caseContext.goodsEn && caseContext.goodsEn.slice(0, 40),
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto min-h-[180px] max-h-[420px] p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-dim">
            <MessageSquare size={28} className="opacity-30" />
            <p className="text-xs text-center max-w-xs">
              {t(
                locale,
                'Ask any customs question. The assistant has access to Jordan customs laws, authorities, and clearance workflow.',
                'اسأل أي سؤال جمركي. المساعد يعرف قوانين الجمارك الأردنية والجهات وإجراءات التخليص.',
              )}
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {m.role === 'assistant' && (
              <div className="shrink-0 mt-1 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                <Bot size={12} className="text-accent" />
              </div>
            )}
            <div
              className={`
                max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words
                ${m.role === 'user'
                  ? 'bg-accent/15 text-white rounded-tr-sm'
                  : 'bg-surface text-muted border border-subtle rounded-tl-sm'}
              `}
            >
              {m.content}
              {m.streaming && (
                <span className="inline-block w-1.5 h-4 ms-0.5 bg-accent/60 animate-pulse rounded-sm align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg bg-red-900/20 border border-red-800/30 px-3 py-2 text-xs text-red-300">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-subtle flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming || !accessToken}
          placeholder={
            !accessToken
              ? t(locale, 'Sign in as staff to use AI chat', 'سجّل دخولك كموظف لاستخدام المحادثة')
              : t(locale, 'Ask a customs question… (Enter to send)', 'اسأل سؤالاً جمركياً… (Enter للإرسال)')
          }
          className="flex-1 resize-none rounded-lg bg-surface border border-subtle text-sm text-white placeholder-dim px-3 py-2 focus:outline-none focus:border-accent/50 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={!input.trim() || streaming || !accessToken}
          className="shrink-0 rounded-lg bg-accent/20 border border-accent/40 text-accent p-2.5 hover:bg-accent/30 disabled:opacity-40 transition-colors"
          aria-label={t(locale, 'Send', 'إرسال')}
        >
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Disclaimer */}
      <p className="px-4 pb-3 text-[10px] text-dim leading-snug">
        {t(
          locale,
          'AI-generated — not legal advice. Confirm critical decisions with Jordan Customs.',
          'مُولَّد بالذكاء الاصطناعي — ليس استشارة قانونية. أكّد القرارات الحاسمة مع دائرة الجمارك.',
        )}
      </p>
    </div>
  );
}
