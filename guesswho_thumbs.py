"""Genera las miniaturas del modulo Masquerade.

Lee las rutas de 'imagen' en guesswho-data.js, escribe un webp reducido en
guess_who/thumbs/ por cada una, y reapunta guesswho-data.js a la miniatura.
Los originales de guess_who/ no se tocan nunca.

Uso, desde la raiz del repo:   python guesswho_thumbs.py
                               python guesswho_thumbs.py --force   (rehace todas)

Es idempotente y detecta cambios: si la ruta ya apunta a guess_who/thumbs/,
busca el original con el mismo nombre en guess_who/ y solo rehace la miniatura
cuando el original es mas nuevo. Asi, si reemplazas la foto de un personaje,
basta con volver a correr esto.

Para agregar un personaje: deja el original en guess_who/, pon esa ruta en
'imagen', y corre el script.
"""
import os
import re
import sys

from PIL import Image, ImageOps

DATA    = "guesswho-data.js"
SRC_DIR = "guess_who"
DST_DIR = f"{SRC_DIR}/thumbs"
MAX_W   = 420   # alcanza para la carta (88px) y para la ficha (108px) en pantallas 2x
QUALITY = 82
EXTS    = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")

FORCE = "--force" in sys.argv


def find_original(stem):
    """Busca guess_who/<stem>.<ext> ignorando mayusculas."""
    for entry in os.listdir(SRC_DIR):
        path = os.path.join(SRC_DIR, entry)
        if not os.path.isfile(path):
            continue
        name, ext = os.path.splitext(entry)
        if name.lower() == stem.lower() and ext.lower() in EXTS:
            return path.replace("\\", "/")
    return None


def build(src, out):
    im = ImageOps.exif_transpose(Image.open(src))
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
    if im.width > MAX_W:
        im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
    im.save(out, "WEBP", quality=QUALITY, method=6)


data = open(DATA, encoding="utf-8").read()
refs = [r for r in re.findall(r"imagen: '([^']+)'", data) if r]

os.makedirs(DST_DIR, exist_ok=True)
mapping = {}
built = updated = uptodate = 0
bytes_in = bytes_out = 0

for rel in refs:
    stem = os.path.splitext(os.path.basename(rel))[0]
    out_rel = f"{DST_DIR}/{stem}.webp"

    if rel.startswith(DST_DIR):
        # ya apunta a la miniatura: rehacerla solo si el original cambio
        src = find_original(stem)
        if src is None:
            uptodate += 1
            continue
        if not FORCE and os.path.exists(out_rel) \
                and os.path.getmtime(src) <= os.path.getmtime(out_rel):
            uptodate += 1
            continue
        build(src, out_rel)
        updated += 1
        print(f"  actualizada: {stem}")
        continue

    if not os.path.exists(rel):
        print(f"  falta el archivo: {rel}")
        continue

    build(rel, out_rel)
    built += 1
    bytes_in  += os.path.getsize(rel)
    bytes_out += os.path.getsize(out_rel)
    mapping[rel] = out_rel

for old, new in mapping.items():
    data = data.replace(f"imagen: '{old}'", f"imagen: '{new}'")
if mapping:
    open(DATA, "w", encoding="utf-8").write(data)

print(f"Done! {built} nuevas ({bytes_in / 1048576:.1f} MB -> {bytes_out / 1048576:.2f} MB), "
      f"{updated} actualizadas, {uptodate} sin cambios.")
