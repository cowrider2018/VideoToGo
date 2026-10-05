# VideoToGo

English | [繁體中文](README.md)

A Chrome extension (Manifest V3) that detects the videos, audio, HLS/DASH streams and images a web page plays or shows, and downloads them. Its features draw on Video DownloadHelper and cat-catch.

## Usage notice

This tool is only for downloading content you have the right to keep. Follow each site's terms of service and copyright law. This project does not support, and does not help with, getting around DRM or other access controls.

## How to use

The interface follows the browser's language: Traditional Chinese or English, and English for any other language.

Clicking the toolbar icon opens a separate small window (or switches to it if it is already open). From top to bottom:

1. **Address bar**: paste a URL and press Enter. It opens with the current tab's URL and follows navigation within the site. The "←" and "→" buttons on the left go back and forward (Alt+← / Alt+→ also work).
2. **Web page**: the site runs inside the window, so there is no need to open an ordinary tab.
3. **Media list**: one row per downloadable item, with a button on the right to add it to the downloads. Each HLS/DASH quality has a row of its own, and so does each DASH audio track.
   - Two or more files or streams fold into one row, "Media (N)"; MSE buffers from two or more players likewise fold into "Buffers (N)". They start folded; "Expand" lists them row by row.
   - Images fold into a last row, "Images (N)": "Download all" saves every image into a folder named after the page title, and "Expand" lists them one by one (format, dimensions, size) so each can be downloaded on its own.
4. **Downloads**: every download you add queues here and shows its own progress.
   - "Pause" keeps what has been downloaded; "Resume" carries on from there.
   - "×" cancels the download and removes it from the list; for a finished item it only removes the entry, and the file stays on disk.
   - Once any download has ended (finished, failed or cancelled), "Clear finished" appears beside the heading and removes all of them from the list at once; the files stay on disk.
   - Downloads run in the background, so you can move to another page, or open another site and keep adding.

The media list and the downloads section are exactly as tall as their rows; resizing the window only resizes the web page area, which can shrink until it is hidden.

## Supported formats

| Format | How it is detected | What is saved |
| --- | --- | --- |
| Media files (mp4, webm, mp3…) | `video/*` or `audio/*` network responses, or the file extension; `<video>`/`<audio>` in the page | The original file |
| HLS (`.m3u8`) | Extension or `mpegurl` MIME type | One `.ts` file; `.mp4` for fMP4 streams. AES-128 decryption and byte ranges are supported |
| DASH (`.mpd`) | Extension or `application/dash+xml` | One file per representation (`.mp4`/`.webm`/`.m4a`). SegmentTemplate (`$Number$`/`$Time$`, SegmentTimeline), SegmentList and SegmentBase are supported |
| Images (jpg, png, gif, webp, avif, bmp) | `image/*` network responses or the file extension; `<img>` in the page (including lazy-loaded and `srcset` images) | The original file, saved as "page title/original name" |
| MSE buffers (videos played from `blob:` URLs) | While the window is open, the data a player feeds into MediaSource is captured; one row per player | fMP4 video and audio merged into one `.mp4` (with total duration and an index, so it can be seeked); other combinations such as WebM as one file per track |

Stream segments (`.ts`, `.m4s`) and media files under 512 KB (mostly previews or ads) are not listed. Images under 10 KB or under 100 pixels on either side (icons, buttons, tracking pixels) and SVGs are skipped; a page lists at most 500 images.

## MSE buffer capture

As long as a player plays through MediaSource, the data the browser has buffered can be obtained the same way. This serves as a fallback when the other methods cannot be used (DRM-protected content excepted).

- **Speed**: when you download, the extension mutes and pauses the player and keeps moving the playhead to the end of what is buffered. Players keep fetching ahead while paused, so the whole video buffers at close to network speed rather than playback speed. Players that will not fetch while paused are played at 16x instead. In testing, a 60-second video played by hls.js finished in about 4–14 seconds.
- **Reassembly**: players may send segments repeatedly or out of order, and may switch quality midway. Segments are sorted by timestamp and de-duplicated; each stretch uses the best quality available, and switches between qualities are handled by MP4's multiple sample descriptions (for WebM, by VP9/AV1 themselves), so the file is complete and playable. If gaps remain, the player is made to fetch those stretches again.
- **Merging**: when both video and audio are fMP4, they are merged into one MP4 right in the browser (two tracks, fragments interleaved by time, with a `sidx` index); no ffmpeg is needed.
- **Out of sight**: each capture opens a hidden frame in the window and loads the same page again there, so you can move to another page or open another site straight away. At most two captures run at once; the rest show "Queued" and start in order. The hidden page has the same cookies and signed-in state, but does not affect the address bar, the title or the media list.
- Captures are listed under "Downloads" too, and can be paused, resumed or cancelled with ×.

## Downloading as the page

Many sites only hand their videos to their own pages: they check cookies (including SameSite), Referer and Origin, or custom headers the player adds, such as `Authorization`.

- Chrome treats a site framed in the window as first-party, so cookies work as usual. `X-Frame-Options` and `Content-Security-Policy` are removed only for frames inside the window, so that sites can be framed.
- The request headers the page sends to each host are recorded. When a download is added, a snapshot is taken and the background downloader sends the same headers through `declarativeNetRequest`, so moving to another page afterwards makes no difference.
- Playlists are read by the page's own content script, as the page.
- Images from "Download all" are fetched in the background as the page (hosts with no recorded headers at least get the page's Referer, so image hosts that need a Referer can be downloaded from too). An image that fails does not affect the others, and the number that failed is shown at the end.
- Ordinary files are first handed to Chrome's downloads (written straight to disk, with cookies and custom headers). Chrome's downloads cannot send a Referer; if the server refuses because of that, the file is fetched again in the background as the page, resuming from where it stopped with Range requests.

## Installation

1. Open `chrome://extensions` and turn on "Developer mode" in the top-right corner.
2. Click "Load unpacked" and choose this folder.

## Limitations

- Content protected by DRM (Widevine, PlayReady, FairPlay) is not supported: the keys exist only inside the browser's decryption module, which extensions cannot reach. Protected qualities show "Protected" and are disabled. HLS SAMPLE-AES is not supported either.
- Live streams are not supported (HLS without `#EXT-X-ENDLIST`, DASH with `type="dynamic"`).
- For DASH, only the first Period is handled.
- Streams with separate video and audio (most DASH, some HLS, WebM MSE buffers) are saved as two files; merge them yourself with a tool such as ffmpeg.
- HLS/DASH assembly and background re-fetching happen in memory, so very large videos use a lot of memory.
- MSE capture loads the page once more, and needs the player to start on its own after loading (the first video is tried muted); the quality is whatever the player chooses at the time. Closing the window stops captures in progress. The first time several files are saved, Chrome may ask whether to allow the site to download multiple files.
- While the window is minimized or fully covered, Chrome may hold back media loading in the page; MSE capture then stalls and carries on once the window is visible again.
- Only `<img>` elements and image responses on the network are picked up. CSS background images that did not go through the network (already cached) are not listed, and images drawn on a `<canvas>` are not supported. For images that arrive as the page first loads, the size may only be known once the page reports it, so the list shows "at least".
- A few sites detect that they are framed and refuse to work (for example some sign-in or bot-check pages); such sites cannot be used in the window.

## Architecture

| File | Role |
| --- | --- |
| `background.js` | Service worker: opens the window and its frame header rules, detects media, records request identity, previews playlists, keeps the download queue (`storage.session`) and the identity rules |
| `content.js` | Reports `<video>`/`<audio>` sources, `<img>` images (with dimensions) and the page title; bridges the MSE hook and assembles captured files; fetches playlists as the page |
| `inject/mse-hook.js` | In the page's own world, intercepts `addSourceBuffer`/`appendBuffer` to keep the buffered data, and drives the player to buffer quickly |
| `offscreen/` | Background downloader: fetches whole files, batches of images, and HLS or DASH segments as the page, pausably, and hands the assembled Blob to Chrome to save |
| `viewer/` | The window: address bar, framed page, media list and download queue; opens a hidden frame for each capture |
| `lib/media.js` | Classifying media and images, sizes, file names |
| `lib/hls.js`, `lib/dash.js` | m3u8 and MPD parsing (`dash.js` includes a small XML parser, since the service worker has no `DOMParser`) |
| `lib/jobs.js` | Download pipelines: whole files (resumable), parallel segment downloads, many files each on its own (one failure does not stop the rest), the pause gate, HLS and DASH jobs |
| `lib/headers.js` | Capturing and filtering identity headers |
| `lib/fragments.js` | Reassembly of MSE captures: parses fMP4/WebM fragments, sorts, de-duplicates, joins across qualities, fills in the total duration; merges and indexes fMP4 video and audio |
| `lib/i18n.js`, `_locales/` | Interface text (`en`, `zh_TW`); the offscreen document and the page's world have no `chrome.i18n`, so their messages travel as tokens that the window turns into text when it shows them |

## Development

```sh
npm test        # unit tests (node --test)
```
