// ── 60 Watts of Clarity — KB Context Packager ──
// Fetches all KB files for a workspace and returns formatted text content
// for injection into AI prompts.

import directus from "./directus";
import type { KBFile } from "./directus";
import { readItems } from "@directus/sdk";

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

/** MIME types considered text-readable for context packaging. */
const TEXT_MIMES = [
  "text/",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/typescript",
  "application/x-yaml",
  "application/toml",
  "application/csv",
];

function isTextMime(mime: string): boolean {
  return TEXT_MIMES.some((prefix) => mime.startsWith(prefix) || mime.includes(prefix));
}

/**
 * Fetch all KB files for a workspace and read text content of text-based files.
 * Returns a formatted string suitable for AI context injection.
 */
export async function getKBContext(workspaceId: string): Promise<string> {
  try {
    // Fetch all kb_files for this workspace
    const items = await directus.request(
      readItems("kb_files", {
        filter: { workspace_id: { _eq: workspaceId } },
        sort: ["-created_at"],
        fields: ["id", "file", "category"],
      })
    );

    const kbFiles = items as KBFile[];
    if (kbFiles.length === 0) {
      return "=== Knowledge Base ===\n(No files)\n";
    }

    const sections: string[] = ["=== Knowledge Base ==="];

    for (const item of kbFiles) {
      try {
        // Fetch file metadata from Directus
        const metaRes = await fetch(`${directusUrl}/files/${item.file}`);
        if (!metaRes.ok) continue;

        const metaData = await metaRes.json();
        const fileMeta = metaData.data || metaData;
        const filename = fileMeta.filename_download || fileMeta.title || "Untitled";
        const mimeType = fileMeta.type || "";

        if (isTextMime(mimeType)) {
          // Fetch the actual file content
          const assetUrl = `${directusUrl}/assets/${item.file}`;
          const contentRes = await fetch(assetUrl);
          if (contentRes.ok) {
            const textContent = await contentRes.text();
            // Limit per-file content to avoid excessively large contexts
            const truncated =
              textContent.length > 50000
                ? textContent.slice(0, 50000) + "\n[... truncated]"
                : textContent;
            sections.push(`--- ${filename} ---\n${truncated}`);
          } else {
            sections.push(`--- ${filename} ---\n[Could not read file content]`);
          }
        } else {
          // Non-text files: include metadata only
          sections.push(`--- ${filename} ---\n[Binary file: ${mimeType}, category: ${item.category}]`);
        }
      } catch {
        // Skip files that can't be processed
      }
    }

    return sections.join("\n\n") + "\n";
  } catch {
    return "=== Knowledge Base ===\n[Failed to fetch files]\n";
  }
}
