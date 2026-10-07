#!/bin/zsh
# Copies the story page's images into public/story/ as JPEGs the web can load:
# each render at 1920 and 960 px wide, each photograph at its own size.
#
#   npm run story:images
#
# Renders come from .shots/story/v2/ (made by .shots/story/v2/render.sh, which
# runs blender/stage_review.py --venue hollywood and crowd_mask.py grade for
# each shot). Photographs come from .shots/reference/. Both folders are
# ignored; what lands in public/story/ is committed, with its credit in
# src/story/images.ts.
set -e
cd "$(dirname "$0")/.."
OUT=public/story
mkdir -p $OUT

render() {   # render <shot> -> <shot>-1920.jpg, <shot>-960.jpg
  local src=.shots/story/v2/$1-graded.png
  [ -f $src ] || { echo "missing $src"; return 1; }
  sips -s format jpeg -s formatOptions 82 -Z 1920 $src --out $OUT/$1-1920.jpg >/dev/null
  sips -s format jpeg -s formatOptions 80 -Z 960 $src --out $OUT/$1-960.jpg >/dev/null
  echo "$1"
}

photo() {    # photo <reference file> <name>
  sips -s format jpeg -s formatOptions 85 .shots/reference/$1 --out $OUT/$2.jpg >/dev/null
  echo "$2"
}

for shot in bowl-hero bowl garcia cluster-up amps bowl-tower; do render $shot; done
photo unsourced-hollywoodbowl-1974-07-21-b.webp photo-bowl-1974-07-21
du -sh $OUT
