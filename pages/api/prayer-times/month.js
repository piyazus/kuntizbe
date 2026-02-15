const ALMATY_LAT = '43.238293';
const ALMATY_LNG = '76.945465';

function subtractMinutes(timeStr, mins) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + m - mins;
    const newH = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
    const newM = ((totalMin % 60) + 60) % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formatDateFromStr(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
}

async function fetchYearData(year) {
    const url = `https://api.muftyat.kz/prayer-times/${year}/${ALMATY_LAT}/${ALMATY_LNG}`;
    const response = await fetch(url);
    const json = await response.json();

    if (!json.result || json.result.length === 0) return null;

    return json.result.map(day => ({
        date: formatDateFromStr(day.Date),
        gregorian: day.Date,
        Date: day.Date,
        suhoor: subtractMinutes(day.fajr, 10),
        imsak: day.imsak,
        fajr: day.fajr,
        sunrise: day.sunrise,
        dhuhr: day.dhuhr,
        asr: day.asr,
        sunset: day.sunset,
        iftar: day.sunset || day.maghrib,
        maghrib: day.maghrib,
        isha: day.isha,
        midnight: day.midnight || '',
    }));
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const now = new Date();
        const month = parseInt(req.query.month) || (now.getMonth() + 1);
        const year = parseInt(req.query.year) || now.getFullYear();

        const yearData = await fetchYearData(year);
        if (!yearData) throw new Error('API error');

        const days = yearData.filter(d => {
            const parts = d.Date.split('-');
            return parseInt(parts[1]) === month;
        });

        res.json(days);
    } catch (err) {
        console.error('Monthly prayer times error:', err.message);
        res.status(500).json({ error: 'Failed to fetch monthly prayer times' });
    }
};
