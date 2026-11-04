#!/bin/zsh
# Renders the story page's images in Blender (Cycles, the Hollywood Bowl at
# about 5:15 pm, with the crowd) and gives each the 1974 colour-print grade.
# About two minutes a shot. Then `npm run story:images` copies them into
# public/story/.
#
#   zsh scripts/story-renders.sh                  # every shot
#   zsh scripts/story-renders.sh bowl-photo title  # just these
#   STORY_RENDER_ARGS='--samples 16 --scale 40' zsh scripts/story-renders.sh title  # a quick look
#
# bowl-photo is the 21 July 1974 photograph's own frame, through the camera
# solved from it (blender/cameras/bowl-1974-07-21.json, qa-findings §19).
set -e
cd "$(dirname "$0")/.."
B=/Applications/Blender.app/Contents/MacOS/Blender
O=.shots/story/v2
mkdir -p $O
shots=(${@:-bowl-photo title bowl-hero bowl bowl-systems bowl-evidence garcia-mark cluster-up amps-close})
for shot in $shots; do
  start=$(date +%s)
  if [ $shot = bowl-photo ]; then
    where=(--camera blender/cameras/bowl-1974-07-21.json)
  elif [ $shot = bowl-systems ]; then
    where=(--shot bowl --tint systems)
  elif [ $shot = bowl-evidence ]; then
    where=(--shot bowl --tint evidence)
  elif [ $shot = amps-close ]; then
    where=(--shot amps-close --meters src/story/meters.json)
  else
    where=(--shot $shot)
  fi
  $B -b -P blender/stage_review.py -- --venue hollywood $where --sun 30,-50 --exposure 0.3 --out $O --name $shot ${=STORY_RENDER_ARGS:-} > $O/$shot.log 2>&1
  $B -b -P blender/crowd_mask.py -- grade $O/$shot.png $O/$shot-graded.png >> $O/$shot.log 2>&1
  echo "$shot done in $(( $(date +%s) - start ))s"
done
