// UI制御クラス
class UIController {
    constructor(editor) {
        this.editor = editor;
        this.initializeElements();
        this.setupEventListeners();
        this.currentModalTime = null;
    }

    initializeElements() {
        this.fileInput = document.getElementById('file-input');
        this.playBtn = document.getElementById('play-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.status = document.getElementById('status');
        this.dropZone = document.getElementById('original-drop-zone');
        this.dropOverlay = document.getElementById('drop-overlay');
        this.originalWaveform = document.getElementById('original-waveform');
        this.originalSpeakerBtn = document.getElementById('original-speaker-btn');
        this.lyricsTbody = document.getElementById('lyrics-tbody');
        this.exportSrtBtn = document.getElementById('export-srt-btn');
        this.exportJsonBtn = document.getElementById('export-json-btn');
        
        // モーダル関連
        this.lyricModal = document.getElementById('lyric-modal');
        this.modalClose = document.getElementById('modal-close');
        this.lyricTimeInput = document.getElementById('lyric-time');
        this.lyricTextInput = document.getElementById('lyric-text');
        this.lyricCancelBtn = document.getElementById('lyric-cancel-btn');
        this.lyricSaveBtn = document.getElementById('lyric-save-btn');
        
        // レベルメーター
        this.originalLevelMeter = null;
    }

    setupEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.playBtn.addEventListener('click', () => this.playPreview());
        this.stopBtn.addEventListener('click', () => this.stopPreview());
        
        this.originalSpeakerBtn.addEventListener('click', () => this.toggleOriginalMute());
        
        // 波形上クリックで歌詞追加モーダルを開く
        if (this.originalWaveform) {
            this.originalWaveform.addEventListener('click', (e) => this.handleWaveformClick(e));
        }

        // ドロップゾーン
        if (this.dropZone) {
            ['dragenter', 'dragover'].forEach(evt => {
                this.dropZone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.dropZone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(evt => {
                this.dropZone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.dropZone.classList.remove('dragover');
                });
            });

            this.dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer?.files;
                if (files && files.length > 0) {
                    this.fileInput.value = '';
                    this.loadFile(files[0]);
                }
            });
        }

        // エクスポートボタン
        if (this.exportSrtBtn) {
            this.exportSrtBtn.addEventListener('click', () => this.exportSRT());
        }
        if (this.exportJsonBtn) {
            this.exportJsonBtn.addEventListener('click', () => this.exportJSON());
        }

        // モーダル関連
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.closeLyricModal());
        }
        if (this.lyricCancelBtn) {
            this.lyricCancelBtn.addEventListener('click', () => this.closeLyricModal());
        }
        if (this.lyricSaveBtn) {
            this.lyricSaveBtn.addEventListener('click', () => this.saveLyric());
        }
        if (this.lyricModal) {
            this.lyricModal.addEventListener('click', (e) => {
                if (e.target === this.lyricModal) {
                    this.closeLyricModal();
                }
            });
        }

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
            if (isInput) {
                if (e.key === 'Escape' && !this.lyricModal.classList.contains('hidden')) {
                    this.closeLyricModal();
                }
                return;
            }
            
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                this.togglePlayback();
            }
        });

        // Enterキーでモーダル保存
        if (this.lyricTextInput) {
            this.lyricTextInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.saveLyric();
                }
            });
        }
    }

    // 波形上クリック処理
    handleWaveformClick(e) {
        if (!this.editor.audioBuffer) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        if (width <= 0) return;

        const ratio = Math.min(1, Math.max(0, x / width));
        const duration = this.editor.audioBuffer.duration;
        const targetTime = duration * ratio;

        // 再生中の場合はシーク、そうでなければ歌詞追加モーダルを開く
        if (this.editor.audioPlayer && this.editor.audioPlayer.isPlaying) {
            this.editor.seekTo(targetTime);
        } else {
            this.openLyricModal(targetTime);
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        await this.loadFile(file);
    }

    async loadFile(file) {
        if (!file) return;

        this.showStatus('ファイルを読み込み中...', 'info');

        try {
            // 再生中なら停止してから読み込み
            if (this.editor.audioPlayer && this.editor.audioPlayer.isPlaying) {
                this.editor.audioPlayer.stopPreview();
                this.editor.stopPlaybackAnimation();
                this.playBtn.disabled = false;
                this.stopBtn.disabled = true;
            }

            const arrayBuffer = await file.arrayBuffer();
            this.editor.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.editor.audioBuffer = await this.editor.audioContext.decodeAudioData(arrayBuffer);
            this.editor.audioPlayer = new AudioPlayer(this.editor.audioContext);
            
            // レベルメーターコンポーネントを初期化
            this.originalLevelMeter = new LevelMeter('original', this.editor.audioPlayer, true);
            
            // 波形を表示
            if (this.editor.originalWaveformViewer) {
                this.editor.originalWaveformViewer.setAudioBuffer(this.editor.audioBuffer);
                this.editor.originalWaveformViewer.setRange(0, this.editor.audioBuffer.duration);
                if (this.dropOverlay) {
                    this.dropOverlay.classList.add('hidden');
                }
            }
            
            this.editor.drawWaveform();
            this.enableControls();
            this.showStatus('ファイルの読み込みが完了しました', 'success');
        } catch (error) {
            this.showStatus('エラー: ' + error.message, 'error');
            console.error(error);
        }
    }

    togglePlayback() {
        if (!this.editor.audioBuffer || !this.editor.audioPlayer) return;
        
        if (this.editor.audioPlayer.isPlaying) {
            this.stopPreview();
        } else {
            this.playPreview();
        }
    }

    async playPreview() {
        if (!this.editor.audioBuffer || !this.editor.audioPlayer) return;

        try {
            this.playBtn.disabled = true;
            this.stopBtn.disabled = false;

            const started = this.editor.audioPlayer.playPreview(this.editor.audioBuffer, 0);
            if (!started) {
                this.playBtn.disabled = false;
                this.stopBtn.disabled = true;
                return;
            }

            this.editor.startPlaybackAnimation();
            this.showStatus('再生中...', 'info');
        } catch (error) {
            this.showStatus('再生エラー: ' + error.message, 'error');
            console.error(error);
            this.playBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }

    stopPreview() {
        if (this.editor.audioPlayer) {
            this.editor.audioPlayer.stopPreview();
        }
        this.editor.stopPlaybackAnimation();
        this.playBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.showStatus('停止しました', 'info');
    }

    toggleOriginalMute() {
        if (!this.editor.audioPlayer) return;
        
        const currentMuted = this.editor.audioPlayer.originalMuted;
        const newMuted = !currentMuted;
        this.editor.audioPlayer.setOriginalMuted(newMuted);
        
        if (this.originalSpeakerBtn) {
            const icon = this.originalSpeakerBtn.querySelector('.speaker-icon');
            if (icon) {
                icon.textContent = newMuted ? '🔇' : '🔊';
            }
            if (newMuted) {
                this.originalSpeakerBtn.classList.add('muted');
            } else {
                this.originalSpeakerBtn.classList.remove('muted');
            }
        }
        
        // 再生中の場合、再開する必要がある
        if (this.editor.audioPlayer.isPlaying && this.editor.audioBuffer) {
            const currentTime = this.editor.audioPlayer.getCurrentPlaybackTime();
            this.editor.audioPlayer.stopPreview();
            this.editor.audioPlayer.playPreview(this.editor.audioBuffer, currentTime || 0);
        }
    }

    updateLevelMeters() {
        if (this.originalLevelMeter) {
            this.originalLevelMeter.update();
        }
    }

    // 歌詞モーダルを開く
    openLyricModal(timeInSeconds) {
        if (!this.lyricModal) return;
        
        this.currentModalTime = timeInSeconds;
        
        if (this.lyricTimeInput) {
            this.lyricTimeInput.value = timeInSeconds.toFixed(2);
        }
        if (this.lyricTextInput) {
            this.lyricTextInput.value = '';
            this.lyricTextInput.focus();
        }
        
        this.lyricModal.classList.remove('hidden');
    }

    // 歌詞モーダルを閉じる
    closeLyricModal() {
        if (this.lyricModal) {
            this.lyricModal.classList.add('hidden');
        }
        this.currentModalTime = null;
    }

    // 歌詞を保存
    saveLyric() {
        if (this.currentModalTime === null) return;
        
        const text = this.lyricTextInput ? this.lyricTextInput.value.trim() : '';
        if (text === '') {
            this.showStatus('歌詞を入力してください', 'error');
            return;
        }

        this.editor.lyricManager.addLyric(this.currentModalTime, text);
        this.closeLyricModal();
        this.showStatus('歌詞を追加しました', 'success');
    }

    // 歌詞テーブルを更新
    updateLyricsTable() {
        if (!this.lyricsTbody) return;

        const lyrics = this.editor.lyricManager.getAllLyrics();

        if (lyrics.length === 0) {
            this.lyricsTbody.innerHTML = '<tr class="empty-row"><td colspan="4" class="empty-message">歌詞がまだありません。波形上をクリックして追加してください。</td></tr>';
            return;
        }

        this.lyricsTbody.innerHTML = '';

        lyrics.forEach((lyric) => {
            const row = document.createElement('tr');
            row.dataset.lyricId = lyric.id;

            // 開始時刻
            const startTimeCell = document.createElement('td');
            const startTimeInput = document.createElement('input');
            startTimeInput.type = 'number';
            startTimeInput.className = 'editable-time';
            startTimeInput.value = lyric.startTime.toFixed(2);
            startTimeInput.step = '0.01';
            startTimeInput.min = '0';
            startTimeInput.addEventListener('change', () => {
                const newTime = parseFloat(startTimeInput.value);
                if (!isNaN(newTime) && newTime >= 0) {
                    this.editor.lyricManager.updateLyric(lyric.id, { startTime: newTime });
                    this.showStatus('開始時刻を更新しました', 'success');
                }
            });
            startTimeCell.appendChild(startTimeInput);

            // 内容
            const textCell = document.createElement('td');
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'editable-text';
            textInput.value = lyric.text;
            textInput.addEventListener('change', () => {
                this.editor.lyricManager.updateLyric(lyric.id, { text: textInput.value });
                this.showStatus('内容を更新しました', 'success');
            });
            textCell.appendChild(textInput);

            // 終了時刻
            const endTimeCell = document.createElement('td');
            const endTimeInput = document.createElement('input');
            endTimeInput.type = 'number';
            endTimeInput.className = 'editable-time';
            endTimeInput.value = (lyric.endTime || lyric.startTime + 1.0).toFixed(2);
            endTimeInput.step = '0.01';
            endTimeInput.min = '0';
            endTimeInput.addEventListener('change', () => {
                const newTime = parseFloat(endTimeInput.value);
                if (!isNaN(newTime) && newTime >= 0) {
                    this.editor.lyricManager.updateLyric(lyric.id, { endTime: newTime });
                    this.showStatus('終了時刻を更新しました', 'success');
                }
            });
            endTimeCell.appendChild(endTimeInput);

            // 削除ボタン
            const actionCell = document.createElement('td');
            actionCell.style.textAlign = 'center';
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '削除';
            deleteBtn.addEventListener('click', () => {
                if (confirm('この歌詞を削除しますか？')) {
                    this.editor.lyricManager.deleteLyric(lyric.id);
                    this.showStatus('歌詞を削除しました', 'success');
                }
            });
            actionCell.appendChild(deleteBtn);

            row.appendChild(startTimeCell);
            row.appendChild(textCell);
            row.appendChild(endTimeCell);
            row.appendChild(actionCell);

            this.lyricsTbody.appendChild(row);
        });

        // エクスポートボタンを有効化
        if (this.exportSrtBtn) {
            this.exportSrtBtn.disabled = false;
        }
        if (this.exportJsonBtn) {
            this.exportJsonBtn.disabled = false;
        }
    }

    // SRT出力
    exportSRT() {
        const lyrics = this.editor.lyricManager.getAllLyrics();
        if (lyrics.length === 0) {
            this.showStatus('歌詞がありません', 'error');
            return;
        }
        Exporter.downloadSRT(lyrics);
        this.showStatus('SRTファイルをダウンロードしました', 'success');
    }

    // JSON出力
    exportJSON() {
        const lyrics = this.editor.lyricManager.getAllLyrics();
        if (lyrics.length === 0) {
            this.showStatus('歌詞がありません', 'error');
            return;
        }
        Exporter.downloadJSON(lyrics);
        this.showStatus('JSONファイルをダウンロードしました', 'success');
    }

    enableControls() {
        this.playBtn.disabled = false;
        if (this.originalSpeakerBtn) {
            this.originalSpeakerBtn.disabled = false;
        }
    }

    showStatus(message, type = 'info') {
        if (this.status) {
            this.status.textContent = message;
            this.status.className = 'status ' + type;
        }
    }
}
