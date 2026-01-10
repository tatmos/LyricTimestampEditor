// 歌詞管理クラス
class LyricManager {
    constructor() {
        this.lyrics = []; // { id, startTime, text, endTime }
        this.nextId = 1;
        this.endTimeOffset = 0.01; // 終了時刻のオフセット（秒）
        this.onLyricsChange = null; // コールバック関数
    }

    // 歌詞を追加
    addLyric(startTime, text) {
        if (text.trim() === '') {
            return null;
        }

        const lyric = {
            id: this.nextId++,
            startTime: startTime,
            text: text.trim(),
            endTime: null // 後で設定される
        };

        this.lyrics.push(lyric);
        this.updateEndTimes();
        this.sortLyrics();
        
        if (this.onLyricsChange) {
            this.onLyricsChange();
        }

        return lyric;
    }

    // 歌詞を更新
    updateLyric(id, updates) {
        const lyric = this.lyrics.find(l => l.id === id);
        if (!lyric) return false;

        if (updates.startTime !== undefined) {
            lyric.startTime = updates.startTime;
        }
        if (updates.text !== undefined) {
            lyric.text = updates.text.trim();
        }
        if (updates.endTime !== undefined) {
            lyric.endTime = updates.endTime;
        }

        this.updateEndTimes();
        this.sortLyrics();

        if (this.onLyricsChange) {
            this.onLyricsChange();
        }

        return true;
    }

    // 歌詞を削除
    deleteLyric(id) {
        const index = this.lyrics.findIndex(l => l.id === id);
        if (index === -1) return false;

        this.lyrics.splice(index, 1);
        this.updateEndTimes();

        if (this.onLyricsChange) {
            this.onLyricsChange();
        }

        return true;
    }

    // 終了時刻を更新（次のイベントの開始時刻より少し前）
    updateEndTimes() {
        // 開始時刻でソート
        this.sortLyrics();

        for (let i = 0; i < this.lyrics.length; i++) {
            const currentLyric = this.lyrics[i];
            
            // 次の歌詞を探す
            const nextLyric = this.lyrics.find((l, idx) => 
                idx > i && l.startTime > currentLyric.startTime
            );

            if (nextLyric) {
                // 次の歌詞の開始時刻より少し前を終了時刻に設定
                currentLyric.endTime = Math.max(
                    currentLyric.startTime + 0.01,
                    nextLyric.startTime - this.endTimeOffset
                );
            } else {
                // 最後の歌詞の場合、開始時刻 + 1秒を終了時刻にする（後で編集可能）
                if (currentLyric.endTime === null) {
                    currentLyric.endTime = currentLyric.startTime + 1.0;
                }
            }
        }
    }

    // 歌詞を開始時刻でソート
    sortLyrics() {
        this.lyrics.sort((a, b) => a.startTime - b.startTime);
    }

    // 全ての歌詞を取得
    getAllLyrics() {
        return [...this.lyrics];
    }

    // 歌詞をクリア
    clear() {
        this.lyrics = [];
        if (this.onLyricsChange) {
            this.onLyricsChange();
        }
    }

    // 指定時刻の歌詞を取得（複数ある場合は最初のもの）
    getLyricAtTime(time) {
        return this.lyrics.find(l => 
            l.startTime <= time && 
            (l.endTime === null || time <= l.endTime)
        );
    }
}
