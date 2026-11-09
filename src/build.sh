#!/bin/sh
# Ensambla el juego a partir de las piezas (uso: sh src/build.sh)
# Genera pixel-skate.html (doble clic) e index.html (el que sirve GitHub Pages); son el mismo archivo.
cd "$(dirname "$0")"
OUT="${1:-../pixel-skate.html}"
cat p0_head.html p1_core.js p2_voxel.js p3_level.js p3b_logo.js p3c_scene.js p4_player.js p7_extras.js p5_audio.js p8a_tricks.js p8b_replay.js p8c_input.js p6a_meta.js p6b_draw.js p9_tail.html > "$OUT"
cp "$OUT" "$(dirname "$OUT")/index.html"
wc -l "$OUT"
