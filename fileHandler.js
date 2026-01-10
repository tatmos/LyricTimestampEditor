// ファイルロード・出力処理クラス
class FileHandler {
    constructor(editor, uiController) {
        this.editor = editor;
        this.uiController = uiController;
    }

    // 音声ファイルを読み込み
    async loadAudioFile(file) {
        if (!file) return false;

        try {
            this.showStatus('ファイルを読み込み中...', 'info');

            // 再生中なら停止してから読み込み
            if (this.editor.audioPlayer && this.editor.audioPlayer.isPlaying) {
                this.editor.audioPlayer.stopPreview();
                this.editor.stopPlaybackAnimation();
                if (this.uiController) {
                    this.uiController.playBtn.disabled = false;
                    this.uiController.stopBtn.disabled = true;
                }
            }

            const arrayBuffer = await file.arrayBuffer();
            this.editor.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.editor.audioBuffer = await this.editor.audioContext.decodeAudioData(arrayBuffer);
            this.editor.audioPlayer = new AudioPlayer(this.editor.audioContext);
            
            // 新しいファイル読み込み時は停止位置とクリック位置をクリア
            if (this.editor.audioPlayer) {
                this.editor.audioPlayer.clearLastStoppedTime();
                this.editor.audioPlayer.setLastClickedTime(null);
            }
            
            // レベルメーターコンポーネントを初期化
            if (this.uiController) {
                this.uiController.lastClickTime = null;
                this.uiController.originalLevelMeter = new LevelMeter('original', this.editor.audioPlayer, true);
            
                // 波形を表示
                if (this.editor.originalWaveformViewer) {
                    this.editor.originalWaveformViewer.setAudioBuffer(this.editor.audioBuffer);
                    this.editor.originalWaveformViewer.setRange(0, this.editor.audioBuffer.duration);
                    if (this.uiController.dropOverlay) {
                        this.uiController.dropOverlay.classList.add('hidden');
                    }
                }
                
                this.editor.drawWaveform();
                this.uiController.enableControls();
            }
            
            // ファイル名を設定（拡張子を除く）
            if (this.uiController && this.uiController.outputFilenameInput && file && file.name) {
                const fileName = this.getFileNameWithoutExtension(file.name);
                this.uiController.outputFilenameInput.value = fileName;
            }
            
            this.showStatus('ファイルの読み込みが完了しました', 'success');
            return true;
        } catch (error) {
            this.showStatus('エラー: ' + error.message, 'error');
            console.error(error);
            return false;
        }
    }
    
    // ファイル名から拡張子を除く
    getFileNameWithoutExtension(fileName) {
        if (!fileName) return 'lyrics';
        const lastDotIndex = fileName.lastIndexOf('.');
        if (lastDotIndex > 0) {
            return fileName.substring(0, lastDotIndex);
        }
        return fileName;
    }

    // SRTファイルをインポート
    async importSRT(file) {
        if (!file) return false;

        try {
            this.showStatus('SRTファイルを読み込み中...', 'info');
            const lyrics = await Importer.loadSRT(file);
            
            if (lyrics.length === 0) {
                this.showStatus('SRTファイルに歌詞が含まれていません', 'error');
                return false;
            }

            // 既存の歌詞をクリアするかどうか確認
            const existingLyrics = this.editor.lyricManager.getAllLyrics();
            let shouldClear = false;
            
            if (existingLyrics.length > 0) {
                shouldClear = confirm(`既存の歌詞が${existingLyrics.length}件あります。上書きしますか？`);
            }

            if (shouldClear || existingLyrics.length === 0) {
                this.editor.lyricManager.clear();
            }

            // 歌詞を追加
            const addedCount = this.editor.lyricManager.addLyrics(lyrics);
            
            // ファイル名を設定（拡張子を除く）
            if (this.uiController && this.uiController.outputFilenameInput && file && file.name) {
                const fileName = this.getFileNameWithoutExtension(file.name);
                this.uiController.outputFilenameInput.value = fileName;
            }
            
            this.showStatus(`SRTファイルから${addedCount}件の歌詞を読み込みました`, 'success');
            
            return true;
        } catch (error) {
            this.showStatus('SRTファイルの読み込みエラー: ' + error.message, 'error');
            console.error(error);
            return false;
        }
    }

    // JSONファイルをインポート
    async importJSON(file) {
        if (!file) return false;

        try {
            this.showStatus('JSONファイルを読み込み中...', 'info');
            const lyrics = await Importer.loadJSON(file);
            
            if (lyrics.length === 0) {
                this.showStatus('JSONファイルに歌詞が含まれていません', 'error');
                return false;
            }

            // 既存の歌詞をクリアするかどうか確認
            const existingLyrics = this.editor.lyricManager.getAllLyrics();
            let shouldClear = false;
            
            if (existingLyrics.length > 0) {
                shouldClear = confirm(`既存の歌詞が${existingLyrics.length}件あります。上書きしますか？`);
            }

            if (shouldClear || existingLyrics.length === 0) {
                this.editor.lyricManager.clear();
            }

            // 歌詞を追加
            const addedCount = this.editor.lyricManager.addLyrics(lyrics);
            
            // ファイル名を設定（拡張子を除く）
            if (this.uiController && this.uiController.outputFilenameInput && file && file.name) {
                const fileName = this.getFileNameWithoutExtension(file.name);
                this.uiController.outputFilenameInput.value = fileName;
            }
            
            this.showStatus(`JSONファイルから${addedCount}件の歌詞を読み込みました`, 'success');
            
            return true;
        } catch (error) {
            this.showStatus('JSONファイルの読み込みエラー: ' + error.message, 'error');
            console.error(error);
            return false;
        }
    }

    // SRTファイルをエクスポート
    exportSRT() {
        const lyrics = this.editor.lyricManager.getAllLyrics();
        if (lyrics.length === 0) {
            this.showStatus('歌詞がありません', 'error');
            return false;
        }
        
        // ファイル名を取得
        let filename = 'lyrics';
        if (this.uiController && this.uiController.outputFilenameInput) {
            const inputValue = this.uiController.outputFilenameInput.value.trim();
            if (inputValue) {
                filename = inputValue;
            }
        }
        
        // 拡張子を追加
        if (!filename.toLowerCase().endsWith('.srt')) {
            filename += '.srt';
        }
        
        Exporter.downloadSRT(lyrics, filename);
        this.showStatus('SRTファイルをダウンロードしました', 'success');
        return true;
    }

    // JSONファイルをエクスポート
    exportJSON() {
        const lyrics = this.editor.lyricManager.getAllLyrics();
        if (lyrics.length === 0) {
            this.showStatus('歌詞がありません', 'error');
            return false;
        }
        
        // ファイル名を取得
        let filename = 'lyrics';
        if (this.uiController && this.uiController.outputFilenameInput) {
            const inputValue = this.uiController.outputFilenameInput.value.trim();
            if (inputValue) {
                filename = inputValue;
            }
        }
        
        // 拡張子を追加
        if (!filename.toLowerCase().endsWith('.json')) {
            filename += '.json';
        }
        
        Exporter.downloadJSON(lyrics, filename);
        this.showStatus('JSONファイルをダウンロードしました', 'success');
        return true;
    }

    // ステータス表示用のヘルパーメソッド
    showStatus(message, type = 'info') {
        if (this.uiController) {
            this.uiController.showStatus(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
}
