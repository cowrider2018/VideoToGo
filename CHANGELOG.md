# Changelog / 更新紀錄

Versions released to the Chrome Web Store. 上架到 Chrome Web Store 的版本。

## 1.1.0 — 2026-10-05

- A download no longer fails when the network drops: it shows "Connection lost", keeps what it has, and carries on once the connection is back (right away when the browser notices, otherwise every 30 seconds). "Retry" tries again at once. Ordinary files resume from where they stopped when the server allows it.
- "Clear finished" removes every finished, failed and cancelled download from the list at once; the files stay on disk.
- The download list stays fast after many downloads and long browsing.
- A download whose save failed now releases its memory right away instead of when the window closes.
- New permission: `alarms`, to retry downloads waiting for the network.

---

- 網路中斷時下載不會失敗：顯示「連線中斷」並保留已下載的部分，連線恢復後自動接著下載（瀏覽器偵測到時立即進行，否則每 30 秒重試一次）；按「重試」可立刻再試。一般檔案在伺服器支援時從中斷處續傳。
- 「清除已完成」一次移除清單中所有已完成、失敗與已取消的下載；檔案仍留在磁碟上。
- 下載很多檔案、瀏覽很久之後，下載清單依然流暢。
- 存檔失敗的下載會立即釋放記憶體，不再等到視窗關閉。
- 新增權限：`alarms`，用來重試等待網路的下載。

## 1.0.0 — 2026-10-01

First release on the Chrome Web Store. 首次上架。
