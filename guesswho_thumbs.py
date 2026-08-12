"""Genera las miniaturas del modulo Adivina Quien.

Lee las rutas de 'imagen' en guesswho-data.js, escribe un webp reducido en
guess_who/thumbs/ por cada una, y reapunta guesswho-data.js a la miniatura.
Los originales de guess_who/ no se tocan nunca.

Uso, desde la raiz del repo:   python guesswho_thumbs.py

Es idempotente: las rutas que ya apuntan a guess_who/thumbs/ se saltan.
Para agregar un personaje: deja el original en guess_who/, pon esa ruta en
'imagen', y vuelve a correr esto.
"""
import os
import re

from PIL import Image, ImageOps

DATA    = "guesswho-data.js"
SRC_DIR = "guess_who"
DST_DIR = os.path.join(SRC_DIR, "thumbs")
MAX_W   = 420   # alcanza para la carta (88px) y para la ficha (108px) en pantallas 2x
QUALITY = 82

data = open(DATA, encoding="utf-8").read()
refs = [r for r in re.findall(r"imagen: '([^']+)'", data) if r]

os.makedirs(DST_DIR, exist_ok=True)
mapping = {}
bytes_in = bytes_out = 0
skipped = 0

for rel in refs:
    if rel.startswith(DST_DIR.replace("\\", "/")):
        skipped += 1
        continue
    if not os.path.exists(rel):
        print(f"  falta el archivo: {rel}")
        continue

    name    = os.path.splitext(os.path.basename(rel))[0]
    out_rel = f"{SRC_DIR}/thumbs/{name}.webp"

    im = ImageOps.exif_transpose(Image.open(rel))
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(out_rel, "WEBP", quality=QUALITY, method=6)

    bytes_in  += os.path.getsize(rel)
    bytes_out += os.path.getsize(out_rel)
    mapping[rel] = out_rel

for old, new in mapping.items():
    data = data.replace(f"imagen: '{old}'", f"imagen: '{new}'")
if mapping:
    open(DATA, "w", encoding="utf-8").write(data)

print(f"Done! {len(mapping)} miniaturas "
      f"({bytes_in / 1048576:.1f} MB -> {bytes_out / 1048576:.2f} MB), "
      f"{skipped} ya estaban al dia.")
