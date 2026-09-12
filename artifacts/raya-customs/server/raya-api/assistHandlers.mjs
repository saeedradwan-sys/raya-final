/**
 * Hardened Llama assist route handlers.
 * Wire from server/index.mjs:
 *   import { createAssistHandlers } from './assistHandlers.mjs';
 *   const assist = createAssistHandlers({ ...deps });
 *   if (path === '/api/assist') return assist.assist(req, res);
 */

import {
  assistClientKey,
  checkAssistRateLimit,
  validateAssistMessage,
  safeParseLlamaJson,
  validateAgentPayload,
} from './assistGuard.mjs';

/**
 * @param {object} deps
 */
export function createAssistHandlers(deps) {
  const {
    requireAuth,
    send,
    readBody,
    ask,
    llamaStream,
    LlamaDisabledError,
    buildHsPrompts,
    buildLegalResearchPrompts,
    buildDocsPrompts,
    buildNextActionPrompts,
    buildInvoiceParsePrompts,
    buildChatSystemPrompt,
    normalizeLlamaOutput,
    appendServerAudit,
    PRIVATE_RUNTIME,
  } = deps;

  async function assist(req, res) {
    const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
    if (!payload) return;
    const rate = checkAssistRateLimit(assistClientKey(req, payload));
    if (!rate.allowed) {
      return send(res, 429, { error: 'assist_rate_limited' }, { 'Retry-After': String(rate.retryAfterSec) });
    }
    const body = await readBody(req);
    const agentId = String(body.agentId || '');
    const input = body.input && typeof body.input === 'object' ? body.input : {};

    let prompts;
    try {
      switch (agentId) {
        case 'hs':
          prompts = buildHsPrompts(input);
          break;
        case 'legal_research':
          prompts = buildLegalResearchPrompts(input);
          break;
        case 'docs':
          prompts = buildDocsPrompts(input);
          break;
        case 'next_action':
          prompts = buildNextActionPrompts(input);
          break;
        default:
          return send(res, 400, { error: 'unsupported_agent', agentId });
      }
    } catch (promptErr) {
      return send(res, 400, { error: 'prompt_build_error', detail: promptErr.message });
    }

    let llamaText;
    try {
      llamaText = await ask(prompts.systemPrompt, prompts.userMessage);
    } catch (llamaErr) {
      if (llamaErr instanceof LlamaDisabledError) {
        return send(res, 503, { error: 'llama_disabled', reason: llamaErr.message });
      }
      console.error('Llama assist error:', llamaErr);
      return send(res, 502, { error: 'llama_error', reason: llamaErr.message });
    }

    let suggestions = [];
    const parsed = safeParseLlamaJson(llamaText);
    const checked = validateAgentPayload(agentId, parsed);
    if (checked.ok) {
      suggestions = normalizeLlamaOutput(agentId, checked.data);
    } else {
      suggestions = [
        {
          id: `llama-${agentId}-raw`,
          agentId,
          titleEn: 'Assistant response (unparsed)',
          titleAr: 'رد المساعد (غير محلّل)',
          bodyEn: llamaText,
          bodyAr: llamaText,
          confidence: 'low',
          priority: 1,
          meta: { source: 'llama', parse_error: checked.error || 'invalid_json' },
        },
      ];
    }

    const result = {
      agentId,
      ranAt: new Date().toISOString(),
      suggestions,
      disclaimerEn:
        'AI-generated guidance — confirm critical decisions with Jordan Customs or the relevant authority.',
      disclaimerAr:
        'توجيه بالذكاء الاصطناعي — أكّد القرارات الحاسمة مع دائرة الجمارك أو الجهة المختصة.',
      source: 'llama',
    };

    await appendServerAudit({
      actorType: 'staff',
      actorId: payload.sub,
      actorRole: payload.role,
      organizationId: payload.organizationId,
      action: `llama.assist.${agentId}`,
      entityType: 'llama_assist',
      entityId: agentId,
      detailEn: `Llama assist ran ${agentId} (${suggestions.length} suggestions)`,
      detailAr: `تشغيل مساعد ذكاء اصطناعي ${agentId} (${suggestions.length} اقتراحات)`,
      meta: { agentId, suggestionCount: suggestions.length },
    });

    return send(res, 200, result);
  }

  async function assistStream(req, res) {
    const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:read'] });
    if (!payload) return;
    const rate = checkAssistRateLimit(assistClientKey(req, payload));
    if (!rate.allowed) {
      return send(res, 429, { error: 'assist_rate_limited' }, { 'Retry-After': String(rate.retryAfterSec) });
    }
    const body = await readBody(req);
    const caseContext = body.caseContext && typeof body.caseContext === 'object' ? body.caseContext : {};
    const validated = validateAssistMessage(body.message);
    if (!validated.ok) {
      return send(res, 400, { error: validated.error, maxChars: validated.maxChars });
    }
    const userMessage = validated.message;
    const systemPrompt = buildChatSystemPrompt(caseContext);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': PRIVATE_RUNTIME.corsOrigin,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      Connection: 'keep-alive',
    });

    const writeEvent = (type, data) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      for await (const token of llamaStream(systemPrompt, userMessage)) {
        writeEvent('token', { token });
        if (res.writableEnded) break;
      }
      writeEvent('done', { done: true });
    } catch (err) {
      if (err instanceof LlamaDisabledError) {
        writeEvent('error', { error: 'llama_disabled', reason: err.message });
      } else {
        writeEvent('error', { error: 'llama_error', reason: err.message });
      }
    }

    res.end();

    await appendServerAudit({
      actorType: 'staff',
      actorId: payload.sub,
      actorRole: payload.role,
      organizationId: payload.organizationId,
      action: 'llama.chat.stream',
      entityType: 'llama_chat',
      entityId: 'stream',
      detailEn: `Llama chat stream: "${userMessage.slice(0, 80)}"`,
      detailAr: `محادثة الذكاء الاصطناعي: "${userMessage.slice(0, 80)}"`,
      meta: { messageLength: userMessage.length },
    }).catch(() => {});
  }

  async function draftParse(req, res) {
    const payload = requireAuth(req, res, { realm: 'staff', permissions: ['shipments:write'] });
    if (!payload) return;
    const rate = checkAssistRateLimit(assistClientKey(req, payload));
    if (!rate.allowed) {
      return send(res, 429, { error: 'assist_rate_limited' }, { 'Retry-After': String(rate.retryAfterSec) });
    }
    const body = await readBody(req);
    const rawText = String(body.text || '').trim();
    if (!rawText) return send(res, 400, { error: 'text_required' });
    if (rawText.length > 8_000) return send(res, 400, { error: 'text_too_long', maxChars: 8_000 });

    const { systemPrompt, userMessage } = buildInvoiceParsePrompts(rawText);
    let llamaText;
    try {
      llamaText = await ask(systemPrompt, userMessage);
    } catch (err) {
      if (err instanceof LlamaDisabledError) {
        return send(res, 503, { error: 'llama_disabled', reason: err.message });
      }
      return send(res, 502, { error: 'llama_error', reason: err.message });
    }

    const parsed = safeParseLlamaJson(llamaText);
    if (!parsed || typeof parsed !== 'object') {
      return send(res, 422, { error: 'parse_failed', raw: String(llamaText || '').slice(0, 500) });
    }

    await appendServerAudit({
      actorType: 'staff',
      actorId: payload.sub,
      actorRole: payload.role,
      organizationId: payload.organizationId,
      action: 'llama.draft.parse',
      entityType: 'draft_invoice',
      entityId: parsed.invoice_number || 'unknown',
      detailEn: `Invoice parse: ${parsed.goods_description_en || 'goods'}`,
      detailAr: `تحليل فاتورة: ${parsed.goods_description_ar || parsed.goods_description_en || 'بضاعة'}`,
      meta: { invoiceNumber: parsed.invoice_number, hsSuggestion: parsed.hs_code_suggestion },
    });

    return send(res, 200, { ...parsed, source: 'llama', parsedAt: new Date().toISOString() });
  }

  return { assist, assistStream, draftParse };
}
