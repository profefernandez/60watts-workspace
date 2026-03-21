"use client";

import ErrorBoundary from "@/components/ErrorBoundary";
import AppInner from "@/components/AppInner";
import LoginPage from "@/components/LoginPage";
import { AuthProvider, useAuth } from "@/lib/auth";

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#08090C",
          color: "#FAF5EF",
          fontFamily: "'Satoshi'",
          fontSize: 18,
        }}
      >
        <div className="loader spin" style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "#E8A87C", borderRadius: "50%" }} />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <AppInner />;
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}
