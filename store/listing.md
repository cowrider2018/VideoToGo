# Chrome Web Store submission / 上架資料

Text to paste into the Chrome Web Store developer dashboard. Keep it in step with `manifest.json`: when a permission is added or removed, update the justifications here.

開發人員資訊主頁要填的內容。`manifest.json` 的權限有增減時，記得同步更新這裡的理由。

## Package / 套件

`npm run pack`, then upload `dist/videotogo-<version>.zip`.

## Store listing / 商店資訊

- **Category / 類別**: Tools
- **Languages / 語言**: English, 中文（繁體）. The name and short description come from `_locales/`.
- **Small promo tile / 小型宣傳圖塊 (440×280)**: `store/promo-small-en.png`, `store/promo-small-zh_TW.png`
- **Screenshots / 螢幕截圖 (1280×800)**: `npm run screenshots` builds them into `dist/store-screenshots/en/` and `dist/store-screenshots/zh_TW/`, four each (open, list, downloads, images); upload each set under its language. Not versioned. 不納入版本控制；各語言上傳到對應的商店資訊語言。
- **Homepage / 首頁網址**: <https://github.com/cowrider2018/video-downloader>
- **Support / 支援網址**: <https://github.com/cowrider2018/video-downloader/issues>

### Detailed description (English)

```text
VideoToGo finds the videos, audio, streams and images on a web page and downloads the ones you pick.

Click the toolbar icon to open the VideoToGo window. It has an address bar, the web page itself, a list of what can be downloaded, and your downloads.

What it can download
• Regular video and audio files (mp4, webm, mp3 and more)
• HLS (.m3u8) streams, including AES-128 encrypted ones, saved as one file per quality
• DASH (.mpd) streams, one file per video or audio track
• Images on the page, one by one or all at once into a folder named after the page
• Videos that play from blob: URLs, captured from what the player buffers (MSE capture) and saved as a single MP4 when they are fMP4

Built for sites that are hard to download from
• Downloads use the same cookies, referrer and headers as the page, so sites that only serve video to their own pages still work
• Downloads run in the background: pause, resume or cancel them, and keep browsing while they run

Privacy
• Works only on pages you open in the VideoToGo window; your other tabs are never read
• No data is collected or sent to the developer or anyone else. No analytics, no ads

Limits
• YouTube is not supported
• DRM-protected content (Widevine, PlayReady, FairPlay) and live streams are not supported
• Video and audio that a site streams separately are saved as two files

Only download content you have the right to keep, and follow each site's terms of service and copyright law.
```

### 詳細說明（繁體中文）

```text
VideoToGo 偵測網頁中的影片、音訊、串流與圖片，下載你選擇的項目。

點工具列圖示開啟 VideoToGo 小視窗：網址列、網頁本身、可下載的項目清單，以及下載中的項目。

可以下載
• 一般影音檔（mp4、webm、mp3 等）
• HLS（.m3u8）串流，支援 AES-128 加密，每種畫質存成一個檔案
• DASH（.mpd）串流，影像與音訊各存成一個檔案
• 網頁中的圖片，可逐張下載，或一次全部存進以網頁標題命名的資料夾
• 以 blob: 網址播放的影片：從播放器的緩衝擷取（MSE 緩存捕捉），fMP4 會合併成單一 MP4

適合不易下載的網站
• 下載時帶上與網頁相同的 Cookie、Referer 與標頭，只把影片交給自己網頁的網站也能下載
• 下載在背景進行，可暫停、繼續、取消，下載時可以繼續瀏覽

隱私
• 只作用於你在 VideoToGo 小視窗中開啟的網頁，不讀取其他分頁
• 不收集任何資料，也不傳送給開發者或任何人；沒有分析工具，沒有廣告

限制
• 不支援 YouTube
• 不支援 DRM 保護的內容（Widevine、PlayReady、FairPlay）與直播
• 網站分開串流的影像與音訊會存成兩個檔案

請只下載你有權保存的內容，並遵守各網站的服務條款與著作權法規。
```

## Privacy practices / 隱私權做法

### Single purpose / 單一用途

```text
Detect the videos, audio, streams and images on a web page the user opens in the VideoToGo window, and download the ones the user picks.
```

### Permission justifications / 權限理由

| Permission | Justification |
| --- | --- |
| `downloads` | Saves the files the user chooses to download, and pauses, resumes, cancels and shows them from the extension's download list. |
| `storage` | `chrome.storage.session` holds the media detected in the VideoToGo window and the download queue, so they survive service worker restarts. Nothing is stored persistently. |
| `scripting` | Registers the MSE capture script while the VideoToGo window is open. It runs only in frames inside that window, and lets the user save videos that play from `blob:` URLs. |
| `offscreen` | An offscreen document downloads HLS/DASH segments and images, joins them into one file and hands it to `chrome.downloads`. A service worker cannot create the `blob:` URL this needs. |
| `declarativeNetRequestWithHostAccess` | Session rules, both scoped as narrowly as possible: (1) for sub-frames of the VideoToGo window's own tab only, remove `X-Frame-Options` and `Content-Security-Policy` so the site the user opened can be shown inside the window; (2) for the extension's own download requests only (tab ID -1), add the headers the page used for that host (cookies, referrer, authorization), because many sites refuse media requests without them. |
| `webRequest` | Observes, without blocking or changing anything, the responses in the VideoToGo window to detect media by content type and size, and reads the request headers the page sends so a download can repeat them. Requests from other tabs are ignored. |
| Host permission `<all_urls>` | The user can open any website in the VideoToGo window, and the media can come from any host or CDN. Detecting it, fetching it with the page's headers, and running the content script in the window's frames all need access to those hosts. |

### Remote code / 遠端程式碼

```text
No, I am not using remote code.
```

All JavaScript ships in the package. 所有 JavaScript 都在套件內。

### Data usage / 資料使用

Check these / 勾選：

- [x] **Authentication information**: cookies and authorization headers the page in the VideoToGo window sends, repeated on the user's own downloads from the same host
- [x] **Web history**: addresses and titles of pages the user opens in the VideoToGo window
- [x] **Website content**: addresses of media and images on those pages, and media a player buffers during an MSE capture the user starts

Leave unchecked / 不勾選：Personally identifiable information, Health information, Financial and payment information, Personal communications, Location, User activity.

Check all three certifications / 三項聲明全部勾選：

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL / 隱私權政策網址

<https://github.com/cowrider2018/video-downloader/blob/main/PRIVACY.md>

This link works once `PRIVACY.md` is on `main`. 合併到 `main` 之後，這個網址才會生效。

## Notes for the reviewer / 給審查員的說明

Paste into the "Test instructions" field. 貼到「測試操作說明」欄位。

```text
No account or credentials are needed.

1. Click the toolbar icon. The VideoToGo window opens with the current tab's address.
2. Type a page with a video into the window's address bar and press Enter, for example:
   - https://www.w3schools.com/html/html5_video.asp (an MP4 file)
   - https://hlsjs.video-dev.org/demo/ (an HLS stream)
3. Detected items appear in the list under the page. Click Download on one; it appears under Downloads and is saved to the download folder.

About the header changes: X-Frame-Options and Content-Security-Policy are removed only for sub-frames of the VideoToGo window's own tab (declarativeNetRequest session rule with tabIds set to that tab), so the user's chosen site can be shown inside the window. No other tab is affected, and the rule is removed when the window closes.

The extension records nothing from tabs outside the VideoToGo window. YouTube is excluded: nothing is detected or downloaded from YouTube or its video hosts, including embedded players.
```
