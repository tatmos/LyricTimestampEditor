// UI制御クラス
class UIController {
    constructor(editor) {
        this.editor = editor;
        this.fileHandler = new FileHandler(editor, this);
        this.initializeElements();
        this.setupEventListeners();
        this.currentModalTime = null;
        
        // ドラッグ処理用
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartTime = null;
        this.lastClickTime = null;
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
        this.importSrtInput = document.getElementById('import-srt-input');
        this.importJsonInput = document.getElementById('import-json-input');
        this.outputFilenameInput = document.getElementById('output-filename-input');
        
        // ズームコントロール
        this.zoomInBtn = document.getElementById('zoom-in-btn');
        this.zoomOutBtn = document.getElementById('zoom-out-btn');
        this.zoomResetBtn = document.getElementById('zoom-reset-btn');
        
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
        
        // 波形上ドラッグ処理（クリック、ドラッグ、スクラッチ再生）
        if (this.originalWaveform) {
            this.originalWaveform.addEventListener('mousedown', (e) => this.handleWaveformMouseDown(e));
            this.originalWaveform.addEventListener('mousemove', (e) => this.handleWaveformMouseMove(e));
            this.originalWaveform.addEventListener('mouseup', (e) => this.handleWaveformMouseUp(e));
            this.originalWaveform.addEventListener('mouseleave', (e) => this.handleWaveformMouseUp(e));
            
            // タッチイベント対応
            this.originalWaveform.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                if (touch) {
                    this.handleWaveformMouseDown(touch);
                }
            }, { passive: false });
            this.originalWaveform.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                if (touch) {
                    this.handleWaveformMouseMove(touch);
                }
            }, { passive: false });
            this.originalWaveform.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleWaveformMouseUp(e);
            });
            this.originalWaveform.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.handleWaveformMouseUp(e);
            });
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
                    this.fileHandler.loadAudioFile(files[0]);
                }
            });
        }

        // エクスポートボタン
        if (this.exportSrtBtn) {
            this.exportSrtBtn.addEventListener('click', () => this.fileHandler.exportSRT());
        }
        if (this.exportJsonBtn) {
            this.exportJsonBtn.addEventListener('click', () => this.fileHandler.exportJSON());
        }

        // インポートボタン
        if (this.importSrtInput) {
            this.importSrtInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.fileHandler.importSRT(file);
                    e.target.value = ''; // リセット
            }
        });
    }
        if (this.importJsonInput) {
            this.importJsonInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await this.fileHandler.importJSON(file);
                    e.target.value = ''; // リセット
                }
            });
        }

        // ズームコントロール
        if (this.zoomInBtn) {
            this.zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (this.zoomOutBtn) {
            this.zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
        if (this.zoomResetBtn) {
            this.zoomResetBtn.addEventListener('click', () => this.zoomReset());
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
            
            // 左右矢印キーでシーク（再生中のみ）
            if (this.editor.audioPlayer && this.editor.audioPlayer.isPlaying && this.editor.audioBuffer) {
                if (e.key === 'ArrowLeft' || e.code === 'ArrowLeft') {
                    e.preventDefault();
                    this.seekRelative(-5.0); // 5秒戻る
                } else if (e.key === 'ArrowRight' || e.code === 'ArrowRight') {
                    e.preventDefault();
                    this.seekRelative(5.0); // 5秒進む
                }
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

    // 波形上で時刻を計算（拡大機能を考慮）
    calculateTimeFromPosition(e, canvas) {
        if (!this.editor.audioBuffer || !this.editor.originalWaveformViewer) return null;

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const x = clientX - rect.left;
        const width = rect.width;
        if (width <= 0) return null;

        // 拡大機能を考慮した時刻計算
        const viewStartTime = this.editor.originalWaveformViewer.viewStartTime;
        const viewEndTime = this.editor.originalWaveformViewer.viewEndTime;
        const viewDuration = viewEndTime - viewStartTime;
        const timeScale = width / viewDuration;
        
        const targetTime = viewStartTime + (x / timeScale);
        
        // 範囲内にクリップ
        const duration = this.editor.audioBuffer.duration;
        return Math.max(0, Math.min(duration, targetTime));
    }

    // 波形上マウスダウン処理
    handleWaveformMouseDown(e) {
        if (!this.editor.audioBuffer || !this.editor.originalWaveformViewer || !this.editor.audioPlayer) return;

        const time = this.calculateTimeFromPosition(e, this.originalWaveform);
        if (time === null) return;

        this.isDragging = true;
        this.dragStartX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        this.dragStartTime = time;
        
        // 最後にクリックした位置を記録
        this.lastClickTime = time;
        this.editor.audioPlayer.setLastClickedTime(time);

        // 再生中の場合はシーク
        if (this.editor.audioPlayer.isPlaying) {
            this.editor.seekTo(time);
            } else {
            // スクラッチ再生を開始
            this.editor.audioPlayer.playScratch(this.editor.audioBuffer, time, 0.15);
        }
    }

    // 波形上マウスムーブ処理（ドラッグ中）
    handleWaveformMouseMove(e) {
        if (!this.isDragging || !this.editor.audioBuffer || !this.editor.audioPlayer) return;

        const time = this.calculateTimeFromPosition(e, this.originalWaveform);
        if (time === null) return;

        // ドラッグ距離を計算（5ピクセル以上動いたらドラッグと判定）
        const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
        const dragDistance = Math.abs(clientX - this.dragStartX);

        if (dragDistance > 5) {
            // スクラッチ再生（短いサンプルを再生）
            this.editor.audioPlayer.playScratch(this.editor.audioBuffer, time, 0.15);
        }
    }

    // 波形上マウスアップ処理
    handleWaveformMouseUp(e) {
        if (!this.isDragging) return;

        // マウスアップ位置の時刻を計算
        const endClientX = e.clientX !== undefined ? e.clientX : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : this.dragStartX);
        const dragDistance = Math.abs(endClientX - this.dragStartX);
        const wasDragging = dragDistance > 5;
        
        // スクラッチ再生を停止
        if (this.editor.audioPlayer) {
            this.editor.audioPlayer.stopScratch();
        }

        // 再生中でない場合のみモーダルを開く
        if (!this.editor.audioPlayer.isPlaying) {
            let targetTime = null;
            
            if (wasDragging) {
                // ドラッグしていた場合、最後の位置で歌詞追加モーダルを開く
                targetTime = this.calculateTimeFromPosition(e, this.originalWaveform);
        } else {
                // クリックのみの場合（ドラッグしていない）、最初にクリックした位置でモーダルを開く
                targetTime = this.dragStartTime;
            }
            
            if (targetTime !== null) {
                // 少し待ってからモーダルを開く（スクラッチ再生が終わってから）
                setTimeout(() => {
                    this.openLyricModal(targetTime);
                }, 150);
            }
        }

        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartTime = null;
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        await this.fileHandler.loadAudioFile(file);
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

            // 優先順位: 最後にクリックした位置 > 前回停止した位置 > 0
            let startOffset = 0;
            const lastClickedTime = this.editor.audioPlayer.getLastClickedTime();
            const lastStoppedTime = this.editor.audioPlayer.getLastStoppedTime();
            
            if (lastClickedTime !== null) {
                // 最後にクリックした位置から再生
                startOffset = lastClickedTime;
            } else if (lastStoppedTime !== null) {
                // 前回停止した位置の少し前（0.5秒前）から再生
                startOffset = Math.max(0, lastStoppedTime - 0.5);
            }

            const started = this.editor.audioPlayer.playPreview(this.editor.audioBuffer, startOffset);
            if (!started) {
                this.playBtn.disabled = false;
                this.stopBtn.disabled = true;
                return;
            }

            // 再生位置が表示範囲外の場合は、表示範囲内にスクロール
            this.scrollToPlaybackPosition(startOffset);

            this.editor.startPlaybackAnimation();
            this.showStatus('再生中...', 'info');
        } catch (error) {
            this.showStatus('再生エラー: ' + error.message, 'error');
            console.error(error);
            this.playBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }
    
    // 相対的なシーク（左右矢印キー用）
    seekRelative(deltaSeconds) {
        if (!this.editor.audioPlayer || !this.editor.audioBuffer || !this.editor.audioPlayer.isPlaying) {
            return;
        }

        const currentTime = this.editor.audioPlayer.getCurrentPlaybackTime();
        if (currentTime === null) return;

        const duration = this.editor.audioBuffer.duration;
        if (duration <= 0) return;

        // 新しい再生位置を計算
        let targetTime = currentTime + deltaSeconds;
        
        // 範囲内にクリップ
        targetTime = Math.max(0, Math.min(duration, targetTime));
        
        // 最後にクリックした位置を記録
        this.editor.audioPlayer.setLastClickedTime(targetTime);

        // シーク実行
        this.editor.seekTo(targetTime);
    }

    // 再生位置が表示範囲内に来るようにスクロール
    scrollToPlaybackPosition(time) {
        if (!this.editor.originalWaveformViewer || !this.editor.audioBuffer) return;
        
        const viewStartTime = this.editor.originalWaveformViewer.viewStartTime;
        const viewEndTime = this.editor.originalWaveformViewer.viewEndTime;
        
        // 再生位置が表示範囲外の場合
        if (time < viewStartTime || time > viewEndTime) {
            const duration = this.editor.audioBuffer.duration;
            const viewDuration = viewEndTime - viewStartTime;
            const margin = viewDuration * 0.1; // 表示範囲の10%をマージンとして使用
            
            let newStartTime, newEndTime;
            
            if (time < viewStartTime) {
                // 再生位置が表示範囲の左側にある場合
                newEndTime = Math.min(duration, time + margin);
                newStartTime = Math.max(0, newEndTime - viewDuration);
                } else {
                // 再生位置が表示範囲の右側にある場合
                newStartTime = Math.max(0, time - margin);
                newEndTime = Math.min(duration, newStartTime + viewDuration);
            }
            
            // 表示範囲を更新
            this.editor.originalWaveformViewer.viewStartTime = newStartTime;
            this.editor.originalWaveformViewer.viewEndTime = newEndTime;
            // drawWaveform()を呼んで正しく再描画（歌詞データと再生位置を含む）
            this.editor.drawWaveform();
        }
    }

    stopPreview() {
        let currentTime = null;
        
        // 停止前に現在の再生位置を取得
        if (this.editor.audioPlayer && this.editor.audioPlayer.isPlaying) {
            currentTime = this.editor.audioPlayer.getCurrentPlaybackTime();
        }
        
        if (this.editor.audioPlayer) {
            this.editor.audioPlayer.stopPreview();
        }
        this.editor.stopPlaybackAnimation();
        this.playBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.showStatus('停止しました', 'info');
        
        // 停止時に現在の再生位置で歌詞追加モーダルを開く
        if (currentTime !== null) {
            // 最後にクリックした位置を更新
            this.editor.audioPlayer.setLastClickedTime(currentTime);
            // 少し待ってからモーダルを開く
            setTimeout(() => {
                this.openLyricModal(currentTime);
            }, 100);
        }
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


    enableControls() {
        this.playBtn.disabled = false;
        if (this.originalSpeakerBtn) {
            this.originalSpeakerBtn.disabled = false;
        }
        if (this.zoomInBtn) {
            this.zoomInBtn.disabled = false;
        }
        if (this.zoomOutBtn) {
            this.zoomOutBtn.disabled = false;
        }
        if (this.zoomResetBtn) {
            this.zoomResetBtn.disabled = false;
        }
    }

    // ズームイン
    zoomIn() {
        if (this.editor.originalWaveformViewer) {
            this.editor.originalWaveformViewer.zoomIn();
        }
    }

    // ズームアウト
    zoomOut() {
        if (this.editor.originalWaveformViewer) {
            this.editor.originalWaveformViewer.zoomOut();
        }
    }

    // ズームリセット
    zoomReset() {
        if (this.editor.originalWaveformViewer) {
            this.editor.originalWaveformViewer.zoomReset();
        }
    }

    showStatus(message, type = 'info') {
        if (this.status) {
            this.status.textContent = message;
            this.status.className = 'status ' + type;
        }
    }
}
