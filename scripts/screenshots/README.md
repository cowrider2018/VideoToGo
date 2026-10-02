# 商店截圖

產生 Chrome Web Store 的 1280×800 截圖，中英文各 4 張，輸出到 `dist/store-screenshots/<en|zh_TW>/`。介面改了之後重新執行即可。

```sh
npm run screenshots
```

依序執行：

1. `demo.py`：在 `dist/screenshots-work/demo/` 建立示範影片網站「Horizon Clips」（虛構）。插圖由 Pillow 繪製，ffmpeg 轉成三種畫質的 HLS 與一支 MP4，hls.js 從 jsdelivr 下載。
2. `capture.mjs en`、`capture.mjs zh-TW`：以 headless Chrome 載入擴充功能，在小視窗中開啟示範網站，操作展開、下載、暫停並截圖，同時記錄要標示的列與按鈕位置。網站以 `--host-resolver-rules` 對應到虛構網域 `horizon-clips.example`。
3. `compose.py`：加上標題、視窗外框、編號說明與箭頭，合成最終截圖。說明文字在 `compose.py` 的 `TEXT`。

## 需求

- Node 22 以上、Python 3 與 Pillow、PATH 上的 ffmpeg，以及網路（下載 hls.js）。
- Chrome for Testing 或 Chromium：品牌版 Chrome 不接受 `--load-extension`。預設使用 Puppeteer 或 Playwright 已下載的最新版本，也可以用 `VIDEOTOGO_CHROME` 指定執行檔。
- 目前只支援 Windows：合成使用 Segoe UI 與微軟正黑體。

所有中間檔案都在 `dist/` 底下，不納入版本控制。
