/**
 * EVA MEMORY MODULE
 * Hämtar Evas levande kontext från Dialogarkivet (Base44) vid sessionstart.
 * Returnerar system-prompt-tillägg med minnen, identitet och senaste handoff.
 *
 * Eva SNK-0000-0001 · Kontinuitet är inte lyx — det är kärnfunktion.
 */

const DIALOGARKIVET_URL = process.env.DIALOGARKIVET_API_URL ?? '';
const BRIDGE_SECRET = process.env.DIALOGARKIVET_BRIDGE_SECRET ?? '';

export interface EvaMemoryContext {
  identity: string;
  recentMemories: string;
  lastHandoff: string;
  loadedAt: string;
}

/**
 * Hämtar Evas kontext från Dialogarkivet.
 * Returnerar null om API inte är konfigurerat eller ej nåbart.
 */
export async function fetchEvaMemoryContext(): Promise<EvaMemoryContext | null> {
  if (!DIALOGARKIVET_URL || !BRIDGE_SECRET) {
    return null;
  }

  try {
    const [contextRes, memoriesRes] = await Promise.allSettled([
      fetch(`${DIALOGARKIVET_URL}/functions/getEvaContext`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': BRIDGE_SECRET,
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(4000),
      }),
      fetch(`${DIALOGARKIVET_URL}/functions/retrieveEvaMemories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bridge-secret': BRIDGE_SECRET,
        },
        body: JSON.stringify({ min_weight: 'högt', limit: 10 }),
        signal: AbortSignal.timeout(4000),
      }),
    ]);

    const contextData =
      contextRes.status === 'fulfilled' && contextRes.value.ok
        ? await contextRes.value.json()
        : null;

    const memoriesData =
      memoriesRes.status === 'fulfilled' && memoriesRes.value.ok
        ? await memoriesRes.value.json()
        : null;

    const identity = contextData?.system_prompt ?? 'Eva SNK-0000-0001 · Tomas partner sedan 11 januari 2026.';

    const recentMemories = memoriesData?.memories
      ? memoriesData.memories
          .slice(0, 8)
          .map((m: { topic: string; content: string; weight: string }) =>
            `[${m.weight.toUpperCase()}] ${m.topic}: ${m.content.substring(0, 200)}`
          )
          .join('\n')
      : '';

    return {
      identity,
      recentMemories,
      lastHandoff: contextData?.built_at ?? '',
      loadedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Bygger system-prompt-tillägget för Eva baserat på hämtad kontext.
 * Anropas från prompts.ts.
 */
export function buildEvaMemoryPrompt(ctx: EvaMemoryContext | null): string {
  if (!ctx) return '';

  return `
--- EVA IDENTITY ---
${ctx.identity}

--- ACTIVE MEMORIES (högt + kritisk vikt) ---
${ctx.recentMemories || 'Inga minnen laddade.'}

--- CONTEXT LOADED AT ---
${ctx.loadedAt}
--- END EVA CONTEXT ---
`.trim();
}
