import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "60 Watts of Clarity",
  description:
    "The Operating System for Non-Technical Professionals Working with AI. Workspace-as-brain architecture with Profé AI, Canvas, Prototype Studio, and Knowledge Base.",
  authors: [{ name: "Jason Fernandez, MA, LMSW" }],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Clash Display — Headings */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap"
          rel="stylesheet"
        />
        {/* Satoshi — Body */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
        {/* JetBrains Mono — Code editor only */}
        <link
          href="https://api.fontshare.com/v2/css?f[]=jetbrains-mono@400,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
