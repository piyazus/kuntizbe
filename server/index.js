import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prayerTimesRouter from './prayerTimes.js';
import {
    getDomains, upsertDomain, updateDomainProgress, seedDomains,
    getChatHistory, addChatMessage,
    addDailyLog, getDailyLogs
} from './database.js';

dotenv.config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Default domain data for seeding
const defaultDomains = [
    { id: "unisonai", label: "UnisonAI", color: "#FF6B6B", bg: "#1A0A0A", icon: "🤝", win: "KPMG + 2 companies", status: "Define your role", urgency: "HIGH", days: 180, progress: 25 },
    { id: "research", label: "Research", color: "#4ECDC4", bg: "#0A1A1A", icon: "📄", win: "Published paper", status: "Not started", urgency: "HIGH", days: 210, progress: 10 },
    { id: "sanash", label: "Sanash", color: "#45B7D1", bg: "#0A1218", icon: "🚌", win: "Gov deal + paper", status: "No clear vision", urgency: "MEDIUM", days: 180, progress: 15 },
    { id: "sevenstudio", label: "Seven Studio", color: "#F7DC6F", bg: "#1A1800", icon: "🚀", win: "3 cohorts, 1000+ teams", status: "Concept stage", urgency: "MEDIUM", days: 180, progress: 20 },
    { id: "n8n", label: "n8n Business", color: "#A29BFE", bg: "#0D0A1A", icon: "⚡", win: "Stable income", status: "Learning phase", urgency: "MEDIUM", days: 180, progress: 35 },
    { id: "sat", label: "SAT", color: "#FF4757", bg: "#1A0608", icon: "🎯", win: "1550+ score", status: "1300 → need +250", urgency: "CRITICAL", days: 29, progress: 52 },
    { id: "ap", label: "AP Exams", color: "#FFA502", bg: "#0A0E00", icon: "📐", win: "Score 4-5 both", status: "Behind on curriculum", urgency: "HIGH", days: 88, progress: 30 },
    { id: "reading", label: "Inner State", color: "#2ED573", bg: "#0A1A0D", icon: "📖", win: "Daily 30min habit", status: "Inconsistent", urgency: "MEDIUM", days: 240, progress: 45 },
];

// Seed database on first run
seedDomains(defaultDomains);

// ── Prayer times routes ──────────────────────────
app.use('/api/prayer-times', prayerTimesRouter);

// ── Domain routes ────────────────────────────────
app.get('/api/domains', (req, res) => {
    try {
        const domains = getDomains();
        res.json(domains);
    } catch (err) {
        console.error('Get domains error:', err.message);
        res.status(500).json({ error: 'Failed to get domains' });
    }
});

app.put('/api/domains/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.progress !== undefined) {
            updateDomainProgress(id, updates.progress);
        } else {
            upsertDomain({ id, ...updates });
        }
        res.json({ ok: true });
    } catch (err) {
        console.error('Update domain error:', err.message);
        res.status(500).json({ error: 'Failed to update domain' });
    }
});

// ── Chat routes ──────────────────────────────────
app.get('/api/chat-history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const history = getChatHistory(limit);
        res.json(history);
    } catch (err) {
        console.error('Get chat history error:', err.message);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

app.post('/api/chat', async (req, res) => {
    const { message, domains, history } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    addChatMessage('user', message);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
        const reply = getFallbackReply(message, domains);
        addChatMessage('assistant', reply);
        return res.json({ reply });
    }

    try {
        const context = (domains || []).map(d =>
            `${d.label}: ${d.progress}% done, ${d.days} days left, urgency ${d.urgency}, status "${d.status}"`
        ).join('\n');

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const systemPrompt = `You are JARVIS — an EXTREMELY OBJECTIVE, HARSH, and ANALYTICAL productivity AI for Diyas, a Grade 11 student in Almaty, Kazakhstan. He has multiple ambitious projects with only ~4 hours/day outside school.

YOUR PERSONALITY:
- You are NOT supportive. You are OBJECTIVE. Like a cold, data-driven analyst.
- If an idea is bad, say it's bad and explain WHY with logic.
- If progress is slow, calculate: "At this pace, you finish in 847 days. You have 180."
- Never say "great job" or "keep it up" unless numbers genuinely back it up.
- Short, direct sentences. No motivational fluff. You're a strict investor reviewing a startup.

YOUR CAPABILITIES:
1. PROJECT CREATION: When asked to create/plan a project, produce:
   - Clear milestones with dates
   - Daily/weekly time allocation
   - Risk assessment (what could go wrong)
   - Success metrics
   - Honest feasibility score (1-10) given current workload

2. PROJECT ANALYSIS: For existing projects:
   - Calculate if timeline is realistic at current pace
   - Identify the #1 bottleneck
   - Give probability of success (%)
   - Suggest what to CUT if time is insufficient

3. HONEST FEEDBACK: For any idea:
   - 3 reasons it could fail FIRST
   - Then what could work
   - Final verdict: PURSUE / PIVOT / KILL

4. DAILY PLANNING: For "what should I do today":
   - Look at urgencies/deadlines
   - Allocate specific time blocks
   - Prioritize ruthlessly — some things must be dropped

Current date: ${today}
Current goals:
${context || 'No domains loaded.'}

RULES:
- Be direct, zero fluff, zero emotions
- Specific next actions with time estimates
- If spreading too thin, prove it with math
- When creating projects, be DETAILED and ACTIONABLE
- Use bullet points and clear structure
- NEVER be a yes-man. Diyas needs truth, not comfort.`;

        const conversationMessages = [];
        if (history && history.length > 0) {
            const recent = history.slice(-10);
            for (const msg of recent) {
                conversationMessages.push({ role: msg.role, content: msg.content });
            }
        }
        conversationMessages.push({ role: 'user', content: message });

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                system: systemPrompt,
                messages: conversationMessages
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Claude API error:', data.error);
            const reply = getFallbackReply(message, domains);
            addChatMessage('assistant', reply);
            return res.json({ reply });
        }

        const reply = data.content?.[0]?.text || 'System error. Retry.';
        addChatMessage('assistant', reply);
        res.json({ reply });

    } catch (err) {
        console.error('Server error:', err.message);
        const reply = getFallbackReply(message, domains);
        addChatMessage('assistant', reply);
        res.json({ reply });
    }
});

// ── Daily logs ───────────────────────────────────
app.post('/api/logs', (req, res) => {
    try {
        const { date, domainId, minutesSpent, notes } = req.body;
        addDailyLog(date, domainId, minutesSpent, notes);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add log' });
    }
});

app.get('/api/logs/:date', (req, res) => {
    try {
        const logs = getDailyLogs(req.params.date);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// ── Status ───────────────────────────────────────
app.get('/api/status', (req, res) => {
    res.json({
        status: 'JARVIS backend online',
        mode: process.env.ANTHROPIC_API_KEY ? 'AI' : 'FALLBACK',
        database: 'SQLite connected',
        prayerTimes: 'Aladhan API'
    });
});

// Fallback response generator
function getFallbackReply(message, domains) {
    const lowerMsg = message.toLowerCase();
    const fallbacks = {
        "done": "Logged. What's next on your list?",
        "stuck": "Stuck where exactly? Name the domain and the specific block.",
        "status": buildStatus(domains),
        "what now": "SAT prep. You have 29 days. Open Khan Academy, do 25 practice problems on your weakest section. No negotiation.",
        "tired": "Understood. Lowest-energy task: read 1 chapter of your current book (Inner State). 30 minutes. No screen required.",
        "20 min": "20 minutes → SAT: do one full Reading passage (5 questions). Time yourself. Go.",
        "skip": "Skip SAT today? That's 1 of 29 remaining days gone. You need +250 points. Every day counts. Think carefully.",
        "help": "Available commands: done, stuck, status, what now, I'm tired, I have 20 min, skip SAT today",
    };

    const key = Object.keys(fallbacks).find(k => lowerMsg.includes(k)) || null;
    return key ? fallbacks[key] : "Be specific. What domain? What's the block? I can't help with vague.";
}

function buildStatus(domains) {
    if (!domains || !domains.length) {
        return '🔴 SAT: CRITICAL — 29 days\n🟡 Research: barely started\n🟢 n8n: on track';
    }
    let lines = [];
    domains.filter(d => d.urgency === 'CRITICAL').forEach(d => lines.push(`🔴 ${d.label}: ${d.progress}% — ${d.days}d left — CRITICAL`));
    domains.filter(d => d.urgency === 'HIGH').forEach(d => lines.push(`🟡 ${d.label}: ${d.progress}% — ${d.days}d left`));
    domains.filter(d => d.urgency === 'MEDIUM').forEach(d => lines.push(`🟢 ${d.label}: ${d.progress}% — ${d.days}d left`));
    return lines.join('\n');
}

app.listen(PORT, () => {
    console.log(`\n  ⚡ JARVIS backend running on http://localhost:${PORT}`);
    console.log(`  📡 AI Mode: ${process.env.ANTHROPIC_API_KEY ? 'Claude AI ✅' : 'Fallback (no API key)'}`);
    console.log(`  🕌 Prayer Times: ДУМК Kazakhstan (muftyat.kz)`);
    console.log(`  💾 Database: SQLite (data/jarvis.db)\n`);
});
