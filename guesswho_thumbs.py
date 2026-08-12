"""Build the thumbnails for the Masquerade module.

Reads the 'imagen' paths out of guesswho-data.js, writes a downscaled webp into
guess_who/thumbs/ for each one, and repoints guesswho-data.js at the thumbnail.
The originals in guess_who/ are never touched.

Usage, from the repo root:   python guesswho_thumbs.py
                             python guesswho_thumbs.py --force   (rebuild all)

Idempotent, and it notices changes: when a path already points at
guess_who/thumbs/, it looks for the original of the same name in guess_who/ and
only rebuilds when that original is newer. So if you replace a character's
photo, just run this again.

To add a character: drop the original in guess_who/, put that path in 'imagen',
and run the script.
"""
import os
import re
import sys

from PIL import Image, ImageOps

DATA    = "guesswho-data.js"
SRC_DIR = "guess_who"
DST_DIR = f"{SRC_DIR}/thumbs"
MAX_W   = 420   # enough for the card (88px) and the sheet (108px) on 2x displays
QUALITY = 82
EXTS    = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp")

FORCE = "--force" in sys.argv


def find_original(stem):
    """Find guess_who/<stem>.<ext>, case-insensitive."""
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

# 'imagen' can be a single path or a list of them; grab every quoted path either way
refs = []
for chunk in re.findall(r"imagen: (\[[^\]]*\]|'[^']*')", data):
    refs.extend(r for r in re.findall(r"'([^']+)'", chunk) if r)

os.makedirs(DST_DIR, exist_ok=True)
mapping = {}
built = updated = uptodate = 0
bytes_in = bytes_out = 0

for rel in refs:
    stem = os.path.splitext(os.path.basename(rel))[0]
    out_rel = f"{DST_DIR}/{stem}.webp"

    if rel.startswith(DST_DIR):
        # already points at the thumb: rebuild only if the original changed
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
        print(f"  updated: {stem}")
        continue

    if not os.path.exists(rel):
        print(f"  missing file: {rel}")
        continue

    build(rel, out_rel)
    built += 1
    bytes_in  += os.path.getsize(rel)
    bytes_out += os.path.getsize(out_rel)
    mapping[rel] = out_rel

if mapping:
    # rewrite every quoted path inside an 'imagen' value, scalar or list alike
    def repoint(m):
        chunk = re.sub(r"'([^']+)'",
                       lambda q: "'%s'" % mapping.get(q.group(1), q.group(1)),
                       m.group(1))
        return f"imagen: {chunk}"

    data = re.sub(r"imagen: (\[[^\]]*\]|'[^']*')", repoint, data)
    open(DATA, "w", encoding="utf-8").write(data)

print(f"Done! {built} new ({bytes_in / 1048576:.1f} MB -> {bytes_out / 1048576:.2f} MB), "
      f"{updated} updated, {uptodate} unchanged.")
