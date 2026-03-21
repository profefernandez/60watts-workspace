"use client";

import React, { useState } from "react";
import { useAuth } from "../lib/auth";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";

export default function LoginPage() {
  const { login, error, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      // Error is set in auth context
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
      {/* Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(ellipse at center, ${C.ob2} 0%, ${C.ob1} 70%)`,
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
          width: 400,
          maxWidth: "90vw",
          display: "flex",
          flexDirection: "column",
          gap: 24,
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
            }}
          >
            {I.bulb}
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
          <p style={{ fontSize: 16, color: C.tx3, margin: 0 }}>Sign in to your workspace</p>
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
              background: C.ob1,
              color: C.cr,
              fontSize: 16,
              fontFamily: "'Satoshi'",
              outline: "none",
            }}
            placeholder="jason@60watts.com"
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
              background: C.ob1,
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
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
