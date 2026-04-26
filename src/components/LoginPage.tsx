"use client";

import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";

export default function LoginPage() {
  const { login, register, error, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        await register(email, password, firstName, lastName);
      } else {
        await login(email, password);
      }
    } catch {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        fontFamily: "'Satoshi'",
        color: C.tx,
        position: "relative",
      }}
    >
      <style>{`
        @keyframes errorShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>

      {/* Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(ellipse at top, ${C.ob2} 0%, #000000 100%)`,
        }}
      >
        <div
          className="orb"
          style={{
            width: 400,
            height: 400,
            background: `radial-gradient(circle, ${C.rg}18, transparent 70%)`,
            top: "20%",
            left: "15%",
            animationDuration: "8s",
          }}
        />
        <div
          className="orb"
          style={{
            width: 300,
            height: 300,
            background: "radial-gradient(circle, rgba(138,100,200,0.12), transparent 70%)",
            bottom: "20%",
            right: "20%",
            animationDuration: "10s",
            animationDelay: "-3s",
          }}
        />
      </div>

      {/* Login card */}
      <form
        onSubmit={handleSubmit}
        style={{
          ...glass(),
          zIndex: 1,
          padding: "48px 40px",
          width: 440,
          maxWidth: "90vw",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(60px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: `0 40px 120px rgba(0,0,0,1), 0 0 80px ${C.rg}15, inset 0 1px 0 rgba(255,255,255,0.2)`,
          borderRadius: 24,
          animation: isShaking ? "errorShake 0.4s ease-in-out" : "none",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            className="logo-glow"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 32px ${C.rg}40`,
            }}
          >
            <div style={{ transform: "scale(1.2)", color: C.ob1 }}>{I.bulb}</div>
          </div>
          <h1
            style={{
              fontFamily: "'Clash Display'",
              fontSize: 28,
              fontWeight: 700,
              color: C.cr,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            60 Watts of Clarity
          </h1>
          <p style={{ fontSize: 16, color: C.tx3, margin: 0 }}>
            {isSignUp ? "Create your workspace account" : "Sign in to your workspace"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: `${C.red}18`,
              border: `1px solid ${C.red}30`,
              color: C.red,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Name Fields (Sign Up Only) */}
        {isSignUp && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <label style={{ fontSize: 14, color: C.tx2, fontWeight: 500 }}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: "rgba(0,0,0,0.4)", color: C.cr, fontSize: 16, fontFamily: "'Satoshi'", outline: "none" }}
                placeholder="First Name"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <label style={{ fontSize: 14, color: C.tx2, fontWeight: 500 }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${C.glassBrd}`, background: "rgba(0,0,0,0.4)", color: C.cr, fontSize: 16, fontFamily: "'Satoshi'", outline: "none" }}
                placeholder="Last Name"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 14, color: C.tx2, fontWeight: 500 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: `1px solid ${C.glassBrd}`,
              background: "rgba(0,0,0,0.4)",
              color: C.cr,
              fontSize: 16,
              fontFamily: "'Satoshi'",
              outline: "none",
            }}
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 14, color: C.tx2, fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: `1px solid ${C.glassBrd}`,
              background: "rgba(0,0,0,0.4)",
              color: C.cr,
              fontSize: 16,
              fontFamily: "'Satoshi'",
              outline: "none",
            }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "14px",
            borderRadius: 10,
            border: "none",
            background: `linear-gradient(135deg, ${C.rg}, ${C.rg2})`,
            color: C.ob1,
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Satoshi'",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "opacity 0.15s",
          }}
        >
          {loading ? (isSignUp ? "Creating account…" : "Signing in…") : (isSignUp ? "Sign Up" : "Sign In")}
        </button>

        {/* Toggle Mode */}
        <div style={{ textAlign: "center", marginTop: -8 }}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: "transparent", border: "none", color: C.tx3, fontSize: 14, fontFamily: "'Satoshi'", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 4
            }}
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </form>
    </div>
  );
}
