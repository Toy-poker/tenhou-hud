let scaleCache = null;

async function getScale() {
    if (scaleCache) return scaleCache;
    try {
        const res = await fetch('https://nodocchi.moe/s/phoenix_scale_all.js');
        const text = await res.text();
        scaleCache = JSON.parse(text);
        return scaleCache;
    } catch(e) {
        console.error('scale取得失敗:', e);
        return null;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_STATS') {
        const playerId = message.playerId;
        const url = `https://nodocchi.moe/api/phoenix_status.php?all=1&username=${encodeURIComponent(playerId)}`;

        Promise.all([
            fetch(url).then(r => r.json()),
            getScale()
        ])
        .then(([data, scale]) => {
            sendResponse({ success: true, data: data, scale: scale });
        })
        .catch(err => {
            sendResponse({ success: false, error: err.message });
        });

        return true;
    }
});