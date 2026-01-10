// SRT/JSON出力クラス
class Exporter {
    // SRT形式で出力
    static exportSRT(lyrics) {
        if (!lyrics || lyrics.length === 0) {
            return '';
        }

        // 開始時刻でソート
        const sortedLyrics = [...lyrics].sort((a, b) => a.startTime - b.startTime);

        let srtContent = '';
        
        sortedLyrics.forEach((lyric, index) => {
            const sequence = index + 1;
            const startTime = this.formatSRTTime(lyric.startTime);
            const endTime = this.formatSRTTime(lyric.endTime || lyric.startTime + 1.0);
            
            srtContent += `${sequence}\n`;
            srtContent += `${startTime} --> ${endTime}\n`;
            srtContent += `${lyric.text}\n`;
            srtContent += `\n`;
        });

        return srtContent;
    }

    // JSON形式で出力
    static exportJSON(lyrics) {
        if (!lyrics || lyrics.length === 0) {
            return JSON.stringify([], null, 2);
        }

        // 開始時刻でソート
        const sortedLyrics = [...lyrics].sort((a, b) => a.startTime - b.startTime);

        // 出力用のデータ構造
        const exportData = sortedLyrics.map(lyric => ({
            startTime: lyric.startTime,
            endTime: lyric.endTime || lyric.startTime + 1.0,
            text: lyric.text
        }));

        return JSON.stringify(exportData, null, 2);
    }

    // SRT形式の時間フォーマット（00:00:00,000）
    static formatSRTTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    }

    // ファイルをダウンロード
    static downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // SRTファイルとしてダウンロード
    static downloadSRT(lyrics, filename = 'lyrics.srt') {
        const srtContent = this.exportSRT(lyrics);
        this.downloadFile(srtContent, filename, 'text/plain;charset=utf-8');
    }

    // JSONファイルとしてダウンロード
    static downloadJSON(lyrics, filename = 'lyrics.json') {
        const jsonContent = this.exportJSON(lyrics);
        this.downloadFile(jsonContent, filename, 'application/json;charset=utf-8');
    }
}
