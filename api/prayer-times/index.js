const ALMATY_LAT = '43.238293';
const ALMATY_LNG = '76.945465';

function subtractMinutes(timeStr, mins) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMin = h * 60 + m - mins;
    const newH = Math.floor(((totalMin % 1440) + 1440) % 1440 / 60);
    const newM = ((totalMin % 60) + 60) % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
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

async function fetchYearData(year) {
    const url = `https://api.muftyat.kz/prayer-times/${year}/${ALMATY_LAT}/${ALMATY_LNG}`;
    const response = await fetch(url);
    const json = await response.json();

    if (!json.result || json.result.length === 0) {
        return null;
    }

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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const year = today.getFullYear();

        const yearData = await fetchYearData(year);
        if (!yearData) throw new Error('ДУМК API error');

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
            suhoor: subtractMinutes(todayData.fajr, 10),
            iftar: todayData.sunset || todayData.maghrib,
            midnight: todayData.midnight || '',
        };

        res.json(result);
    } catch (err) {
        console.error('Prayer times error:', err.message);
        res.status(500).json({ error: 'Failed to fetch prayer times' });
    }
}
