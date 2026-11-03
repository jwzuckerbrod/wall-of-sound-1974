#!/bin/zsh
# Copies the story page's images into public/story/ as JPEGs the web can load:
# each render at 1920 and 960 px wide, each photograph at its own size.
#
#   npm run story:images
#
# Renders come from .shots/story/v2/, made by scripts/story-renders.sh;
# photographs from .shots/reference/. Both folders are ignored; what lands in
# public/story/ is committed, with its credit in src/story/images.ts.
set -e
cd "$(dirname "$0")/.."
OUT=public/story
mkdir -p $OUT

# The Bowl photograph's own frame (bowl-photo, from stage_review.py --camera
# blender/cameras/bowl-1974-07-21.json) goes at the photo's size and twice it.
match() {
  local src=.shots/story/v2/bowl-photo-graded.png
  [ -f $src ] || { echo "missing $src"; return 1; }
  sips -s format jpeg -s formatOptions 84 -Z 2040 $src --out $OUT/bowl-photo-2040.jpg >/dev/null
  sips -s format jpeg -s formatOptions 82 -Z 1020 $src --out $OUT/bowl-photo-1020.jpg >/dev/null
  echo bowl-photo
}

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
match
photo unsourced-hollywoodbowl-1974-07-21-b.webp photo-bowl-1974-07-21
du -sh $OUT
