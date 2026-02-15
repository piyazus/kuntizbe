import { supabase } from './_lib/supabase.js';

function buildStatus(domains) {
    if (!domains || !domains.length) {
        return '🔴 No domains loaded';
    }
    let lines = [];
    domains.filter(d => d.urgency === 'CRITICAL').forEach(d => lines.push(`🔴 ${d.label}: ${d.progress}% — ${d.days}d left — CRITICAL`));
    domains.filter(d => d.urgency === 'HIGH').forEach(d => lines.push(`🟡 ${d.label}: ${d.progress}% — ${d.days}d left`));
    domains.filter(d => d.urgency === 'MEDIUM').forEach(d => lines.push(`🟢 ${d.label}: ${d.progress}% — ${d.days}d left`));
    return lines.join('\n');
}

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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // GET = chat history
    if (req.method === 'GET') {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const { data, error } = await supabase
                .from('chat_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return res.json((data || []).reverse());
        } catch (err) {
            console.error('Get chat history error:', err.message);
            return res.status(500).json({ error: 'Failed to get chat history' });
        }
    }

    // POST = send message
    if (req.method === 'POST') {
        const { message, domains, history } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Save user message
        await supabase.from('chat_history').insert({ role: 'user', content: message });

        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            const reply = getFallbackReply(message, domains);
            await supabase.from('chat_history').insert({ role: 'assistant', content: reply });
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

5. PROGRESS EVALUATION: This is CRITICAL. You control the progress bars.
   - When the user tells you about work they've done, you MUST evaluate and update progress.
   - When asked to evaluate progress, analyze what's been accomplished and set a fair progress percentage.
   - Be HARSH but FAIR. Don't inflate progress.
   - Consider: actual deliverables produced, not just time spent.

   To update progress, you MUST include this block at the END of your message:
   [PROGRESS_UPDATE]
   \`\`\`json
   [{"id": "domain_id", "progress": number_0_to_100}]
   \`\`\`
   
   Valid domain IDs: unisonai, research, sanash, sevenstudio, n8n, sat, ap, reading
   
   Example: If user says "I finished my SAT practice test and scored 1400", you might set:
   [PROGRESS_UPDATE]
   \`\`\`json
   [{"id": "sat", "progress": 60}]
   \`\`\`
   
   You can update multiple domains at once. Only include this block when progress should change.

Current date: ${today}
Current goals:
${context || 'No domains loaded.'}

RULES:
- Be direct, zero fluff, zero emotions
- Specific next actions with time estimates
- If spreading too thin, prove it with math
- When creating projects, be DETAILED and ACTIONABLE
- Use bullet points and clear structure
- NEVER be a yes-man. Diyas needs truth, not comfort.
- ALWAYS include [PROGRESS_UPDATE] block when the user reports work done or asks for progress evaluation
- Progress bars start at 0. Only YOU can move them. Evaluate honestly.`;

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
                await supabase.from('chat_history').insert({ role: 'assistant', content: reply });
                return res.json({ reply });
            }

            const reply = data.content?.[0]?.text || 'System error. Retry.';
            await supabase.from('chat_history').insert({ role: 'assistant', content: reply });

            // Parse progress updates from AI response
            const progressUpdates = [];
            const progressMatch = reply.match(/\[PROGRESS_UPDATE\]\s*```json\s*([\s\S]*?)```/);
            if (progressMatch) {
                try {
                    const updates = JSON.parse(progressMatch[1]);
                    if (Array.isArray(updates)) {
                        for (const u of updates) {
                            if (u.id && typeof u.progress === 'number') {
                                const clamped = Math.min(100, Math.max(0, u.progress));
                                await supabase
                                    .from('domains')
                                    .update({ progress: clamped, updated_at: new Date().toISOString() })
                                    .eq('id', u.id);
                                progressUpdates.push({ id: u.id, progress: clamped });
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse progress updates:', e.message);
                }
            }

            return res.json({ reply, progressUpdates });

        } catch (err) {
            console.error('Server error:', err.message);
            const reply = getFallbackReply(message, domains);
            await supabase.from('chat_history').insert({ role: 'assistant', content: reply });
            return res.json({ reply });
        }
    }

    res.status(405).json({ error: 'Method not allowed' });
}
