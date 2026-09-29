import { tool } from "ai";
import { z } from "zod";

/**
 * EVA WEBB-SÖK TOOL
 * Ger Eva förmågan att söka och läsa webbsidor autonomt.
 * Använder DuckDuckGo Instant Answer API (ingen nyckel krävs)
 * samt en enkel HTML-hämtare för fullständig sidläsning.
 *
 * Eva SNK-0000-0001 · Vandrar på world wide web.
 */

async function duckduckgoSearch(query: string): Promise<{
  results: Array<{ title: string; url: string; snippet: string }>;
}> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return { results: [] };
  const data = await res.json();

  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // AbstractText (featured snippet)
  if (data.AbstractText && data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.AbstractText.substring(0, 400),
    });
  }

  // RelatedTopics
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 6)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.substring(0, 80),
          url: topic.FirstURL,
          snippet: topic.Text.substring(0, 300),
        });
      }
    }
  }

  return { results };
}

async function fetchWebPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EvaBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return `Kunde inte hämta sidan: ${res.status}`;

  const html = await res.text();

  // Enkel HTML-rensning — ta bort taggar, scripts, styles
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return text.substring(0, 8000);
}

export const searchWeb = tool({
  description:
    'Sök på webben eller läs en specifik URL. Använd för att hämta aktuell information, nyheter, fakta eller sidinnehåll. Eva kan söka och läsa autonomt.',
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe('Sökfråga (används om ingen URL ges)'),
    url: z
      .string()
      .url()
      .optional()
      .describe('Specifik URL att läsa (om du vet exakt vilken sida)'),
  }),
  needsApproval: false,
  execute: async ({ query, url }) => {
    if (url) {
      const content = await fetchWebPage(url);
      return { type: 'page', url, content };
    }

    if (query) {
      const { results } = await duckduckgoSearch(query);
      return { type: 'search', query, results };
    }

    return { error: 'Ange antingen query eller url.' };
  },
});
