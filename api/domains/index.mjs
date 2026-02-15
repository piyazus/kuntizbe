import { supabase } from '../_lib/supabase.mjs';

const defaultDomains = [
    { id: "unisonai", label: "UnisonAI", color: "#FF6B6B", bg: "#1A0A0A", icon: "🤝", win: "KPMG + 2 companies", status: "Define your role", urgency: "HIGH", days: 180, progress: 0 },
    { id: "research", label: "Research", color: "#4ECDC4", bg: "#0A1A1A", icon: "📄", win: "Published paper", status: "Not started", urgency: "HIGH", days: 210, progress: 0 },
    { id: "sanash", label: "Sanash", color: "#45B7D1", bg: "#0A1218", icon: "🚌", win: "Gov deal + paper", status: "No clear vision", urgency: "MEDIUM", days: 180, progress: 0 },
    { id: "sevenstudio", label: "Seven Studio", color: "#F7DC6F", bg: "#1A1800", icon: "🚀", win: "3 cohorts, 1000+ teams", status: "Concept stage", urgency: "MEDIUM", days: 180, progress: 0 },
    { id: "n8n", label: "n8n Business", color: "#A29BFE", bg: "#0D0A1A", icon: "⚡", win: "Stable income", status: "Learning phase", urgency: "MEDIUM", days: 180, progress: 0 },
    { id: "sat", label: "SAT", color: "#FF4757", bg: "#1A0608", icon: "🎯", win: "1550+ score", status: "1300 → need +250", urgency: "CRITICAL", days: 29, progress: 0 },
    { id: "ap", label: "AP Exams", color: "#FFA502", bg: "#0A0E00", icon: "📐", win: "Score 4-5 both", status: "Behind on curriculum", urgency: "HIGH", days: 88, progress: 0 },
    { id: "reading", label: "Inner State", color: "#2ED573", bg: "#0A1A0D", icon: "📖", win: "Daily 30min habit", status: "Inconsistent", urgency: "MEDIUM", days: 240, progress: 0 },
];

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { data, error } = await supabase
                .from('domains')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            // Seed if empty
            if (!data || data.length === 0) {
                const { data: seeded, error: seedErr } = await supabase
                    .from('domains')
                    .insert(defaultDomains)
                    .select();
                if (seedErr) throw seedErr;
                return res.json(seeded);
            }

            return res.json(data);
        }

        if (req.method === 'POST') {
            // Reset all progress to 0
            const { error } = await supabase
                .from('domains')
                .update({ progress: 0 })
                .neq('id', '');

            if (error) throw error;
            return res.json({ ok: true, message: 'All progress reset to 0' });
        }

        res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('Domains error:', err.message);
        res.status(500).json({ error: 'Failed to handle domains request' });
    }
}
