// ── 60 Watts of Clarity — Directus Research Endpoint ──
// Route: POST /workspace/research/search
// Provider-agnostic research: anthropic (web search), pubmed, custom

"use strict";

module.exports = function registerEndpoint(router, { services, database, getSchema }) {
  const { ItemsService } = services;

  router.post("/search", async (req, res) => {
    try {
      const { query, provider = "anthropic", apiKey: clientApiKey } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query string is required" });
      }

      // ── Resolve API key from user_api_keys if not passed directly ──
      const accountability = req.accountability;
      let apiKey = clientApiKey || null;

      if (!apiKey && accountability && accountability.user) {
        const schema = await getSchema();
        const keysService = new ItemsService("user_api_keys", {
          knex: database,
          schema,
          accountability: { admin: true },
        });

        const keys = await keysService.readByQuery({
          filter: {
            user_id: { _eq: accountability.user },
            provider: { _eq: provider },
          },
          limit: 1,
        });

        if (keys && keys.length > 0) {
          apiKey = keys[0].api_key;
        }
      }

      // ── Provider dispatch ──
      if (provider === "anthropic") {
        const results = await handleAnthropic(apiKey, query);
        return res.json({ results });
      }

      if (provider === "pubmed") {
        const results = await handlePubMed(query);
        return res.json({ results });
      }

      if (provider === "custom") {
        const results = await handleCustom(apiKey, query, req.body);
        return res.json({ results });
      }

      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    } catch (err) {
      console.error("[research] Error:", err);
      return res.status(500).json({
        error: "Research request failed. Please try again.",
      });
    }
  });
};

// ── Anthropic with web_search tool ──
async function handleAnthropic(apiKey, query) {
  if (!apiKey) {
    throw new Error("No API key available for Anthropic research.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Research the following topic: ${query}\n\nProvide 4-6 key findings. Format your response as a JSON array: [{"title":"Finding Title","summary":"2-3 sentence summary","source":"source name or url"}]\n\nRespond with ONLY the JSON array.`,
        },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (!response.ok) {
    return [
      {
        title: "Error",
        summary: `Search returned status ${response.status}. Try again.`,
        source: "",
      },
    ];
  }

  const data = await response.json();
  let txt = "";
  for (const block of data.content || []) {
    if (block.type === "text" && block.text) txt += block.text;
  }

  if (!txt.trim()) {
    return [
      {
        title: "No Results",
        summary: "Search did not return results. Try a different query.",
        source: "",
      },
    ];
  }

  try {
    const cleaned = txt.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          title: String(item.title || "Finding"),
          summary: String(item.summary || item.description || ""),
          source: String(item.source || item.url || ""),
        }));
      }
    }
    return [{ title: "Research Results", summary: cleaned.slice(0, 1500), source: "Web Search" }];
  } catch {
    return [{ title: "Research Results", summary: txt.slice(0, 1500), source: "Web Search" }];
  }
}

// ── PubMed via NCBI E-utilities (free, no key needed for basic use) ──
async function handlePubMed(query) {
  const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

  // Step 1: Search for article IDs
  const searchUrl = `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=6&retmode=json`;
  const searchRes = await fetch(searchUrl);

  if (!searchRes.ok) {
    return [{ title: "PubMed Error", summary: `Search failed with status ${searchRes.status}.`, source: "" }];
  }

  const searchData = await searchRes.json();
  const idList = searchData.esearchresult?.idlist || [];

  if (idList.length === 0) {
    return [{ title: "No Results", summary: "No PubMed articles found for this query.", source: "" }];
  }

  // Step 2: Fetch article details via efetch (XML) then parse
  const ids = idList.join(",");
  const fetchUrl = `${BASE}/esummary.fcgi?db=pubmed&id=${ids}&retmode=json`;
  const fetchRes = await fetch(fetchUrl);

  if (!fetchRes.ok) {
    return [{ title: "PubMed Error", summary: "Failed to fetch article details.", source: "" }];
  }

  const fetchData = await fetchRes.json();
  const results = [];

  for (const pmid of idList) {
    const article = fetchData.result?.[pmid];
    if (!article) continue;

    const authors = (article.authors || [])
      .map((a) => a.name)
      .slice(0, 3)
      .join(", ");

    const journal = article.source || "";

    results.push({
      title: article.title || "Untitled",
      summary: article.description || article.title || "",
      source: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      authors: authors + (article.authors?.length > 3 ? " et al." : ""),
      journal,
      pmid,
    });
  }

  return results;
}

// ── Custom REST API adapter ──
async function handleCustom(apiKey, query, body) {
  const { base_url, headers = {}, response_mapping = {} } = body;

  if (!base_url) {
    return [{ title: "Error", summary: "Custom provider requires a base_url.", source: "" }];
  }

  const url = base_url.replace("{query}", encodeURIComponent(query));

  const reqHeaders = { "Content-Type": "application/json", ...headers };
  if (apiKey) {
    reqHeaders["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, { headers: reqHeaders });

  if (!response.ok) {
    return [{ title: "Error", summary: `Custom API returned status ${response.status}.`, source: "" }];
  }

  const data = await response.json();

  // Use response_mapping to extract results
  const itemsPath = response_mapping.items || "results";
  const titleField = response_mapping.title || "title";
  const summaryField = response_mapping.summary || "summary";
  const sourceField = response_mapping.source || "source";

  const items = getNestedValue(data, itemsPath);
  if (!Array.isArray(items)) {
    return [{ title: "Error", summary: "Could not parse custom API response.", source: "" }];
  }

  return items.slice(0, 10).map((item) => ({
    title: String(getNestedValue(item, titleField) || "Result"),
    summary: String(getNestedValue(item, summaryField) || ""),
    source: String(getNestedValue(item, sourceField) || ""),
  }));
}

// Helper: access nested object properties via dot-notation path
function getNestedValue(obj, path) {
  if (!path || !obj) return obj;
  return path.split(".").reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}
