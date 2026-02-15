import { useState, useEffect } from "react";

const domains = [
    { id: "unisonai", label: "UnisonAI", color: "#FF6B6B", bg: "#1A0A0A", icon: "🤝", win: "KPMG + 2 companies", status: "Define your role", urgency: "HIGH", days: 180, progress: 25 },
    { id: "research", label: "Research", color: "#4ECDC4", bg: "#0A1A1A", icon: "📄", win: "Published paper", status: "Not started", urgency: "HIGH", days: 210, progress: 10 },
    { id: "sanash", label: "Sanash", color: "#45B7D1", bg: "#0A1218", icon: "🚌", win: "Gov deal + paper", status: "No clear vision", urgency: "MEDIUM", days: 180, progress: 15 },
    { id: "sevenstudio", label: "Seven Studio", color: "#F7DC6F", bg: "#1A1800", icon: "🚀", win: "3 cohorts, 1000+ teams", status: "Concept stage", urgency: "MEDIUM", days: 180, progress: 20 },
    { id: "n8n", label: "n8n Business", color: "#A29BFE", bg: "#0D0A1A", icon: "⚡", win: "Stable income", status: "Learning phase", urgency: "MEDIUM", days: 180, progress: 35 },
    { id: "sat", label: "SAT", color: "#FF4757", bg: "#1A0608", icon: "🎯", win: "1550+ score", status: "1300 → need +250", urgency: "CRITICAL", days: 29, progress: 52 },
    { id: "ap", label: "AP Exams", color: "#FFA502", bg: "#0A0E00", icon: "📐", win: "Score 4-5 both", status: "Behind on curriculum", urgency: "HIGH", days: 88, progress: 30 },
    { id: "reading", label: "Inner State", color: "#2ED573", bg: "#0A1A0D", icon: "📖", win: "Daily 30min habit", status: "Inconsistent", urgency: "MEDIUM", days: 240, progress: 45 },
];

const urgencyColor = { CRITICAL: "#FF4757", HIGH: "#FFA502", MEDIUM: "#2ED573" };
const urgencyPulse = { CRITICAL: true, HIGH: false, MEDIUM: false };

// Radar Chart Component
const RadarChart = ({ data }) => {
    const size = 320;
    const center = size / 2;
    const maxRadius = 120;
    const n = data.length;

    const getPoint = (index, radius) => {
        const angle = (2 * Math.PI * index / n) - Math.PI / 2;
        return {
            x: center + radius * Math.cos(angle),
            y: center + radius * Math.sin(angle)
        };
    };

    const gridLevels = [0.25, 0.5, 0.75, 1];

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#4ECDC4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#A29BFE" stopOpacity="0.4" />
                </linearGradient>
            </defs>

            {/* Grid circles */}
            {gridLevels.map((level, idx) => (
                <path
                    key={idx}
                    d={Array.from({ length: n }, (_, i) => getPoint(i, maxRadius * level))
                        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'}
                    fill="none"
                    stroke="#1A1A3A"
                    strokeWidth="1"
                />
            ))}

            {/* Axis lines */}
            {data.map((_, i) => {
                const p = getPoint(i, maxRadius);
                return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#1A1A3A" strokeWidth="1" />;
            })}

            {/* Data polygon */}
            <path
                d={data.map((d, i) => {
                    const radius = (d.progress / 100) * maxRadius;
                    const point = getPoint(i, radius);
                    return `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
                }).join(' ') + ' Z'}
                fill="url(#radarFill)"
                stroke="#7777FF"
                strokeWidth="2"
                filter="url(#glow)"
            />

            {/* Data points */}
            {data.map((d, i) => {
                const radius = (d.progress / 100) * maxRadius;
                const point = getPoint(i, radius);
                return (
                    <circle
                        key={d.id}
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill={d.color}
                        stroke="#080810"
                        strokeWidth="2"
                    />
                );
            })}

            {/* Labels */}
            {data.map((d, i) => {
                const labelPoint = getPoint(i, maxRadius + 35);
                return (
                    <g key={`label-${d.id}`}>
                        <text
                            x={labelPoint.x}
                            y={labelPoint.y - 6}
                            textAnchor="middle"
                            fill={d.color}
                            fontSize="10"
                            fontFamily="'Courier New', monospace"
                            fontWeight="bold"
                        >
                            {d.label}
                        </text>
                        <text
                            x={labelPoint.x}
                            y={labelPoint.y + 8}
                            textAnchor="middle"
                            fill="#555577"
                            fontSize="9"
                            fontFamily="'Courier New', monospace"
                        >
                            {d.progress}%
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

// AI Chat Component
const JarvisChat = ({ domains, onUpdateProgress }) => {
    const [messages, setMessages] = useState([
        { role: "assistant", content: "JARVIS online. What do you need?" }
    ]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);

    const sendMessage = async () => {
        if (!input.trim() || isThinking) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: "user", content: userMsg }]);
        setInput("");
        setIsThinking(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    domains: domains,
                    history: messages.filter(m => m.role !== "system")
                })
            });

            const data = await response.json();
            setMessages(prev => [...prev, { role: "assistant", content: data.reply || "System error. Retry." }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Is the backend running?" }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div style={{
            background: "#0A0A16",
            border: "1px solid #1A1A3A",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: "400px"
        }}>
            <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid #1A1A3A",
                display: "flex",
                alignItems: "center",
                gap: "8px"
            }}>
                <div style={{
                    width: "8px",
                    height: "8px",
                    background: "#2ED573",
                    borderRadius: "50%",
                    animation: "pulse 2s infinite"
                }} />
                <span style={{ fontSize: "11px", letterSpacing: "3px", color: "#7777FF" }}>JARVIS TERMINAL</span>
            </div>

            <div style={{
                flex: 1,
                overflow: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
            }}>
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        maxWidth: "85%"
                    }}>
                        <div style={{
                            background: msg.role === "user" ? "#1A1A4A" : "#0D0D1A",
                            border: `1px solid ${msg.role === "user" ? "#3333AA" : "#1A1A3A"}`,
                            padding: "10px 14px",
                            fontSize: "12px",
                            color: msg.role === "user" ? "#AAAAFF" : "#8888AA",
                            lineHeight: "1.6",
                            whiteSpace: "pre-wrap"
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div style={{
                        fontSize: "11px",
                        color: "#555577",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                    }}>
                        <div style={{
                            width: "12px",
                            height: "12px",
                            border: "2px solid #333366",
                            borderTopColor: "#7777FF",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite"
                        }} />
                        Processing...
                    </div>
                )}
            </div>

            <div style={{
                padding: "12px",
                borderTop: "1px solid #1A1A3A",
                display: "flex",
                gap: "8px"
            }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                    placeholder="Ask anything: plan a project, analyze progress, get feedback..."
                    style={{
                        flex: 1,
                        background: "#060610",
                        border: "1px solid #1A1A3A",
                        padding: "10px 14px",
                        color: "#AAAAFF",
                        fontSize: "12px",
                        fontFamily: "'Courier New', monospace",
                        outline: "none"
                    }}
                />
                <button
                    onClick={sendMessage}
                    disabled={isThinking}
                    style={{
                        background: isThinking ? "#1A1A3A" : "#7777FF",
                        border: "none",
                        padding: "10px 20px",
                        color: "#000",
                        fontSize: "11px",
                        letterSpacing: "2px",
                        cursor: isThinking ? "not-allowed" : "pointer",
                        fontFamily: "'Courier New', monospace"
                    }}
                >
                    SEND
                </button>
            </div>
        </div>
    );
};

export default function App() {
    const [activeTab, setActiveTab] = useState("overview");
    const [ramadan, setRamadan] = useState(false);
    const [domainsState, setDomainsState] = useState(domains);
    const [prayerTimes, setPrayerTimes] = useState(null);
    const [monthlyPrayers, setMonthlyPrayers] = useState([]);
    const [nextPrayer, setNextPrayer] = useState(null);
    const [countdown, setCountdown] = useState("");
    const [prayerLoading, setPrayerLoading] = useState(false);

    // Load domains from DB on mount
    useEffect(() => {
        fetch('/api/domains').then(r => r.json()).then(data => {
            if (data && data.length > 0) setDomainsState(data);
        }).catch(() => { });
    }, []);

    // Fetch prayer times when Ramadan mode is on
    useEffect(() => {
        if (!ramadan) return;
        setPrayerLoading(true);
        Promise.all([
            fetch('/api/prayer-times').then(r => r.json()),
            fetch('/api/prayer-times/month').then(r => r.json())
        ]).then(([daily, monthly]) => {
            setPrayerTimes(daily);
            setMonthlyPrayers(monthly);
            setPrayerLoading(false);
        }).catch(() => setPrayerLoading(false));
    }, [ramadan]);

    // Countdown to next prayer
    useEffect(() => {
        if (!prayerTimes) return;
        const interval = setInterval(() => {
            const now = new Date();
            const prayers = Object.entries(prayerTimes.prayers);
            let next = null;
            for (const [name, time] of prayers) {
                const [h, m] = time.split(':').map(Number);
                const prayerDate = new Date();
                prayerDate.setHours(h, m, 0, 0);
                if (prayerDate > now) {
                    next = { name, time, diff: prayerDate - now };
                    break;
                }
            }
            if (next) {
                const mins = Math.floor(next.diff / 60000);
                const hrs = Math.floor(mins / 60);
                const remainMins = mins % 60;
                setNextPrayer(next.name);
                setCountdown(hrs > 0 ? `${hrs}h ${remainMins}m` : `${remainMins}m`);
            } else {
                setNextPrayer('Fajr');
                setCountdown('tomorrow');
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [prayerTimes]);

    const updateProgress = (id, delta) => {
        setDomainsState(prev => prev.map(d => {
            if (d.id !== id) return d;
            const newProgress = Math.min(100, Math.max(0, d.progress + delta));
            // Persist to backend
            fetch(`/api/domains/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ progress: newProgress })
            }).catch(() => { });
            return { ...d, progress: newProgress };
        }));
    };

    return (
        <div style={{
            background: "#080810",
            minHeight: "100vh",
            fontFamily: "'Courier New', monospace",
            color: "#E0E0FF",
            padding: "0",
            overflowX: "hidden"
        }}>
            <style>{`
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
        @keyframes slideIn { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px #FF4757;} 50%{box-shadow:0 0 24px #FF4757, 0 0 48px #FF4757;} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .domain-card:hover { transform: translateY(-3px); transition: transform 0.2s; }
        .tab-btn:hover { background: rgba(255,255,255,0.08) !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0A16; }
        ::-webkit-scrollbar-thumb { background: #1A1A3A; }
      `}</style>

            {/* Header */}
            <div style={{
                background: "linear-gradient(180deg, #0D0D1A 0%, #080810 100%)",
                borderBottom: "1px solid #1A1A3A",
                padding: "24px 32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
            }}>
                <div>
                    <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#5555AA", marginBottom: "4px" }}>
                        JARVIS DAILY OS / DIYAS
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#FFFFFF", letterSpacing: "-1px" }}>
                        8 months. 6 goals. 4 hours/day.
                    </div>
                    <div style={{ fontSize: "12px", color: "#6666AA", marginTop: "4px" }}>
                        Almaty, Kazakhstan · Grade 11 · Ramadan starts March 1
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{
                        background: "#FF4757",
                        color: "white",
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        letterSpacing: "2px",
                        animation: "glow 2s infinite",
                        marginBottom: "8px"
                    }}>
                        ⚠ SAT IN 29 DAYS
                    </div>
                    <div style={{ fontSize: "11px", color: "#666688" }}>March 14, 2025 · Target: 1550+</div>
                    <div style={{ marginTop: "8px" }}>
                        <button
                            onClick={() => setRamadan(!ramadan)}
                            style={{
                                background: ramadan ? "#FF9F43" : "#1A1A3A",
                                border: "1px solid " + (ramadan ? "#FF9F43" : "#333366"),
                                color: ramadan ? "#000" : "#9999CC",
                                padding: "4px 12px",
                                fontSize: "11px",
                                cursor: "pointer",
                                letterSpacing: "1px"
                            }}
                        >
                            {ramadan ? "☪ RAMADAN MODE ON" : "☪ RAMADAN MODE"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: "flex",
                borderBottom: "1px solid #1A1A3A",
                background: "#0A0A16",
                padding: "0 32px"
            }}>
                {[
                    { id: "overview", label: "OVERVIEW" },
                    { id: "radar", label: "PROGRESS RADAR" },
                    { id: "jarvis", label: "JARVIS AI" },
                    { id: "schedule", label: "SCHEDULE" },
                    ...(ramadan ? [{ id: "ramadan", label: "☪ RAMADAN" }] : [])
                ].map(tab => (
                    <button
                        key={tab.id}
                        className="tab-btn"
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            background: activeTab === tab.id ? "rgba(100,100,255,0.1)" : "transparent",
                            border: "none",
                            borderBottom: activeTab === tab.id ? "2px solid #7777FF" : "2px solid transparent",
                            color: activeTab === tab.id ? "#AAAAFF" : "#555577",
                            padding: "12px 20px",
                            fontSize: "11px",
                            letterSpacing: "2px",
                            cursor: "pointer",
                            marginBottom: "-1px"
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ padding: "32px", animation: "slideIn 0.3s ease" }}>

                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                    <div>
                        <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "3px", marginBottom: "20px" }}>
                            8 DOMAINS · PRIORITY ORDER
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                            {domainsState.map((d, i) => (
                                <div
                                    key={d.id}
                                    className="domain-card"
                                    style={{
                                        background: d.bg,
                                        border: `1px solid ${d.color}22`,
                                        borderLeft: `3px solid ${d.color}`,
                                        padding: "20px",
                                        cursor: "default",
                                        position: "relative",
                                        overflow: "hidden"
                                    }}
                                >
                                    {urgencyPulse[d.urgency] && (
                                        <div style={{
                                            position: "absolute", top: "12px", right: "12px",
                                            width: "8px", height: "8px",
                                            background: urgencyColor[d.urgency],
                                            borderRadius: "50%",
                                            animation: "pulse 1.5s infinite"
                                        }} />
                                    )}
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                                        <span style={{ fontSize: "20px" }}>{d.icon}</span>
                                        <div>
                                            <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "2px" }}>#{i + 1}</div>
                                            <div style={{ fontSize: "16px", fontWeight: "bold", color: d.color }}>{d.label}</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#AAAACC", marginBottom: "8px" }}>
                                        <span style={{ color: "#555577" }}>WIN: </span>{d.win}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#888899", marginBottom: "12px" }}>
                                        <span style={{ color: "#555577" }}>NOW: </span>{d.status}
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{
                                        background: "#0A0A12",
                                        height: "6px",
                                        borderRadius: "3px",
                                        marginBottom: "12px",
                                        overflow: "hidden"
                                    }}>
                                        <div style={{
                                            width: `${d.progress}%`,
                                            height: "100%",
                                            background: d.color,
                                            transition: "width 0.3s"
                                        }} />
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button
                                                onClick={() => updateProgress(d.id, -5)}
                                                style={{
                                                    background: "#0A0A16",
                                                    border: "1px solid #1A1A3A",
                                                    color: "#555577",
                                                    padding: "2px 8px",
                                                    fontSize: "10px",
                                                    cursor: "pointer"
                                                }}
                                            >-5%</button>
                                            <button
                                                onClick={() => updateProgress(d.id, 5)}
                                                style={{
                                                    background: "#0A0A16",
                                                    border: "1px solid #1A1A3A",
                                                    color: "#555577",
                                                    padding: "2px 8px",
                                                    fontSize: "10px",
                                                    cursor: "pointer"
                                                }}
                                            >+5%</button>
                                        </div>
                                        <div style={{
                                            background: urgencyColor[d.urgency] + "22",
                                            color: urgencyColor[d.urgency],
                                            padding: "2px 8px",
                                            fontSize: "10px",
                                            letterSpacing: "2px"
                                        }}>
                                            {d.progress}% · {d.days}d
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RADAR TAB */}
                {activeTab === "radar" && (
                    <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
                        <div style={{
                            background: "#0A0A16",
                            border: "1px solid #1A1A3A",
                            padding: "32px",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center"
                        }}>
                            <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "3px", marginBottom: "24px" }}>
                                OVERALL PROGRESS RADAR
                            </div>
                            <RadarChart data={domainsState} />
                            <div style={{
                                marginTop: "24px",
                                fontSize: "12px",
                                color: "#555577",
                                textAlign: "center"
                            }}>
                                Total avg: {Math.round(domainsState.reduce((a, d) => a + d.progress, 0) / domainsState.length)}%
                            </div>
                        </div>

                        <div style={{ flex: 1, minWidth: "300px" }}>
                            <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "3px", marginBottom: "16px" }}>
                                DOMAIN BREAKDOWN
                            </div>
                            {[...domainsState].sort((a, b) => b.progress - a.progress).map(d => (
                                <div key={d.id} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "12px 0",
                                    borderBottom: "1px solid #1A1A3A"
                                }}>
                                    <span style={{ fontSize: "16px" }}>{d.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: "13px", color: d.color, marginBottom: "4px" }}>{d.label}</div>
                                        <div style={{
                                            background: "#0A0A12",
                                            height: "4px",
                                            borderRadius: "2px",
                                            overflow: "hidden"
                                        }}>
                                            <div style={{
                                                width: `${d.progress}%`,
                                                height: "100%",
                                                background: d.color
                                            }} />
                                        </div>
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#555577", width: "40px", textAlign: "right" }}>
                                        {d.progress}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* JARVIS AI TAB */}
                {activeTab === "jarvis" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", minHeight: "500px" }}>
                        <JarvisChat domains={domainsState} onUpdateProgress={updateProgress} />

                        <div>
                            <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "3px", marginBottom: "16px" }}>
                                QUICK COMMANDS
                            </div>
                            <div style={{ display: "grid", gap: "8px" }}>
                                {[
                                    { cmd: "done", desc: "Log completion → get next task", color: "#2ED573" },
                                    { cmd: "stuck", desc: "Diagnose block → get unblock action", color: "#FFA502" },
                                    { cmd: "status", desc: "3-line status: green/red/fire", color: "#4ECDC4" },
                                    { cmd: "what now", desc: "Next highest-leverage task", color: "#A29BFE" },
                                    { cmd: "I have 20 min", desc: "Micro-task for exact time", color: "#F7DC6F" },
                                    { cmd: "I'm tired", desc: "Lowest-energy task available", color: "#45B7D1" },
                                ].map(c => (
                                    <div key={c.cmd} style={{
                                        background: "#0A0A16",
                                        border: "1px solid #1A1A3A",
                                        padding: "12px 16px",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px"
                                    }}>
                                        <span style={{
                                            background: "#060610",
                                            border: "1px solid #1A1A3A",
                                            padding: "4px 10px",
                                            fontSize: "11px",
                                            color: c.color
                                        }}>"{c.cmd}"</span>
                                        <span style={{ fontSize: "11px", color: "#555577" }}>{c.desc}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                marginTop: "24px",
                                background: "#0A0A18",
                                border: "1px solid #FF475722",
                                borderLeft: "3px solid #FF4757",
                                padding: "16px"
                            }}>
                                <div style={{ fontSize: "11px", color: "#FF4757", letterSpacing: "2px", marginBottom: "8px" }}>
                                    JARVIS NEVER
                                </div>
                                <div style={{ fontSize: "11px", color: "#555577", lineHeight: "1.8" }}>
                                    ✗ Sugarcoats when you didn't do the work<br />
                                    ✗ Gives vague tasks like "work on research"<br />
                                    ✗ Ignores 3+ day neglect streaks
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SCHEDULE TAB */}
                {activeTab === "schedule" && (
                    <div>
                        <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "3px", marginBottom: "24px" }}>
                            YOUR DAILY TIME ARCHITECTURE
                        </div>

                        <div style={{ marginBottom: "40px" }}>
                            {[
                                { time: "4:40", event: ramadan ? "Wake up + Suhoor" : "Wake up", color: "#F7DC6F" },
                                { time: "5:00", event: "Jarvis sends battle plan", color: "#7777FF" },
                                { time: ramadan ? "5:50" : "5:30", event: ramadan ? "Fajr prayer 🕌" : "Pre-dawn deep work ends", color: "#4ECDC4" },
                                { time: "6:20", event: "Leave for school", color: "#555577" },
                                { time: "8:00", event: "School starts", color: "#555577" },
                                { time: "17:00", event: "School ends", color: "#555577" },
                                { time: "18:00", event: ramadan ? "Home, rest before Iftar" : "Evening work block starts", color: "#4ECDC4" },
                                ...(ramadan ? [
                                    { time: "19:10", event: "Maghrib + Iftar 🌙", color: "#FF9F43" },
                                    { time: "19:40", event: "Post-Iftar work (1.5h)", color: "#A29BFE" },
                                ] : []),
                                { time: "21:00", event: "Jarvis evening check-in", color: "#7777FF" },
                                ...(ramadan ? [{ time: "21:30", event: "Isha + Tarawih 🕌", color: "#4ECDC4" }] : []),
                                { time: "23:00", event: "Sleep", color: "#333355" },
                            ].map((e, i, arr) => (
                                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "12px" }}>
                                    <div style={{ width: "50px", textAlign: "right", fontSize: "12px", color: "#555577", paddingTop: "2px" }}>
                                        {e.time}
                                    </div>
                                    <div style={{ width: "12px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <div style={{ width: "10px", height: "10px", background: e.color, borderRadius: "50%", marginTop: "4px" }} />
                                        {i < arr.length - 1 && <div style={{ width: "1px", height: "20px", background: "#1A1A3A" }} />}
                                    </div>
                                    <div style={{ fontSize: "13px", color: e.color }}>{e.event}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                            {[
                                { label: "Pre-dawn", mins: ramadan ? 60 : 90, desc: ramadan ? "4:40–5:40" : "4:40–6:10", color: "#F7DC6F" },
                                { label: "Evening", mins: ramadan ? 90 : 180, desc: ramadan ? "Post-Iftar" : "18:00–21:00", color: "#A29BFE" },
                                { label: "Total", mins: ramadan ? 150 : 270, desc: ramadan ? "~2.5h" : "~4.5h", color: "#4ECDC4" },
                            ].map(w => (
                                <div key={w.label} style={{
                                    background: "#0A0A18",
                                    border: `1px solid ${w.color}33`,
                                    padding: "20px"
                                }}>
                                    <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "2px", marginBottom: "8px" }}>{w.label.toUpperCase()}</div>
                                    <div style={{ fontSize: "28px", fontWeight: "bold", color: w.color }}>{w.mins}<span style={{ fontSize: "14px" }}>m</span></div>
                                    <div style={{ fontSize: "12px", color: "#555577", marginTop: "4px" }}>{w.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RAMADAN TAB */}
                {activeTab === "ramadan" && ramadan && (
                    <div>
                        <div style={{ fontSize: "11px", color: "#FF9F43", letterSpacing: "3px", marginBottom: "24px" }}>
                            ☪ PRAYER TIMES · ALMATY, KAZAKHSTAN
                        </div>

                        {prayerLoading ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#555577" }}>
                                <div style={{
                                    width: "24px", height: "24px",
                                    border: "2px solid #333366", borderTopColor: "#FF9F43",
                                    borderRadius: "50%", animation: "spin 1s linear infinite",
                                    margin: "0 auto 12px"
                                }} />
                                Loading prayer times...
                            </div>
                        ) : prayerTimes ? (
                            <div>
                                {/* Date info */}
                                <div style={{
                                    background: "#0D0A00",
                                    border: "1px solid #FF9F4333",
                                    padding: "16px 20px",
                                    marginBottom: "24px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center"
                                }}>
                                    <div>
                                        <div style={{ fontSize: "13px", color: "#FF9F43" }}>{prayerTimes.date}</div>
                                        <div style={{ fontSize: "11px", color: "#555577", marginTop: "4px" }}>
                                            {prayerTimes.hijri} · {prayerTimes.hijriMonth}
                                        </div>
                                    </div>
                                    {nextPrayer && (
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "2px" }}>NEXT PRAYER</div>
                                            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#FF9F43" }}>{nextPrayer}</div>
                                            <div style={{ fontSize: "13px", color: "#4ECDC4" }}>in {countdown}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Suhoor & Iftar highlight */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                                    <div style={{
                                        background: "linear-gradient(135deg, #0D0A1A 0%, #1A0D2A 100%)",
                                        border: "1px solid #A29BFE33",
                                        padding: "24px",
                                        textAlign: "center"
                                    }}>
                                        <div style={{ fontSize: "11px", color: "#A29BFE", letterSpacing: "3px", marginBottom: "8px" }}>🌙 SUHOOR</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#A29BFE" }}>{prayerTimes.suhoor}</div>
                                        <div style={{ fontSize: "11px", color: "#555577", marginTop: "4px" }}>Stop eating before Fajr</div>
                                    </div>
                                    <div style={{
                                        background: "linear-gradient(135deg, #1A0800 0%, #2A0D00 100%)",
                                        border: "1px solid #FF9F4333",
                                        padding: "24px",
                                        textAlign: "center"
                                    }}>
                                        <div style={{ fontSize: "11px", color: "#FF9F43", letterSpacing: "3px", marginBottom: "8px" }}>🌅 IFTAR</div>
                                        <div style={{ fontSize: "32px", fontWeight: "bold", color: "#FF9F43" }}>{prayerTimes.iftar}</div>
                                        <div style={{ fontSize: "11px", color: "#555577", marginTop: "4px" }}>Break fast at Maghrib</div>
                                    </div>
                                </div>

                                {/* All prayer times */}
                                <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "3px", marginBottom: "16px" }}>
                                    TODAY'S PRAYER TIMES
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "32px" }}>
                                    {Object.entries(prayerTimes.prayers).map(([name, time]) => {
                                        const icons = { Fajr: "🌙", Sunrise: "🌅", Dhuhr: "☀️", Asr: "🌤", Maghrib: "🌇", Isha: "🌃" };
                                        const colors = { Fajr: "#A29BFE", Sunrise: "#F7DC6F", Dhuhr: "#FF9F43", Asr: "#4ECDC4", Maghrib: "#FF6B6B", Isha: "#7777FF" };
                                        const isNext = nextPrayer === name;
                                        return (
                                            <div key={name} style={{
                                                background: isNext ? `${colors[name]}11` : "#0A0A16",
                                                border: `1px solid ${isNext ? colors[name] + '66' : '#1A1A3A'}`,
                                                borderLeft: isNext ? `3px solid ${colors[name]}` : `1px solid #1A1A3A`,
                                                padding: "16px",
                                                textAlign: "center",
                                                position: "relative"
                                            }}>
                                                {isNext && (
                                                    <div style={{
                                                        position: "absolute", top: "8px", right: "8px",
                                                        width: "6px", height: "6px",
                                                        background: colors[name],
                                                        borderRadius: "50%",
                                                        animation: "pulse 1.5s infinite"
                                                    }} />
                                                )}
                                                <div style={{ fontSize: "18px", marginBottom: "4px" }}>{icons[name]}</div>
                                                <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "2px", marginBottom: "6px" }}>{name.toUpperCase()}</div>
                                                <div style={{ fontSize: "18px", fontWeight: "bold", color: colors[name] }}>{time}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Monthly calendar */}
                                {monthlyPrayers.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: "11px", color: "#555577", letterSpacing: "3px", marginBottom: "16px" }}>
                                            MONTHLY SUHOOR & IFTAR CALENDAR
                                        </div>
                                        <div style={{
                                            background: "#0A0A16",
                                            border: "1px solid #1A1A3A",
                                            overflow: "auto",
                                            maxHeight: "400px"
                                        }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                                                <thead>
                                                    <tr style={{ borderBottom: "1px solid #1A1A3A" }}>
                                                        <th style={{ padding: "10px 12px", textAlign: "left", color: "#555577", letterSpacing: "1px", fontSize: "10px" }}>DATE</th>
                                                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#A29BFE", letterSpacing: "1px", fontSize: "10px" }}>SUHOOR</th>
                                                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#555577", letterSpacing: "1px", fontSize: "10px" }}>FAJR</th>
                                                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#555577", letterSpacing: "1px", fontSize: "10px" }}>DHUHR</th>
                                                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#555577", letterSpacing: "1px", fontSize: "10px" }}>ASR</th>
                                                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#FF9F43", letterSpacing: "1px", fontSize: "10px" }}>IFTAR</th>
                                                        <th style={{ padding: "10px 12px", textAlign: "center", color: "#555577", letterSpacing: "1px", fontSize: "10px" }}>ISHA</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {monthlyPrayers.map((day, i) => {
                                                        const isToday = day.date === prayerTimes?.date;
                                                        return (
                                                            <tr key={i} style={{
                                                                borderBottom: "1px solid #0D0D1A",
                                                                background: isToday ? "#FF9F4311" : "transparent"
                                                            }}>
                                                                <td style={{ padding: "8px 12px", color: isToday ? "#FF9F43" : "#555577" }}>
                                                                    {day.gregorian}
                                                                </td>
                                                                <td style={{ padding: "8px 12px", textAlign: "center", color: "#A29BFE" }}>{day.suhoor}</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "center", color: "#7777AA" }}>{day.fajr}</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "center", color: "#7777AA" }}>{day.dhuhr}</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "center", color: "#7777AA" }}>{day.asr}</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "center", color: "#FF9F43", fontWeight: "bold" }}>{day.iftar}</td>
                                                                <td style={{ padding: "8px 12px", textAlign: "center", color: "#7777AA" }}>{day.isha}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ color: "#555577", padding: "40px", textAlign: "center" }}>
                                Failed to load prayer times. Check backend connection.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                borderTop: "1px solid #1A1A3A",
                padding: "16px 32px",
                display: "flex",
                justifyContent: "space-between",
                fontSize: "11px",
                color: "#333355"
            }}>
                <span>JARVIS DAILY OS · DIYAS · ALMATY 2025–2026</span>
                <span>Claude API + React</span>
            </div>
        </div>
    );
}
