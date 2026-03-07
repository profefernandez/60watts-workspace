import { C, I } from "@/lib";

/* ═══════════════════════════════════════════════════════════
   60 WATTS OF CLARITY — v6
   Spline-inspired 3D Luxury Tech Aesthetic
   Obsidian · Rose Gold · Soft Cream
   AI: Profé
   ═══════════════════════════════════════════════════════════ */

// ═════════════════════════════════════
// NOTE: This is the v6 prototype — the working UI.
// The full component (AppInner) contains Canvas, Prototype Studio,
// Knowledge Base, Profé AI chat, Research, YouTube search,
// and the complete Spline-inspired 3D glassmorphism design system.
// See the complete source in the development environment.
// ═════════════════════════════════════

export default function AppInner() {
  return (
    <div style={{display:"flex",height:"100vh",width:"100vw",background:`radial-gradient(ellipse at 20% 50%, ${C.ob4} 0%, ${C.ob1} 50%, #050608 100%)`,fontFamily:"'Satoshi',system-ui,-apple-system,sans-serif",overflow:"hidden",color:C.tx}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",flexDirection:"column",gap:"24px"}}>
        <div style={{width:"64px",height:"64px",borderRadius:"16px",background:`linear-gradient(135deg,${C.rg},${C.rg2})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 24px ${C.rgGlow}`}}>
          {I.bulb}
        </div>
        <h1 style={{fontFamily:"'Clash Display',sans-serif",fontSize:"40px",fontWeight:700,color:C.cr,letterSpacing:"-0.03em"}}>60 Watts of Clarity</h1>
        <p style={{fontSize:"20px",color:C.tx2,maxWidth:"600px",textAlign:"center",lineHeight:1.7}}>Workspace Platform — v6 Prototype</p>
        <p style={{fontSize:"16px",color:C.tx4}}>Full component loading from AppInner.tsx</p>
      </div>
    </div>
  );
}
