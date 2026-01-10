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
        
        // 停止位置の記憶（次回再生時に少し前から再生するため）
        this.lastStoppedTime = null;
        
        // スクラッチ再生用
        this.scratchSourceNode = null;
        this.scratchGainNode = null;
        this.isScratching = false;
        
        // 最後にクリックした位置
        this.lastClickedTime = null;
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
        // 停止時の位置を記録
        if (this.isPlaying && this.sourceNode && this.sourceNode.buffer) {
            const currentTime = this.getCurrentPlaybackTime();
            if (currentTime !== null) {
                this.lastStoppedTime = currentTime;
            }
        }
        
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
    
    // 最後に停止した位置を取得（少し前から再生するための計算用）
    getLastStoppedTime() {
        return this.lastStoppedTime;
    }
    
    // 停止位置をクリア（最初から再生する場合など）
    clearLastStoppedTime() {
        this.lastStoppedTime = null;
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
    
    // スクラッチ再生（短い時間のサンプル再生）
    playScratch(audioBuffer, startTime, duration = 0.1) {
        if (!audioBuffer || this.isScratching) return;
        
        // 範囲チェック
        if (startTime < 0 || startTime >= audioBuffer.duration) return;
        
        // 既存のスクラッチ再生を停止
        this.stopScratch();
        
        try {
            const endTime = Math.min(startTime + duration, audioBuffer.duration);
            const actualDuration = endTime - startTime;
            
            if (actualDuration <= 0) return;
            
            // 短いサンプルを再生
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // GainNodeでボリューム制御
            this.scratchGainNode = this.audioContext.createGain();
            this.scratchGainNode.gain.value = 1.0;
            
            source.connect(this.scratchGainNode);
            this.scratchGainNode.connect(this.audioContext.destination);
            
            this.scratchSourceNode = source;
            this.isScratching = true;
            
            // 再生開始（指定した位置から、短い時間だけ再生）
            const startAt = this.audioContext.currentTime;
            source.start(startAt, startTime);
            
            // 指定時間後に自動停止
            source.stop(startAt + actualDuration);
            
            // 自動停止後にクリーンアップ
            source.onended = () => {
                this.stopScratch();
            };
            
            return true;
        } catch (error) {
            console.error('スクラッチ再生エラー:', error);
            this.isScratching = false;
            return false;
        }
    }
    
    // スクラッチ再生を停止
    stopScratch() {
        if (this.scratchSourceNode) {
            try {
                this.scratchSourceNode.stop();
                this.scratchSourceNode.disconnect();
            } catch (e) {
                // 既に停止している場合など
            }
            this.scratchSourceNode = null;
        }
        if (this.scratchGainNode) {
            this.scratchGainNode.disconnect();
            this.scratchGainNode = null;
        }
        this.isScratching = false;
    }
    
    // 最後にクリックした位置を設定
    setLastClickedTime(time) {
        this.lastClickedTime = time;
    }
    
    // 最後にクリックした位置を取得
    getLastClickedTime() {
        return this.lastClickedTime;
    }
}
