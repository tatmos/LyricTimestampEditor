# Lyric Timestamp Editor (歌詞タイムスタンプエディタ)

ブラウザ上で音声ファイルの波形を確認しながら、歌詞の開始/終了時刻を付与できるシンプルなエディタです。波形上のクリックで歌詞を追加し、再生しながらプレビュー表示を確認して、SRT/JSON形式で書き出せます。

## 主な機能

- **音声ファイル読み込み**: WAV/MP3 などの音声をアップロード/ドラッグ&ドロップで読み込み。
- **波形表示**: 波形と時間ルーラーの表示、再生位置の追従。
- **歌詞タイムスタンプ編集**:
  - 追加モード: 波形上をクリックして歌詞を追加。
  - 調整モード: 既存の歌詞の開始/終了時刻を調整。
- **再生/プレビュー**: 波形再生に合わせて歌詞プレビューを表示。
- **ズーム操作**: 波形の拡大/縮小/全体表示。
- **入出力**: SRT/JSON のインポート/エクスポート。

## 使い方

1. `index.html` をブラウザで開く。
2. 「波形をアップロード」またはドラッグ&ドロップで音声ファイルを読み込み。
3. 追加モードで波形をクリックし歌詞を入力。
4. 調整モードで開始/終了時刻を調整。
5. 「SRT出力」「JSON出力」から書き出し。

## プロジェクト構成

- `index.html`: UI の入口。
- `style.css`: UI のスタイル定義。
- `app.js`: アプリケーション初期化と主要ロジックの統括。
- `uiController.js`: UI 操作とイベント処理。
- `fileHandler.js`: ファイル読み込み/書き出し処理。
- `audioPlayer.js`: 再生とシーク制御。
- `waveformDrawer.js` / `originalWaveformViewer.js`: 波形描画。
- `timeRuler.js`: 時間ルーラー表示。
- `lyricManager.js`: 歌詞データ管理。
- `importer.js` / `exporter.js`: SRT/JSON 入出力。
- `levelMeter.js`: レベルメーター表示。

## 技術スタック

- HTML5
- CSS3
- JavaScript (ES6+)
- Web Audio API

## 動作環境

- Chrome / Firefox / Edge / Safari などのモダンブラウザ
- Web Audio API 対応ブラウザ

## ライセンス

MIT License
