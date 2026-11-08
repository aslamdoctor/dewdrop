#!/usr/bin/env bash
# Copy the dewdrop layout into the Herdr home (default), or remove it (--remove).
# Copies, not symlinks: Herdr 0.1.13 doesn't hot-reload files behind a symlink.
# Rerun after every edit while developing.
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
ITEMS=(layouts/dewdrop.json themes/dewdrop.json mods/dewdrop)
# Old names from before the rename, removed on every run so no stale copy lingers.
OLD=(layouts/stardew.json layouts/stardew.svg themes/stardew.json mods/stardew)

for item in "${OLD[@]}"; do
  if [[ -e "$HOME_DIR/$item" || -L "$HOME_DIR/$item" ]]; then rm -rf "${HOME_DIR:?}/$item"; echo "removed old $item"; fi
done

for item in "${ITEMS[@]}"; do
  dst="$HOME_DIR/$item"
  if [[ "${1:-}" == "--remove" ]]; then
    rm -rf "$dst"; echo "removed $item"; continue
  fi
  [[ -e "$SRC/$item" ]] || { echo "skip $item (not built yet)"; continue; }
  mkdir -p "$(dirname "$dst")"
  rm -rf "$dst"
  cp -R "$SRC/$item" "$dst"
  echo "copied $item"
done
