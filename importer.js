// SRT/JSONインポートクラス
class Importer {
    // SRT形式をパース
    static parseSRT(content) {
        if (!content || typeof content !== 'string') {
            throw new Error('SRTファイルの内容が無効です');
        }

        const lyrics = [];
        const blocks = content.trim().split(/\n\s*\n/); // 空行で区切る

        for (const block of blocks) {
            if (!block.trim()) continue;

            const lines = block.trim().split('\n');
            if (lines.length < 3) continue; // シーケンス番号、時刻、テキストの3行以上が必要

            // 時刻行を取得（例: "00:00:00,000 --> 00:00:05,000"）
            const timeLine = lines[1];
            const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
            
            if (!timeMatch) continue;

            // 開始時刻と終了時刻を秒に変換
            const startTime = this.parseSRTTime(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
            const endTime = this.parseSRTTime(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);

            // テキストを取得（3行目以降）
            const text = lines.slice(2).join('\n').trim();

            if (text && startTime >= 0 && endTime > startTime) {
                lyrics.push({
                    startTime: startTime,
                    endTime: endTime,
                    text: text
                });
            }
        }

        return lyrics.sort((a, b) => a.startTime - b.startTime);
    }

    // JSON形式をパース
    static parseJSON(content) {
        if (!content || typeof content !== 'string') {
            throw new Error('JSONファイルの内容が無効です');
        }

        let data;
        try {
            data = JSON.parse(content);
        } catch (error) {
            throw new Error('JSONファイルのパースに失敗しました: ' + error.message);
        }

        if (!Array.isArray(data)) {
            throw new Error('JSONファイルは配列形式である必要があります');
        }

        const lyrics = [];

        for (const item of data) {
            if (!item || typeof item !== 'object') continue;

            const startTime = parseFloat(item.startTime);
            const endTime = item.endTime !== undefined ? parseFloat(item.endTime) : null;
            const text = item.text ? String(item.text).trim() : '';

            if (isNaN(startTime) || startTime < 0) continue;
            if (text === '') continue;

            // endTimeが無効な場合は、startTime + 1秒を設定
            const validEndTime = (endTime !== null && !isNaN(endTime) && endTime > startTime) 
                ? endTime 
                : startTime + 1.0;

            lyrics.push({
                startTime: startTime,
                endTime: validEndTime,
                text: text
            });
        }

        return lyrics.sort((a, b) => a.startTime - b.startTime);
    }

    // SRT形式の時間文字列を秒に変換
    static parseSRTTime(hours, minutes, seconds, milliseconds) {
        const h = parseInt(hours, 10) || 0;
        const m = parseInt(minutes, 10) || 0;
        const s = parseInt(seconds, 10) || 0;
        const ms = parseInt(milliseconds, 10) || 0;

        return h * 3600 + m * 60 + s + ms / 1000;
    }

    // ファイルからSRTを読み込み
    static async loadSRT(file) {
        const content = await file.text();
        return this.parseSRT(content);
    }

    // ファイルからJSONを読み込み
    static async loadJSON(file) {
        const content = await file.text();
        return this.parseJSON(content);
    }
}
