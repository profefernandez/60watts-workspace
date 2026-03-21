// ── 60 Watts of Clarity — Directus Settings Endpoint ──
// Route: POST /workspace/settings/api-key
// Route: GET  /workspace/settings/status

"use strict";

module.exports = function registerEndpoint(router, { services, database, getSchema }) {
  const { ItemsService } = services;

  // ── POST /api-key — Upsert an API key for a provider ──
  router.post("/api-key", async (req, res) => {
    try {
      const { provider, api_key, agent_id } = req.body;

      if (!provider || !api_key) {
        return res.status(400).json({ error: "provider and api_key are required." });
      }

      const accountability = req.accountability;
      if (!accountability || !accountability.user) {
        return res.status(401).json({ error: "Authentication required." });
      }

      const userId = accountability.user;
      const schema = await getSchema();

      const keysService = new ItemsService("user_api_keys", {
        knex: database,
        schema,
        accountability: { admin: true },
      });

      // Check if a key already exists for this user + provider
      const existing = await keysService.readByQuery({
        filter: {
          user_id: { _eq: userId },
          provider: { _eq: provider },
        },
        limit: 1,
      });

      if (existing && existing.length > 0) {
        // Update existing key
        await keysService.updateOne(existing[0].id, { api_key });
      } else {
        // Create new key
        await keysService.createOne({
          user_id: userId,
          provider,
          api_key,
        });
      }

      // If agent_id provided (for LaunchLemonade), upsert agent_configs
      if (agent_id) {
        const agentService = new ItemsService("agent_configs", {
          knex: database,
          schema,
          accountability: { admin: true },
        });

        const existingAgent = await agentService.readByQuery({
          filter: {
            user_id: { _eq: userId },
            provider: { _eq: provider },
          },
          limit: 1,
        });

        if (existingAgent && existingAgent.length > 0) {
          await agentService.updateOne(existingAgent[0].id, { agent_id });
        } else {
          await agentService.createOne({
            user_id: userId,
            provider,
            agent_id,
            display_name: provider,
            is_active: true,
          });
        }
      }

      return res.json({ success: true, provider });
    } catch (err) {
      console.error("[settings] api-key error:", err);
      return res.status(500).json({ error: "Failed to save API key." });
    }
  });

  // ── GET /status — Return which providers have keys configured ──
  router.get("/status", async (req, res) => {
    try {
      const accountability = req.accountability;
      if (!accountability || !accountability.user) {
        return res.status(401).json({ error: "Authentication required." });
      }

      const userId = accountability.user;
      const schema = await getSchema();

      const keysService = new ItemsService("user_api_keys", {
        knex: database,
        schema,
        accountability: { admin: true },
      });

      const keys = await keysService.readByQuery({
        filter: {
          user_id: { _eq: userId },
        },
        fields: ["provider"],
      });

      const configuredProviders = new Set(
        (keys || []).map((k) => k.provider)
      );

      return res.json({
        providers: {
          anthropic: configuredProviders.has("anthropic"),
          launchlemonade: configuredProviders.has("launchlemonade"),
          perplexity: configuredProviders.has("perplexity"),
          youtube: configuredProviders.has("youtube"),
          pubmed: configuredProviders.has("pubmed"),
        },
      });
    } catch (err) {
      console.error("[settings] status error:", err);
      return res.status(500).json({ error: "Failed to fetch provider status." });
    }
  });
};
