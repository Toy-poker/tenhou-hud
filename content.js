console.log('天鳳HUD起動！');

let currentPlayerNum = 4;

window.addEventListener('tenhou-gametype', function(e) {
    currentPlayerNum = e.detail.playernum;
});

window.addEventListener('tenhou-players', function(e) {
    removeAllHUD();

    const { n0, n1, n2, n3 } = e.detail;
    const players = [n0, n1, n2, n3]
        .map(n => n ? decodeURIComponent(n) : null);

    console.log('★プレイヤー:', players);

    players.forEach((name, i) => {
        if (name && name !== 'COM') {
            chrome.runtime.sendMessage(
                { type: 'FETCH_STATS', playerId: name },
                response => {
                    if (response && response.success) {
                        showHUD(i, name, response.data, response.scale);
                    } else {
                        showHUDError(i, name);
                    }
                }
            );
        }
    });
});

window.addEventListener('tenhou-end', function() {
    removeAllHUD();
});

function removeAllHUD() {
    [0,1,2,3].forEach(i => {
        const hud = document.getElementById(`hud-${i}`);
        if (hud) {
            hud._resizeObserver && hud._resizeObserver.disconnect();
            hud.remove();
        }
    });
}

function showHUD(seat, name, data, scale) {
    const statsKey = currentPlayerNum === 3 ? 's3' : 's4';
    const stats = data[statsKey];
    const avg = scale ? scale[statsKey] : null;

    if (!stats || !stats.agariC) {
        showHUDError(seat, name);
        return;
    }

    const agari      = (stats.agariC              * 100).toFixed(1) ;
    const houjuu     = (stats.houjuuC             * 100).toFixed(1) ;
    const riichi     = (stats.riichC              * 100).toFixed(1) ;
    const fuuro      = (stats.fuuroC              * 100).toFixed(1) ;
    const fuuroMinus = (stats.fuuro_minus_houjuu_C * 100).toFixed(1) ;
    const dama       = (stats.damaV               * 100).toFixed(1) ;
    const some       = (stats.someV               * 100).toFixed(1) ;
    const chiitoi    = (stats.chiitoiV            * 100).toFixed(1) ;
    const games      = stats.totalrecord || '-';
    const antei      = stats['stablerank_phoenix_X']
        ? parseFloat(stats['stablerank_phoenix_X']).toFixed(2)
        : '-';

    renderHUD(seat, name, agari, houjuu, riichi, fuuro, games, antei, fuuroMinus, dama, some, chiitoi, stats, avg);
}

function showHUDError(seat, name) {
    renderHUD(seat, name, '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', null, null);
}

function getHUDPosition(seat) {
    switch(seat) {
        case 0: return 'top: 62%; left: 62%;';
        case 1: return 'top: 18%; left: 62%;';
        case 2: return 'top: 18%; left: 35%;';
        case 3: return 'top: 62%; left: 35%;';
    }
}

function calcStyle(avg, key, value, higherIsBad) {
    if (!avg || !avg[key]) return '';
    const data = avg[key].data;
    if (!data || data.length === 0) return '';

    const p10 = parseFloat(data[Math.floor(data.length * 0.10)]);
    const p20 = parseFloat(data[Math.floor(data.length * 0.20)]);
    const p80 = parseFloat(data[Math.floor(data.length * 0.80)]);
    const p90 = parseFloat(data[Math.floor(data.length * 0.90)]);

    const isBad10  = higherIsBad ? value > p90 : value < p10;
    const isBad20  = higherIsBad ? value > p80 : value < p20;
    const isGood10 = higherIsBad ? value < p10 : value > p90;
    const isGood20 = higherIsBad ? value < p20 : value > p80;

    if (isBad10 || isGood10) {
        return `font-weight:900; font-size:1.15em; color:#FF4444;`; // 赤・太字
    }
    if (isBad20 || isGood20) {
        return `color:#FFD700;`; // 黄
    }
    return `color:#44FF44;`; // 緑
}

function getArrow(avg, key, value, higherIsBad) {
    if (!avg || !avg[key]) return '';
    const data = avg[key].data;
    if (!data || data.length === 0) return '';

    const p20 = parseFloat(data[Math.floor(data.length * 0.20)]);
    const p80 = parseFloat(data[Math.floor(data.length * 0.80)]);

    // 緑の範囲（20〜80%）は矢印なし
    if (value >= p20 && value <= p80) return '';

    const mean = data.reduce((sum, v) => sum + parseFloat(v), 0) / data.length;
    return value > mean ? ' ↑' : ' ↓';
}

function renderHUD(seat, name, agari, houjuu, riichi, fuuro, games, antei, fuuroMinus, dama, some, chiitoi, stats, avg) {
    let hud = document.getElementById(`hud-${seat}`);
    if (hud) {
        updateHUDContent(hud, name, agari, houjuu, riichi, fuuro, games, antei, fuuroMinus, dama, some, chiitoi, stats, avg);
        return;
    }

    const savedKey = `hud-state-${seat}`;
    const savedState = JSON.parse(localStorage.getItem(savedKey) || 'null');

    hud = document.createElement('div');
    hud.id = `hud-${seat}`;
    hud.style.cssText = `
        position: fixed;
        ${savedState
            ? `top: ${savedState.topPct}%; left: ${savedState.leftPct}%; width: ${savedState.widthPx}px; font-size: ${savedState.fontSize}px;`
            : getHUDPosition(seat) + ' width: 180px; font-size: 12px;'
        }
        background: rgba(0,0,0,0.6);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        z-index: 9999;
        line-height: 1.8;
        border: 1px solid rgba(255,255,255,0.2);
        text-align: center;
        cursor: grab;
        overflow: hidden;
        user-select: none;
    `;

    const content = document.createElement('div');
    content.className = 'hud-content';
    hud.appendChild(content);

    const corners = [
        { pos: 'top: 0; left: 0;', cursor: 'nwse-resize', id: 'nw' },
        { pos: 'top: 0; right: 0;', cursor: 'nesw-resize', id: 'ne' },
        { pos: 'bottom: 0; left: 0;', cursor: 'nesw-resize', id: 'sw' },
        { pos: 'bottom: 0; right: 0;', cursor: 'nwse-resize', id: 'se' },
    ];

    const cornerHandles = {};
    corners.forEach(({ pos, cursor, id }) => {
        const handle = document.createElement('div');
        handle.style.cssText = `
            position: absolute;
            ${pos}
            width: 12px;
            height: 12px;
            cursor: ${cursor};
            z-index: 1;
        `;
        hud.appendChild(handle);
        cornerHandles[id] = handle;
    });

    const resizeHandleTop = document.createElement('div');
    resizeHandleTop.style.cssText = `
        position: absolute; left: 12px; top: 0;
        width: calc(100% - 24px); height: 6px; cursor: ns-resize;
    `;
    hud.appendChild(resizeHandleTop);

    const resizeHandleBottom = document.createElement('div');
    resizeHandleBottom.style.cssText = `
        position: absolute; left: 12px; bottom: 0;
        width: calc(100% - 24px); height: 6px; cursor: ns-resize;
    `;
    hud.appendChild(resizeHandleBottom);

    const resizeHandleLeft = document.createElement('div');
    resizeHandleLeft.style.cssText = `
        position: absolute; left: 0; top: 12px;
        width: 6px; height: calc(100% - 24px); cursor: ew-resize;
    `;
    hud.appendChild(resizeHandleLeft);

    const resizeHandleRight = document.createElement('div');
    resizeHandleRight.style.cssText = `
        position: absolute; right: 0; top: 12px;
        width: 6px; height: calc(100% - 24px); cursor: ew-resize;
    `;
    hud.appendChild(resizeHandleRight);

    function saveState() {
        const rect = hud.getBoundingClientRect();
        localStorage.setItem(savedKey, JSON.stringify({
            topPct: rect.top / window.innerHeight * 100,
            leftPct: rect.left / window.innerWidth * 100,
            widthPct: rect.width / window.innerWidth * 100,
            widthPx: rect.width,
            fontSize: parseFloat(hud.style.fontSize) || 12
        }));
    }

    let isDragging = false;
    let dragOffsetX, dragOffsetY;

    hud.addEventListener('mousedown', function(e) {
        const handles = [
            resizeHandleTop, resizeHandleBottom,
            resizeHandleLeft, resizeHandleRight,
            ...Object.values(cornerHandles)
        ];
        if (handles.includes(e.target)) return;
        isDragging = true;
        dragOffsetX = e.clientX - hud.getBoundingClientRect().left;
        dragOffsetY = e.clientY - hud.getBoundingClientRect().top;
        hud.style.cursor = 'grabbing';
        e.preventDefault();
    });

    let isResizingTop = false;
    let resizeTopStartY, resizeTopStartFontSize, resizeTopStartTop;

    resizeHandleTop.addEventListener('mousedown', function(e) {
        isResizingTop = true;
        resizeTopStartY = e.clientY;
        resizeTopStartFontSize = parseFloat(hud.style.fontSize) || 12;
        resizeTopStartTop = hud.getBoundingClientRect().top;
        e.preventDefault(); e.stopPropagation();
    });

    let isResizingBottom = false;
    let resizeBottomStartY, resizeBottomStartFontSize;

    resizeHandleBottom.addEventListener('mousedown', function(e) {
        isResizingBottom = true;
        resizeBottomStartY = e.clientY;
        resizeBottomStartFontSize = parseFloat(hud.style.fontSize) || 12;
        e.preventDefault(); e.stopPropagation();
    });

    let isResizingLeft = false;
    let resizeLeftStartX, resizeLeftStartW, resizeLeftStartLeft;

    resizeHandleLeft.addEventListener('mousedown', function(e) {
        isResizingLeft = true;
        resizeLeftStartX = e.clientX;
        resizeLeftStartW = hud.getBoundingClientRect().width;
        resizeLeftStartLeft = hud.getBoundingClientRect().left;
        e.preventDefault(); e.stopPropagation();
    });

    let isResizingRight = false;
    let resizeRightStartX, resizeRightStartW;

    resizeHandleRight.addEventListener('mousedown', function(e) {
        isResizingRight = true;
        resizeRightStartX = e.clientX;
        resizeRightStartW = hud.getBoundingClientRect().width;
        e.preventDefault(); e.stopPropagation();
    });

    let activeCorner = null;
    let cornerStartX, cornerStartY, cornerStartW, cornerStartFontSize;
    let cornerStartLeft, cornerStartTop;

    Object.entries(cornerHandles).forEach(([id, handle]) => {
        handle.addEventListener('mousedown', function(e) {
            activeCorner = id;
            cornerStartX = e.clientX;
            cornerStartY = e.clientY;
            const rect = hud.getBoundingClientRect();
            cornerStartW = rect.width;
            cornerStartFontSize = parseFloat(hud.style.fontSize) || 12;
            cornerStartLeft = rect.left;
            cornerStartTop = rect.top;
            e.preventDefault(); e.stopPropagation();
        });
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            hud.style.left = (e.clientX - dragOffsetX) + 'px';
            hud.style.top = (e.clientY - dragOffsetY) + 'px';
            hud.style.right = 'auto';
            hud.style.bottom = 'auto';
            hud.style.transform = 'none';
        }
        if (isResizingTop) {
            const delta = e.clientY - resizeTopStartY;
            const newFontSize = Math.max(8, resizeTopStartFontSize - delta * 0.1);
            hud.style.fontSize = newFontSize + 'px';
            hud.style.top = (resizeTopStartTop + (resizeTopStartFontSize - newFontSize) * 2) + 'px';
        }
        if (isResizingBottom) {
            const delta = e.clientY - resizeBottomStartY;
            hud.style.fontSize = Math.max(8, resizeBottomStartFontSize + delta * 0.1) + 'px';
        }
        if (isResizingLeft) {
            const newWidth = Math.max(80, resizeLeftStartW - (e.clientX - resizeLeftStartX));
            hud.style.width = newWidth + 'px';
            hud.style.left = (resizeLeftStartLeft + resizeLeftStartW - newWidth) + 'px';
        }
        if (isResizingRight) {
            hud.style.width = Math.max(80, resizeRightStartW + (e.clientX - resizeRightStartX)) + 'px';
        }
        if (activeCorner) {
            const dx = e.clientX - cornerStartX;
            const dy = e.clientY - cornerStartY;
            if (activeCorner === 'se') {
                hud.style.width = Math.max(80, cornerStartW + dx) + 'px';
                hud.style.fontSize = Math.max(8, cornerStartFontSize + dy * 0.1) + 'px';
            } else if (activeCorner === 'sw') {
                const newWidth = Math.max(80, cornerStartW - dx);
                hud.style.width = newWidth + 'px';
                hud.style.left = (cornerStartLeft + cornerStartW - newWidth) + 'px';
                hud.style.fontSize = Math.max(8, cornerStartFontSize + dy * 0.1) + 'px';
            } else if (activeCorner === 'ne') {
                hud.style.width = Math.max(80, cornerStartW + dx) + 'px';
                const newFontSize = Math.max(8, cornerStartFontSize - dy * 0.1);
                hud.style.fontSize = newFontSize + 'px';
                hud.style.top = (cornerStartTop + (cornerStartFontSize - newFontSize) * 2) + 'px';
            } else if (activeCorner === 'nw') {
                const newWidth = Math.max(80, cornerStartW - dx);
                hud.style.width = newWidth + 'px';
                hud.style.left = (cornerStartLeft + cornerStartW - newWidth) + 'px';
                const newFontSize = Math.max(8, cornerStartFontSize - dy * 0.1);
                hud.style.fontSize = newFontSize + 'px';
                hud.style.top = (cornerStartTop + (cornerStartFontSize - newFontSize) * 2) + 'px';
            }
        }
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            hud.style.cursor = 'grab';
            saveState();
        }
        if (isResizingTop || isResizingBottom || isResizingLeft || isResizingRight || activeCorner) {
            isResizingTop = false;
            isResizingBottom = false;
            isResizingLeft = false;
            isResizingRight = false;
            activeCorner = null;
            saveState();
        }
    });

    hud._resizeObserver = { disconnect: () => {} };
    document.body.appendChild(hud);
    updateHUDContent(hud, name, agari, houjuu, riichi, fuuro, games, antei, fuuroMinus, dama, some, chiitoi, stats, avg);
}

function updateHUDContent(hud, name, agari, houjuu, riichi, fuuro, games, antei, fuuroMinus, dama, some, chiitoi, stats, avg) {
    const content = hud.querySelector('.hud-content');
    if (!content) return;

    const agariStyle      = stats ? calcStyle(avg, 'agariC',               stats.agariC,               false) : '';
    const houjuuStyle     = stats ? calcStyle(avg, 'houjuuC',              stats.houjuuC,              true)  : '';
    const riichiStyle     = stats ? calcStyle(avg, 'riichC',               stats.riichC,               false) : '';
    const fuuroStyle      = stats ? calcStyle(avg, 'fuuroC',               stats.fuuroC,               false) : '';
    const fuuroMinusStyle = stats ? calcStyle(avg, 'fuuro_minus_houjuu_C', stats.fuuro_minus_houjuu_C, false) : '';
    const damaStyle       = stats ? calcStyle(avg, 'damaV',                stats.damaV,                false) : '';
    const someStyle       = stats ? calcStyle(avg, 'someV',                stats.someV,                false) : '';

    const agariArrow      = stats ? getArrow(avg, 'agariC',               stats.agariC,               false) : '';
    const houjuuArrow     = stats ? getArrow(avg, 'houjuuC',              stats.houjuuC,              true)  : '';
    const riichiArrow     = stats ? getArrow(avg, 'riichC',               stats.riichC,               false) : '';
    const fuuroArrow      = stats ? getArrow(avg, 'fuuroC',               stats.fuuroC,               false) : '';
    const fuuroMinusArrow = stats ? getArrow(avg, 'fuuro_minus_houjuu_C', stats.fuuro_minus_houjuu_C, false) : '';
    const damaArrow       = stats ? getArrow(avg, 'damaV',                stats.damaV,                false) : '';
    const someArrow       = stats ? getArrow(avg, 'someV',                stats.someV,                false) : '';

    content.innerHTML = `
        <div style="font-weight:bold; font-size:1.1em; margin-bottom:6px; color:#FFD700; text-align:center;">
            ${name} <span style="font-size:0.8em; color:#aaa">(${games})</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:2px 8px; text-align:left;">
            <div>和了率<br><span style="${agariStyle}">${agari}${agariArrow}</span></div>
            <div>放銃率<br><span style="${houjuuStyle}">${houjuu}${houjuuArrow}</span></div>
            <div>リーチ率<br><span style="${riichiStyle}">${riichi}${riichiArrow}</span></div>
            <div>副露率<br><span style="${fuuroStyle}">${fuuro}${fuuroArrow}</span></div>
            <div>鳴き防御<br><span style="${fuuroMinusStyle}">${fuuroMinus}${fuuroMinusArrow}</span></div>
            <div>染め手率<br><span style="${someStyle}">${some}${someArrow}</span></div>
            <div>ダマ率<br><span style="${damaStyle}">${dama}${damaArrow}</span></div>
            <div>安定段位<br><span style="color:#DDA0DD">${antei}</span></div>
        </div>
    `;
}
window.addEventListener('resize', function() {
    [0,1,2,3].forEach(i => {
        const hud = document.getElementById(`hud-${i}`);
        if (!hud) return;
        const savedKey = `hud-state-${i}`;
        const savedState = JSON.parse(localStorage.getItem(savedKey) || 'null');
        if (!savedState) return;

        hud.style.left = (savedState.leftPct / 100 * window.innerWidth) + 'px';
        hud.style.top = (savedState.topPct / 100 * window.innerHeight) + 'px';
        hud.style.width = (savedState.widthPct / 100 * window.innerWidth) + 'px';
        hud.style.fontSize = savedState.fontSize + 'px';
    });
});