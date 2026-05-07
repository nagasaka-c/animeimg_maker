# アニメーション画像制作ツール

連番画像から APNG / WebP / GIF を生成し、既存アニメーション画像を別形式へ変換できる Next.js 製の Web ツールです。

## 構成

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 16 (App Router) + TypeScript |
| スタイル | Tailwind CSS v4 |
| 画像処理 | クライアントサイド Web Worker（`workers/encoder.worker.ts`） |
| APNG 圧縮 | サーバー API ルート `/api/tinypng`（[TinyPNG](https://tinypng.com/) を中継） |
| デプロイ | Vercel |

### 採用ライブラリ

- [`upng-js`](https://github.com/photopea/UPNG.js) — APNG エンコード（zlib圧縮）
- [`gifenc`](https://github.com/mattdesl/gifenc) — GIF エンコード（パレット量子化、Lossy）
- [`@ffmpeg/ffmpeg`](https://github.com/ffmpegwasm/ffmpeg.wasm) — Animated WebP エンコード（WASM、初回 unpkg からロード）
- ブラウザ標準 `ImageDecoder` API — APNG / WebP / GIF のフレーム抽出
- [`jszip`](https://github.com/Stuk/jszip) — 複数出力の ZIP 化
- [`tinify`](https://www.npmjs.com/package/tinify) — TinyPNG SDK（サーバー側）

## ローカルセットアップ

Node.js は **20.19.4** を使用しています（`.node-version` 同梱）。

```bash
# nodenv を使っている場合（プロジェクトルートに `.node-version` あり）
nodenv install -s 20.19.4

# 依存インストール
npm install

# 環境変数（.env.local）を作成
cp .env.example .env.local
# TINYPNG_API_KEY を発行して書き込む（https://tinypng.com/developers）

# 開発サーバー起動
npm run dev
# http://localhost:3000
```

### TinyPNG API キーの取得

1. <https://tinypng.com/developers> でメールアドレスを登録すると、メールに API キーが届きます。
2. `.env.local` に `TINYPNG_API_KEY=...` を設定。
3. 無料枠は **月 500 回**。本ツールは APNG 出力時に自動で TinyPNG を呼び出すため、APNG 1回 = 1カウントです。
4. 月 500 回を超えると `/api/tinypng` が `429` を返し、UI に上限超過エラーを表示して処理を中断します。

> APNG は技術的には PNG として扱われるため TinyPNG に通します。仕様上 APNG はサポート対象外ですが、PNG 拡張チャンクを保ったまま圧縮されることが期待されます。実際の挙動は APNG ファイルで実機検証してください。

## Vercel デプロイ手順

1. このディレクトリを GitHub のリポジトリへ push
2. Vercel ダッシュボードから「New Project」→ 当該リポジトリを Import
3. 「Environment Variables」に `TINYPNG_API_KEY` を登録
4. Deploy

> Vercel で動作させる際の制約：`/api/tinypng` ルートはサーバーレス関数として動きます。API ルートのリクエストボディ上限は 4.5MB です。生成済み APNG が 4.5MB を超える場合は TinyPNG への送信に失敗するため、フレーム数や解像度を抑えてご利用ください。

## 使い方

1. ヘッダー直下のタブで「制作」または「変換」を選択。
   - 制作：複数の連番 PNG / JPEG → APNG / WebP / GIF
   - 変換：1ファイルの APNG / WebP / GIF → 別形式
2. ドラッグ＆ドロップ（またはクリックでファイル選択）で画像を投入。
3. 「さらに追加」ボタンで複数の出力エリアを並べることも可能。
4. 下半分の設定パネルで解像度 / FPS / ループ回数 / 出力形式 / 品質を指定。
5. 画面下の「保存する」ボタンを押下。
   - エリアが 1 つなら単体ダウンロード。
   - エリアが複数なら `animation-tool_{YYYYMMDD-HHmmss}.zip` として一括ダウンロード。
6. 保存ボタン上のプログレスバーで進捗を確認できます。

### 設定の挙動

| 項目 | 既定値 | 備考 |
|------|--------|------|
| 解像度 | 100% | 0–100%、アスペクト比は入力画像に追従 |
| フレームレート | 30 FPS | 任意の整数（1–240） |
| ループ回数 | 0 | 0 = 無限ループ |
| 出力形式 | APNG | APNG / WebP / GIF を選択 |
| 品質レベル | 80% | WebP / GIF 選択時のみ表示（Lossy 圧縮） |

変換タブで動画形式のファイルを投入すると、`ImageDecoder` で抽出したメタデータから FPS とループ回数を自動でデフォルト値に反映します（取得できない場合は標準値）。

## 既知の留意点

- **対応ブラウザ**：最新版の Chrome / Edge / Safari / Firefox を想定（`ImageDecoder` `OffscreenCanvas` `createImageBitmap` を利用）。
- **WebP 出力の初回ロード**：ffmpeg.wasm のコアを unpkg から取得するため、初回数十秒のダウンロードが発生します。
- **TinyPNG の APNG 圧縮**：実機で確認してアニメーションチャンクが残っていることを確認してください。問題があれば `lib/save-flow.ts` の `compressViaTinyPNG` 呼び出しをスキップするよう調整します。
- **大きい入力**：数百フレーム×高解像度の処理はブラウザのメモリを多く消費します。

## ディレクトリ構造

```
animation-tool/
├── app/
│   ├── api/tinypng/route.ts   # TinyPNG 中継 API
│   ├── globals.css            # Tailwind v4 + ブランドカラー
│   ├── layout.tsx
│   └── page.tsx               # メイン画面
├── components/                # UI 構成要素
├── lib/
│   ├── canvas-utils.ts        # OffscreenCanvas ヘルパ
│   ├── decoders/decode.ts     # ImageDecoder ベースの読み込み
│   ├── encoders/{apng,gif,webp}.ts
│   ├── metadata.ts            # メタデータのみ抽出
│   ├── save-flow.ts           # 保存処理オーケストレーション
│   ├── state.tsx              # React Context
│   ├── types.ts
│   ├── validators.ts
│   ├── worker-client.ts
│   └── worker-types.ts
└── workers/
    └── encoder.worker.ts      # メイン Web Worker
```
