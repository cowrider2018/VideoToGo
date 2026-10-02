"""Builds the demo video site the store screenshots are taken on, into dist/screenshots-work/demo.

Everything on it is made here: landscape art drawn with Pillow, a 3-quality HLS stream and an
MP4 clip encoded from that art with ffmpeg, and hls.js fetched from jsdelivr to play the stream.
"""

import math
import os
import random
import shutil
import subprocess
import urllib.request

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'dist', 'screenshots-work', 'demo')
HLS_JS = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.20/dist/hls.min.js'

# name: sky top, sky bottom, sun, [(ridge colour, height, roughness)], seed
SCENES = {
    'sunrise': ((38, 44, 92), (246, 170, 110), (255, 226, 170),
                [((92, 74, 110), 0.55, 0.18), ((58, 48, 80), 0.66, 0.16), ((30, 26, 46), 0.8, 0.12)], 1),
    'ocean': ((90, 160, 210), (220, 236, 240), (255, 250, 230),
              [((40, 110, 150), 0.62, 0.04), ((24, 80, 118), 0.72, 0.05), ((214, 196, 150), 0.9, 0.03)], 2),
    'forest': ((120, 170, 150), (230, 226, 190), (255, 240, 200),
               [((70, 120, 90), 0.5, 0.2), ((40, 84, 62), 0.64, 0.18), ((20, 48, 36), 0.8, 0.14)], 3),
    'desert': ((240, 150, 90), (250, 220, 160), (255, 245, 220),
               [((210, 130, 80), 0.6, 0.1), ((170, 96, 60), 0.72, 0.08), ((110, 60, 40), 0.86, 0.06)], 4),
    'night': ((10, 14, 40), (50, 60, 120), (235, 235, 250),
              [((40, 40, 80), 0.6, 0.2), ((24, 24, 56), 0.72, 0.15), ((10, 10, 28), 0.86, 0.1)], 5),
}


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def scene(w, h, sky_top, sky_bottom, sun, ridges, seed):
    rnd = random.Random(seed)
    im = Image.new('RGB', (w, h))
    d = ImageDraw.Draw(im)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=lerp(sky_top, sky_bottom, y / h))
    sx, sy, r = int(w * rnd.uniform(0.25, 0.75)), int(h * 0.42), int(h * 0.09)
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((sx - r * 2.6, sy - r * 2.6, sx + r * 2.6, sy + r * 2.6), fill=sun + (90,))
    glow = glow.filter(ImageFilter.GaussianBlur(r * 1.2))
    ImageDraw.Draw(glow).ellipse((sx - r, sy - r, sx + r, sy + r), fill=sun + (255,))
    im.paste(glow, (0, 0), glow)
    for i, (colour, base, amp) in enumerate(ridges):
        n, f = rnd.randint(14, 24), rnd.uniform(4, 9)
        pts = [(w * k / n, h * base + math.sin(k / n * f + i) * h * amp * 0.5 + rnd.uniform(-1, 1) * h * amp * 0.35)
               for k in range(n + 1)]
        d.polygon([(0, h)] + pts + [(w, h)], fill=colour)
    return im


def draw_art():
    os.makedirs(os.path.join(OUT, 'thumbs'), exist_ok=True)
    for name, (top, bottom, sun, ridges, seed) in SCENES.items():
        big = scene(1920, 1080, top, bottom, sun, ridges, seed)
        if name == 'night':
            d, rnd = ImageDraw.Draw(big), random.Random(9)
            for _ in range(300):
                d.point((rnd.randint(0, 1920), rnd.randint(0, 600)), fill=(255, 255, 255))
        big.save(os.path.join(OUT, f'{name}.png'))
        # Light grain so a thumbnail has a realistic size (the extension skips images under 10 KB).
        thumb = big.resize((480, 270), Image.LANCZOS)
        px, rnd = thumb.load(), random.Random(seed)
        for y in range(270):
            for x in range(480):
                n = rnd.randint(-6, 6)
                px[x, y] = tuple(max(0, min(255, v + n)) for v in px[x, y])
        thumb.save(os.path.join(OUT, 'thumbs', f'{name}.jpg'), quality=90)


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], cwd=OUT, check=True)


def encode():
    # The main video: a slow push-in on the sunrise, as HLS in three qualities.
    os.makedirs(os.path.join(OUT, 'hls'), exist_ok=True)
    ffmpeg('-loop', '1', '-framerate', '30', '-i', 'sunrise.png', '-t', '24', '-filter_complex',
           "[0]zoompan=z='1+0.0006*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,"
           'noise=alls=6:allf=t,format=yuv420p,split=3[a][b][c];[b]scale=1280:720[b2];[c]scale=854:480[c2]',
           '-map', '[a]', '-map', '[b2]', '-map', '[c2]', '-c:v', 'libx264', '-preset', 'veryfast',
           '-g', '60', '-keyint_min', '60', '-sc_threshold', '0',
           '-b:v:0', '4500k', '-b:v:1', '2500k', '-b:v:2', '1000k',
           '-f', 'hls', '-hls_time', '2', '-hls_playlist_type', 'vod',
           '-hls_segment_filename', 'hls/%v/seg%03d.ts', '-master_pl_name', 'master.m3u8',
           '-var_stream_map', 'v:0,name:1080p v:1,name:720p v:2,name:480p', 'hls/%v/index.m3u8')
    # The sidebar preview: a plain MP4 file, large enough to be listed (over 512 KB).
    ffmpeg('-loop', '1', '-framerate', '30', '-i', 'ocean.png', '-t', '12', '-vf',
           "zoompan=z='1.08-0.0005*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1280x720:fps=30,"
           'noise=alls=6:allf=t,format=yuv420p',
           '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '1500k', '-movflags', '+faststart', 'clip.mp4')


def main():
    shutil.rmtree(OUT, ignore_errors=True)
    os.makedirs(OUT)
    draw_art()
    encode()
    shutil.copy(os.path.join(HERE, 'watch.html'), OUT)
    urllib.request.urlretrieve(HLS_JS, os.path.join(OUT, 'hls.min.js'))
    print(f'demo site: {os.path.relpath(OUT, ROOT)}')


if __name__ == '__main__':
    main()
