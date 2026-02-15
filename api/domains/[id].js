import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        const updates = req.body;

        if (updates.progress !== undefined) {
            const { error } = await supabase
                .from('domains')
                .update({ progress: updates.progress, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('domains')
                .upsert({ id, ...updates, updated_at: new Date().toISOString() });
            if (error) throw error;
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('Update domain error:', err.message);
        res.status(500).json({ error: 'Failed to update domain' });
    }
}
