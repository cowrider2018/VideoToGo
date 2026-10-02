"""Composes the Chrome Web Store screenshots (1280x800) from what capture.mjs took: a headline,
the viewer in a window frame, and numbered callouts with arrows to the rows they describe.
Writes dist/store-screenshots/<en|zh_TW>/1-open.png ... 4-images.png.

Uses Windows fonts (Segoe UI, Microsoft JhengHei).
"""

import json
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SHOTS = os.path.join(REPO, 'dist', 'screenshots-work', 'shots')
OUT = os.path.join(REPO, 'dist', 'store-screenshots')

DARK = (26, 22, 21)
CREAM = (244, 241, 234)
MUTED = (178, 170, 158)
ORANGE = (236, 123, 49)
W, H = 1280, 800
DSF = 2  # screenshots were taken at 2x

FONTS = {
    'en': ('C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/seguisb.ttf'),
    'zh_TW': ('C:/Windows/Fonts/msjhbd.ttc', 'C:/Windows/Fonts/msjh.ttc', 'C:/Windows/Fonts/msjhbd.ttc'),
}

TEXT = {
    'en': {
        'open': ('Open any page in the VideoToGo window',
                 'Click the toolbar icon. The page you are on opens in a window of its own.',
                 ['Click the VideoToGo icon', 'The page runs in the window, with what it plays listed below']),
        'list': ('Every video, stream and image, listed',
                 'Pick a quality and download it with one click.',
                 [('One click to download', 'Saved with the same cookies and headers the page used.'),
                  ('Each quality on its own row', 'HLS and DASH streams list every resolution and bitrate.'),
                  ('Videos that play from blob: too', 'Captured from what the player has buffered.')]),
        'queue': ('Downloads keep going in the background',
                  'Keep browsing, or open another page and add more.',
                  [('Pause and resume', 'A paused download picks up where it stopped.'),
                   ('Progress for every file', 'Segments, bytes and percent as they arrive.'),
                   ('Cancel with ×', 'Finished files stay on disk when you clear the list.')]),
        'images': ('Save every image at once',
                   'Into a folder named after the page, or one at a time.',
                   [('Download all', 'Every image goes into one folder named after the page.'),
                    ('Or pick them one by one', 'Each image shows its format and dimensions.')]),
    },
    'zh_TW': {
        'open': ('在 VideoToGo 小視窗中開啟網頁',
                 '點工具列圖示，目前的網頁會在獨立的小視窗中開啟。',
                 ['點 VideoToGo 圖示', '網頁在小視窗中執行，播放的內容列在下方']),
        'list': ('影片、串流、圖片，全部列出',
                 '選好畫質，按一下就下載。',
                 [('按一下就下載', '帶著網頁使用的 Cookie 與標頭下載。'),
                  ('每種畫質各一列', 'HLS 與 DASH 串流列出每種解析度與位元率。'),
                  ('blob: 播放的影片也能存', '從播放器的緩衝擷取。')]),
        'queue': ('下載在背景進行',
                  '可以繼續瀏覽，或開別的網頁再加入下載。',
                  [('隨時暫停、繼續', '暫停的下載會從中斷處接著下載。'),
                   ('每個檔案的進度', '片段數、大小與百分比即時更新。'),
                   ('按 × 取消', '已完成的檔案從清單移除後仍留在磁碟上。')]),
        'images': ('一次存下所有圖片',
                   '存進以網頁標題命名的資料夾，也可以逐張下載。',
                   [('全部下載', '所有圖片存進以網頁標題命名的同一個資料夾。'),
                    ('也可以逐張挑選', '每張都標示格式與尺寸。')]),
    },
}


def font(lang, kind, size):
    path = FONTS[lang][{'bold': 0, 'regular': 1, 'semi': 2}[kind]]
    return ImageFont.truetype(path, size)


def wrap(draw, text, f, width):
    # Words for English, characters for Chinese.
    units = text.split(' ') if ' ' in text and not any('\u4e00' <= c <= '\u9fff' for c in text) else list(text)
    sep = ' ' if len(units) > 1 and units != list(text) else ''
    lines, cur = [], ''
    for u in units:
        trial = cur + (sep if cur else '') + u
        if draw.textlength(trial, font=f) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = u
    if cur:
        lines.append(cur)
    return lines


def canvas():
    im = Image.new('RGB', (W, H), DARK)
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((W - 520, -380, W + 320, 360), fill=ORANGE + (46,))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    im.paste(glow, (0, 0), glow)
    return im


def header(im, lang, title, sub):
    d = ImageDraw.Draw(im)
    d.text((64, 34), title, font=font(lang, 'bold', 40), fill=CREAM)
    d.text((66, 92), sub, font=font(lang, 'regular', 20), fill=MUTED)


def shadow(im, box, radius=14, blur=24, alpha=150):
    sh = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((box[0], box[1] + 10, box[2], box[3] + 10), radius, fill=(0, 0, 0, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    im.paste(sh, (0, 0), sh)


ICON = Image.open(os.path.join(REPO, 'icons', 'icon128.png')).convert('RGBA').crop((16, 16, 112, 112))


def window(im, shot, x, y, scale, title='VideoToGo'):
    """Pastes a viewer screenshot inside a popup-window frame. Returns a css->canvas mapper."""
    sw, sh = int(shot.width / DSF * scale), int(shot.height / DSF * scale)
    bar = 30
    box = (x, y, x + sw, y + bar + sh)
    shadow(im, box)
    frame = Image.new('RGBA', (sw, bar + sh), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle((0, 0, sw - 1, bar + sh - 1), 10, fill=(222, 216, 204))
    frame.paste(shot.resize((sw, sh), Image.LANCZOS), (0, bar))
    mask = Image.new('L', frame.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, sw - 1, bar + sh - 1), 10, fill=255)
    im.paste(frame, (x, y), mask)
    d = ImageDraw.Draw(im)
    ic = ICON.resize((18, 18), Image.LANCZOS)
    im.paste(ic, (x + 10, y + 6), ic)
    d.text((x + 36, y + 6), title, font=font('en', 'semi', 14), fill=DARK)
    for i, c in enumerate([(120, 114, 104)] * 3):
        cx = x + sw - 20 - i * 26
        if i == 0:
            d.line((cx - 5, y + 10, cx + 5, y + 20), fill=c, width=2)
            d.line((cx - 5, y + 20, cx + 5, y + 10), fill=c, width=2)
        elif i == 1:
            d.rectangle((cx - 5, y + 10, cx + 5, y + 20), outline=c, width=2)
        else:
            d.line((cx - 5, y + 15, cx + 5, y + 15), fill=c, width=2)
    return lambda cx, cy: (x + cx * scale, y + bar + cy * scale)


def ring(im, box, pad=4):
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 - pad, y0 - pad, x1 + pad, y1 + pad), 8, outline=ORANGE, width=3)


def arrow(im, start, end, bend=0.0, head=14, width=3):
    d = ImageDraw.Draw(im)
    (x0, y0), (x1, y1) = start, end
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    nx, ny = -(y1 - y0), (x1 - x0)
    cx, cy = mx + nx * bend, my + ny * bend
    pts = [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1)
           for t in [i / 40 for i in range(41)]]
    stop = len(pts) - 3
    d.line(pts[:stop + 1], fill=ORANGE, width=width, joint='curve')
    ax, ay = pts[-1]
    bx, by = pts[-4]
    ang = math.atan2(ay - by, ax - bx)
    d.polygon([(ax, ay),
               (ax - head * math.cos(ang - 0.45), ay - head * math.sin(ang - 0.45)),
               (ax - head * math.cos(ang + 0.45), ay - head * math.sin(ang + 0.45))], fill=ORANGE)
    d.ellipse((x0 - 4, y0 - 4, x0 + 4, y0 + 4), fill=ORANGE)


def badge(im, x, y, n, r=16):
    d = ImageDraw.Draw(im)
    d.ellipse((x - r, y - r, x + r, y + r), fill=ORANGE)
    f = font('en', 'bold', 19)
    d.text((x, y + 1), str(n), font=f, fill=DARK, anchor='mm')


def callouts(im, lang, items, x, ys, width=470):
    """Numbered callouts in the right column. Returns the anchor point (left middle) of each."""
    d = ImageDraw.Draw(im)
    anchors = []
    for i, ((title, body), y) in enumerate(zip(items, ys)):
        badge(im, x + 16, y + 16, i + 1)
        d.text((x + 44, y + 1), title, font=font(lang, 'bold', 23), fill=CREAM)
        ty = y + 38
        for line in wrap(d, body, font(lang, 'regular', 18), width - 44):
            d.text((x + 44, ty), line, font=font(lang, 'regular', 18), fill=MUTED)
            ty += 27
        anchors.append((x - 6, y + 16))
    return anchors


def rect_box(m, r):
    x0, y0 = m(r['x'], r['y'])
    x1, y1 = m(r['x'] + r['w'], r['y'] + r['h'])
    return (x0, y0, x1, y1)


def union(*boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def right_mid(b):
    return (b[2] + 6, (b[1] + b[3]) / 2)


VIEW_X, VIEW_Y, VIEW_SCALE = 56, 140, 0.86
COL_X = 700


def viewer_shot(lang, shots, key, marks, pick):
    t = TEXT[lang][key]
    im = canvas()
    header(im, lang, t[0], t[1])
    shot = Image.open(os.path.join(shots, f'{key}.png')).convert('RGB')
    m = window(im, shot, VIEW_X, VIEW_Y, VIEW_SCALE)
    targets = pick(m, marks[key])
    ys = [y for _, y in targets]
    anchors = callouts(im, lang, t[2], COL_X, ys)
    for (box, _), a in zip(targets, anchors):
        ring(im, box)
        arrow(im, a, right_mid(box), bend=0.06)
    return im


def open_shot(lang, shots):
    t = TEXT[lang]['open']
    im = canvas()
    header(im, lang, t[0], t[1])
    d = ImageDraw.Draw(im)
    # A browser window around the page as it looks in an ordinary tab.
    page = Image.open(os.path.join(shots, 'page.png')).convert('RGB')
    bx, by, bw = 56, 168, 700
    ph = int(page.height * bw / page.width)
    tabs, tool = 38, 44
    box = (bx, by, bx + bw, by + tabs + tool + ph)
    shadow(im, box)
    frame = Image.new('RGB', (bw, tabs + tool + ph), (222, 225, 232))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle((10, 8, 270, tabs + 6), 9, fill=(255, 255, 255))
    fd.rectangle((10, tabs - 4, 270, tabs + 6), fill=(255, 255, 255))
    fd.text((24, 15), 'Mountain Sunrise · Horizon Clips', font=font('en', 'regular', 13), fill=(60, 64, 72))
    fd.text((284, 12), '+', font=font('en', 'regular', 18), fill=(90, 94, 104))
    fd.rectangle((0, tabs, bw, tabs + tool), fill=(255, 255, 255))
    fd.text((14, tabs + 10), '←   →', font=font('en', 'regular', 16), fill=(110, 114, 124))
    rx, ry = 82, tabs + tool // 2
    fd.arc((rx - 7, ry - 7, rx + 7, ry + 7), 40, 330, fill=(110, 114, 124), width=2)
    fd.polygon([(rx + 4, ry - 9), (rx + 9, ry - 3), (rx + 2, ry - 2)], fill=(110, 114, 124))
    fd.rounded_rectangle((110, tabs + 7, bw - 92, tabs + tool - 7), 15, fill=(236, 238, 243))
    fd.text((128, tabs + 12), 'horizon-clips.example/watch.html', font=font('en', 'regular', 14), fill=(60, 64, 72))
    fd.line((0, tabs + tool - 1, bw, tabs + tool - 1), fill=(218, 220, 226))
    frame.paste(page.resize((bw, ph), Image.LANCZOS), (0, tabs + tool))
    mask = Image.new('L', frame.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, bw - 1, frame.height - 1), 10, fill=255)
    im.paste(frame, (bx, by), mask)
    # Toolbar icons: VideoToGo, then the menu.
    iy = by + tabs + tool // 2
    ix = bx + bw - 62
    ic = ICON.resize((24, 24), Image.LANCZOS)
    im.paste(ic, (ix - 12, iy - 12), ic)
    for k in (-6, 0, 6):
        d.ellipse((bx + bw - 28, iy + k - 2, bx + bw - 24, iy + k + 2), fill=(90, 94, 104))
    d.ellipse((ix - 20, iy - 20, ix + 20, iy + 20), outline=ORANGE, width=3)

    # The viewer window it opens.
    shot = Image.open(os.path.join(shots, 'list.png')).convert('RGB')
    vx, vy, vs = 800, 196, 0.62
    window(im, shot, vx, vy, vs)

    arrow(im, (ix + 22, iy - 6), (vx - 8, vy + 60), bend=-0.3)
    d = ImageDraw.Draw(im)
    cap = font(lang, 'bold', 20)
    # Captions under each window.
    cy = 700
    badge(im, bx + 16, cy + 14, 1)
    d.text((bx + 44, cy), t[2][0], font=cap, fill=CREAM)
    badge(im, vx + 16, cy + 14, 2)
    lines = wrap(d, t[2][1], cap, 1280 - vx - 44 - 40)
    for i, line in enumerate(lines):
        d.text((vx + 44, cy + i * 30), line, font=cap, fill=CREAM)
    return im


CSS_W = 680


def row_box(m, r):
    x0, y0 = m(0, r['y'])
    x1, y1 = m(CSS_W, r['y'] + r['h'])
    return (x0 + 3, y0, x1 - 3, y1)


def pick_list(m, k):
    hls = union(row_box(m, k['hls1080']), row_box(m, k['hls480']))
    return [(row_box(m, k['mp4']), 330), (hls, 470), (row_box(m, k['capture']), 610)]


def pick_queue(m, k):
    meta = k['mp4Meta']
    return [(row_box(m, k['paused']), 300), (row_box(m, meta | {'y': meta['y'] - 6, 'h': 32}), 450), (rect_box(m, k['cancel']), 600)]


def pick_images(m, k):
    return [(rect_box(m, k['downloadAll']), 330), (row_box(m, k['rows']), 500)]


for lang, shotdir in [('en', 'en'), ('zh_TW', 'zh-TW')]:
    shots = os.path.join(SHOTS, shotdir)
    marks = json.load(open(os.path.join(shots, 'marks.json'), encoding='utf-8'))
    out = os.path.join(OUT, lang)
    os.makedirs(out, exist_ok=True)
    open_shot(lang, shots).save(os.path.join(out, '1-open.png'))
    viewer_shot(lang, shots, 'list', marks, pick_list).save(os.path.join(out, '2-list.png'))
    viewer_shot(lang, shots, 'queue', marks, pick_queue).save(os.path.join(out, '3-downloads.png'))
    viewer_shot(lang, shots, 'images', marks, pick_images).save(os.path.join(out, '4-images.png'))
print(f'store screenshots: {os.path.relpath(OUT, REPO)}')
