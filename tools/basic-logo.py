import sys
# tools/basic-logo.py — macht aus den Pro-Symbolen die Basic-Symbole (Klaus 2026-10-29 spät): weißes Feld, Innenleben dunkelgrün,
# feiner grüner Rand. Aufruf je Datei: python3 tools/basic-logo.py <Pro-Symbol.png> <Ziel.png>
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGBA'); W,H = im.size
px = im.load(); out = Image.new('RGBA', im.size); po = out.load()
G = (5, 92, 86)      # dunkles Grün fürs Innenleben
RAND = (11, 116, 114)
a = im.split()[3]
# Rand: Alphamaske minus verkleinerte Maske
k = max(3, (W//64)|1)
from PIL import ImageDraw
bin_ = a.point(lambda v: 255 if v>=128 else 0)
aussen = bin_.copy(); ImageDraw.floodfill(aussen,(0,0),128)
tile = aussen.point(lambda v: 0 if v==128 else 255)   # Kachel ohne Löcher
innen = tile.filter(ImageFilter.MinFilter(k)); ai = innen.load()
for y in range(H):
  for x in range(W):
    r,g,b,al = px[x,y]
    L = .3*r+.59*g+.11*b
    f = min(1,max(0,(r-35)/(165-35)))
    nr,ng,nb = [round(255*(1-f)+c*f) for c in G]
    if al and tile.getpixel((x,y))==255 and ai[x,y] < 128 and src.find('maskable')<0 and src.find('apple')<0:  # äußerer Ring
      nr,ng,nb = RAND
    po[x,y] = (nr,ng,nb,255 if (al and tile.getpixel((x,y))==255) else al)
if im.getpixel((0,0))[3] == 255: out = out.convert('RGB')
out.save(dst)
