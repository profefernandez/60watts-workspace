"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#08090C",
            color: "#FAF5EF",
            fontFamily: "'Satoshi'",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #E8A87C, #D4956C)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              boxShadow: "0 4px 24px #E8A87C40",
            }}
          >
            💡
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              margin: 0,
              fontFamily: "'Clash Display'",
            }}
          >
            60 Watts of Clarity
          </h2>
          <p style={{ color: "#8A8078", fontSize: "14px", margin: 0 }}>
            Something went wrong. Click below to restart.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #E8A87C, #D4956C)",
              color: "#08090C",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "14px",
              fontFamily: "'Satoshi'",
            }}
          >
            Restart Workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
