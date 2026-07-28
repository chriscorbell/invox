# Vendored PDF fonts

pdf-lib embeds TrueType, but `@fontsource-variable/*` ships woff2 only, so these
static instances are derived from the variable fonts already in `node_modules`.
Both families are SIL OFL 1.1 (licenses alongside), which permits redistribution.

Regenerate with `fonttools`:

```sh
uv venv /tmp/fv && uv pip install --python /tmp/fv/bin/python "fonttools[woff]"
# geist-latin-wght-normal.woff2 -> geist.ttf, jetbrains-mono-latin-wght-normal.woff2 -> mono.ttf
/tmp/fv/bin/python - <<'PY'
from fontTools.ttLib.woff2 import decompress
from fontTools.varLib import instancer
from fontTools.ttLib import TTFont
decompress("geist.woff2", "geist.ttf"); decompress("mono.woff2", "mono.ttf")
for src, wght, out in [("geist",400,"Geist-Regular"), ("geist",600,"Geist-SemiBold"),
                       ("mono",400,"JetBrainsMono-Regular"), ("mono",600,"JetBrainsMono-SemiBold")]:
    f = TTFont(f"{src}.ttf")
    instancer.instantiateVariableFont(f, {"wght": wght}, inplace=False).save(f"{out}.ttf")
PY
```

They are subset at embed time, so only the glyphs actually used ship in a PDF.
