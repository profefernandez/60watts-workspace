// ── 60 Watts of Clarity — Directus YouTube Search Endpoint ──
// Route: POST /workspace/youtube/search
// Searches YouTube Data API v3

"use strict";

module.exports = function registerEndpoint(router, { services, database, getSchema }) {
  const { ItemsService } = services;

  router.post("/search", async (req, res) => {
    try {
      const { query, apiKey: clientApiKey } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "query string is required" });
      }

      // ── Resolve YouTube API key ──
      let apiKey = clientApiKey || null;

      const accountability = req.accountability;
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
            provider: { _eq: "youtube" },
          },
          limit: 1,
        });

        if (keys && keys.length > 0) {
          apiKey = keys[0].api_key;
        }
      }

      if (!apiKey) {
        return res.status(400).json({
          error: 'No YouTube API key found. Add one in Settings (provider: "youtube").',
        });
      }

      // ── Call YouTube Data API v3 ──
      const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("q", query);
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("maxResults", "6");
      searchUrl.searchParams.set("key", apiKey);

      const response = await fetch(searchUrl.toString());

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[youtube] API error:", errorText);
        return res.status(response.status).json({
          error: `YouTube API error: ${response.status}`,
          results: [],
        });
      }

      const data = await response.json();

      const results = (data.items || []).map((item) => ({
        title: item.snippet?.title || "Untitled",
        channelName: item.snippet?.channelTitle || "Unknown",
        videoId: item.id?.videoId || "",
        description: item.snippet?.description || "",
        thumbnail:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url ||
          "",
      }));

      return res.json({ results });
    } catch (err) {
      console.error("[youtube] Error:", err);
      return res.status(500).json({
        error: "YouTube search failed. Please try again.",
        results: [],
      });
    }
  });
};
