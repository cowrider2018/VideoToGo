# Privacy Policy / 隱私權政策

Last updated / 最後更新：2026-10-01

[English](#english) | [繁體中文](#繁體中文)

## English

VideoToGo does not collect, sell or share any user data. It has no servers of its own, no analytics and no advertising. Everything it handles stays in your browser.

### What the extension handles

The extension works only on pages you open inside the VideoToGo window. It does not read or record anything from your other tabs. For the pages in that window, it handles:

- **Page address and title**, to show the address bar and to name downloaded files.
- **Addresses of the videos, audio, streams and images the page loads**, with their type and size, to list what can be downloaded.
- **Request headers the page sends**, which can include cookies, the `Referer`, and authorization headers. Many sites only serve a video to their own page, so a download repeats the headers the page itself used.
- **Media data a player buffers** (MSE capture), only for a capture you start, to assemble the file.
- **Your download list**: file names and progress.

### Where it is kept

- In `chrome.storage.session` and in memory. Chrome clears both when the browser closes.
- The addresses, titles and headers recorded for the window are removed when you close it. Each entry in the download list keeps a copy of the headers its download needs until you remove the entry or close the browser.
- Downloaded files go to your download folder through Chrome's own downloads, like any other download.
- Nothing is written to persistent extension storage or synced to your Google account.

### Where it is sent

- Request headers are sent only back to the host they were first sent to, when you download from that host. Cookies go only to that host and its subdomains. For a host the page did not contact (for example, a CDN that serves stream segments), only the page's `Referer`, `Origin` and the player's custom headers are sent.
- The extension makes network requests only to the sites you open in its window and to the media you choose to download.
- No data is sent to the developer or to any third party.

### Header changes

For frames inside the VideoToGo window only, the extension removes the `X-Frame-Options` and `Content-Security-Policy` response headers so that a site can be shown in the window. Your other tabs are not affected.

### Excluded sites

The extension does not detect or download content from YouTube.

### Contact

Questions about this policy: <https://github.com/cowrider2018/video-downloader/issues>

## 繁體中文

VideoToGo 不收集、不販售，也不分享任何使用者資料。本擴充功能沒有自己的伺服器，也沒有分析工具或廣告；處理的資料都留在你的瀏覽器裡。

### 處理哪些資料

本擴充功能只作用於你在 VideoToGo 小視窗中開啟的網頁，不讀取也不記錄其他分頁的任何內容。對小視窗中的網頁，會處理：

- **網頁網址與標題**：顯示在網址列，並用來為下載的檔案命名。
- **網頁載入的影片、音訊、串流與圖片網址**及其類型、大小：列出可下載的項目。
- **網頁送出的請求標頭**，其中可能包含 Cookie、`Referer` 與授權標頭：許多網站只把影片交給自己的網頁，因此下載時會帶上網頁本身使用的標頭。
- **播放器緩衝的媒體資料**（MSE 緩存捕捉）：只在你開始捕捉時處理，用來組成檔案。
- **下載清單**：檔名與進度。

### 存放在哪裡

- 存放在 `chrome.storage.session` 與記憶體中，關閉瀏覽器時由 Chrome 清除。
- 小視窗記錄的網址、標題與標頭，在關閉小視窗時刪除；下載清單的每一筆會保留該次下載所需的標頭副本，直到你移除該筆或關閉瀏覽器。
- 下載的檔案經由 Chrome 本身的下載功能存到你的下載資料夾，與一般下載相同。
- 不寫入擴充功能的永久儲存空間，也不會同步到你的 Google 帳戶。

### 傳送到哪裡

- 請求標頭只會在你從某個主機下載時，送回原本收到它的同一個主機；Cookie 只會送往該主機及其子網域。對網頁沒有連線過的主機（例如提供串流片段的 CDN），只會送出網頁的 `Referer`、`Origin` 與播放器自訂的標頭。
- 本擴充功能只會連線到你在小視窗中開啟的網站，以及你選擇下載的媒體。
- 不會傳送任何資料給開發者或任何第三方。

### 標頭修改

本擴充功能只對 VideoToGo 小視窗內的框架移除 `X-Frame-Options` 與 `Content-Security-Policy` 回應標頭，讓網站可以顯示在小視窗中；不影響其他分頁。

### 排除的網站

本擴充功能不偵測、不下載 YouTube 的內容。

### 聯絡

對本政策有疑問，請至：<https://github.com/cowrider2018/video-downloader/issues>
