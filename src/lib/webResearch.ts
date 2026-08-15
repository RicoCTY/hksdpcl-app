export interface WebResearchSnippet {
  title: string;
  url: string;
  extract: string;
}

function wikiHost(language: string) {
  return language.startsWith("zh") ? "zh.wikipedia.org" : "en.wikipedia.org";
}

async function wikiOpenSearch(
  host: string,
  query: string,
  signal?: AbortSignal,
) {
  const url = new URL(`https://${host}/w/api.php`);
  url.searchParams.set("action", "opensearch");
  url.searchParams.set("search", query);
  url.searchParams.set("limit", "4");
  url.searchParams.set("namespace", "0");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as unknown;
  if (!Array.isArray(data) || data.length < 4) return [];
  const titles = Array.isArray(data[1]) ? data[1] : [];
  const urls = Array.isArray(data[3]) ? data[3] : [];
  return titles
    .map((title, index) => ({
      title: typeof title === "string" ? title : "",
      url: typeof urls[index] === "string" ? urls[index] : "",
    }))
    .filter((item) => item.title);
}

async function wikiExtracts(
  host: string,
  titles: string[],
  signal?: AbortSignal,
) {
  if (!titles.length) return new Map<string, string>();
  const url = new URL(`https://${host}/w/api.php`);
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "extracts");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("exlimit", "4");
  url.searchParams.set("titles", titles.join("|"));
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  const response = await fetch(url, { signal });
  if (!response.ok) return new Map<string, string>();
  const data = (await response.json()) as {
    query?: { pages?: Record<string, { title?: string; extract?: string }> };
  };
  const extracts = new Map<string, string>();
  Object.values(data.query?.pages ?? {}).forEach((page) => {
    if (page.title && page.extract) extracts.set(page.title, page.extract);
  });
  return extracts;
}

function researchQuery(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

export async function searchWebResearch({
  query,
  language,
  signal,
}: {
  query: string;
  language: string;
  signal?: AbortSignal;
}): Promise<WebResearchSnippet[]> {
  const q = researchQuery(query);
  if (!q) return [];

  const timeout = AbortSignal.timeout(8000);
  const combined = signal
    ? AbortSignal.any([signal, timeout])
    : timeout;
  signal = combined;

  const hosts = [wikiHost(language)];
  const fallback = wikiHost(language) === "zh.wikipedia.org"
    ? "en.wikipedia.org"
    : "zh.wikipedia.org";
  if (!hosts.includes(fallback)) hosts.push(fallback);

  const snippets: WebResearchSnippet[] = [];
  const seen = new Set<string>();

  for (const host of hosts) {
    if (snippets.length >= 4) break;
    try {
      const matches = await wikiOpenSearch(host, q, signal);
      const extracts = await wikiExtracts(
        host,
        matches.map((item) => item.title),
        signal,
      );
      matches.forEach((item) => {
        if (snippets.length >= 4 || seen.has(item.title)) return;
        const extract = (extracts.get(item.title) ?? "").replace(/\s+/g, " ").trim();
        if (!extract) return;
        seen.add(item.title);
        snippets.push({
          title: item.title,
          url: item.url,
          extract: extract.slice(0, 500),
        });
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }

  return snippets;
}

export function formatWebResearch(snippets: WebResearchSnippet[]) {
  if (!snippets.length) return "No web research snippets were available.";
  return snippets
    .map(
      (snippet, index) =>
        `${index + 1}. ${snippet.title}\n${snippet.url}\n${snippet.extract}`,
    )
    .join("\n\n");
}
