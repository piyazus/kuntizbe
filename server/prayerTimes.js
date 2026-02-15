import express from 'express';

const router = express.Router();

// Cache prayer times for 24 hours
let cache = {};
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Almaty — ДУМК Kazakhstan official API (api.muftyat.kz)
// Same source as azan.kz — Hanafi madhab
const ALMATY_LAT = '43.238293';
const ALMATY_LNG = '76.945465';

// Helper: subtract minutes from HH:MM time string
function subtractMinutes(timeStr, mins) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + m - mins;
    const newH = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
    const newM = ((totalMin % 60) + 60) % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

// Get today's prayer times
router.get('/', async (req, res) => {
    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const year = today.getFullYear();
        const cacheKey = `daily-${dateStr}`;

        if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_TTL) {
            return res.json(cache[cacheKey].data);
        }

        // Fetch full year from ДУМК API
        const yearData = await fetchYearData(year);
        if (!yearData) throw new Error('ДУМК API error');

        // Find today's entry
        const todayData = yearData.find(d => d.Date === dateStr);
        if (!todayData) throw new Error('Date not found in data');

        const result = {
            date: formatDate(today),
            hijri: '',
            hijriMonth: '',
            hijriDay: '',
            source: 'ДУМК Kazakhstan (muftyat.kz)',
            prayers: {
                Fajr: todayData.fajr,
                Sunrise: todayData.sunrise,
                Dhuhr: todayData.dhuhr,
                Asr: todayData.asr,
                Maghrib: todayData.maghrib,
                Isha: todayData.isha,
            },
            suhoor: subtractMinutes(todayData.fajr, 10),  // 10 min before Fajr
            iftar: todayData.sunset || todayData.maghrib,  // Sunset = break fast
            midnight: todayData.midnight || '',
        };

        cache[cacheKey] = { data: result, ts: Date.now() };
        res.json(result);
    } catch (err) {
        console.error('Prayer times error:', err.message);
        res.status(500).json({ error: 'Failed to fetch prayer times' });
    }
});

// Get full month's prayer times (for Ramadan calendar)
router.get('/month', async (req, res) => {
    try {
        const now = new Date();
        const month = parseInt(req.query.month) || (now.getMonth() + 1);
        const year = parseInt(req.query.year) || now.getFullYear();
        const cacheKey = `month-${year}-${month}`;

        if (cache[cacheKey] && Date.now() - cache[cacheKey].ts < CACHE_TTL) {
            return res.json(cache[cacheKey].data);
        }

        const yearData = await fetchYearData(year);
        if (!yearData) throw new Error('ДУМК API error');

        // Filter for requested month
        const monthStr = String(month).padStart(2, '0');
        const days = yearData.filter(d => {
            const parts = d.Date.split('-');
            return parseInt(parts[1]) === month;
        });

        cache[cacheKey] = { data: days, ts: Date.now() };
        res.json(days);
    } catch (err) {
        console.error('Monthly prayer times error:', err.message);
        res.status(500).json({ error: 'Failed to fetch monthly prayer times' });
    }
});

// Fetch and cache full year data from ДУМК API
let yearCache = {};
async function fetchYearData(year) {
    if (yearCache[year] && Date.now() - yearCache[year].ts < CACHE_TTL) {
        return yearCache[year].data;
    }

    const url = `https://api.muftyat.kz/prayer-times/${year}/${ALMATY_LAT}/${ALMATY_LNG}`;
    console.log(`  🕌 Fetching prayer times from ДУМК API: ${year}`);
    const response = await fetch(url);
    const json = await response.json();

    if (!json.result || json.result.length === 0) {
        return null;
    }

    // Normalize the data
    const data = json.result.map(day => ({
        date: formatDateFromStr(day.Date),
        gregorian: day.Date,
        Date: day.Date,
        suhoor: subtractMinutes(day.fajr, 10),  // 10 min before Fajr
        imsak: day.imsak,
        fajr: day.fajr,
        sunrise: day.sunrise,
        dhuhr: day.dhuhr,
        asr: day.asr,
        sunset: day.sunset,
        iftar: day.sunset || day.maghrib,  // Iftar at sunset
        maghrib: day.maghrib,
        isha: day.isha,
        midnight: day.midnight || '',
    }));

    yearCache[year] = { data, ts: Date.now() };
    return data;
}

function formatDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateFromStr(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

export default router;
