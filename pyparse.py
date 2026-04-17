import re
import json

INPUT  = "1000_rnd_spells.txt"
OUTPUT = "spells.js"

entry_re = re.compile(r'^\d{4}\s+(.+)$')

spells = []
with open(INPUT, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        m = entry_re.match(line)
        if m:
            text = m.group(1)
            # fix cp1252-as-latin1 garbling: ì -> '
            text = text.replace('\u00ec', "'").replace('\u00ed', "'")
            spells.append(text)

with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write("const SPELLS = ")
    json.dump(spells, f, ensure_ascii=False, separators=(',', ':'))
    f.write(";")

print(f"Done! {len(spells)} spells written to {OUTPUT}")
