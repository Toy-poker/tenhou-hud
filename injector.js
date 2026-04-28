const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
    const ws = protocols
        ? new OriginalWebSocket(url, protocols)
        : new OriginalWebSocket(url);

    ws.addEventListener('message', function(event) {
        const data = event.data;
        if (typeof data === 'string') {
            try {
                const json = JSON.parse(data);

                // ゲーム種別を取得
                if (json.tag === 'GO') {
                    const type = parseInt(json.type || '0');
                    const playernum = (type & 16) ? 3 : 4; // 16ビット目が立っていれば三麻
                    console.log('★ゲーム種別:', playernum + '人打ち', 'type:', type);
                    window.dispatchEvent(new CustomEvent('tenhou-gametype', {
                        detail: { playernum: playernum }
                    }));
                }

                // プレイヤー名を取得
                if (json.tag === 'UN') {
                    window.dispatchEvent(new CustomEvent('tenhou-players', {
                        detail: {
                            n0: json.n0, n1: json.n1,
                            n2: json.n2, n3: json.n3
                        }
                    }));
                }
                // 対局終了を検知
               if (json.tag === 'RANKING') {
                window.dispatchEvent(new CustomEvent('tenhou-end'));
            }
            
            } catch(e) {}
        }
    });

    return ws;
};