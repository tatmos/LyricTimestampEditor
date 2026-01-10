// 歌詞タイムスタンプエディタ
class LyricTimestampEditor {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null; // 波形のバッファ
        this.audioPlayer = null;
        this.originalWaveformViewer = null;
        this.animationFrameId = null;
        this.lyricManager = new LyricManager();
        
        this.initializeElements();
        this.uiController = new UIController(this);
    }

    initializeElements() {
        const originalCanvas = document.getElementById('original-waveform');
        const originalRuler = document.getElementById('ruler-original');
        
        this.originalWaveformViewer = new OriginalWaveformViewer(originalCanvas, originalRuler);
        
        // 歌詞変更時のコールバック
        this.lyricManager.onLyricsChange = () => {
            if (this.uiController) {
                this.uiController.updateLyricsTable();
            }
        };
    }

    // 波形上クリックによるシーク
    seekTo(timeInSeconds) {
        if (!this.audioPlayer || !this.audioBuffer) return;

        const duration = this.audioBuffer.duration;
        if (duration <= 0) return;

        // 範囲内にクリップ
        let targetTime = Math.max(0, Math.min(duration, timeInSeconds));

        // 再生中のみシーク
        if (this.audioPlayer.isPlaying) {
            this.audioPlayer.stopPreview();
            this.audioPlayer.playPreview(this.audioBuffer, targetTime);
        }
    }

    // 波形上クリックで歌詞追加モーダルを開く
    openLyricModal(timeInSeconds) {
        if (this.uiController) {
            this.uiController.openLyricModal(timeInSeconds);
        }
    }
    
    drawWaveform() {
        if (!this.audioBuffer || !this.originalWaveformViewer) return;
        
        const currentTime = this.audioPlayer ? this.audioPlayer.getCurrentPlaybackTime() : null;
        
        // 元波形の再生位置を表示
        if (this.audioPlayer && this.audioPlayer.isPlaying) {
            if (!this.audioPlayer.originalMuted) {
                this.originalWaveformViewer.render(currentTime);
            } else {
                this.originalWaveformViewer.render(null);
            }
        } else {
            this.originalWaveformViewer.render(null);
        }
    }

    startPlaybackAnimation() {
        const animate = () => {
            if (this.audioPlayer && this.audioPlayer.isPlaying) {
                this.drawWaveform();
                // レベルメータを更新
                if (this.uiController) {
                    this.uiController.updateLevelMeters();
                }
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.animationFrameId = null;
                // 再生が停止したらレベルメータをリセット
                if (this.uiController) {
                    this.uiController.updateLevelMeters();
                }
            }
        };
        if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(animate);
        }
    }

    stopPlaybackAnimation() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // 再生位置ラインを消すために再描画
        this.drawWaveform();
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new LyricTimestampEditor();
});
