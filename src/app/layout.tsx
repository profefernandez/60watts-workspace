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
      <head />
      <body>{children}</body>
    </html>
  );
}
