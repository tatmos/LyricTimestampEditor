// オーディオ再生クラス
class AudioPlayer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sourceNode = null;
        this.gainNode = null;
        this.analyserNode = null;
        this.startTime = null;
        this.isPlaying = false;
        
        // ミュート状態
        this.originalMuted = false; // 初期状態では有効
        
        // レベルメータ用のデータ配列
        this.levels = null;
    }

    // バッファを再生
    // audioBuffer: 再生するバッファ
    // offsetSeconds: 再生開始位置（秒）
    playPreview(audioBuffer, offsetSeconds = 0) {
        if (!audioBuffer || this.isPlaying) return false;

        try {
            // オフセットを範囲に収める
            let offset = audioBuffer.duration > 0 ? (offsetSeconds % audioBuffer.duration) : 0;
            if (offset < 0) {
                offset += audioBuffer.duration;
            }
            
            // 再生開始時刻を決定
            const startAt = this.audioContext.currentTime;
            
            // バッファを再生
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            source.loopStart = 0;
            source.loopEnd = audioBuffer.duration;
            
            // GainNodeでボリューム制御
            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.originalMuted ? 0 : 1;
            
            // AnalyserNodeでレベルメータ用のデータを取得
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            this.levels = new Uint8Array(this.analyserNode.frequencyBinCount);
            
            source.connect(this.gainNode);
            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);
            
            this.sourceNode = source;
            
            // 再生開始
            source.start(startAt, offset);
            
            // 再生位置計算用の基準時刻
            this.startTime = startAt - offset;
            this.isPlaying = true;
            return true;
        } catch (error) {
            console.error('再生エラー:', error);
            this.isPlaying = false;
            throw error;
        }
    }

    stopPreview() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
                this.sourceNode.disconnect();
            } catch (e) {
                // 既に停止している場合など
            }
            this.sourceNode = null;
        }
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        if (this.analyserNode) {
            this.analyserNode.disconnect();
            this.analyserNode = null;
        }
        this.startTime = null;
        this.isPlaying = false;
        this.levels = null;
    }

    // ミュート状態を切り替え
    setOriginalMuted(muted) {
        this.originalMuted = muted;
        if (this.gainNode) {
            this.gainNode.gain.value = muted ? 0 : 1;
        }
    }

    // レベルメータのデータを取得
    getOriginalLevels() {
        if (!this.analyserNode || !this.levels) {
            return null;
        }
        this.analyserNode.getByteFrequencyData(this.levels);
        return this.levels;
    }

    getCurrentPlaybackTime() {
        if (!this.isPlaying || this.startTime === null || !this.sourceNode || !this.sourceNode.buffer) {
            return null;
        }
        const elapsed = this.audioContext.currentTime - this.startTime;
        return elapsed % this.sourceNode.buffer.duration;
    }
}
