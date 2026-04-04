"use client";
import React from "react";
import CanvasEditor from "./canvas/CanvasEditor";

interface Props {
  workspaceId: string;
}

export default function CanvasView({ workspaceId }: Props) {
  return <CanvasEditor workspaceId={workspaceId} />;
}
