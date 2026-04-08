import { useState, useEffect, useRef } from "react";

// Refined, curated palette — desaturated sophistication with precise accents
const PLANETS = [
  { id: 1,  appId: "flashcards",  name: "Flash Cards",  symbol: "✦", color: "#C8B8FF", glow: "#9B7FFF", size: 48, orbitRadius: 110, speed: 45, desc: "Flashcard mastery"      },
  { id: 2,  appId: "quiz",        name: "Quiz Arena",   symbol: "◈", color: "#7FD4C8", glow: "#4FBFB0", size: 44, orbitRadius: 145, speed: 38, desc: "Test your knowledge"    },
  { id: 3,  appId: "notes",       name: "Note Hub",     symbol: "⬡", color: "#F0D080", glow: "#D4A830", size: 40, orbitRadius: 180, speed: 52, desc: "Smart note-taking"      },
  { id: 4,  appId: "focus",       name: "Focus Timer",  symbol: "◎", color: "#A8C4E8", glow: "#6899CC", size: 42, orbitRadius: 215, speed: 60, desc: "Deep work sessions"     },
  { id: 5,  appId: "brainmap",    name: "Brain Map",    symbol: "✺", color: "#F0A8C0", glow: "#D4607A", size: 46, orbitRadius: 250, speed: 33, desc: "Mind mapping"           },
  { id: 6,  appId: "goals",       name: "Goal Tracker", symbol: "◉", color: "#88D8A8", glow: "#40B870", size: 38, orbitRadius: 285, speed: 70, desc: "Track your progress"    },
  { id: 7,  appId: "library",     name: "Ace Library",  symbol: "⬟", color: "#90C8F8", glow: "#4898E8", size: 44, orbitRadius: 318, speed: 55, desc: "Resource library"       },
  { id: 8,  appId: "collab",      name: "Collab Space", symbol: "⊕", color: "#F8C898", glow: "#E89040", size: 40, orbitRadius: 350, speed: 42, desc: "Study with friends"     },
  { id: 9,  appId: "aitutor",     name: "AI Tutor",     symbol: "⟡", color: "#D0A8F8", glow: "#A060E8", size: 50, orbitRadius: 382, speed: 48, desc: "Personal AI assistant"  },
  { id: 10, appId: "certprep",    name: "Cert Prep",    symbol: "◇", color: "#F8E070", glow: "#D4B820", size: 42, orbitRadius: 412, speed: 65, desc: "Certification ready"    },
  { id: 11, appId: "schedule",    name: "Schedule",     symbol: "⬢", color: "#78D8D0", glow: "#30A8A0", size: 36, orbitRadius: 440, speed: 58, desc: "Plan your study"        },
  { id: 12, appId: "analytics",   name: "Analytics",    symbol: "◈", color: "#F89898", glow: "#E04848", size: 46, orbitRadius: 468, speed: 75, desc: "Performance insights"   },
];

const TILT = 0.34;

function Stars() {
  const stars = useRef(
    Array.from({ length: 160 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() < 0.15 ? Math.random() * 1.8 + 1.2 : Math.random() * 0.9 + 0.3,
      opacity: Math.random() * 0.5 + 0.15,
      twinkle: Math.random() * 6 + 4,
      delay: Math.random() * 5,
    }))
  );
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.current.map((s, i) => (
        <div key={i} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          width: s.size, height: s.size, borderRadius: "50%",
          background: i % 7 === 0 ? "#e8d8ff" : i % 5 === 0 ? "#c8e8ff" : "#ffffff",
          opacity: s.opacity,
          animation: `starPulse ${s.twinkle}s ease-in-out infinite alternate`,
          animationDelay: `${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

function Sun() {
  return (
    <div style={{
      position: "absolute", left: "50%", top: "50%",
      transform: "translate(-50%, -50%)", zIndex: 15,
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      {/* Outermost corona ring */}
      <div style={{
        position: "absolute", width: 174, height: 174, borderRadius: "50%",
        border: "1px solid rgba(210, 180, 100, 0.12)",
        animation: "coronaPulse 4s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", width: 148, height: 148, borderRadius: "50%",
        border: "1px solid rgba(210, 180, 100, 0.18)",
        animation: "coronaPulse 4s ease-in-out infinite 0.8s",
      }} />
      {/* Sun body — clean sphere */}
      <div style={{
        width: 110, height: 110, borderRadius: "50%",
        background: "radial-gradient(circle at 38% 32%, #FFF8E8, #F5D96A, #D4A820, #9B6C00)",
        boxShadow: "0 0 30px rgba(212,168,32,0.45), 0 0 70px rgba(212,168,32,0.2), 0 0 120px rgba(212,168,32,0.08)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", zIndex: 1,
      }}>
        {/* Subtle surface shading */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle at 65% 65%, rgba(0,0,0,0.18) 0%, transparent 60%)",
        }} />
        <div style={{
          position: "relative", zIndex: 1,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
        }}>
          <span style={{
            fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 800,
            color: "rgba(20,10,0,0.85)", letterSpacing: 4,
            textTransform: "uppercase", lineHeight: 1,
            paddingLeft: 4, // compensate for trailing letter-spacing
          }}>ACE</span>
          <span style={{
            fontFamily: "'Montserrat', sans-serif", fontSize: 18, fontWeight: 800,
            color: "rgba(20,10,0,0.85)", letterSpacing: 4,
            textTransform: "uppercase", lineHeight: 1,
            paddingLeft: 4,
          }}>IT</span>
        </div>
      </div>
      {/* Wordmark below */}
      <div style={{
        marginTop: 14, display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{ width: 24, height: 1, background: "rgba(212,168,32,0.35)" }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 500,
          color: "rgba(212,168,32,0.55)", letterSpacing: 5, textTransform: "uppercase",
        }}>Galaxy</span>
        <div style={{ width: 24, height: 1, background: "rgba(212,168,32,0.35)" }} />
      </div>
    </div>
  );
}

function OrbitRing({ orbitRadius, highlight }) {
  const rx = orbitRadius;
  const ry = orbitRadius * TILT;
  return (
    <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, pointerEvents: "none" }}>
      <svg style={{ position: "absolute", left: -rx, top: -ry, overflow: "visible", pointerEvents: "none" }}
        width={rx * 2} height={ry * 2}>
        <ellipse cx={rx} cy={ry} rx={rx} ry={ry} fill="none"
          stroke={highlight ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.04)"}
          strokeWidth={highlight ? "1" : "0.75"}
          strokeDasharray={highlight ? "none" : "2 4"}
        />
      </svg>
    </div>
  );
}

function Planet({ planet, onClick, isActive }) {
  const angleRef = useRef(-(planet.id * 3.7));
  const lastTimeRef = useRef(null);
  const hoverRef = useRef(false);
  const [state, setState] = useState({ x: 0, y: 0, depthScale: 1, opacity: 1, zIndex: 10 });
  const [hover, setHover] = useState(false);

  const handleMouseEnter = () => { hoverRef.current = true;  setHover(true);  };
  const handleMouseLeave = () => { hoverRef.current = false; setHover(false); };

  useEffect(() => {
    const speedRad = (2 * Math.PI) / (planet.speed * 1000);
    let rafId;
    const animate = (time) => {
      // Only advance the angle when not hovered — planet freezes under the cursor
      if (lastTimeRef.current !== null && !hoverRef.current) {
        angleRef.current += speedRad * (time - lastTimeRef.current);
      }
      lastTimeRef.current = time;
      const angle = angleRef.current;
      const x = Math.cos(angle) * planet.orbitRadius;
      const y = Math.sin(angle) * planet.orbitRadius * TILT;
      const depth = (Math.sin(angle) + 1) / 2;
      const depthScale = 0.48 + depth * 1.04;
      const opacity = 0.78 + depth * 0.22;
      const zIndex = Math.round(depth * 90);
      setState({ x, y, depthScale, opacity, zIndex });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [planet.speed, planet.orbitRadius]);

  const finalScale = state.depthScale * (hover ? 1.1 : 1);
  const resolvedZ = isActive || hover ? 300 : state.zIndex;

  return (
    <>
      <OrbitRing orbitRadius={planet.orbitRadius} highlight={hover || isActive} />
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onClick(planet)}
        style={{
          position: "absolute",
          left: `calc(50% + ${state.x}px)`,
          top: `calc(50% + ${state.y}px)`,
          transform: `translate(-50%, -50%) scale(${finalScale})`,
          width: planet.size,
          height: planet.size,
          borderRadius: "50%",
          // Refined sphere — subtle, not garish
          background: `radial-gradient(circle at 38% 32%, ${planet.color}f8, ${planet.color}90, ${planet.color}28)`,
          border: `1px solid ${planet.color}50`,
          boxShadow: hover || isActive
            ? `0 0 18px ${planet.glow}55, 0 0 40px ${planet.glow}22, inset 0 0 12px rgba(255,255,255,0.15)`
            : `0 0 8px ${planet.glow}28, inset 0 0 8px rgba(255,255,255,0.06)`,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: state.opacity,
          zIndex: resolvedZ,
          transition: "box-shadow 0.25s ease, border-color 0.25s ease",
        }}
      >
        {/* Surface shading */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(circle at 65% 68%, rgba(0,0,0,0.25) 0%, transparent 58%)",
          pointerEvents: "none",
        }} />
        {/* Symbol — clean, not emoji */}
        <span style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: planet.size * 0.38,
          color: "rgba(255,255,255,0.9)",
          lineHeight: 1,
          position: "relative", zIndex: 1,
          textShadow: `0 0 8px ${planet.color}`,
          userSelect: "none",
        }}>{planet.symbol}</span>

        {/* Label — always readable, minimal, no pill */}
        <div style={{
          position: "absolute",
          top: "calc(100% + 7px)",
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}>
          <span style={{
            display: "block",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: hover || isActive ? planet.color : "rgba(255,255,255,0.75)",
            transition: "color 0.25s ease",
          }}>
            {planet.name}
          </span>
        </div>
      </div>
    </>
  );
}

// Panel slide-in from left
function Sidebar({ isOpen, onClose, planets, onSelect, activePlanet, user, openAuth, onLogout }) {
  const [appsOpen, setAppsOpen] = useState(true);
  const [userOpen, setUserOpen] = useState(true);
  return (
    <>
      {isOpen && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0, zIndex: 98,
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        }} />
      )}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 280,
        background: "linear-gradient(160deg, rgba(8,6,22,0.98) 0%, rgba(4,3,14,0.99) 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        zIndex: 99, display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Top bar */}
        <div style={{
          padding: "24px 20px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{
              fontFamily: "'Montserrat', sans-serif", fontSize: 17, fontWeight: 800,
              color: "#F5D96A", letterSpacing: 2, textTransform: "uppercase",
            }}>Ace It</div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 400,
              color: "rgba(255,255,255,0.28)", letterSpacing: 4, textTransform: "uppercase",
              marginTop: 1,
            }}>Galaxy Platform</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.35)", width: 30, height: 30,
            borderRadius: 4, cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
          }}
            onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; e.target.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.color = "rgba(255,255,255,0.35)"; }}
          >✕</button>
        </div>

        {/* User Information — collapsible */}
        <button
          onClick={() => setUserOpen(o => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px 10px", background: "none", border: "none", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.6"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
            color: "rgba(255,255,255,0.3)", letterSpacing: 3, textTransform: "uppercase",
          }}>User Information</span>
          <span style={{
            color: "rgba(255,255,255,0.25)", fontSize: 10, lineHeight: 1,
            display: "inline-block",
            transform: userOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s ease",
          }}>▾</span>
        </button>

        <div style={{
          overflow: "hidden",
          maxHeight: userOpen ? "400px" : "0px",
          transition: "max-height 0.35s ease",
        }}>
          <div style={{
            margin: "0 12px 12px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "14px 16px",
          }}>
            {user ? (
              <>
                {/* Logged-in view */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #9B7FFF, #F5D96A)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat', sans-serif", fontSize: 14, fontWeight: 700, color: "rgba(0,0,0,0.75)" }}>{user.avatar}</div>
                  <div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{user.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#88D8A8", marginTop: 2 }}>● Signed in</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 12 }} />
                {[{ label: "Plan", value: "Free Tier" }, { label: "Status", value: "Active" }, { label: "Apps", value: "12 modules" }].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{label}</span>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>{value}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "12px 0" }} />
                <button onClick={onLogout} style={{ width: "100%", padding: "9px 0", borderRadius: 4, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.4)", cursor: "pointer", letterSpacing: 1, transition: "all 0.18s" }}
                  onMouseEnter={e => { e.target.style.borderColor = "rgba(255,80,80,0.4)"; e.target.style.color = "rgba(255,120,120,0.8)"; }}
                  onMouseLeave={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "rgba(255,255,255,0.4)"; }}>Sign Out</button>
              </>
            ) : (
              <>
                {/* Guest view */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
                  <div>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Guest User</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>Not signed in</div>
                  </div>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: 14 }} />
                <button onClick={() => { openAuth("login"); onClose(); }} style={{ width: "100%", padding: "9px 0", borderRadius: 4, background: "#F5D96A", border: "none", fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(0,0,0,0.8)", cursor: "pointer", letterSpacing: 1.5, textTransform: "uppercase", transition: "all 0.18s", marginBottom: 8, boxShadow: "0 4px 16px rgba(245,217,106,0.2)" }}
                  onMouseEnter={e => { e.target.style.opacity = "0.85"; }} onMouseLeave={e => { e.target.style.opacity = "1"; }}>Log In</button>
                <button onClick={() => { openAuth("signup"); onClose(); }} style={{ width: "100%", padding: "9px 0", borderRadius: 4, background: "transparent", border: "1px solid rgba(245,217,106,0.3)", fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 600, color: "rgba(245,217,106,0.7)", cursor: "pointer", letterSpacing: 1.5, textTransform: "uppercase", transition: "all 0.18s" }}
                  onMouseEnter={e => { e.target.style.borderColor = "rgba(245,217,106,0.6)"; e.target.style.color = "#F5D96A"; }} onMouseLeave={e => { e.target.style.borderColor = "rgba(245,217,106,0.3)"; e.target.style.color = "rgba(245,217,106,0.7)"; }}>Create Account</button>
              </>
            )}
          </div>
        </div>

        {/* Thin divider between sections */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.04)", margin: "0 16px 4px" }} />

        {/* Section label — collapsible toggle */}
        <button
          onClick={() => setAppsOpen(o => !o)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px 10px", background: "none", border: "none", cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.6"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
            color: "rgba(255,255,255,0.3)", letterSpacing: 3, textTransform: "uppercase",
          }}>Applications</span>
          <span style={{
            color: "rgba(255,255,255,0.25)", fontSize: 10, lineHeight: 1,
            display: "inline-block",
            transform: appsOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s ease",
          }}>▾</span>
        </button>

        {/* Nav list — collapses smoothly */}
        <div style={{
          flex: appsOpen ? 1 : 0,
          overflowY: appsOpen ? "auto" : "hidden",
          maxHeight: appsOpen ? "10000px" : "0px",
          transition: "max-height 0.35s ease",
          padding: appsOpen ? "4px 10px 12px" : "0 10px",
        }}>
          {planets.map((p, i) => (
            <button key={p.id} onClick={() => onSelect(p)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              padding: "10px 10px", marginBottom: 1,
              background: activePlanet?.id === p.id ? `rgba(255,255,255,0.05)` : "transparent",
              border: "none", borderRadius: 4, cursor: "pointer",
              transition: "all 0.18s ease",
              borderLeft: activePlanet?.id === p.id ? `2px solid ${p.color}` : "2px solid transparent",
              animation: "fadeSlideIn 0.35s ease forwards",
              animationDelay: `${i * 0.03}s`, opacity: 0,
            }}
              onMouseEnter={(e) => { if (activePlanet?.id !== p.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={(e) => { if (activePlanet?.id !== p.id) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Color swatch dot */}
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: p.color,
                boxShadow: activePlanet?.id === p.id ? `0 0 8px ${p.color}88` : "none",
              }} />
              <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
                  color: activePlanet?.id === p.id ? p.color : "rgba(255,255,255,0.72)",
                  letterSpacing: 0.3,
                  transition: "color 0.18s",
                }}>{p.name}</div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 400,
                  color: "rgba(255,255,255,0.22)", marginTop: 1, letterSpacing: 0.2,
                }}>{p.desc}</div>
              </div>
              {activePlanet?.id === p.id && (
                <div style={{
                  width: 4, height: 4, borderRadius: "50%",
                  background: p.color, flexShrink: 0,
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          fontFamily: "'DM Sans', sans-serif", fontSize: 9,
          color: "rgba(255,255,255,0.15)", letterSpacing: 1,
        }}>
          © 2026 Ace It Galaxy
        </div>
      </div>
    </>
  );
}

// ─── Shared Nav Dropdown ─────────────────────────────────────────────────────

const NAV_LINKS = {
  Features: [
    { label: "Smart Decks",        desc: "Organize your study material"     },
    { label: "Spaced Repetition",  desc: "Study at the perfect moment"      },
    { label: "Progress Tracking",  desc: "See your mastery grow"            },
    { label: "AI Generation",      desc: "Auto-create cards from any text"  },
    { label: "Offline Mode",       desc: "Study anywhere, anytime"          },
    { label: "Collaboration",      desc: "Study with your group"            },
  ],
  "How It Works": [
    { label: "Create a Deck",     desc: "Build your first flash card set"   },
    { label: "Study & Flip",      desc: "Review at your own pace"           },
    { label: "Track Mastery",     desc: "Watch your progress build"         },
    { label: "Watch a Demo",      desc: "See it in action"                  },
  ],
  Pricing: [
    { label: "Free Tier",         desc: "Get started at no cost"            },
    { label: "Pro — $9/mo",       desc: "Unlimited decks & AI features"     },
    { label: "Team — $6/mo",      desc: "Per seat, for study groups"        },
    { label: "Compare Plans",     desc: "See all features side by side"     },
  ],
};

function NavDropdown({ links, label, color = "#C8B8FF", glow = "#9B7FFF" }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const show = () => { clearTimeout(timerRef.current); setOpen(true); };
  const hide = () => { timerRef.current = setTimeout(() => setOpen(false), 120); };

  return (
    <div style={{ position: "relative" }} onMouseEnter={show} onMouseLeave={hide}>
      {/* Trigger */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 12, fontWeight: 500, cursor: "pointer",
        color: open ? "#fff" : "rgba(255,255,255,0.38)",
        letterSpacing: 0.5, transition: "color 0.18s",
        userSelect: "none",
      }}>
        {label}
        <span style={{
          fontSize: 8, display: "inline-block",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.22s ease",
          color: open ? color : "rgba(255,255,255,0.3)",
        }}>▾</span>
      </div>

      {/* Panel */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 14px)", left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(8,6,20,0.97)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderTop: `2px solid ${color}`,
          borderRadius: 8,
          minWidth: 240,
          padding: "8px 6px",
          backdropFilter: "blur(20px)",
          boxShadow: `0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.3), 0 0 40px ${glow}18`,
          zIndex: 200,
          animation: "ddFadeIn 0.18s ease both",
        }}>
          {/* Arrow notch */}
          <div style={{
            position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
            width: 10, height: 10, background: color,
            clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          }} />

          {links.map(({ label: lbl, desc }, i) => (
            <div key={lbl} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 6, cursor: "pointer",
              transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = `${color}12`}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: color, opacity: 0.5,
              }} />
              <div>
                <div style={{
                  fontFamily: "'Montserrat', sans-serif", fontSize: 12, fontWeight: 600,
                  color: "rgba(255,255,255,0.82)", letterSpacing: 0.2,
                }}>{lbl}</div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 300,
                  color: "rgba(255,255,255,0.28)", marginTop: 1,
                }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── App Configs & Shared Landing ───────────────────────────────────────────

const APP_CONFIGS = {
  quiz: {
    badge: "Knowledge Testing",
    headline: ["Challenge What","You Know."],
    highlight: 1,
    sub: "Quiz Arena turns studying into a competition. Take timed quizzes, track your scores, and climb the leaderboard as you master every topic.",
    cta: "Start a Quiz",
    stats: [{ value:"200+", label:"Quiz Categories" },{ value:"8K+", label:"Quizzes Taken" },{ value:"88%", label:"Improved Scores" },{ value:"4.8★", label:"User Rating" }],
    features: [
      { icon:"◈", title:"Timed Challenges",     desc:"Race the clock to sharpen your recall. Timed mode simulates real exam pressure so you're never caught off guard." },
      { icon:"⬡", title:"Custom Quizzes",       desc:"Build quizzes from your own notes or let AI generate questions from any topic in seconds." },
      { icon:"✦", title:"Instant Feedback",     desc:"See detailed explanations for every answer — right and wrong — so you always know exactly why." },
      { icon:"◎", title:"Adaptive Difficulty",  desc:"The more you quiz, the smarter it gets. Questions adjust to your level to keep you in the optimal learning zone." },
      { icon:"⟡", title:"Leaderboards",         desc:"Compete with classmates and study partners. A little healthy competition goes a long way." },
      { icon:"◉", title:"Progress History",     desc:"Track your score trends over time and see which topics need the most attention." },
    ],
    steps: [
      { num:"01", title:"Pick a Topic",      desc:"Browse hundreds of pre-built quiz sets or create your own from scratch in minutes." },
      { num:"02", title:"Answer & Learn",    desc:"Work through questions at your own pace or race the clock. Instant feedback after every answer." },
      { num:"03", title:"Review & Improve",  desc:"See your score breakdown, revisit missed questions, and watch your mastery climb." },
    ],
  },
  notes: {
    badge: "Smart Note-Taking",
    headline: ["Capture Every","Idea Instantly."],
    highlight: 1,
    sub: "Note Hub is your intelligent second brain. Write, organize, and search your notes with AI-powered insights that help you study smarter.",
    cta: "Open Note Hub",
    stats: [{ value:"1M+", label:"Notes Created" },{ value:"15K+", label:"Active Writers" },{ value:"3×", label:"Faster Review" },{ value:"4.9★", label:"User Rating" }],
    features: [
      { icon:"⬡", title:"Rich Text Editor",    desc:"Format your notes with headings, lists, highlights, and code blocks. Your notes, your way." },
      { icon:"⟡", title:"AI Summarization",   desc:"Paste a wall of text and get a clean, bullet-pointed summary in one click. Study the highlights, not the noise." },
      { icon:"◈", title:"Smart Search",        desc:"Find any note instantly with full-text search. No more scrolling through endless folders." },
      { icon:"✦", title:"Linked Notes",        desc:"Connect related ideas across notes with bi-directional links. Build your own knowledge graph." },
      { icon:"◎", title:"Study Mode",          desc:"Turn any note into a study guide automatically. Highlights become flash cards, headings become quiz questions." },
      { icon:"⊕", title:"Shared Notebooks",    desc:"Collaborate in real time with classmates. Everyone's edits appear live — no conflicts, no confusion." },
    ],
    steps: [
      { num:"01", title:"Write & Organize",  desc:"Jot down notes in any format. Create notebooks, tags, and folders to keep everything tidy." },
      { num:"02", title:"Enhance with AI",   desc:"Let AI expand your bullet points, summarize long passages, or generate study questions automatically." },
      { num:"03", title:"Study & Share",     desc:"Export notes as flash cards, share with your study group, or review in focused study mode." },
    ],
  },
  focus: {
    badge: "Deep Work Sessions",
    headline: ["Zero In.", "Get It Done."],
    highlight: 0,
    sub: "Focus Timer uses proven time-management techniques to eliminate distractions and keep you in a deep work state — one session at a time.",
    cta: "Start Focusing",
    stats: [{ value:"500K+", label:"Sessions Logged" },{ value:"40min", label:"Avg Focus Time" },{ value:"2.4×", label:"Productivity Lift" },{ value:"4.9★", label:"User Rating" }],
    features: [
      { icon:"◎", title:"Pomodoro & Custom",   desc:"Choose from classic 25-5 Pomodoro blocks or set fully custom work and break intervals that match your rhythm." },
      { icon:"⬡", title:"Session Goals",       desc:"Set a goal before each session — what you plan to accomplish keeps you accountable and on track." },
      { icon:"⟡", title:"Ambient Sounds",      desc:"Block out distractions with curated focus soundscapes — rain, café noise, white noise, and more." },
      { icon:"◈", title:"Distraction Log",     desc:"Every time your mind wanders, log it. Review patterns to understand and eliminate your biggest focus killers." },
      { icon:"✦", title:"Streak Tracking",     desc:"Build a daily focus habit. Streaks and milestones keep you coming back for consistent deep work." },
      { icon:"◉", title:"Focus Analytics",     desc:"See your most productive hours, longest sessions, and weekly focus trends to optimize your schedule." },
    ],
    steps: [
      { num:"01", title:"Set Your Session",   desc:"Choose your timer length, set a goal for the session, and pick an ambient sound to lock in." },
      { num:"02", title:"Work Deeply",        desc:"Put the phone away. Focus Timer runs in the background, gently keeping time while you do your best work." },
      { num:"03", title:"Rest & Repeat",      desc:"Take structured breaks to recharge, then dive back in. Review your stats after each round." },
    ],
  },
  brainmap: {
    badge: "Visual Mind Mapping",
    headline: ["See Your","Thinking Clearly."],
    highlight: 1,
    sub: "Brain Map turns complex ideas into visual diagrams. Connect concepts, see the big picture, and unlock understanding that linear notes can't capture.",
    cta: "Create a Map",
    stats: [{ value:"80K+", label:"Maps Created" },{ value:"9K+", label:"Active Mappers" },{ value:"60%", label:"Better Retention" },{ value:"4.8★", label:"User Rating" }],
    features: [
      { icon:"✺", title:"Drag & Drop Canvas",  desc:"Build your map visually. Drag nodes anywhere, connect ideas with arrows, and color-code by theme." },
      { icon:"⟡", title:"AI Expansion",        desc:"Start with one idea and let AI suggest related branches. Discover connections you hadn't considered." },
      { icon:"◈", title:"Nested Hierarchies",  desc:"Zoom from big-picture overview down to granular details. Infinite levels of depth in a clean interface." },
      { icon:"⬡", title:"Templates",           desc:"Start fast with pre-built templates for SWOT analysis, study plans, project outlines, and more." },
      { icon:"◎", title:"Export Anywhere",     desc:"Export your maps as PNG, PDF, or markdown outlines. Share on any platform instantly." },
      { icon:"⊕", title:"Collaborative Maps",  desc:"Invite your study group to edit the same map in real time. Build knowledge together, visually." },
    ],
    steps: [
      { num:"01", title:"Start a Central Idea", desc:"Type your main topic in the center. Every branch, sub-branch, and connection grows outward from there." },
      { num:"02", title:"Branch & Connect",     desc:"Add child nodes, draw connections, add notes to any branch. The canvas is infinite — think freely." },
      { num:"03", title:"Review & Export",      desc:"Zoom out to see the whole picture. Export or present directly from the canvas." },
    ],
  },
  goals: {
    badge: "Progress Tracking",
    headline: ["Set Goals.", "Actually Hit Them."],
    highlight: 1,
    sub: "Goal Tracker keeps your study ambitions visible, measurable, and achievable. Break big targets into daily wins and celebrate every milestone.",
    cta: "Set Your Goals",
    stats: [{ value:"95%", label:"Goals Completed" },{ value:"6K+", label:"Active Users" },{ value:"21 days", label:"Avg Habit Build" },{ value:"4.9★", label:"User Rating" }],
    features: [
      { icon:"◉", title:"Goal Breakdown",       desc:"Split any big goal into weekly milestones and daily tasks. Big dreams become manageable steps." },
      { icon:"⬡", title:"Progress Bars",        desc:"Visual progress on every goal at a glance. Nothing is more motivating than watching a bar fill up." },
      { icon:"✺", title:"Habit Streaks",        desc:"Track daily study habits alongside goals. Streaks create momentum — and momentum creates results." },
      { icon:"◈", title:"Deadline Alerts",      desc:"Set deadlines and get smart reminders that escalate as the date approaches. Never miss an exam again." },
      { icon:"⟡", title:"AI Goal Planning",     desc:"Describe what you want to achieve and let AI build a realistic, structured study plan automatically." },
      { icon:"◎", title:"Weekly Reviews",       desc:"End-of-week summaries show what you hit, what you missed, and what to adjust going forward." },
    ],
    steps: [
      { num:"01", title:"Define Your Goal",    desc:"Give your goal a name, a deadline, and break it into the specific milestones you need to hit." },
      { num:"02", title:"Track Daily",         desc:"Log your daily progress in seconds. Celebrate streaks, flag blockers, and stay accountable." },
      { num:"03", title:"Review & Adjust",     desc:"Weekly check-ins show where you're on track and where to focus more energy." },
    ],
  },
  library: {
    badge: "Resource Library",
    headline: ["Every Resource.", "One Place."],
    highlight: 0,
    sub: "Ace Library is your personal study resource hub. Save articles, PDFs, videos, and links — all searchable, organized, and accessible anywhere.",
    cta: "Open Library",
    stats: [{ value:"2M+", label:"Resources Saved" },{ value:"18K+", label:"Active Readers" },{ value:"5 sec", label:"Avg Search Time" },{ value:"4.8★", label:"User Rating" }],
    features: [
      { icon:"⬟", title:"Universal Saver",      desc:"Save anything — URLs, PDFs, YouTube videos, or plain text. If it helps you study, it belongs here." },
      { icon:"⟡", title:"AI Summarizer",        desc:"Get a concise summary of any saved article or document without reading the whole thing." },
      { icon:"◈", title:"Smart Tagging",        desc:"Auto-tagging organizes your resources by topic as you save them. Find anything in seconds." },
      { icon:"✦", title:"Reading Lists",        desc:"Create curated reading lists for each subject. Work through them systematically and track your progress." },
      { icon:"◎", title:"Annotations",          desc:"Highlight and annotate any saved document. Your notes and the source stay together permanently." },
      { icon:"⊕", title:"Shared Collections",  desc:"Share a reading list with your study group. Everyone benefits from resources the group discovers." },
    ],
    steps: [
      { num:"01", title:"Save Resources",    desc:"Use the browser extension, paste a link, or upload a file. It's in your library in one click." },
      { num:"02", title:"Read & Annotate",   desc:"Open any resource in the built-in reader. Highlight, take notes, and bookmark key sections." },
      { num:"03", title:"Search & Review",   desc:"Use smart search to find exactly what you need, when you need it." },
    ],
  },
  collab: {
    badge: "Study Together",
    headline: ["Better Together.", "Study as One."],
    highlight: 0,
    sub: "Collab Space makes group studying as easy as texting. Share notes, quiz each other, co-create mind maps, and stay in sync across every session.",
    cta: "Create a Space",
    stats: [{ value:"30K+", label:"Study Groups" },{ value:"11K+", label:"Active Members" },{ value:"3×", label:"Better Retention" },{ value:"4.7★", label:"User Rating" }],
    features: [
      { icon:"⊕", title:"Group Rooms",         desc:"Create a private study room and invite your group. Everything you work on lives here together." },
      { icon:"⬡", title:"Shared Whiteboards",  desc:"Brainstorm together on a live collaborative whiteboard. Ideas from the whole group, all in one place." },
      { icon:"◈", title:"Live Quizzing",        desc:"Challenge your group to a live quiz. Compete in real time and see everyone's scores on the leaderboard." },
      { icon:"✺", title:"Deck Sharing",         desc:"Share your flash card decks with the group instantly. Everyone studies the same material." },
      { icon:"⟡", title:"Group Chat",           desc:"Discuss, ask questions, and share resources in the built-in chat without leaving your study session." },
      { icon:"◎", title:"Session Scheduling",  desc:"Schedule group sessions and send reminders so no one misses a study meeting." },
    ],
    steps: [
      { num:"01", title:"Create a Room",      desc:"Name your study space, set a subject, and invite your group with a simple link." },
      { num:"02", title:"Study Together",     desc:"Share notes, quiz each other live, and collaborate on whiteboards in real time." },
      { num:"03", title:"Track Group Progress", desc:"See how the whole group is doing and identify where everyone needs more review." },
    ],
  },
  aitutor: {
    badge: "Personal AI Assistant",
    headline: ["Your Personal","Tutor. Always On."],
    highlight: 1,
    sub: "AI Tutor is like having a brilliant study partner available 24/7. Ask anything, get clear explanations, generate practice problems, and never get stuck.",
    cta: "Meet Your Tutor",
    stats: [{ value:"1M+", label:"Questions Answered" },{ value:"20K+", label:"Active Students" },{ value:"97%", label:"Clarity Rating" },{ value:"4.9★", label:"User Rating" }],
    features: [
      { icon:"⟡", title:"Ask Anything",         desc:"Type any question and get a clear, detailed explanation instantly. No judgment, no waiting." },
      { icon:"✦", title:"Explain Like I'm 5",   desc:"Still confused? Ask for a simpler explanation and AI Tutor will break it down in plain English." },
      { icon:"◈", title:"Practice Problems",    desc:"Request custom practice problems on any topic at any difficulty level. Unlimited practice, forever." },
      { icon:"⬡", title:"Essay Feedback",       desc:"Paste your writing and get detailed feedback on structure, clarity, argument, and grammar." },
      { icon:"◎", title:"Concept Connections",  desc:"Struggling with a concept? AI Tutor connects it to what you already know to make it click." },
      { icon:"⊕", title:"Study Plans",          desc:"Tell AI Tutor your exam date and what you need to cover — get a personalized study schedule instantly." },
    ],
    steps: [
      { num:"01", title:"Ask Your Question",   desc:"Type any question, paste your notes, or describe what you're struggling with. Nothing is off-limits." },
      { num:"02", title:"Learn Deeply",        desc:"Get clear explanations, examples, analogies, and follow-up prompts to build real understanding." },
      { num:"03", title:"Practice & Master",   desc:"Request practice problems, test yourself, and keep going until the concept fully clicks." },
    ],
  },
  certprep: {
    badge: "Certification Ready",
    headline: ["Pass Your Exam.", "First Time."],
    highlight: 2,
    sub: "Cert Prep is purpose-built for certification exams. Real estate, law, finance — get exam-specific content, practice tests, and a proven study system.",
    cta: "Start Prep",
    stats: [{ value:"94%", label:"First-Time Pass Rate" },{ value:"7K+", label:"Certs Earned" },{ value:"6 weeks", label:"Avg Prep Time" },{ value:"4.9★", label:"User Rating" }],
    features: [
      { icon:"◇", title:"Exam-Mapped Content",  desc:"Every study module maps directly to the official exam blueprint so you study exactly what's tested." },
      { icon:"⟡", title:"Practice Exams",       desc:"Full-length practice tests that mirror the real exam format, timing, and question style." },
      { icon:"✦", title:"Weak Area Detection",  desc:"AI identifies your weakest domains and automatically prioritizes them in your study schedule." },
      { icon:"⬡", title:"State-Specific Prep",  desc:"Studying for a state license? Get content tailored to your specific state's requirements and laws." },
      { icon:"◎", title:"Cram Mode",            desc:"Exam tomorrow? Cram Mode serves only the highest-probability questions based on your gaps." },
      { icon:"◈", title:"Study Guarantee",      desc:"Follow the system and pass — or we'll give you 30 more days free. We're that confident." },
    ],
    steps: [
      { num:"01", title:"Choose Your Exam",   desc:"Select your target certification. We'll load the official content outline and build your study plan." },
      { num:"02", title:"Study the System",   desc:"Work through modules, take section quizzes, and build mastery domain by domain." },
      { num:"03", title:"Take Practice Exams", desc:"Simulate the real test, review every missed question, and repeat until you're consistently scoring to pass." },
    ],
  },
  schedule: {
    badge: "Study Planning",
    headline: ["Plan Smarter.", "Study Less. Score More."],
    highlight: 1,
    sub: "Schedule builds your perfect study calendar automatically. Tell it your exams, your availability, and what you need to cover — it does the rest.",
    cta: "Build My Schedule",
    stats: [{ value:"85K+", label:"Schedules Built" },{ value:"14K+", label:"Active Planners" },{ value:"38%", label:"Less Study Time" },{ value:"4.8★", label:"User Rating" }],
    features: [
      { icon:"⬢", title:"AI Scheduling",        desc:"Input your exams, subjects, and free hours. AI builds an optimized study calendar in seconds." },
      { icon:"⟡", title:"Smart Reminders",      desc:"Context-aware reminders that know when your exam is near and ramp up intensity automatically." },
      { icon:"◈", title:"Calendar Sync",        desc:"Syncs with Google Calendar and Apple Calendar so your study blocks live alongside your real life." },
      { icon:"✦", title:"Buffer Zones",         desc:"Schedule automatically adds review buffers before every exam so you're never cramming at the last minute." },
      { icon:"◎", title:"Drag & Reschedule",    desc:"Life happens. Drag any study block to a new time and the whole calendar adjusts intelligently." },
      { icon:"⬡", title:"Weekly Reviews",       desc:"End-of-week check-ins review what you studied, what you missed, and what's coming up next." },
    ],
    steps: [
      { num:"01", title:"Add Your Exams",        desc:"Enter your exam dates, subjects, and how prepared you currently feel for each one." },
      { num:"02", title:"Set Availability",      desc:"Tell us when you're free to study and how many hours per day you can commit." },
      { num:"03", title:"Follow the Plan",       desc:"Your personalized calendar is ready. Follow the blocks, check them off, and watch your confidence grow." },
    ],
  },
  analytics: {
    badge: "Performance Insights",
    headline: ["Know Exactly","Where You Stand."],
    highlight: 2,
    sub: "Analytics gives you a crystal-clear view of your study performance. See what's working, what isn't, and exactly what to do next.",
    cta: "View My Analytics",
    stats: [{ value:"10M+", label:"Data Points Tracked" },{ value:"16K+", label:"Active Users" },{ value:"41%", label:"Score Improvement" },{ value:"4.9★", label:"User Rating" }],
    features: [
      { icon:"◈", title:"Performance Dashboard", desc:"One screen shows your overall mastery, active streaks, time studied, and score trends at a glance." },
      { icon:"⟡", title:"Weak Spot Heatmap",    desc:"A visual heatmap shows exactly which topics you're strongest and weakest in across every subject." },
      { icon:"⬡", title:"Time Analysis",        desc:"See when you study most effectively, how long your sessions run, and where your hours are actually going." },
      { icon:"✦", title:"Predictive Scoring",   desc:"Based on your current trajectory, Analytics predicts your likely exam score with 90% accuracy." },
      { icon:"◎", title:"Comparative Insights", desc:"Benchmark your progress against anonymized peers studying the same material. Know where you rank." },
      { icon:"⊕", title:"Exportable Reports",   desc:"Generate a full PDF progress report to share with a tutor, advisor, or just keep for your records." },
    ],
    steps: [
      { num:"01", title:"Connect Your Apps",    desc:"Analytics pulls data from all your Ace It apps automatically — flash cards, quizzes, focus sessions, and more." },
      { num:"02", title:"Read Your Dashboard",  desc:"Your personal performance dashboard updates in real time as you study. No setup required." },
      { num:"03", title:"Act on Insights",      desc:"Follow the AI-generated recommendations to shift your study focus where it matters most." },
    ],
  },
};

// Shared landing page renderer for all apps except Flash Cards
function AppLanding({ planet, onBack }) {
  const cfg = APP_CONFIGS[planet.appId];
  const { color, glow, name, symbol } = planet;

  const words = cfg.headline.join(" ").split(" ");
  const allWords = cfg.headline.flatMap(line => line.split(" "));
  let wordCounter = 0;

  return (
    <div style={{
      position:"fixed", inset:0, background:"#06040E",
      fontFamily:"'DM Sans', sans-serif", overflowY:"auto", color:"#fff",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes alFadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes alShimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
        .al-reveal { animation: alFadeUp 0.55s ease both; }
        .al-feature:hover { transform:translateY(-3px)!important; }
        @keyframes ddFadeIn { from{opacity:0;transform:translateX(-50%) translateY(-6px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
      `}</style>

      {/* NAV */}
      <nav style={{
        position:"sticky", top:0, zIndex:100,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 48px", height:64,
        background:"rgba(6,4,14,0.88)", backdropFilter:"blur(16px)",
        borderBottom:"1px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={onBack} style={{
            background:"none", border:`1px solid rgba(255,255,255,0.1)`,
            borderRadius:4, padding:"6px 12px", cursor:"pointer",
            color:"rgba(255,255,255,0.4)", fontSize:11, fontFamily:"'DM Sans', sans-serif",
            letterSpacing:1, transition:"all 0.18s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.25)";e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.color="rgba(255,255,255,0.4)";}}
          >← Galaxy</button>
          <div style={{ width:1, height:18, background:"rgba(255,255,255,0.07)" }} />
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              background:`linear-gradient(135deg, ${glow}, ${color})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:13, color:"rgba(0,0,0,0.75)", fontFamily:"'Montserrat', sans-serif", fontWeight:800,
            }}>{symbol}</div>
            <span style={{ fontFamily:"'Montserrat', sans-serif", fontSize:14, fontWeight:700, color, letterSpacing:0.5 }}>{name}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:28, alignItems:"center" }}>
          {Object.keys(NAV_LINKS).map(key => (
            <NavDropdown key={key} label={key} links={NAV_LINKS[key]} color={color} glow={glow} />
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button style={{
            background:"none", border:`1px solid ${color}55`,
            borderRadius:4, padding:"8px 18px", cursor:"pointer",
            color:`${color}cc`, fontSize:11, fontWeight:600,
            fontFamily:"'DM Sans', sans-serif", letterSpacing:1, transition:"all 0.18s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=color;e.currentTarget.style.color=color;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=`${color}55`;e.currentTarget.style.color=`${color}cc`;}}
          >Log In</button>
          <button style={{
            background:color, border:"none", borderRadius:4,
            padding:"8px 18px", cursor:"pointer", color:"rgba(0,0,0,0.85)",
            fontSize:11, fontWeight:700, fontFamily:"'Montserrat', sans-serif",
            letterSpacing:1, textTransform:"uppercase", transition:"all 0.18s",
            boxShadow:`0 4px 20px ${glow}44`,
          }}
            onMouseEnter={e=>{e.target.style.opacity="0.88";e.target.style.transform="translateY(-1px)";}}
            onMouseLeave={e=>{e.target.style.opacity="1";e.target.style.transform="none";}}
          >{cfg.cta}</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight:"calc(100vh - 64px)", display:"flex", alignItems:"center",
        justifyContent:"center", padding:"80px 48px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:`radial-gradient(circle, ${glow}0D 0%, transparent 70%)`, top:"5%", left:"-5%", pointerEvents:"none" }} />
        <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${color}0A 0%, transparent 70%)`, bottom:"5%", right:"5%", pointerEvents:"none" }} />

        <div style={{ maxWidth:1100, width:"100%", display:"grid", gridTemplateColumns:"1fr 1fr", gap:80, alignItems:"center" }}>
          {/* Left copy */}
          <div>
            <div className="al-reveal" style={{ animationDelay:"0s", display:"inline-flex", alignItems:"center", gap:8, background:`${color}14`, border:`1px solid ${color}33`, borderRadius:20, padding:"5px 14px", marginBottom:28 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:color, animation:"alShimmer 2s infinite" }} />
              <span style={{ fontSize:11, color:`${color}dd`, letterSpacing:2, textTransform:"uppercase", fontWeight:600 }}>{cfg.badge}</span>
            </div>

            <h1 className="al-reveal" style={{ animationDelay:"0.1s", fontFamily:"'Montserrat', sans-serif", fontSize:"clamp(34px,4.5vw,56px)", fontWeight:900, lineHeight:1.1, margin:"0 0 20px", letterSpacing:-1 }}>
              {cfg.headline.map((line, li) => (
                <span key={li}>
                  {line.split(" ").map((word, wi) => (
                    <span key={wi} style={{ color: li === cfg.highlight && wi === 0 ? color : "inherit" }}>{word} </span>
                  ))}
                  {li < cfg.headline.length - 1 && <br />}
                </span>
              ))}
            </h1>

            <p className="al-reveal" style={{ animationDelay:"0.2s", fontSize:16, fontWeight:300, color:"rgba(255,255,255,0.42)", lineHeight:1.75, marginBottom:40, maxWidth:460 }}>
              {cfg.sub}
            </p>

            <div className="al-reveal" style={{ animationDelay:"0.3s", display:"flex", gap:12, flexWrap:"wrap" }}>
              <button style={{
                background:color, border:"none", borderRadius:6,
                padding:"14px 32px", cursor:"pointer", color:"rgba(0,0,0,0.85)",
                fontSize:13, fontWeight:700, fontFamily:"'Montserrat', sans-serif",
                letterSpacing:1.5, textTransform:"uppercase", transition:"all 0.2s",
                boxShadow:`0 6px 30px ${glow}44`,
              }}
                onMouseEnter={e=>{e.target.style.transform="translateY(-2px)";e.target.style.boxShadow=`0 10px 40px ${glow}66`;}}
                onMouseLeave={e=>{e.target.style.transform="none";e.target.style.boxShadow=`0 6px 30px ${glow}44`;}}
              >{cfg.cta} →</button>
              <button style={{
                background:"transparent", border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:6, padding:"14px 32px", cursor:"pointer",
                color:"rgba(255,255,255,0.5)", fontSize:13, fontWeight:500,
                fontFamily:"'DM Sans', sans-serif", transition:"all 0.2s",
              }}
                onMouseEnter={e=>{e.target.style.borderColor="rgba(255,255,255,0.25)";e.target.style.color="#fff";}}
                onMouseLeave={e=>{e.target.style.borderColor="rgba(255,255,255,0.1)";e.target.style.color="rgba(255,255,255,0.5)";}}
              >Learn More</button>
            </div>

            <div className="al-reveal" style={{ animationDelay:"0.4s", display:"flex", alignItems:"center", gap:16, marginTop:40 }}>
              <div style={{ display:"flex" }}>
                {[color, glow, "#F0D080", "#88D8A8"].map((c,i) => (
                  <div key={i} style={{ width:26, height:26, borderRadius:"50%", background:`radial-gradient(circle at 35% 35%, ${c}, ${c}88)`, border:"2px solid #06040E", marginLeft:i===0?0:-7 }} />
                ))}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.65)" }}>{cfg.stats[1].value} {cfg.stats[1].label.toLowerCase()}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.22)", letterSpacing:0.5 }}>already using {name}</div>
              </div>
            </div>
          </div>

          {/* Right — decorative card */}
          <div className="al-reveal" style={{ animationDelay:"0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>
            <div style={{
              width:320, height:200, borderRadius:12,
              background:`linear-gradient(135deg, ${glow}18, ${color}0A)`,
              border:`1px solid ${color}30`, borderTop:`2px solid ${color}`,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              gap:12, boxShadow:`0 24px 60px rgba(0,0,0,0.4), 0 0 80px ${glow}12`,
              position:"relative", overflow:"hidden",
            }}>
              <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%", background:`radial-gradient(circle, ${glow}18 0%, transparent 70%)`, top:"-30%", right:"-10%", pointerEvents:"none" }} />
              <span style={{ fontSize:48, color, fontFamily:"'Montserrat', sans-serif", textShadow:`0 0 30px ${glow}` }}>{symbol}</span>
              <div style={{ fontFamily:"'Montserrat', sans-serif", fontSize:18, fontWeight:800, color:"#fff", letterSpacing:0.5 }}>{name}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", letterSpacing:1 }}>{cfg.badge}</div>
            </div>
            <div style={{ display:"flex", gap:12, width:320 }}>
              {cfg.stats.slice(0,2).map(({value,label}) => (
                <div key={label} style={{
                  flex:1, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                  borderRadius:8, padding:"14px 16px", textAlign:"center",
                }}>
                  <div style={{ fontFamily:"'Montserrat', sans-serif", fontSize:20, fontWeight:800, color }}>{value}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.28)", marginTop:3 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{
        borderTop:"1px solid rgba(255,255,255,0.05)", borderBottom:"1px solid rgba(255,255,255,0.05)",
        background:"rgba(255,255,255,0.02)", padding:"36px 48px",
      }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:24 }}>
          {cfg.stats.map(({value,label},i) => (
            <div key={label} className="al-reveal" style={{ animationDelay:`${i*0.08}s`, textAlign:"center" }}>
              <div style={{ fontFamily:"'Montserrat', sans-serif", fontSize:30, fontWeight:900, color, letterSpacing:-0.5 }}>{value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.28)", marginTop:4, letterSpacing:1, textTransform:"uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding:"96px 48px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="al-reveal" style={{ textAlign:"center", marginBottom:60 }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:4, textTransform:"uppercase", color:`${color}99`, marginBottom:14 }}>Features</div>
            <h2 style={{ fontFamily:"'Montserrat', sans-serif", fontSize:"clamp(26px,3.5vw,40px)", fontWeight:800, margin:0, letterSpacing:-0.5 }}>
              Built to help you <span style={{ color }}>{cfg.cta.toLowerCase()}</span>
            </h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:18 }}>
            {cfg.features.map(({icon,title,desc},i) => (
              <div key={title} className="al-feature al-reveal" style={{ animationDelay:`${i*0.07}s`,
                background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)",
                borderRadius:10, padding:"26px 26px 22px", transition:"all 0.25s",
              }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${color}0A`;e.currentTarget.style.borderColor=`${color}33`;}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.025)";e.currentTarget.style.borderColor="rgba(255,255,255,0.06)";}}
              >
                <div style={{ fontSize:20, color, marginBottom:14, fontFamily:"'Montserrat', sans-serif" }}>{icon}</div>
                <div style={{ fontFamily:"'Montserrat', sans-serif", fontSize:14, fontWeight:700, color:"#fff", marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.36)", lineHeight:1.65, fontWeight:300 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{
        padding:"96px 48px",
        background:"rgba(255,255,255,0.015)",
        borderTop:"1px solid rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.04)",
      }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="al-reveal" style={{ textAlign:"center", marginBottom:60 }}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:4, textTransform:"uppercase", color:`${color}99`, marginBottom:14 }}>Process</div>
            <h2 style={{ fontFamily:"'Montserrat', sans-serif", fontSize:"clamp(26px,3.5vw,40px)", fontWeight:800, margin:0, letterSpacing:-0.5 }}>How it works</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:48 }}>
            {cfg.steps.map(({num,title,desc},i) => (
              <div key={num} className="al-reveal" style={{ animationDelay:`${i*0.1}s` }}>
                <div style={{ fontSize:11, fontWeight:800, color:`${color}55`, fontFamily:"'Montserrat', sans-serif", letterSpacing:2, marginBottom:14 }}>{num}</div>
                <div style={{
                  width:44, height:44, borderRadius:"50%",
                  border:`1px solid ${color}33`, background:`${color}10`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16, fontWeight:700, marginBottom:18,
                  color, fontFamily:"'Montserrat', sans-serif",
                }}>{i+1}</div>
                <div style={{ fontFamily:"'Montserrat', sans-serif", fontSize:15, fontWeight:700, color:"#fff", marginBottom:10 }}>{title}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.35)", lineHeight:1.65, fontWeight:300 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{ padding:"96px 48px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div className="al-reveal" style={{
            background:`linear-gradient(135deg, ${glow}18 0%, ${color}0A 100%)`,
            border:`1px solid ${color}22`, borderRadius:16,
            padding:"72px 64px", textAlign:"center", position:"relative", overflow:"hidden",
          }}>
            <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:`radial-gradient(circle, ${glow}12 0%, transparent 70%)`, top:"-30%", right:"10%", pointerEvents:"none" }} />
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:4, textTransform:"uppercase", color:`${color}99`, marginBottom:16 }}>Get Started Today</div>
            <h2 style={{ fontFamily:"'Montserrat', sans-serif", fontSize:"clamp(24px,3.5vw,38px)", fontWeight:900, margin:"0 0 14px", letterSpacing:-0.5 }}>
              Ready to {cfg.cta.toLowerCase()}?
            </h2>
            <p style={{ fontSize:15, color:"rgba(255,255,255,0.35)", maxWidth:460, margin:"0 auto 38px", lineHeight:1.75, fontWeight:300 }}>
              Join thousands of students already using {name} to study smarter and achieve better results.
            </p>
            <button style={{
              background:color, border:"none", borderRadius:6,
              padding:"15px 40px", cursor:"pointer", color:"rgba(0,0,0,0.85)",
              fontSize:13, fontWeight:700, fontFamily:"'Montserrat', sans-serif",
              letterSpacing:1.5, textTransform:"uppercase", transition:"all 0.2s",
              boxShadow:`0 8px 32px ${glow}44`,
            }}
              onMouseEnter={e=>{e.target.style.transform="translateY(-2px)";e.target.style.boxShadow=`0 12px 40px ${glow}66`;}}
              onMouseLeave={e=>{e.target.style.transform="none";e.target.style.boxShadow=`0 8px 32px ${glow}44`;}}
            >{cfg.cta} →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop:"1px solid rgba(255,255,255,0.05)", padding:"36px 48px",
        display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:22, height:22, borderRadius:"50%", background:`linear-gradient(135deg, ${glow}, ${color})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontFamily:"'Montserrat', sans-serif", fontWeight:800, color:"rgba(0,0,0,0.75)" }}>{symbol}</div>
          <span style={{ fontFamily:"'Montserrat', sans-serif", fontSize:12, fontWeight:700, color:`${color}99`, letterSpacing:0.5 }}>{name}</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.15)", marginLeft:6 }}>· Part of Ace It Galaxy</span>
        </div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.15)" }}>© 2026 Ace It Galaxy · All rights reserved</div>
        <div style={{ display:"flex", gap:22 }}>
          {["Privacy","Terms","Support"].map(l => (
            <span key={l} style={{ fontSize:11, color:"rgba(255,255,255,0.22)", cursor:"pointer", transition:"color 0.18s" }}
              onMouseEnter={e=>e.target.style.color="rgba(255,255,255,0.6)"} onMouseLeave={e=>e.target.style.color="rgba(255,255,255,0.22)"}
            >{l}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}


// ─── Flash Cards App ─────────────────────────────────────────────────────────
// Clean base model — easy to read, edit, and extend

const FC_DECKS = [
  {
    id: 1, title: "Real Estate Principles", subject: "Real Estate", cardCount: 6,
    color: "#4F6EF7", lastStudied: "Today", mastery: 65,
    cards: [
      { id: 1, term: "Easement",      definition: "A legal right to use another person's land for a specific, limited purpose — such as a driveway or utility line." },
      { id: 2, term: "Fee Simple",    definition: "The most complete form of property ownership. The owner holds full, unconditional rights with no restrictions or conditions." },
      { id: 3, term: "Escrow",        definition: "A neutral third party that holds funds, documents, and assets until all conditions of a real estate transaction are satisfied." },
      { id: 4, term: "Lien",          definition: "A legal claim placed against a property as security for a debt or obligation owed by the property owner." },
      { id: 5, term: "Amortization",  definition: "The process of gradually paying off a mortgage through regular installments that cover both principal and interest." },
      { id: 6, term: "Appraisal",     definition: "A professional assessment of a property's market value, typically required by lenders before approving a mortgage." },
    ],
  },
  {
    id: 2, title: "Contract Law Basics", subject: "Law", cardCount: 5,
    color: "#E85D3F", lastStudied: "Yesterday", mastery: 40,
    cards: [
      { id: 1, term: "Offer",             definition: "A clear proposal made by one party to another, expressing willingness to enter into a contract under specific terms." },
      { id: 2, term: "Acceptance",        definition: "Unconditional agreement to all the terms of an offer, creating a binding contract between the parties." },
      { id: 3, term: "Consideration",     definition: "Something of value exchanged between parties — money, services, or a promise — that makes a contract legally enforceable." },
      { id: 4, term: "Breach of Contract",definition: "Failure by one party to fulfill their obligations under a contract without legal justification." },
      { id: 5, term: "Contingency",       definition: "A condition that must be met before a real estate contract becomes binding — such as financing approval or a home inspection." },
    ],
  },
  {
    id: 3, title: "Property Management", subject: "Real Estate", cardCount: 4,
    color: "#2BAE7E", lastStudied: "3 days ago", mastery: 100,
    cards: [
      { id: 1, term: "Gross Lease",   definition: "A lease where the tenant pays a fixed rent and the landlord covers all operating expenses including taxes, insurance, and maintenance." },
      { id: 2, term: "Net Lease",     definition: "A lease where the tenant pays base rent plus some or all of the property's operating expenses directly." },
      { id: 3, term: "CAP Rate",      definition: "Capitalization rate — a metric used to estimate the return on an investment property, calculated as Net Operating Income ÷ Property Value." },
      { id: 4, term: "Vacancy Rate",  definition: "The percentage of available rental units that are unoccupied at a given time, used to measure a property's performance." },
    ],
  },
  {
    id: 4, title: "Finance & Appraisal", subject: "Finance", cardCount: 5,
    color: "#9B59B6", lastStudied: "1 week ago", mastery: 20,
    cards: [
      { id: 1, term: "LTV Ratio",             definition: "Loan-to-Value ratio — the percentage of a property's value being financed. Lenders use this to assess risk." },
      { id: 2, term: "PMI",                   definition: "Private Mortgage Insurance — required when a borrower puts down less than 20%, protecting the lender against default." },
      { id: 3, term: "Comparable Sales",      definition: "Recently sold properties similar in size, location, and condition used to estimate a subject property's market value." },
      { id: 4, term: "Debt-to-Income Ratio",  definition: "The percentage of a borrower's gross monthly income that goes toward debt payments, used by lenders to qualify buyers." },
      { id: 5, term: "Points",                definition: "Prepaid interest paid to a lender at closing — one point equals 1% of the loan amount — used to lower the interest rate." },
    ],
  },
];

const FC_SUBJECTS = ["All", "Real Estate", "Law", "Finance", "Science", "History", "Math"];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function FCSidebar({ isOpen, onClose, decks, view, setView, onBack, user, openAuth, onLogout }) {
  const [profileOpen, setProfileOpen] = useState(true);
  const [decksOpen,   setDecksOpen]   = useState(true);

  const navItems = [
    { icon: "⌂", label: "Home",       v: "home"    },
    { icon: "▦", label: "My Library", v: "library" },
  ];

  const accountItems = [
    { icon: "◎", label: "Settings"       },
    { icon: "✦", label: "Upgrade to Pro" },
    { icon: "⟡", label: "Help & Support" },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(26,24,20,0.35)", backdropFilter: "blur(4px)", animation: "fcFadeIn 0.2s ease both" }} />
      )}

      {/* Panel */}
      <div style={{
        position: "fixed", left: 0, top: 0, bottom: 0, width: 272,
        background: "#fff", borderRight: "1px solid #ECEAE4",
        display: "flex", flexDirection: "column", overflow: "hidden",
        zIndex: 201,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.38s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: isOpen ? "4px 0 32px rgba(26,24,20,0.08)" : "none",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #ECEAE4", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: "#1A1814", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#F7F6F2", fontSize: 14, fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>A</span>
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 800, color: "#1A1814", letterSpacing: -0.3 }}>Ace Cards</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, width: 28, height: 28, cursor: "pointer", fontSize: 13, color: "#8C8880", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.color = "#1A1814"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECEAE4"; e.currentTarget.style.color = "#8C8880"; }}>✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 20px" }}>

          {/* User profile */}
          <div style={{ marginBottom: 6 }}>
            <button onClick={() => setProfileOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E" }}>Account</span>
              <span style={{ fontSize: 9, color: "#A8A59E", display: "inline-block", transform: profileOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.22s" }}>▾</span>
            </button>

            {profileOpen && (
              <div style={{ margin: "4px 0 8px", padding: "14px 14px", background: "#F7F6F2", borderRadius: 10, border: "1px solid #ECEAE4" }}>
                {user ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg, #1A1814, #4F6EF7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 0 3px #fff, 0 0 0 4px #ECEAE4" }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#F7F6F2" }}>{user.avatar}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#1A1814" }}>{user.name}</div>
                        <div style={{ fontSize: 11, color: "#8C8880", marginTop: 1 }}>Free Plan</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A8A59E", marginBottom: 5 }}>
                        <span>XP Progress</span><span style={{ color: "#4F6EF7", fontWeight: 600 }}>1,240 / 2,000</span>
                      </div>
                      <div style={{ height: 4, background: "#ECEAE4", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: "62%", background: "linear-gradient(90deg, #1A1814, #4F6EF7)", borderRadius: 2 }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", borderTop: "1px solid #ECEAE4", paddingTop: 12, marginBottom: 12 }}>
                      {[{ val: "7🔥", lbl: "Streak" }, { val: "4", lbl: "Decks" }, { val: "64%", lbl: "Mastery" }].map(({ val, lbl }, i) => (
                        <div key={lbl} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? "1px solid #ECEAE4" : "none" }}>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 800, color: "#1A1814" }}>{val}</div>
                          <div style={{ fontSize: 9, color: "#A8A59E", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{lbl}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => { onLogout(); onClose(); }} style={{ width: "100%", padding: "8px 0", borderRadius: 6, background: "transparent", border: "1px solid #E8E5E0", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#8C8880", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = "#E85D3F"; e.currentTarget.style.color = "#E85D3F"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#E8E5E0"; e.currentTarget.style.color = "#8C8880"; }}>Sign Out</button>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#ECEAE4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>👤</div>
                      <div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 800, color: "#8C8880" }}>Guest</div>
                        <div style={{ fontSize: 11, color: "#A8A59E", marginTop: 1 }}>Not signed in</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { openAuth("login"); onClose(); }} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1.5px solid #1A1814", background: "#1A1814", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>Log In</button>
                      <button onClick={() => { openAuth("signup"); onClose(); }} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1.5px solid #1A1814", background: "transparent", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#1A1814", transition: "all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>Sign Up</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#ECEAE4", margin: "6px 8px 12px" }} />

          {/* Navigation */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", padding: "0 8px", marginBottom: 4 }}>Navigate</div>
            {navItems.map(({ icon, label, v }) => {
              const active = view === v;
              return (
                <div key={v} onClick={() => setView(v)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: active ? "#1A1814" : "transparent", borderLeft: active ? "none" : "2px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F7F6F2"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontSize: 14, color: active ? "#F7F6F2" : "#8C8880", width: 18, textAlign: "center" }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? "#F7F6F2" : "#5A5752" }}>{label}</span>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#ECEAE4", margin: "6px 8px 12px" }} />

          {/* Recent Decks */}
          <div style={{ marginBottom: 6 }}>
            <button onClick={() => setDecksOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E" }}>Recent Decks</span>
              <span style={{ fontSize: 9, color: "#A8A59E", display: "inline-block", transform: decksOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.22s" }}>▾</span>
            </button>

            {decksOpen && (
              <div style={{ marginTop: 4 }}>
                {decks.map(deck => (
                  <div key={deck.id} onClick={() => setView("library")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {/* Color dot */}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: deck.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1A1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{deck.title}</div>
                      <div style={{ fontSize: 10, color: "#A8A59E", marginTop: 1 }}>{deck.cardCount} cards · {deck.mastery}% mastered</div>
                    </div>
                    {/* Mini mastery bar */}
                    <div style={{ width: 36, height: 3, background: "#ECEAE4", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ height: "100%", width: `${deck.mastery}%`, background: deck.mastery === 100 ? "#2BAE7E" : deck.color, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
                <div onClick={() => setView("library")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", borderRadius: 8, marginTop: 2, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ fontSize: 11, color: "#4F6EF7", fontWeight: 600 }}>+ View all decks →</span>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "#ECEAE4", margin: "6px 8px 12px" }} />

          {/* Account links */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", padding: "0 8px", marginBottom: 4 }}>Account</div>
            {accountItems.map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 2, transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <span style={{ fontSize: 13, color: "#8C8880", width: 18, textAlign: "center" }}>{icon}</span>
                <span style={{ fontSize: 13, color: "#5A5752" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — Upgrade CTA + back to Galaxy */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #ECEAE4" }}>
          {/* Upgrade strip */}
          <div style={{ margin: "12px 12px 8px", padding: "14px 16px", background: "#1A1814", borderRadius: 10 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 800, color: "#F5C842", marginBottom: 4 }}>✦ Go Pro</div>
            <div style={{ fontSize: 11, color: "rgba(247,246,242,0.5)", lineHeight: 1.5, marginBottom: 12 }}>Unlimited decks, AI card generation & more</div>
            <div style={{ background: "#F5C842", borderRadius: 6, padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#1A1814", cursor: "pointer", letterSpacing: 0.5 }}>Upgrade — $9/mo</div>
          </div>
          {/* Galaxy link */}
          <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", cursor: "pointer", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F7F6F2"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <span style={{ fontSize: 13, color: "#8C8880" }}>←</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#8C8880" }}>Back to Ace It Galaxy</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root wrapper — receives onBack from Galaxy ────────────────────────────────
function FlashCardsApp({ onBack, user, openAuth, onLogout }) {
  const [view, setView]             = useState("home");   // home | library | deck | study
  const [activeDeck, setActiveDeck] = useState(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [activeSubject, setActiveSubject] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [studyConfig, setStudyConfig] = useState(null);

  const openDeck   = (deck) => { setActiveDeck(deck); setView("deck"); };
  const startStudy = (deck) => { setActiveDeck(deck); setView("setup"); };
  const goHome     = ()     => { setView("home"); setActiveDeck(null); };
  const openCreate = ()     => { setActiveDeck(null); setView("create"); };

  const filteredDecks = FC_DECKS.filter(d => {
    const matchSubject = activeSubject === "All" || d.subject === activeSubject;
    const matchSearch  = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#F7F6F2", minHeight: "100vh", color: "#1A1814" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #D8D5CE; border-radius: 3px; }
        @keyframes fcFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fcFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fcSlideIn { from { transform:translateX(-100%); } to { transform:translateX(0); } }
        .fc-fade-up { animation: fcFadeUp 0.5s ease both; }
        .fc-fade-in { animation: fcFadeIn 0.3s ease both; }
        .fc-deck-card { transition: all 0.22s; }
        .fc-deck-card:hover { transform: translateY(-4px) !important; box-shadow: 0 12px 40px rgba(0,0,0,0.1) !important; }
        .fc-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .fc-nav-link { transition: color 0.18s; }
        .fc-nav-link:hover { color: #1A1814 !important; }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #ECEAE4", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Hamburger + Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, width: 36, height: 36, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, transition: "all 0.18s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.background = "#F7F6F2"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECEAE4"; e.currentTarget.style.background = "none"; }}>
              <div style={{ width: 14, height: 1.5, background: "#1A1814", borderRadius: 1 }} />
              <div style={{ width: 10, height: 1.5, background: "#8C8880", borderRadius: 1 }} />
              <div style={{ width: 14, height: 1.5, background: "#1A1814", borderRadius: 1 }} />
            </button>
            <div onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, background: "#1A1814", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#F7F6F2", fontSize: 16, fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>A</span>
              </div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814", letterSpacing: -0.5 }}>Ace Cards</span>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
            {[["Home", "home"], ["My Library", "library"]].map(([label, v]) => (
              <span key={v} className="fc-nav-link" onClick={() => setView(v)} style={{ fontSize: 14, fontWeight: 500, color: view === v ? "#1A1814" : "#8C8880", cursor: "pointer", borderBottom: view === v ? "2px solid #1A1814" : "2px solid transparent", paddingBottom: 2 }}>{label}</span>
            ))}
          </div>

          {/* Right */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={onBack} style={{ background: "none", border: "1px solid #D8D5CE", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#8C8880", transition: "all 0.18s" }}>← Galaxy</button>
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1814" }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: "#8C8880" }}>Free Plan</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #1A1814, #4F6EF7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 800, color: "#F7F6F2", cursor: "pointer" }}
                  onClick={() => setSidebarOpen(true)}>{user.avatar}</div>
              </div>
            ) : (
              <>
                <button onClick={() => openAuth("login")} style={{ background: "none", border: "1px solid #D8D5CE", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#5A5752", transition: "all 0.18s" }}>Log In</button>
                <button className="fc-btn" onClick={() => openAuth("signup")} style={{ background: "#1A1814", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#F7F6F2", transition: "all 0.18s" }}>Sign Up Free</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <FCSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} decks={FC_DECKS} view={view} setView={(v) => { setView(v); setSidebarOpen(false); setActiveDeck(null); }} onBack={onBack} user={user} openAuth={openAuth} onLogout={onLogout} />

      {/* ── VIEWS ────────────────────────────────────────────────────────── */}
      {view === "home"    && <FCHomeView    decks={FC_DECKS} onOpenDeck={openDeck} onStartStudy={startStudy} onGoLibrary={() => setView("library")} onNewDeck={openCreate} />}
      {view === "library" && <FCLibraryView allDecks={FC_DECKS} onOpenDeck={openDeck} onStartStudy={startStudy} onNewDeck={openCreate} />}
      {view === "deck"    && activeDeck && <FCDeckView   deck={activeDeck} onBack={() => setView("library")} onStudy={() => startStudy(activeDeck)} />}
      {view === "create"  && <FCCreateDeck onBack={() => setView("library")} onSave={() => setView("library")} />}
      {view === "setup"   && activeDeck && <FCStudySetup deck={activeDeck} onBack={() => setView("deck")} onStart={(cfg) => { setStudyConfig(cfg); setView("study"); }} />}
      {view === "study"   && activeDeck && studyConfig && <FCStudyView deck={activeDeck} config={studyConfig} onBack={() => setView("setup")} onBackToLibrary={() => setView("library")} />}
    </div>
  );
}

// ── Home View ─────────────────────────────────────────────────────────────────
function FCHomeView({ decks, onOpenDeck, onStartStudy, onGoLibrary, onNewDeck }) {
  return (
    <div>
      {/* Hero */}
      <section style={{ background: "#1A1814", color: "#F7F6F2", padding: "80px 24px 72px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center" }}>
          <div className="fc-fade-up" style={{ animationDelay: "0s", display: "inline-block", background: "rgba(247,246,242,0.1)", border: "1px solid rgba(247,246,242,0.15)", borderRadius: 20, padding: "4px 14px", fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "rgba(247,246,242,0.6)", marginBottom: 24 }}>
            Study Smarter
          </div>
          <h1 className="fc-fade-up" style={{ animationDelay: "0.08s", fontFamily: "'Playfair Display', serif", fontSize: "clamp(42px, 6vw, 68px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: -1.5, marginBottom: 22 }}>
            The cards that help you{" "}
            <em style={{ fontStyle: "italic", color: "#F5C842" }}>actually</em> remember.
          </h1>
          <p className="fc-fade-up" style={{ animationDelay: "0.16s", fontSize: 17, fontWeight: 300, color: "rgba(247,246,242,0.55)", lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
            Build flash card decks, flip through terms, and track your mastery — built for students who are serious about passing.
          </p>
          <div className="fc-fade-up" style={{ animationDelay: "0.24s", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="fc-btn" onClick={onGoLibrary} style={{ background: "#F5C842", border: "none", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#1A1814", transition: "all 0.2s" }}>Browse My Decks</button>
            <button style={{ background: "transparent", border: "1px solid rgba(247,246,242,0.2)", borderRadius: 8, padding: "13px 28px", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "rgba(247,246,242,0.7)" }} onClick={onNewDeck}>Create a Deck</button>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{ background: "#ECEAE4", borderBottom: "1px solid #D8D5CE" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {[["4", "Study Decks"], ["20", "Total Cards"], ["56%", "Avg Mastery"], ["7", "Day Streak"]].map(([val, lbl], i) => (
            <div key={lbl} style={{ padding: "20px 0", textAlign: "center", borderRight: i < 3 ? "1px solid #D8D5CE" : "none" }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: "#1A1814" }}>{val}</div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#8C8880", letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Decks */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#8C8880", marginBottom: 8 }}>Continue Studying</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Your Recent Decks</h2>
          </div>
          <span onClick={onGoLibrary} style={{ fontSize: 13, fontWeight: 600, color: "#1A1814", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>View all →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {decks.map((deck, i) => <FCDeckCard key={deck.id} deck={deck} index={i} onOpen={onOpenDeck} onStudy={onStartStudy} />)}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "#fff", borderTop: "1px solid #ECEAE4", borderBottom: "1px solid #ECEAE4", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "#8C8880", marginBottom: 8 }}>Simple by design</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>How it works</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 48 }}>
            {[
              { num: "01", title: "Create a Deck",  desc: "Add terms and definitions. Organize by subject, topic, or exam section." },
              { num: "02", title: "Flip & Study",   desc: "Go through your cards one by one. Flip to reveal the answer and mark what you know." },
              { num: "03", title: "Track Mastery",  desc: "Watch your progress bar fill up as you master each card in the deck." },
            ].map(({ num, title, desc }) => (
              <div key={num}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: "#D8D5CE", letterSpacing: 2, marginBottom: 14 }}>{num}</div>
                <div style={{ width: 40, height: 40, background: "#1A1814", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <span style={{ color: "#F7F6F2", fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{num[1]}</span>
                </div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{title}</h3>
                <p style={{ fontSize: 14, color: "#6B6860", lineHeight: 1.65, fontWeight: 300 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: "32px 24px", textAlign: "center" }}>
        <span style={{ fontSize: 12, color: "#A8A59E" }}>© 2026 Ace Cards · Part of Ace It Galaxy</span>
      </footer>
    </div>
  );
}

// ── Library — folder tree data ────────────────────────────────────────────────
// Structure: Year > Semester > Class > Chapter  (add more levels as needed)
const FC_TREE = [
  {
    id: "y2025", type: "year", label: "2025 – 2026", color: "#4F6EF7",
    children: [
      {
        id: "fall25", type: "semester", label: "Fall 2025", color: "#E85D3F",
        children: [
          {
            id: "re101", type: "class", label: "Real Estate Principles 101", color: "#4F6EF7",
            children: [
              { id: "re101-ch1", type: "chapter", label: "Chapter 1 – Property Foundations", color: "#4F6EF7", deckIds: [1] },
              { id: "re101-ch2", type: "chapter", label: "Chapter 2 – Contracts & Law",       color: "#E85D3F", deckIds: [2] },
            ],
          },
          {
            id: "pm201", type: "class", label: "Property Management 201", color: "#2BAE7E",
            children: [
              { id: "pm201-ch1", type: "chapter", label: "Chapter 1 – Lease Types & CAP Rates", color: "#2BAE7E", deckIds: [3] },
            ],
          },
        ],
      },
      {
        id: "spr26", type: "semester", label: "Spring 2026", color: "#9B59B6",
        children: [
          {
            id: "fin301", type: "class", label: "Finance & Appraisal 301", color: "#9B59B6",
            children: [
              { id: "fin301-ch1", type: "chapter", label: "Chapter 1 – Loan Fundamentals", color: "#9B59B6", deckIds: [4] },
            ],
          },
        ],
      },
    ],
  },
];

// Folder type display config — add or rename levels here
const FC_TYPE_META = {
  year:     { icon: "📅", label: "Year"     },
  semester: { icon: "📆", label: "Semester" },
  class:    { icon: "📚", label: "Class"    },
  chapter:  { icon: "📖", label: "Chapter"  },
  section:  { icon: "📄", label: "Section"  },
};

const FC_ORG_LEVELS = ["year", "semester", "class", "chapter", "section"];

// Tree helpers
function fcFindNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const f = fcFindNode(n.children, id); if (f) return f; }
  }
  return null;
}
function fcGetAllDeckIds(node) {
  let ids = node.deckIds ? [...node.deckIds] : [];
  if (node.children) for (const c of node.children) ids = ids.concat(fcGetAllDeckIds(c));
  return ids;
}

// ── Organize / New-Deck Wizard ────────────────────────────────────────────────
function FCOrganizeModal({ onClose, allDecks, tree }) {
  const [step, setStep]           = useState(0);
  const [choices, setChoices]     = useState({});  // { year: "y2025", ... }
  const [newNames, setNewNames]   = useState({});  // { year: "2026-2027", ... }
  const [creating, setCreating]   = useState({});  // { year: true }
  const [deckName, setDeckName]   = useState("");

  const isNameStep = step === FC_ORG_LEVELS.length;
  const currentLevel = FC_ORG_LEVELS[step];

  const getOptions = (s) => {
    if (s === 0) return tree;
    const parentId = choices[FC_ORG_LEVELS[s - 1]];
    if (!parentId) return [];
    return fcFindNode(tree, parentId)?.children || [];
  };
  const options = getOptions(step);

  const choose = (id) => { setChoices(c => ({ ...c, [currentLevel]: id })); setCreating(c => ({ ...c, [currentLevel]: false })); };
  const skip   = ()   => { const n = { ...choices }; delete n[currentLevel]; setChoices(n); setCreating(c => ({ ...c, [currentLevel]: false })); setStep(s => s + 1); };
  const next   = ()   => setStep(s => s + 1);
  const back   = ()   => setStep(s => Math.max(0, s - 1));

  const canContinue = !!choices[currentLevel] || (creating[currentLevel] && newNames[currentLevel]?.trim());

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(26,24,20,0.55)", backdropFilter: "blur(6px)" }} />
      <div className="fc-fade-in" onClick={e => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: 16, width: "100%", maxWidth: 500, boxShadow: "0 24px 80px rgba(0,0,0,0.2)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#1A1814", padding: "22px 28px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#F7F6F2" }}>
              {isNameStep ? "Name Your Deck" : "Organize Your Deck"}
            </span>
            <button onClick={onClose} style={{ background: "rgba(247,246,242,0.1)", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "#F7F6F2", fontSize: 13 }}>✕</button>
          </div>
          {/* Progress bar */}
          <div style={{ display: "flex", gap: 4 }}>
            {[...FC_ORG_LEVELS, "name"].map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? "#F5C842" : "rgba(247,246,242,0.15)", transition: "background 0.3s" }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(247,246,242,0.4)" }}>
              {isNameStep ? "Final step" : `Step ${step + 1} of ${FC_ORG_LEVELS.length + 1} — ${FC_TYPE_META[currentLevel]?.label}`}
            </span>
            {!isNameStep && <span onClick={skip} style={{ fontSize: 11, color: "#F5C842", cursor: "pointer", fontWeight: 600 }}>Skip →</span>}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px 28px" }}>
          {isNameStep ? (
            <div>
              <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 16, lineHeight: 1.6 }}>Give your deck a name. You can always rename it later.</p>

              {/* Path summary */}
              <div style={{ background: "#F7F6F2", border: "1px solid #ECEAE4", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", marginBottom: 8 }}>Saved to</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {FC_ORG_LEVELS.map(lvl => {
                    const id = choices[lvl]; const nm = newNames[lvl];
                    if (!id && !nm) return null;
                    const node = id ? fcFindNode(tree, id) : null;
                    const m = FC_TYPE_META[lvl];
                    return (
                      <span key={lvl} style={{ fontSize: 11, fontWeight: 600, color: m.color || "#4F6EF7", background: `${m.color || "#4F6EF7"}15`, padding: "3px 10px", borderRadius: 20 }}>
                        {m.icon} {node ? node.label : nm}
                      </span>
                    );
                  })}
                  {!Object.values(choices).some(Boolean) && !Object.values(newNames).some(Boolean) && (
                    <span style={{ fontSize: 11, color: "#A8A59E" }}>Uncategorized</span>
                  )}
                </div>
              </div>

              <input autoFocus type="text" value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="e.g. Chapter 4 – Agency Law" style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #D8D5CE", borderRadius: 8, fontSize: 15, color: "#1A1814", outline: "none", fontFamily: "'DM Sans', sans-serif", background: "#F7F6F2" }}
                onKeyDown={e => e.key === "Enter" && deckName.trim() && onClose()} />
            </div>
          ) : (
            <div>
              <p style={{ fontSize: 13, color: "#6B6860", marginBottom: 16, lineHeight: 1.6 }}>
                {options.length > 0 ? `Choose an existing ${FC_TYPE_META[currentLevel]?.label.toLowerCase()} or create a new one.` : `No ${FC_TYPE_META[currentLevel]?.label.toLowerCase()}s yet — create one or skip.`}
              </p>

              {/* Option list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {options.map(opt => {
                  const selected = choices[currentLevel] === opt.id;
                  return (
                    <div key={opt.id} onClick={() => choose(opt.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${selected ? opt.color : "#ECEAE4"}`, background: selected ? `${opt.color}08` : "#F7F6F2", cursor: "pointer", transition: "all 0.15s" }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = "#D8D5CE"; }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = "#ECEAE4"; }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: selected ? 600 : 400, color: "#1A1814", flex: 1 }}>{opt.label}</span>
                      {selected && <span style={{ fontSize: 13, color: opt.color }}>✓</span>}
                    </div>
                  );
                })}
              </div>

              {/* Create new */}
              {!creating[currentLevel] ? (
                <div onClick={() => { setCreating(c => ({ ...c, [currentLevel]: true })); setChoices(c => { const n = { ...c }; delete n[currentLevel]; return n; }); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 10, border: "1.5px dashed #D8D5CE", cursor: "pointer", color: "#8C8880", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.color = "#1A1814"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.color = "#8C8880"; }}>
                  <span>+</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Create new {FC_TYPE_META[currentLevel]?.label.toLowerCase()}…</span>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input autoFocus type="text" value={newNames[currentLevel] || ""} onChange={e => setNewNames(n => ({ ...n, [currentLevel]: e.target.value }))} placeholder={`Name your ${FC_TYPE_META[currentLevel]?.label.toLowerCase()}…`} style={{ flex: 1, padding: "10px 14px", border: "1.5px solid #4F6EF7", borderRadius: 8, fontSize: 13, color: "#1A1814", outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
                  <button onClick={() => { setCreating(c => ({ ...c, [currentLevel]: false })); setNewNames(n => { const x = { ...n }; delete x[currentLevel]; return x; }); }} style={{ background: "#F7F6F2", border: "1px solid #D8D5CE", borderRadius: 8, padding: "0 12px", cursor: "pointer", fontSize: 12, color: "#8C8880" }}>✕</button>
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: "flex", alignItems: "center", marginTop: 24, gap: 10 }}>
            {step > 0 && <button onClick={back} style={{ background: "#F7F6F2", border: "1px solid #ECEAE4", borderRadius: 8, padding: "10px 16px", fontSize: 13, cursor: "pointer", color: "#5A5752" }}>← Back</button>}
            <div style={{ flex: 1 }} />
            {!isNameStep ? (
              <button onClick={next} disabled={!canContinue} style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: canContinue ? "pointer" : "default", color: "#F7F6F2", opacity: canContinue ? 1 : 0.4, transition: "opacity 0.2s" }}>Continue →</button>
            ) : (
              <button onClick={() => { if (deckName.trim()) onClose(); }} disabled={!deckName.trim()} style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: deckName.trim() ? "pointer" : "default", color: "#F7F6F2", opacity: deckName.trim() ? 1 : 0.4, transition: "opacity 0.2s" }}>Create Deck ✓</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Deck ───────────────────────────────────────────────────────────────
function FCCreateDeck({ onBack, onSave }) {
  const [tab, setTab]           = useState("cards");   // cards | details | organize
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [subject, setSubject]   = useState("");
  const [color, setColor]       = useState("#4F6EF7");
  const [cards, setCards]       = useState([
    { id: 1, term: "", definition: "" },
    { id: 2, term: "", definition: "" },
    { id: 3, term: "", definition: "" },
  ]);
  const [activeCard, setActiveCard] = useState(1);
  const [orgPath, setOrgPath] = useState({ year: "", semester: "", class: "", chapter: "" });
  const nextId = Math.max(...cards.map(c => c.id)) + 1;

  const updateCard = (id, field, val) =>
    setCards(cs => cs.map(c => c.id === id ? { ...c, [field]: val } : c));

  const addCard = () => {
    const id = Date.now();
    setCards(cs => [...cs, { id, term: "", definition: "" }]);
    setActiveCard(id);
    setTimeout(() => document.getElementById(`term-${id}`)?.focus(), 60);
  };

  const removeCard = (id) => {
    if (cards.length <= 1) return;
    const idx = cards.findIndex(c => c.id === id);
    setCards(cs => cs.filter(c => c.id !== id));
    setActiveCard(cards[Math.max(0, idx - 1)]?.id ?? cards[0].id);
  };

  const filledCards = cards.filter(c => c.term.trim() || c.definition.trim()).length;
  const canSave = title.trim() && filledCards > 0;

  const COLORS = ["#4F6EF7","#E85D3F","#2BAE7E","#9B59B6","#F5C842","#E67E22","#1ABC9C","#E91E8C"];
  const SUBJECTS = ["Real Estate","Law","Finance","Science","History","Math","Biology","Chemistry","Other"];
  const ORG_OPTIONS = {
    year: ["2025 – 2026", "2024 – 2025"],
    semester: ["Fall 2025", "Spring 2026", "Summer 2026"],
    class: ["Real Estate Principles 101", "Property Management 201", "Finance & Appraisal 301"],
    chapter: ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"],
  };

  const tabStyle = (t) => ({
    padding: "9px 20px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "all 0.18s",
    background: tab === t ? "#1A1814" : "transparent",
    color: tab === t ? "#F7F6F2" : "#8C8880",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F7F6F2" }}>
      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ECEAE4", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={onBack} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "#8C8880", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#1A1814"} onMouseLeave={e => e.currentTarget.style.borderColor = "#ECEAE4"}>
              ← Back
            </button>
            <div style={{ width: 1, height: 20, background: "#ECEAE4" }} />
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814", margin: 0 }}>New Deck</h2>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#F7F6F2", borderRadius: 9, padding: 3, gap: 2 }}>
            {[["cards","📇 Cards"], ["details","✏️ Details"], ["organize","📁 Organize"]].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>{label}</button>
            ))}
          </div>

          {/* Save */}
          <button onClick={onSave} disabled={!canSave} style={{ background: canSave ? "#1A1814" : "#ECEAE4", border: "none", borderRadius: 8, padding: "9px 22px", fontSize: 13, fontWeight: 700, cursor: canSave ? "pointer" : "default", color: canSave ? "#F7F6F2" : "#A8A59E", transition: "all 0.2s" }}
            onMouseEnter={e => { if (canSave) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            Save Deck {filledCards > 0 && `(${filledCards} card${filledCards !== 1 ? "s" : ""})`}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>

        {/* ══ CARDS TAB ══ */}
        {tab === "cards" && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }}>

            {/* Left — card list */}
            <div style={{ position: "sticky", top: 80 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 10 }}>Cards — {cards.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {cards.map((c, i) => (
                  <div key={c.id} onClick={() => { setActiveCard(c.id); setTimeout(() => document.getElementById(`term-${c.id}`)?.focus(), 30); }}
                    style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${activeCard === c.id ? "#1A1814" : "#ECEAE4"}`, background: activeCard === c.id ? "#1A1814" : "#fff", transition: "all 0.15s", position: "relative", overflow: "hidden" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: activeCard === c.id ? "rgba(247,246,242,0.4)" : "#A8A59E", marginBottom: 3 }}>#{i + 1}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: activeCard === c.id ? "#F7F6F2" : "#1A1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.term || <span style={{ opacity: 0.4 }}>Empty term</span>}
                    </div>
                    {c.definition && <div style={{ fontSize: 11, color: activeCard === c.id ? "rgba(247,246,242,0.5)" : "#8C8880", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>{c.definition}</div>}
                  </div>
                ))}
              </div>
              <button onClick={addCard} style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "1.5px dashed #D8D5CE", background: "none", fontSize: 13, fontWeight: 600, color: "#8C8880", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.color = "#1A1814"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.color = "#8C8880"; }}>
                + Add Card
              </button>
            </div>

            {/* Right — active card editor */}
            <div>
              {cards.map((c) => c.id === activeCard ? (
                <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ECEAE4", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.04)" }}>
                  {/* Card header */}
                  <div style={{ padding: "18px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#A8A59E", letterSpacing: 1, textTransform: "uppercase" }}>Card #{cards.findIndex(x => x.id === c.id) + 1}</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      {cards.findIndex(x => x.id === c.id) > 0 && (
                        <button onClick={() => { const i = cards.findIndex(x => x.id === c.id); setActiveCard(cards[i-1].id); }} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#8C8880" }}>↑ Prev</button>
                      )}
                      {cards.findIndex(x => x.id === c.id) < cards.length - 1 && (
                        <button onClick={() => { const i = cards.findIndex(x => x.id === c.id); setActiveCard(cards[i+1].id); }} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#8C8880" }}>↓ Next</button>
                      )}
                      {cards.length > 1 && (
                        <button onClick={() => removeCard(c.id)} style={{ background: "none", border: "1px solid #ECEAE4", borderRadius: 5, padding: "4px 10px", fontSize: 11, cursor: "pointer", color: "#E85D3F", transition: "all 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = "#E85D3F"} onMouseLeave={e => e.currentTarget.style.borderColor = "#ECEAE4"}>✕ Remove</button>
                      )}
                    </div>
                  </div>

                  {/* Term */}
                  <div style={{ padding: "16px 24px", borderBottom: "1px solid #F7F6F2" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", display: "block", marginBottom: 8 }}>Term</label>
                    <textarea id={`term-${c.id}`} value={c.term} onChange={e => updateCard(c.id, "term", e.target.value)} placeholder="Enter the term or question…"
                      style={{ width: "100%", minHeight: 90, padding: "12px 0", fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: "#1A1814", border: "none", outline: "none", resize: "none", background: "transparent", lineHeight: 1.4 }} />
                  </div>

                  {/* Definition */}
                  <div style={{ padding: "16px 24px" }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", display: "block", marginBottom: 8 }}>Definition</label>
                    <textarea value={c.definition} onChange={e => updateCard(c.id, "definition", e.target.value)} placeholder="Enter the definition or answer…"
                      style={{ width: "100%", minHeight: 120, padding: "12px 0", fontSize: 16, fontWeight: 400, fontFamily: "'DM Sans', sans-serif", color: "#3A3830", border: "none", outline: "none", resize: "none", background: "transparent", lineHeight: 1.7 }} />
                  </div>

                  {/* Footer hint */}
                  <div style={{ padding: "12px 24px", background: "#FAFAF8", borderTop: "1px solid #F0EDE8", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#C8C5BE" }}>Tab to jump between fields • Enter to add a new card</span>
                    <button onClick={addCard} style={{ background: "none", border: "none", fontSize: 12, fontWeight: 600, color: "#4F6EF7", cursor: "pointer", padding: 0 }}>+ Add next card →</button>
                  </div>
                </div>
              ) : null)}

              {/* Keyboard nav hint when no card selected — shouldn't happen but safety */}
              <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
                <span style={{ fontSize: 12, color: "#C8C5BE" }}>{filledCards} of {cards.length} cards filled</span>
              </div>
            </div>
          </div>
        )}

        {/* ══ DETAILS TAB ══ */}
        {tab === "details" && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>Deck Details</h3>
              <p style={{ fontSize: 14, color: "#8C8880" }}>Give your deck a name and a little context so you can find it easily later.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Title */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Deck Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Real Estate Principles — Chapter 3"
                  style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #ECEAE4", borderRadius: 9, fontSize: 16, fontWeight: 600, color: "#1A1814", fontFamily: "'DM Sans', sans-serif", outline: "none", background: "#fff", transition: "border-color 0.18s" }}
                  onFocus={e => e.target.style.borderColor = "#1A1814"} onBlur={e => e.target.style.borderColor = "#ECEAE4"} />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Description <span style={{ fontWeight: 400, textTransform: "none", color: "#A8A59E" }}>(optional)</span></label>
                <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="What does this deck cover? Any tips for studying it?"
                  style={{ width: "100%", padding: "13px 16px", border: "1.5px solid #ECEAE4", borderRadius: 9, fontSize: 14, color: "#3A3830", fontFamily: "'DM Sans', sans-serif", outline: "none", resize: "vertical", minHeight: 100, lineHeight: 1.6, background: "#fff", transition: "border-color 0.18s" }}
                  onFocus={e => e.target.style.borderColor = "#1A1814"} onBlur={e => e.target.style.borderColor = "#ECEAE4"} />
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Subject</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SUBJECTS.map(s => (
                    <button key={s} onClick={() => setSubject(s === subject ? "" : s)}
                      style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${subject === s ? "#1A1814" : "#ECEAE4"}`, background: subject === s ? "#1A1814" : "#fff", fontSize: 13, fontWeight: subject === s ? 700 : 400, color: subject === s ? "#F7F6F2" : "#5A5752", cursor: "pointer", transition: "all 0.15s" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>Deck Color</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: c, border: `3px solid ${color === c ? "#1A1814" : "transparent"}`, outline: color === c ? `2px solid ${c}` : "none", outlineOffset: 2, cursor: "pointer", transition: "all 0.15s" }} />
                  ))}
                </div>
              </div>

              {/* Preview card */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 10 }}>Preview</label>
                <div style={{ background: "#fff", border: "1.5px solid #ECEAE4", borderTop: `3px solid ${color}`, borderRadius: 10, padding: "20px 22px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: color, marginBottom: 6 }}>{subject || "No subject"}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#1A1814", marginBottom: 8 }}>{title || "Untitled Deck"}</div>
                  {description && <div style={{ fontSize: 12, color: "#8C8880", lineHeight: 1.5 }}>{description}</div>}
                  <div style={{ marginTop: 14, height: 3, background: "#ECEAE4", borderRadius: 2 }}><div style={{ height: "100%", width: "0%", background: color, borderRadius: 2 }} /></div>
                  <div style={{ fontSize: 11, color: "#A8A59E", marginTop: 6 }}>{filledCards} card{filledCards !== 1 ? "s" : ""} · 0% mastery</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ORGANIZE TAB ══ */}
        {tab === "organize" && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800, color: "#1A1814", marginBottom: 6 }}>Organize</h3>
              <p style={{ fontSize: 14, color: "#8C8880" }}>Place this deck in your folder structure. Totally optional — you can always do it later.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(ORG_OPTIONS).map(([level, options], i) => {
                const prevLevel = Object.keys(ORG_OPTIONS)[i - 1];
                const isLocked = i > 0 && !orgPath[prevLevel];
                return (
                  <div key={level} style={{ opacity: isLocked ? 0.4 : 1, transition: "opacity 0.2s" }}>
                    <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#5A5752", display: "block", marginBottom: 8 }}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                      {isLocked && <span style={{ fontWeight: 400, textTransform: "none", color: "#A8A59E", marginLeft: 8 }}>— pick {prevLevel} first</span>}
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {options.map(opt => (
                        <button key={opt} disabled={isLocked} onClick={() => setOrgPath(p => ({ ...p, [level]: opt === p[level] ? "" : opt }))}
                          style={{ padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${orgPath[level] === opt ? "#1A1814" : "#ECEAE4"}`, background: orgPath[level] === opt ? "#1A1814" : "#fff", fontSize: 13, fontWeight: orgPath[level] === opt ? 700 : 400, color: orgPath[level] === opt ? "#F7F6F2" : "#5A5752", cursor: isLocked ? "default" : "pointer", transition: "all 0.15s" }}>
                          {opt}
                        </button>
                      ))}
                      <button disabled={isLocked} onClick={() => {}} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px dashed #D8D5CE", background: "none", fontSize: 13, color: "#A8A59E", cursor: isLocked ? "default" : "pointer" }}>+ New</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Path summary */}
            {orgPath.year && (
              <div style={{ marginTop: 32, padding: "18px 20px", background: "#fff", borderRadius: 10, border: "1.5px solid #ECEAE4" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#A8A59E", marginBottom: 12 }}>Folder Path</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                  {["year","semester","class","chapter"].filter(k => orgPath[k]).map((k, i, arr) => (
                    <span key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ background: "#F7F6F2", border: "1px solid #ECEAE4", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#3A3830" }}>{orgPath[k]}</span>
                      {i < arr.length - 1 && <span style={{ color: "#D8D5CE", fontSize: 14 }}>›</span>}
                    </span>
                  ))}
                  <span style={{ color: "#D8D5CE", fontSize: 14 }}>›</span>
                  <span style={{ background: "#1A1814", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#F7F6F2" }}>{title || "This Deck"}</span>
                </div>
              </div>
            )}

            {!orgPath.year && (
              <div style={{ marginTop: 32, padding: "28px", background: "#fff", borderRadius: 10, border: "1.5px dashed #D8D5CE", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#8C8880", marginBottom: 4 }}>No folder selected</div>
                <div style={{ fontSize: 12, color: "#A8A59E" }}>This deck will be saved as Uncategorized. You can organize it any time from your Library.</div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ── Library View (hierarchical) ───────────────────────────────────────────────
function FCLibraryView({ allDecks, onOpenDeck, onStartStudy, onNewDeck }) {
  const [folderPath, setFolderPath]     = useState([]);
  const [searchQuery, setSearchQuery]   = useState("");
  const [showOrganize, setShowOrganize] = useState(false); // kept for potential future use
  const [treeExpanded, setTreeExpanded] = useState({ y2025: true, fall25: true });

  const currentNode     = folderPath.length > 0 ? fcFindNode(FC_TREE, folderPath[folderPath.length - 1]) : null;
  const currentChildren = currentNode ? (currentNode.children || []) : FC_TREE;
  const currentDeckIds  = currentNode?.deckIds || [];
  const currentDecks    = allDecks.filter(d => currentDeckIds.includes(d.id));

  const allIdsHere  = currentNode ? fcGetAllDeckIds(currentNode) : allDecks.map(d => d.id);
  const allHere     = allDecks.filter(d => allIdsHere.includes(d.id));

  const assignedIds    = new Set(fcGetAllDeckIds({ children: FC_TREE }));
  const unassigned     = allDecks.filter(d => !assignedIds.has(d.id));

  const searchResults  = searchQuery.trim()
    ? allDecks.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.subject.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const enterFolder  = (id) => setFolderPath(p => [...p, id]);
  const navToIndex   = (i)  => setFolderPath(p => p.slice(0, i + 1));
  const goRoot       = ()   => setFolderPath([]);
  const toggleTree   = (id) => setTreeExpanded(e => ({ ...e, [id]: !e[id] }));

  // Recursive left-panel tree renderer
  const renderTreeNode = (node, depth = 0) => {
    const expanded   = treeExpanded[node.id];
    const hasKids    = node.children?.length > 0;
    const isActive   = folderPath[folderPath.length - 1] === node.id;
    const meta       = FC_TYPE_META[node.type] || {};
    const deckCount  = fcGetAllDeckIds(node).length;
    return (
      <div key={node.id}>
        <div onClick={() => { if (hasKids) toggleTree(node.id); enterFolder(node.id); }}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: `7px 8px 7px ${8 + depth * 14}px`, borderRadius: 7, cursor: "pointer", background: isActive ? "#1A1814" : "transparent", transition: "background 0.15s", marginBottom: 1 }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#F7F6F2"; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ fontSize: 8, color: isActive ? "rgba(247,246,242,0.4)" : "#C8C5BE", width: 10, flexShrink: 0, display: "inline-block", transform: hasKids && expanded ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>{hasKids ? "▶" : " "}</span>
          <span style={{ fontSize: 11, flexShrink: 0 }}>{meta.icon}</span>
          <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? "#F7F6F2" : "#3A3830", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</span>
          <span style={{ fontSize: 10, color: isActive ? "rgba(247,246,242,0.35)" : "#C8C5BE", flexShrink: 0 }}>{deckCount}</span>
        </div>
        {hasKids && expanded && node.children.map(c => renderTreeNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>

      {/* ── LEFT TREE ─────────────────────────────────────────────────── */}
      <div style={{ width: 232, flexShrink: 0, background: "#fff", borderRight: "1px solid #ECEAE4", display: "flex", flexDirection: "column", position: "sticky", top: 60, height: "calc(100vh - 60px)", overflowY: "auto" }}>
        <div style={{ padding: "20px 10px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", padding: "0 8px", marginBottom: 10 }}>My Library</div>

          {/* Root */}
          <div onClick={goRoot} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 7, cursor: "pointer", background: folderPath.length === 0 ? "#1A1814" : "transparent", marginBottom: 6, transition: "background 0.15s" }}
            onMouseEnter={e => { if (folderPath.length > 0) e.currentTarget.style.background = "#F7F6F2"; }}
            onMouseLeave={e => { if (folderPath.length > 0) e.currentTarget.style.background = "transparent"; }}>
            <span style={{ fontSize: 13 }}>🗂</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: folderPath.length === 0 ? "#F7F6F2" : "#1A1814" }}>All Folders</span>
          </div>

          {/* Tree */}
          {FC_TREE.map(n => renderTreeNode(n, 0))}

          {/* Uncategorized */}
          {unassigned.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #ECEAE4" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", borderRadius: 7, cursor: "pointer" }}>
                <span style={{ fontSize: 11, width: 10 }} />
                <span style={{ fontSize: 11 }}>📎</span>
                <span style={{ fontSize: 12, color: "#8C8880" }}>Uncategorized ({unassigned.length})</span>
              </div>
            </div>
          )}
        </div>

        {/* New deck button */}
        <div style={{ padding: "12px 10px", marginTop: "auto", borderTop: "1px solid #ECEAE4" }}>
          <button onClick={onNewDeck} style={{ width: "100%", background: "none", border: "1.5px dashed #D8D5CE", borderRadius: 8, padding: "9px 12px", fontSize: 11, fontWeight: 600, color: "#8C8880", cursor: "pointer", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.color = "#1A1814"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.color = "#8C8880"; }}>
            + New Deck
          </button>
        </div>
      </div>

      {/* ── RIGHT CONTENT ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#A8A59E", pointerEvents: "none" }}>⌕</span>
          <input type="text" placeholder="Search all decks…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "11px 16px 11px 38px", border: "1px solid #D8D5CE", borderRadius: 10, fontSize: 14, background: "#fff", color: "#1A1814", outline: "none", fontFamily: "'DM Sans', sans-serif", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }} />
          {searchQuery && <span onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", fontSize: 13, color: "#A8A59E" }}>✕</span>}
        </div>

        {/* ── SEARCH RESULTS ── */}
        {searchQuery.trim() ? (
          <div>
            <div style={{ fontSize: 12, color: "#8C8880", marginBottom: 16 }}>{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "<strong>{searchQuery}</strong>"</div>
            {searchResults.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#8C8880" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>No decks match that search</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {searchResults.map((d, i) => <FCDeckCard key={d.id} deck={d} index={i} onOpen={onOpenDeck} onStudy={onStartStudy} />)}
              </div>
            )}
          </div>
        ) : (
          /* ── FOLDER VIEW ── */
          <div>
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              <span onClick={goRoot} style={{ fontSize: 13, color: folderPath.length === 0 ? "#1A1814" : "#8C8880", cursor: "pointer", fontWeight: folderPath.length === 0 ? 700 : 400 }}>All Folders</span>
              {folderPath.map((id, i) => {
                const n = fcFindNode(FC_TREE, id);
                if (!n) return null;
                const isLast = i === folderPath.length - 1;
                return (
                  <span key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#D8D5CE" }}>›</span>
                    <span onClick={() => navToIndex(i)} style={{ fontSize: 13, color: isLast ? "#1A1814" : "#8C8880", fontWeight: isLast ? 700 : 400, cursor: "pointer" }}>{n.label}</span>
                  </span>
                );
              })}
            </div>

            {/* Current folder header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                {currentNode ? (
                  <>
                    <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: currentNode.color, background: `${currentNode.color}18`, padding: "2px 10px", borderRadius: 20, marginBottom: 6 }}>{FC_TYPE_META[currentNode.type]?.label}</div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: "#1A1814", marginBottom: 4 }}>{currentNode.label}</h1>
                    <div style={{ fontSize: 12, color: "#8C8880" }}>{allHere.length} deck{allHere.length !== 1 ? "s" : ""} · {allHere.reduce((a, d) => a + d.cardCount, 0)} cards total</div>
                  </>
                ) : (
                  <>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: "#1A1814", marginBottom: 4 }}>All Folders</h1>
                    <div style={{ fontSize: 12, color: "#8C8880" }}>{allDecks.length} decks across {FC_TREE.length} year{FC_TREE.length !== 1 ? "s" : ""}</div>
                  </>
                )}
              </div>
              <button onClick={onNewDeck} className="fc-btn" style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.2s" }}>+ New Deck</button>
            </div>

            {/* Stats bar */}
            {allHere.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
                {[
                  { label: "Decks",      value: allHere.length },
                  { label: "Cards",      value: allHere.reduce((a, d) => a + d.cardCount, 0) },
                  { label: "Avg Mastery",value: `${Math.round(allHere.reduce((a, d) => a + d.mastery, 0) / allHere.length)}%` },
                  { label: "Mastered",   value: allHere.filter(d => d.mastery === 100).length },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: "#fff", border: "1px solid #ECEAE4", borderRadius: 10, padding: "12px 14px", flex: 1, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: "#1A1814" }}>{value}</div>
                    <div style={{ fontSize: 10, color: "#8C8880", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Subfolder grid */}
            {currentChildren.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 12 }}>Folders</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {currentChildren.map((child, i) => {
                    const childIds   = fcGetAllDeckIds(child);
                    const childDecks = allDecks.filter(d => childIds.includes(d.id));
                    const avgMastery = childDecks.length ? Math.round(childDecks.reduce((a, d) => a + d.mastery, 0) / childDecks.length) : 0;
                    const meta       = FC_TYPE_META[child.type] || {};
                    return (
                      <div key={child.id} className="fc-fade-up" style={{ animationDelay: `${i * 0.05}s`, background: "#fff", border: "1px solid #ECEAE4", borderLeft: `3px solid ${child.color}`, borderRadius: 10, padding: "16px 18px", cursor: "pointer", transition: "all 0.18s", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
                        onClick={() => enterFolder(child.id)}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.04)"; }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <span style={{ fontSize: 18 }}>{meta.icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: child.color, background: `${child.color}15`, padding: "2px 8px", borderRadius: 20 }}>{meta.label}</span>
                        </div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 800, color: "#1A1814", marginBottom: 6, lineHeight: 1.3 }}>{child.label}</div>
                        <div style={{ fontSize: 11, color: "#A8A59E", marginBottom: childIds.length > 0 ? 10 : 0 }}>
                          {childIds.length} deck{childIds.length !== 1 ? "s" : ""}
                          {child.children?.length ? ` · ${child.children.length} sub-folder${child.children.length !== 1 ? "s" : ""}` : ""}
                        </div>
                        {childIds.length > 0 && (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A8A59E", marginBottom: 4 }}>
                              <span>Mastery</span>
                              <span style={{ color: avgMastery === 100 ? "#2BAE7E" : "#1A1814", fontWeight: 600 }}>{avgMastery}%</span>
                            </div>
                            <div style={{ height: 3, background: "#ECEAE4", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${avgMastery}%`, background: avgMastery === 100 ? "#2BAE7E" : child.color, borderRadius: 2 }} />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {/* Add new folder */}
                  <div onClick={onNewDeck} style={{ border: "1.5px dashed #D8D5CE", borderRadius: 10, padding: "16px 18px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 100, transition: "all 0.18s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A1814"; e.currentTarget.style.background = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.background = "transparent"; }}>
                    <span style={{ fontSize: 20, color: "#D8D5CE" }}>+</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#A8A59E" }}>New Folder</span>
                  </div>
                </div>
              </div>
            )}

            {/* Decks at this node */}
            {currentDecks.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#A8A59E", marginBottom: 12 }}>Decks</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                  {currentDecks.map((d, i) => <FCDeckCard key={d.id} deck={d} index={i} onOpen={onOpenDeck} onStudy={onStartStudy} />)}
                </div>
              </div>
            )}

            {/* Empty state */}
            {currentChildren.length === 0 && currentDecks.length === 0 && (
              <div style={{ textAlign: "center", padding: "64px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>📂</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814", marginBottom: 8 }}>Empty folder</div>
                <div style={{ fontSize: 14, color: "#8C8880", marginBottom: 24 }}>Add your first deck to get started</div>
                <button onClick={onNewDeck} className="fc-btn" style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.2s" }}>+ Add Deck Here</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showOrganize && <FCOrganizeModal onClose={() => setShowOrganize(false)} allDecks={allDecks} tree={FC_TREE} />}
    </div>
  );
}

// ── Deck Card (shared) ────────────────────────────────────────────────────────
function FCDeckCard({ deck, index, onOpen, onStudy }) {
  return (
    <div className="fc-deck-card fc-fade-up" style={{ animationDelay: `${index * 0.06}s`, background: "#fff", border: "1px solid #ECEAE4", borderTop: `3px solid ${deck.color}`, borderRadius: 12, padding: "22px 22px 18px", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      onClick={() => onOpen(deck)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: deck.color, background: `${deck.color}18`, padding: "3px 10px", borderRadius: 20 }}>{deck.subject}</div>
        <span style={{ fontSize: 11, color: "#A8A59E" }}>{deck.cardCount} cards</span>
      </div>
      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 800, color: "#1A1814", marginBottom: 16, lineHeight: 1.3 }}>{deck.title}</h3>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A8A59E", marginBottom: 6 }}>
          <span>Mastery</span>
          <span style={{ color: deck.mastery === 100 ? "#2BAE7E" : "#1A1814", fontWeight: 600 }}>{deck.mastery}%</span>
        </div>
        <div style={{ height: 4, background: "#ECEAE4", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${deck.mastery}%`, background: deck.mastery === 100 ? "#2BAE7E" : deck.color, borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#A8A59E" }}>Last: {deck.lastStudied}</span>
        <button onClick={e => { e.stopPropagation(); onStudy(deck); }} style={{ background: "#1A1814", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.15s" }}
          onMouseEnter={e => e.target.style.opacity = "0.8"} onMouseLeave={e => e.target.style.opacity = "1"}>Study</button>
      </div>
    </div>
  );
}

// ── Deck View (overview + card list) ─────────────────────────────────────────
function FCDeckView({ deck, onBack, onStudy }) {
  const [previewCard, setPreviewCard] = useState(null);
  const [flipped, setFlipped]         = useState(false);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        <span onClick={onBack} className="fc-nav-link" style={{ fontSize: 13, color: "#8C8880", cursor: "pointer" }}>← My Library</span>
        <span style={{ color: "#D8D5CE" }}>/</span>
        <span style={{ fontSize: 13, color: "#1A1814", fontWeight: 500 }}>{deck.title}</span>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: deck.color, marginBottom: 8 }}>{deck.subject}</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, letterSpacing: -0.8, marginBottom: 10 }}>{deck.title}</h1>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 13, color: "#8C8880" }}>
            <span>{deck.cardCount} cards</span>
            <span>·</span>
            <span style={{ color: deck.mastery === 100 ? "#2BAE7E" : "#8C8880", fontWeight: deck.mastery === 100 ? 600 : 400 }}>{deck.mastery}% mastered</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "#fff", border: "1px solid #D8D5CE", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#5A5752" }}>Edit Deck</button>
          <button className="fc-btn" onClick={onStudy} style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.2s" }}>Study Now →</button>
        </div>
      </div>

      {/* Flip preview — appears when a card row is clicked */}
      {previewCard && (
        <div className="fc-fade-in" style={{ background: "#fff", border: "1px solid #ECEAE4", borderTop: `3px solid ${deck.color}`, borderRadius: 14, padding: "40px 36px", textAlign: "center", marginBottom: 24, cursor: "pointer", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}
          onClick={() => setFlipped(f => !f)}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: flipped ? deck.color : "#A8A59E", marginBottom: 18, transition: "color 0.3s" }}>{flipped ? "Definition" : "Term · tap to flip"}</div>
          <div style={{ fontFamily: flipped ? "'DM Sans', sans-serif" : "'Playfair Display', serif", fontSize: flipped ? 16 : 22, fontWeight: flipped ? 400 : 800, color: "#1A1814", lineHeight: 1.5, transition: "all 0.3s" }}>
            {flipped ? previewCard.definition : previewCard.term}
          </div>
        </div>
      )}

      {/* Mastery bar */}
      <div style={{ background: "#fff", border: "1px solid #ECEAE4", borderRadius: 10, padding: "18px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
          <span style={{ fontWeight: 600 }}>Overall Mastery</span>
          <span style={{ color: deck.color, fontWeight: 700 }}>{deck.mastery}%</span>
        </div>
        <div style={{ height: 6, background: "#ECEAE4", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${deck.mastery}%`, background: deck.mastery === 100 ? "#2BAE7E" : deck.color, borderRadius: 3 }} />
        </div>
      </div>

      {/* Card list */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#8C8880", marginBottom: 14 }}>All Cards</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {deck.cards.map((card, i) => (
          <div key={card.id} className="fc-fade-up" style={{ animationDelay: `${i * 0.04}s`, background: "#fff", border: "1px solid #ECEAE4", borderRadius: 10, padding: "18px 20px", display: "flex", gap: 20, alignItems: "flex-start", cursor: "pointer", transition: "all 0.18s" }}
            onClick={() => { setPreviewCard(card); setFlipped(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = deck.color; e.currentTarget.style.background = `${deck.color}06`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#ECEAE4"; e.currentTarget.style.background = "#fff"; }}>
            <div style={{ width: 28, height: 28, background: "#F7F6F2", borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#A8A59E" }}>{i + 1}</div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#A8A59E", marginBottom: 5 }}>Term</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#1A1814" }}>{card.term}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "#A8A59E", marginBottom: 5 }}>Definition</div>
                <div style={{ fontSize: 13, color: "#5A5752", lineHeight: 1.55, fontWeight: 300 }}>{card.definition}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Study Setup ───────────────────────────────────────────────────────────────
function FCStudySetup({ deck, onBack, onStart }) {
  const [mode, setMode]             = useState("all");      // all | pick | count | progressive
  const [selectedIds, setSelectedIds] = useState(new Set(deck.cards.map(c => c.id)));
  const [countVal, setCountVal]     = useState(Math.min(5, deck.cards.length));
  const [progStart, setProgStart]   = useState(Math.min(3, deck.cards.length));

  const toggleCard = (id) => setSelectedIds(s => {
    const n = new Set(s);
    if (n.has(id)) { if (n.size > 1) n.delete(id); }
    else n.add(id);
    return n;
  });

  const selectAll  = () => setSelectedIds(new Set(deck.cards.map(c => c.id)));
  const clearAll   = () => setSelectedIds(new Set([deck.cards[0].id]));

  const handleStart = () => {
    let cards;
    if      (mode === "all")         cards = deck.cards;
    else if (mode === "pick")        cards = deck.cards.filter(c => selectedIds.has(c.id));
    else if (mode === "count")       cards = deck.cards.slice(0, countVal);
    else                             cards = deck.cards; // progressive uses full pool
    onStart({ mode, cards, progStart: mode === "progressive" ? progStart : null });
  };

  const readyCount = mode === "all" ? deck.cards.length
    : mode === "pick" ? selectedIds.size
    : mode === "count" ? countVal
    : progStart;

  const MODES = [
    { id: "all",         icon: "▦",  label: "Full Deck",       desc: "Go through every card in order" },
    { id: "pick",        icon: "◎",  label: "Pick Cards",      desc: "Choose exactly which cards to study" },
    { id: "count",       icon: "◈",  label: "Study N Cards",   desc: "Pick a number and study a focused set" },
    { id: "progressive", icon: "✦",  label: "Progressive",     desc: "Start small, unlock one card at a time as you master each" },
  ];

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
      {/* Back */}
      <span onClick={onBack} className="fc-nav-link" style={{ fontSize: 13, color: "#8C8880", cursor: "pointer", display: "inline-block", marginBottom: 28 }}>← Back to Deck</span>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: deck.color, marginBottom: 6 }}>Study Session</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, color: "#1A1814", letterSpacing: -0.5, marginBottom: 6 }}>{deck.title}</h1>
        <div style={{ fontSize: 13, color: "#8C8880" }}>{deck.cards.length} cards available</div>
      </div>

      {/* Mode selector */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        {MODES.map(m => (
          <div key={m.id} onClick={() => setMode(m.id)} style={{ border: `2px solid ${mode === m.id ? deck.color : "#ECEAE4"}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", background: mode === m.id ? `${deck.color}08` : "#fff", transition: "all 0.18s" }}
            onMouseEnter={e => { if (mode !== m.id) { e.currentTarget.style.borderColor = "#D8D5CE"; e.currentTarget.style.background = "#F7F6F2"; } }}
            onMouseLeave={e => { if (mode !== m.id) { e.currentTarget.style.borderColor = "#ECEAE4"; e.currentTarget.style.background = "#fff"; } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 15, color: mode === m.id ? deck.color : "#A8A59E" }}>{m.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: mode === m.id ? "#1A1814" : "#5A5752" }}>{m.label}</span>
              {mode === m.id && <span style={{ marginLeft: "auto", fontSize: 11, color: deck.color, fontWeight: 700 }}>✓</span>}
            </div>
            <div style={{ fontSize: 11, color: "#8C8880", lineHeight: 1.5 }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Mode-specific controls */}
      <div className="fc-fade-in" style={{ background: "#fff", border: "1px solid #ECEAE4", borderRadius: 14, padding: "22px 22px 18px", marginBottom: 24 }}>

        {/* ── PICK MODE ── */}
        {mode === "pick" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1814" }}>Select cards to study</div>
              <div style={{ display: "flex", gap: 10 }}>
                <span onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, color: deck.color, cursor: "pointer" }}>Select all</span>
                <span style={{ color: "#D8D5CE" }}>·</span>
                <span onClick={clearAll} style={{ fontSize: 11, fontWeight: 600, color: "#8C8880", cursor: "pointer" }}>Clear</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {deck.cards.map((card, i) => {
                const on = selectedIds.has(card.id);
                return (
                  <div key={card.id} onClick={() => toggleCard(card.id)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${on ? deck.color : "#ECEAE4"}`, background: on ? `${deck.color}06` : "#F7F6F2", cursor: "pointer", transition: "all 0.15s" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${on ? deck.color : "#D8D5CE"}`, background: on ? deck.color : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                      {on && <span style={{ fontSize: 9, color: "#fff", fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1814", fontFamily: "'Playfair Display', serif", marginBottom: 2 }}>{card.term}</div>
                      <div style={{ fontSize: 11, color: "#8C8880", lineHeight: 1.4 }}>{card.definition.length > 80 ? card.definition.slice(0, 80) + "…" : card.definition}</div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#A8A59E", flexShrink: 0 }}>#{i + 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── COUNT MODE ── */}
        {mode === "count" && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1814", marginBottom: 18 }}>How many cards do you want to study?</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 52, fontWeight: 900, color: deck.color, minWidth: 60, textAlign: "center", lineHeight: 1 }}>{countVal}</span>
              <div style={{ flex: 1 }}>
                <input type="range" min={1} max={deck.cards.length} value={countVal} onChange={e => setCountVal(Number(e.target.value))} style={{ width: "100%", accentColor: deck.color, cursor: "pointer" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A8A59E", marginTop: 6 }}>
                  <span>1 card</span><span>{deck.cards.length} cards (full deck)</span>
                </div>
              </div>
            </div>
            {/* Preview chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {deck.cards.slice(0, countVal).map((card, i) => (
                <div key={card.id} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: i < countVal ? `${deck.color}18` : "#F7F6F2", color: i < countVal ? deck.color : "#A8A59E", fontWeight: 600, border: `1px solid ${i < countVal ? `${deck.color}30` : "#ECEAE4"}` }}>
                  {card.term}
                </div>
              ))}
              {deck.cards.length > countVal && <div style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "#F7F6F2", color: "#A8A59E" }}>+{deck.cards.length - countVal} not included</div>}
            </div>
          </div>
        )}

        {/* ── PROGRESSIVE MODE ── */}
        {mode === "progressive" && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1814", marginBottom: 6 }}>Progressive Unlock</div>
            <div style={{ fontSize: 12, color: "#6B6860", lineHeight: 1.6, marginBottom: 20 }}>
              Start with a small number of cards. Every time you mark <em>all active cards</em> as "Got It", a new card unlocks automatically. Keep going until you've mastered the full deck.
            </div>

            {/* Start count picker */}
            <div style={{ background: "#F7F6F2", borderRadius: 10, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#8C8880", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Start with how many cards?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 44, fontWeight: 900, color: deck.color, minWidth: 50, textAlign: "center", lineHeight: 1 }}>{progStart}</span>
                <div style={{ flex: 1 }}>
                  <input type="range" min={1} max={Math.min(deck.cards.length, 10)} value={progStart} onChange={e => setProgStart(Number(e.target.value))} style={{ width: "100%", accentColor: deck.color, cursor: "pointer" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A8A59E", marginTop: 5 }}>
                    <span>1</span><span>10 max</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual flow preview */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {Array.from({ length: Math.min(deck.cards.length, progStart + 3) }, (_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {i > 0 && <span style={{ fontSize: 10, color: "#D8D5CE" }}>→</span>}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: i < progStart ? deck.color : "#ECEAE4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: i < progStart ? "#fff" : "#A8A59E", border: i >= progStart && i < progStart + 3 ? "1.5px dashed #D8D5CE" : "none" }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 8, color: i < progStart ? deck.color : "#C8C5BE", marginTop: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{i < progStart ? "Start" : "Unlock"}</div>
                  </div>
                </div>
              ))}
              {deck.cards.length > progStart + 3 && <span style={{ fontSize: 11, color: "#A8A59E" }}>…+{deck.cards.length - progStart - 3} more</span>}
            </div>
          </div>
        )}

        {/* ── ALL MODE ── */}
        {mode === "all" && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1A1814", marginBottom: 10 }}>All {deck.cards.length} cards, in order</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {deck.cards.map((card, i) => (
                <div key={card.id} style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: `${deck.color}15`, color: deck.color, fontWeight: 600, border: `1px solid ${deck.color}28` }}>{card.term}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start CTA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: "#8C8880" }}>
          {mode === "progressive"
            ? `Starting with ${progStart} card${progStart !== 1 ? "s" : ""} — unlocking from ${deck.cards.length} total`
            : `${readyCount} card${readyCount !== 1 ? "s" : ""} selected`}
        </div>
        <button onClick={handleStart} className="fc-btn" style={{ background: "#1A1814", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.2s" }}>
          Start Studying →
        </button>
      </div>
    </div>
  );
}

// ── Study View ────────────────────────────────────────────────────────────────
function FCStudyView({ deck, config, onBack, onBackToLibrary }) {
  const { mode, cards: configCards, progStart } = config;

  // Progressive state — active window grows as cards are mastered
  const [activeCount, setActiveCount] = useState(mode === "progressive" ? progStart : configCards.length);
  const [unlockAnim,  setUnlockAnim]  = useState(false);

  const allCards   = configCards;                           // full pool for this session
  const cards      = allCards.slice(0, activeCount);        // currently active window
  const lockedLeft = allCards.length - activeCount;         // how many still locked

  const [index, setIndex]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown]     = useState(new Set());
  const [done, setDone]       = useState(false);

  const card     = cards[index];
  const progress = Math.round(((index) / cards.length) * 100);
  const allKnown = cards.every(c => known.has(c.id));

  // When all active cards are known in progressive mode → unlock next
  useEffect(() => {
    if (mode !== "progressive" || !allKnown || activeCount >= allCards.length) return;
    setUnlockAnim(true);
    const t = setTimeout(() => {
      setActiveCount(n => Math.min(n + 1, allCards.length));
      setKnown(new Set());       // reset known for the new round
      setIndex(0);
      setFlipped(false);
      setUnlockAnim(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [allKnown, mode]);

  const advance = (currentKnown) => {
    if (index + 1 >= cards.length) { setDone(true); }
    else { setIndex(i => i + 1); setFlipped(false); }
  };
  const markKnown    = () => { const n = new Set(known); n.add(card.id); setKnown(n); advance(n); };
  const markLearning = () => advance(known);
  const restart      = () => { setIndex(0); setFlipped(false); setKnown(new Set()); setDone(false); setActiveCount(mode === "progressive" ? progStart : configCards.length); };

  // ── UNLOCK TOAST ──
  if (unlockAnim) {
    const newCard = allCards[activeCount];
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div className="fc-fade-in" style={{ background: "#fff", border: `2px solid ${deck.color}`, borderRadius: 20, padding: "48px 40px", boxShadow: `0 0 60px ${deck.color}30` }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔓</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 900, color: "#1A1814", marginBottom: 8 }}>New Card Unlocked!</div>
          <div style={{ fontSize: 14, color: "#6B6860", marginBottom: 20 }}>You mastered all active cards. Adding:</div>
          <div style={{ background: `${deck.color}12`, border: `1.5px solid ${deck.color}30`, borderRadius: 10, padding: "14px 20px", display: "inline-block" }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#1A1814" }}>{newCard?.term}</div>
          </div>
          <div style={{ marginTop: 20, fontSize: 12, color: "#A8A59E" }}>New round starting…</div>
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ──
  if (done) {
    const masteredAll = mode === "progressive" ? activeCount >= allCards.length : known.size === cards.length;
    const pct = Math.round((known.size / cards.length) * 100);
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>{masteredAll ? "🎉" : "📚"}</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, marginBottom: 12, color: "#1A1814" }}>
          {masteredAll ? "Session Complete!" : "Round Complete"}
        </h2>
        <p style={{ fontSize: 15, color: "#6B6860", lineHeight: 1.6, marginBottom: 8 }}>
          You marked <strong>{known.size}</strong> of <strong>{cards.length}</strong> cards as known.
        </p>
        {mode === "progressive" && lockedLeft > 0 && (
          <p style={{ fontSize: 13, color: "#8C8880", marginBottom: 8 }}>{lockedLeft} card{lockedLeft !== 1 ? "s" : ""} still locked — keep going to unlock them!</p>
        )}
        {known.size < cards.length && mode !== "progressive" && (
          <p style={{ fontSize: 14, color: "#8C8880", marginBottom: 8 }}>{cards.length - known.size} still need more practice.</p>
        )}
        <div style={{ background: "#ECEAE4", borderRadius: 4, height: 8, margin: "20px 0 32px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: masteredAll ? "#2BAE7E" : deck.color, borderRadius: 4, transition: "width 1s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button className="fc-btn" onClick={restart} style={{ background: "#1A1814", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.2s" }}>Study Again</button>
          <button onClick={onBack} style={{ background: "#fff", border: "1px solid #D8D5CE", borderRadius: 8, padding: "12px 24px", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#5A5752" }}>Change Setup</button>
        </div>
      </div>
    );
  }

  // ── MAIN CARD ──
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "40px 24px" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span onClick={onBack} className="fc-nav-link" style={{ fontSize: 13, color: "#8C8880", cursor: "pointer" }}>← Exit</span>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1814" }}>{deck.title}</div>
          <div style={{ fontSize: 12, color: "#A8A59E", marginTop: 2 }}>
            {index + 1} / {cards.length}
            {mode === "progressive" && lockedLeft > 0 && <span style={{ color: "#D8D5CE" }}> · 🔒{lockedLeft} locked</span>}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#2BAE7E", fontWeight: 600 }}>{known.size} known ✓</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "#ECEAE4", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: deck.color, borderRadius: 2, transition: "width 0.4s ease" }} />
      </div>

      {/* Progressive: overall unlock bar */}
      {mode === "progressive" && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#A8A59E", marginBottom: 5 }}>
            <span style={{ fontWeight: 600, color: deck.color }}>Overall unlock progress</span>
            <span>{activeCount} / {allCards.length} unlocked</span>
          </div>
          <div style={{ height: 3, background: "#ECEAE4", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((activeCount / allCards.length) * 100)}%`, background: `linear-gradient(90deg, ${deck.color}, #2BAE7E)`, borderRadius: 2, transition: "width 0.6s ease" }} />
          </div>
        </div>
      )}

      {/* Flip card */}
      <div onClick={() => setFlipped(f => !f)} style={{ background: "#fff", border: "1px solid #ECEAE4", borderTop: `4px solid ${deck.color}`, borderRadius: 16, padding: "56px 44px", textAlign: "center", cursor: "pointer", minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 32px rgba(0,0,0,0.06)", transition: "box-shadow 0.2s", marginBottom: 24 }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 40px rgba(0,0,0,0.1)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 32px rgba(0,0,0,0.06)"}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: flipped ? deck.color : "#A8A59E", marginBottom: 24, transition: "color 0.3s" }}>
          {flipped ? "Definition" : "Term · click to reveal"}
        </div>
        <div style={{ fontFamily: flipped ? "'DM Sans', sans-serif" : "'Playfair Display', serif", fontSize: flipped ? 17 : 26, fontWeight: flipped ? 400 : 800, color: "#1A1814", lineHeight: 1.5, maxWidth: 480, transition: "all 0.2s" }}>
          {flipped ? card.definition : card.term}
        </div>
      </div>

      {/* Action buttons */}
      {flipped ? (
        <div className="fc-fade-in" style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={markLearning} style={{ flex: 1, maxWidth: 200, background: "#fff", border: "2px solid #E85D3F", borderRadius: 10, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#E85D3F", transition: "all 0.18s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#E85D3F"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#E85D3F"; }}>
            Still Learning
          </button>
          <button onClick={markKnown} style={{ flex: 1, maxWidth: 200, background: "#2BAE7E", border: "2px solid #2BAE7E", borderRadius: 10, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#fff", transition: "all 0.18s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            Got It ✓
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <button onClick={() => setFlipped(true)} className="fc-btn" style={{ background: "#1A1814", border: "none", borderRadius: 10, padding: "13px 36px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#F7F6F2", transition: "all 0.2s" }}>
            Reveal Answer
          </button>
        </div>
      )}

      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 32, flexWrap: "wrap" }}>
        {cards.map((c, i) => (
          <div key={i} onClick={() => { setIndex(i); setFlipped(false); }} style={{ width: i === index ? 20 : 6, height: 6, borderRadius: 3, background: known.has(c.id) ? "#2BAE7E" : i === index ? deck.color : "#ECEAE4", cursor: "pointer", transition: "all 0.25s" }} />
        ))}
        {mode === "progressive" && lockedLeft > 0 && Array.from({ length: Math.min(lockedLeft, 6) }, (_, i) => (
          <div key={`lock-${i}`} style={{ width: 6, height: 6, borderRadius: 3, background: "#ECEAE4", opacity: 0.4 }} />
        ))}
        {mode === "progressive" && lockedLeft > 6 && <span style={{ fontSize: 10, color: "#C8C5BE" }}>+{lockedLeft - 6}</span>}
      </div>
    </div>
  );
}


// ─── Auth Modal ──────────────────────────────────────────────────────────────
function AuthModal({ onClose, onAuth, initialMode = "login" }) {
  const [mode, setMode]             = useState(initialMode); // login | signup
  const [step, setStep]             = useState("form");      // form | success
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);

  const switchMode = (m) => { setMode(m); setErrors({}); setPassword(""); setConfirm(""); };

  const passStrength = (p) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)             s++;
    if (/[A-Z]/.test(p))           s++;
    if (/[0-9]/.test(p))           s++;
    if (/[^A-Za-z0-9]/.test(p))   s++;
    return s;
  };
  const strength = passStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#E85D3F", "#F5C842", "#4F6EF7", "#2BAE7E"][strength];

  const validate = () => {
    const e = {};
    if (mode === "signup" && !name.trim())      e.name     = "Name is required";
    if (!email.trim())                          e.email    = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email))      e.email    = "Enter a valid email";
    if (!password)                              e.password = "Password is required";
    else if (password.length < 8)              e.password = "At least 8 characters";
    if (mode === "signup" && password !== confirm) e.confirm = "Passwords don't match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("success");
      setTimeout(() => {
        onAuth({ name: name || email.split("@")[0], email, avatar: (name || email)[0].toUpperCase() });
      }, 1400);
    }, 900);
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "12px 14px",
    border: `1.5px solid ${errors[field] ? "#E85D3F" : "#E8E5E0"}`,
    borderRadius: 8, fontSize: 14, color: "#1A1814", outline: "none",
    fontFamily: "'DM Sans', sans-serif", background: "#FAFAF8",
    transition: "border-color 0.18s",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,8,24,0.75)", backdropFilter: "blur(8px)" }} />

      {/* Modal card */}
      <div style={{ position: "relative", width: "100%", maxWidth: 860, display: "flex", borderRadius: 20, overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)", animation: "modalIn 0.32s cubic-bezier(0.16,1,0.3,1) forwards" }}>

        {/* ── LEFT — Brand panel ── */}
        <div style={{ width: 340, flexShrink: 0, background: "linear-gradient(160deg, #0D0B20 0%, #060412 100%)", padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          {/* BG glow */}
          <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(155,127,255,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -60, right: -60, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,200,66,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

          {/* Logo */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F5C842", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 900, color: "#1A1814" }}>A</span>
              </div>
              <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 15, fontWeight: 800, color: "#F7F6F2", letterSpacing: 1 }}>ACE IT</span>
            </div>

            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, color: "#F7F6F2", lineHeight: 1.2, marginBottom: 16 }}>
              {mode === "login" ? "Welcome back." : "Start your journey."}
            </h2>
            <p style={{ fontSize: 14, color: "rgba(247,246,242,0.45)", lineHeight: 1.7, fontWeight: 300 }}>
              {mode === "login"
                ? "Sign in to access your Galaxy, flashcard decks, and study tools."
                : "Create a free account and start mastering your subjects today."}
            </p>
          </div>

          {/* Floating card decoration */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderTop: "2px solid #C8B8FF", borderRadius: 12, padding: "18px 20px", marginBottom: 10 }}>
              <div style={{ fontSize: 10, color: "rgba(200,184,255,0.7)", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Flash Cards</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 800, color: "#F7F6F2", marginBottom: 6 }}>Real Estate Principles</div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}><div style={{ height: "100%", width: "65%", background: "#C8B8FF", borderRadius: 2 }} /></div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginLeft: 20 }}>
              <span style={{ fontSize: 16 }}>🔓</span>
              <span style={{ fontSize: 12, color: "rgba(247,246,242,0.4)" }}>New card unlocked! <span style={{ color: "#2BAE7E", fontWeight: 600 }}>Escrow</span></span>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ fontSize: 11, color: "rgba(247,246,242,0.2)", letterSpacing: 1 }}>© 2026 Ace It Galaxy</div>
        </div>

        {/* ── RIGHT — Form panel ── */}
        <div style={{ flex: 1, background: "#fff", padding: "48px 44px", display: "flex", flexDirection: "column", position: "relative" }}>
          {/* Close */}
          <button onClick={onClose} style={{ position: "absolute", top: 18, right: 18, background: "#F7F6F2", border: "none", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 13, color: "#8C8880", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "#ECEAE4"; e.currentTarget.style.color = "#1A1814"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#F7F6F2"; e.currentTarget.style.color = "#8C8880"; }}>✕</button>

          {/* Success screen */}
          {step === "success" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#2BAE7E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 24, boxShadow: "0 0 0 8px #2BAE7E18" }}>✓</div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 900, color: "#1A1814", marginBottom: 10 }}>
                {mode === "login" ? "Welcome back!" : "Account created!"}
              </h3>
              <p style={{ fontSize: 14, color: "#8C8880" }}>Taking you in…</p>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div style={{ display: "flex", background: "#F7F6F2", borderRadius: 10, padding: 4, marginBottom: 32, gap: 4 }}>
                {[["login", "Sign In"], ["signup", "Create Account"]].map(([m, label]) => (
                  <button key={m} onClick={() => switchMode(m)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#1A1814" : "#8C8880", boxShadow: mode === m ? "0 1px 6px rgba(0,0,0,0.08)" : "none" }}>{label}</button>
                ))}
              </div>

              {/* Social buttons */}
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                {[["G", "Continue with Google", "#fff", "#3A3830", "#E8E5E0"], ["", "Continue with Apple", "#1A1814", "#F7F6F2", "#1A1814"]].map(([icon, label, bg, color, border]) => (
                  <button key={label} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 8, border: `1.5px solid ${border}`, background: bg, color, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    <span style={{ fontSize: 14, fontWeight: 900 }}>{icon || "🍎"}</span> {label}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ flex: 1, height: 1, background: "#ECEAE4" }} />
                <span style={{ fontSize: 11, color: "#A8A59E", fontWeight: 500 }}>or continue with email</span>
                <div style={{ flex: 1, height: 1, background: "#ECEAE4" }} />
              </div>

              {/* Fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                {mode === "signup" && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5A5752", display: "block", marginBottom: 6, letterSpacing: 0.3 }}>Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Larry Johnson" style={inputStyle("name")}
                      onFocus={e => e.target.style.borderColor = "#4F6EF7"} onBlur={e => e.target.style.borderColor = errors.name ? "#E85D3F" : "#E8E5E0"} />
                    {errors.name && <div style={{ fontSize: 11, color: "#E85D3F", marginTop: 4 }}>{errors.name}</div>}
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#5A5752", display: "block", marginBottom: 6, letterSpacing: 0.3 }}>Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle("email")}
                    onFocus={e => e.target.style.borderColor = "#4F6EF7"} onBlur={e => e.target.style.borderColor = errors.email ? "#E85D3F" : "#E8E5E0"} />
                  {errors.email && <div style={{ fontSize: 11, color: "#E85D3F", marginTop: 4 }}>{errors.email}</div>}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5A5752", letterSpacing: 0.3 }}>Password</label>
                    {mode === "login" && <span style={{ fontSize: 11, color: "#4F6EF7", cursor: "pointer", fontWeight: 600 }}>Forgot password?</span>}
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"} style={{ ...inputStyle("password"), paddingRight: 42 }}
                      onFocus={e => e.target.style.borderColor = "#4F6EF7"} onBlur={e => e.target.style.borderColor = errors.password ? "#E85D3F" : "#E8E5E0"} />
                    <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#A8A59E", padding: 2 }}>{showPass ? "🙈" : "👁"}</button>
                  </div>
                  {errors.password && <div style={{ fontSize: 11, color: "#E85D3F", marginTop: 4 }}>{errors.password}</div>}
                  {mode === "signup" && password && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
                        {[1,2,3,4].map(i => <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColor : "#ECEAE4", transition: "background 0.3s" }} />)}
                      </div>
                      <span style={{ fontSize: 10, color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                    </div>
                  )}
                </div>
                {mode === "signup" && (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#5A5752", display: "block", marginBottom: 6, letterSpacing: 0.3 }}>Confirm Password</label>
                    <div style={{ position: "relative" }}>
                      <input type={showConf ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" style={{ ...inputStyle("confirm"), paddingRight: 42 }}
                        onFocus={e => e.target.style.borderColor = "#4F6EF7"} onBlur={e => e.target.style.borderColor = errors.confirm ? "#E85D3F" : "#E8E5E0"} />
                      <button onClick={() => setShowConf(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#A8A59E", padding: 2 }}>{showConf ? "🙈" : "👁"}</button>
                    </div>
                    {errors.confirm && <div style={{ fontSize: 11, color: "#E85D3F", marginTop: 4 }}>{errors.confirm}</div>}
                  </div>
                )}
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "13px 0", borderRadius: 9, border: "none", background: "#1A1814", color: "#F7F6F2", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", letterSpacing: 0.5, transition: "all 0.2s", opacity: loading ? 0.7 : 1, marginBottom: 18 }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.86"; }}
                onMouseLeave={e => e.currentTarget.style.opacity = loading ? "0.7" : "1"}>
                {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
              </button>

              {mode === "signup" && (
                <p style={{ fontSize: 11, color: "#A8A59E", textAlign: "center", lineHeight: 1.6 }}>
                  By creating an account you agree to our <span style={{ color: "#4F6EF7", cursor: "pointer" }}>Terms</span> and <span style={{ color: "#4F6EF7", cursor: "pointer" }}>Privacy Policy</span>.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AceItGalaxy ─────────────────────────────────────────────────────────────
export default function AceItGalaxy() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePlanet, setActivePlanet] = useState(null);
  const [currentApp, setCurrentApp] = useState(null);
  const [user, setUser]       = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const openAuth  = (mode = "login") => { setAuthMode(mode); setShowAuth(true); };
  const handleAuth = (userData) => { setUser(userData); setShowAuth(false); };
  const handleLogout = () => setUser(null);

  if (currentApp === 'flashcards') return <FlashCardsApp user={user} openAuth={openAuth} onLogout={handleLogout} onBack={() => setCurrentApp(null)} />;
  if (currentApp && currentApp !== 'flashcards') {
    const planet = PLANETS.find(p => p.appId === currentApp);
    return <AppLanding planet={planet} onBack={() => setCurrentApp(null)} />;
  }

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "radial-gradient(ellipse at 48% 52%, #0a0818 0%, #060410 45%, #020208 100%)",
      overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes starPulse { 0% { opacity: var(--lo, 0.1); } 100% { opacity: var(--hi, 0.6); } }
        @keyframes coronaPulse { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.04); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:translate(-50%,-48%) scale(0.96); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Subtle deep nebula atmosphere */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background: "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(80,50,160,0.06) 0%, transparent 70%)" }} />
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background: "radial-gradient(ellipse 60% 50% at 80% 80%, rgba(30,80,160,0.05) 0%, transparent 70%)" }} />

      <Stars />

      {/* Header bar — minimal, professional */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 400,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 28px",
        background: "linear-gradient(to bottom, rgba(2,2,8,0.9) 0%, transparent 100%)",
        animation: "fadeUp 0.8s ease 0.2s both",
      }}>
        {/* Menu button */}
        <button onClick={() => setSidebarOpen(prev => !prev)} style={{
          background: "none", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 4, width: 38, height: 38, cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4.5,
          transition: "all 0.2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(245,217,106,0.4)"; e.currentTarget.style.background = "rgba(245,217,106,0.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "none"; }}
        >
          <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
          <div style={{ width: 12, height: 1, background: "rgba(255,255,255,0.4)", borderRadius: 1 }} />
          <div style={{ width: 16, height: 1, background: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
        </button>

        {/* Center brand */}
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 1, height: 16, background: "rgba(245,217,106,0.25)" }} />
          <span style={{
            fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 700,
            color: "rgba(245,217,106,0.7)", letterSpacing: 5, textTransform: "uppercase",
          }}>Ace It Galaxy</span>
          <div style={{ width: 1, height: 16, background: "rgba(245,217,106,0.25)" }} />
        </div>

        {/* Right — auth */}
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 600, color: "rgba(245,217,106,0.9)" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>Free Plan</div>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #9B7FFF, #F5D96A)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 800, color: "#1A1814", cursor: "pointer" }}
              onClick={() => setSidebarOpen(true)}>
              {user.avatar}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openAuth("login")} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 20px", background: "transparent", border: "1px solid rgba(245,217,106,0.35)", borderRadius: 4, color: "rgba(245,217,106,0.8)", cursor: "pointer", transition: "all 0.2s ease" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,217,106,0.1)"; e.currentTarget.style.borderColor = "rgba(245,217,106,0.7)"; e.currentTarget.style.color = "#F5D96A"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "rgba(245,217,106,0.35)"; e.currentTarget.style.color = "rgba(245,217,106,0.8)"; }}>
              Log In
            </button>
            <button onClick={() => openAuth("signup")} style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", padding: "8px 20px", background: "#F5D96A", border: "none", borderRadius: 4, color: "rgba(0,0,0,0.8)", cursor: "pointer", transition: "all 0.2s ease" }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}>
              Sign Up
            </button>
          </div>
        )}
      </div>

      {/* Galaxy scene */}
      <div style={{ position: "absolute", inset: 0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Sun />
        {PLANETS.map((planet) => (
          <Planet key={planet.id} planet={planet} onClick={setActivePlanet} isActive={activePlanet?.id === planet.id} />
        ))}
      </div>

      {/* Planet detail modal — architectural, not card-like */}
      {activePlanet && (
        <div style={{
          position: "fixed", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 500,
          width: 320,
          background: "rgba(6,4,16,0.95)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderTop: `2px solid ${activePlanet.color}`,
          padding: "32px 32px 28px",
          backdropFilter: "blur(24px)",
          boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.6), 0 0 80px ${activePlanet.glow}18`,
          animation: "modalIn 0.28s cubic-bezier(0.16,1,0.3,1) forwards",
        }}>
          {/* Close */}
          <button onClick={() => setActivePlanet(null)} style={{
            position: "absolute", top: 14, right: 14,
            background: "none", border: "none", color: "rgba(255,255,255,0.25)",
            cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 4,
            transition: "color 0.15s",
          }}
            onMouseEnter={(e) => e.target.style.color = "rgba(255,255,255,0.7)"}
            onMouseLeave={(e) => e.target.style.color = "rgba(255,255,255,0.25)"}
          >✕</button>

          {/* Symbol */}
          <div style={{ marginBottom: 20 }}>
            <span style={{
              fontFamily: "'Montserrat', sans-serif", fontSize: 36,
              color: activePlanet.color,
              textShadow: `0 0 20px ${activePlanet.glow}`,
              display: "block", lineHeight: 1,
            }}>{activePlanet.symbol}</span>
          </div>

          {/* App label */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 600,
            color: activePlanet.color, letterSpacing: 3, textTransform: "uppercase",
            marginBottom: 6, opacity: 0.8,
          }}>Application</div>

          {/* Name */}
          <div style={{
            fontFamily: "'Montserrat', sans-serif", fontSize: 22, fontWeight: 700,
            color: "#ffffff", letterSpacing: 0.5, marginBottom: 8, lineHeight: 1.2,
          }}>{activePlanet.name}</div>

          {/* Desc */}
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
            color: "rgba(255,255,255,0.42)", marginBottom: 28, lineHeight: 1.6,
          }}>{activePlanet.desc}</div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 22 }} />

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setActivePlanet(null)} style={{
              flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
              padding: "11px 0", borderRadius: 3,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.45)",
              cursor: "pointer", letterSpacing: 1.5, textTransform: "uppercase",
              transition: "all 0.18s",
            }}
              onMouseEnter={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.22)"; e.target.style.color = "rgba(255,255,255,0.75)"; }}
              onMouseLeave={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.color = "rgba(255,255,255,0.45)"; }}
            >Dismiss</button>
            <button
              onClick={() => {
                if (activePlanet.appId) { setCurrentApp(activePlanet.appId); setActivePlanet(null); }
              }}
              style={{
              flex: 2, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
              padding: "11px 0", borderRadius: 3,
              border: "none",
              background: activePlanet.color,
              color: "rgba(0,0,0,0.85)",
              cursor: "pointer", letterSpacing: 1.5, textTransform: "uppercase",
              transition: "all 0.18s",
              boxShadow: `0 4px 24px ${activePlanet.glow}44`,
            }}
              onMouseEnter={(e) => { e.target.style.opacity = "0.88"; e.target.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.target.style.opacity = "1"; e.target.style.transform = "none"; }}
            >Launch →</button>
          </div>
        </div>
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        planets={PLANETS}
        onSelect={(p) => { setActivePlanet(p); setSidebarOpen(false); }}
        activePlanet={activePlanet}
        user={user}
        openAuth={openAuth}
        onLogout={handleLogout}
      />

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onAuth={handleAuth} initialMode={authMode} />}
    </div>
  );
}
