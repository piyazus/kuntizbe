module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
        status: 'JARVIS backend online',
        mode: process.env.ANTHROPIC_API_KEY ? 'AI' : 'FALLBACK',
        database: 'Supabase PostgreSQL',
        prayerTimes: 'ДУМК Kazakhstan API'
    });
};
