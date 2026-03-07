# 60 Watts of Clarity — Copilot Instructions

## Project Identity
This is **60 Watts of Clarity Workspace Platform** — the operating system for non-technical professionals working with AI. Built by Jason Fernandez, MA, LMSW. Version 2.0, March 2026. Collaboration with LaunchLemonade (Agent Builder Integration).

## Architecture: Three Layers
1. **Workspace (The Brain):** Holds all knowledge — files, writing, prototypes, history. Scoped to 30-50 files so AI comprehends full context without RAG/vector databases.
2. 2. **API Connectors (The Senses):** Plug-and-play connections — Perplexity, Google Scholar, YouTube, PubMed, LaunchLemonade.
   3. 3. **Trained Agents (The Intelligence):** Specialized AI built in LaunchLemonade, attached to workspaces with ethical guardrails.
     
      4. ## Tech Stack
      5. - Next.js (React 18+) with App Router, TypeScript
         - - Tailwind CSS with custom design tokens
           - - Anthropic Claude API (claude-sonnet-4-20250514) for Profé AI
             - - PostgreSQL (future), S3-compatible storage (future)
               - - Deployment: Scala Hosting VPS (Rocky Linux, SPanel, SSH port 6543)
                
                 - ## CRITICAL: Design System — DO NOT CHANGE
                 - The v6 prototype design is LOCKED. Spline-inspired 3D luxury tech aesthetic:
                
                 - ### Colors
                 - - Obsidian Black: #08090C (primary bg), #0E1015, #14161C, #1A1D26, #222530, #2C303D
                   - - Rose Gold: #E8A87C (accent/CTAs/AI), #D4956C, #C0825E, #F2C4A0
                     - - Soft Cream: #FAF5EF (text), #F0E8DC, #E6DCCF
                       - - Glass: rgba(255,255,255,0.04) panels, rgba(255,255,255,0.08) hover
                        
                         - ### Typography — NO GENERIC FONTS
                         - - Clash Display (Fontshare): Headings — 40px H1, bold
                           - - Satoshi (Fontshare): Body — 20px body, 16px nav
                             - - JetBrains Mono: Code editor ONLY
                               - - EXCLUDED: Inter, Roboto, Arial, DM Sans, system-ui
                                
                                 - ### Ambient Animation
                                 - - Floating orbs: 80px blur, 8s drift
                                   - - Profé sparkle: 3s float
                                     - - Logo: rose gold glow pulse
                                       - - Send button: gradient shift
                                         - - Glass panels: backdrop-filter blur(24px), border rgba(255,255,255,0.06)
                                          
                                           - ## Core Features
                                           - - **Canvas:** Block-based editor (H1/H2/text/image/YouTube). Canvas-to-KB pipeline.
                                             - - **Prototype Studio:** Live HTML/CSS/JS with Split/Code/Preview modes. JetBrains Mono, rose gold cursor.
                                               - - **Knowledge Base:** Master KB + workspace views. Auto-categorized. Context preview with send-to-Canvas/Profé.
                                                 - - **Profé AI:** Floating draggable chat. Claude-powered. Context-aware. Image gen via Pollinations. Prototype gen with CODE_START/CODE_END.
                                                   - - **Research Panel:** AI web search with cited JSON results.
                                                     - - **YouTube Search:** Video search with embed.
                                                      
                                                       - ## Data Model
                                                       - ```typescript
                                                         interface Block { id: string; type: 'heading'|'subheading'|'text'|'image'|'youtube'; content: string; imageUrl?: string; prompt?: string; url?: string; videoId?: string; }
                                                         interface KBFile { id: string; name: string; type: string; size: number; data: string; uploadedAt: string; textContent: string|null; }
                                                         interface AIMessage { role: 'user'|'assistant'; content: string; image?: string; imgPr?: string; }
                                                         ```

                                                         ## Development Phases
                                                         - **Phase 1 (NOW):** Single-workspace MVP — Canvas, Prototype Studio, KB, Profé + Claude
                                                         - - **Phase 2:** Multi-workspace, home screen, connector library, Perplexity-style search
                                                           - - **Phase 3:** LaunchLemonade integration, per-workspace agents, session timeline, ethical guardrails
                                                             - - **Phase 4:** Multi-user, sharing, subscriptions, mobile
                                                              
                                                               - ## Key Rules
                                                               - 1. PRESERVE AppInner.tsx — the v6 prototype design is loved. Never refactor or restyle it.
                                                                 2. 2. The color palette (C object), icons, and helpers live in src/lib/ for modularity.
                                                                    3. 3. Tailwind config must register custom palette as design tokens.
                                                                       4. 4. Fonts from Fontshare CDN in layout.
                                                                          5. 5. Author: Jason Fernandez, MA, LMSW — 60 Watts of Clarity
