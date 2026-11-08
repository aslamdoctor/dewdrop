# Contributing to Dewdrop

Thanks for taking a look. Bug reports, fixes, new pets and art tweaks are all welcome.

## Before you start

- For a bug, open an issue with your Herdr version, your OS, and a screenshot if it's visual. The mod is built against Herdr 0.1.13, so say if you're on something newer.
- For a bigger change (a new hotbar tool, a new scene, layout changes), open an issue first so we can agree on the idea before you put time into it.
- Small fixes can go straight to a pull request.

## Setup

You need the Herdr desktop app and [Bun](https://bun.sh).

```sh
git clone https://github.com/aslamdoctor/dewdrop.git
cd dewdrop
bun test
bash scripts/install.sh
herdr-app do layout.switch --name dewdrop
```

The install script copies the files into `~/.config/herdr-app` (or `$HERDR_APP_HOME`). It copies instead of symlinking because Herdr 0.1.13 doesn't hot-reload files behind a symlink. Rerun it after every edit, then touch the installed `.js` files so Herdr picks them up:

```sh
bash scripts/install.sh && touch ~/.config/herdr-app/mods/dewdrop/*.js
```

## Where things live

| Path | What's in it |
|------|--------------|
| `mods/dewdrop/` | the mod: `main.js` wires it up, the other files each own one part (`tabs.js`, `hotbar.js`, `pets.js`, `sky.js`, ...) |
| `mods/dewdrop/logic.js` | pure helpers with no Herdr calls, the easiest place to add tests |
| `mods/dewdrop/art/` | sprites, scenes, pet frames and portraits |
| `layouts/dewdrop.json` | the layout tree |
| `themes/dewdrop.json` | the theme colors |
| `scripts/` | the install script and the art generators |
| `tests/` | `bun test` suites |
| `RECIPE.md` | a full description of how the layout looks and behaves |

## Making changes

- Run `bun test` and `herdr-app check mods/dewdrop` before you open a PR. Both should pass.
- Try the change in Herdr, in both the day and the night look. For now the only way to see the night look is to set your system clock past 6 pm.
- Add or update tests for logic changes. Put pure logic in `logic.js` (or another file without Herdr calls) so it can be tested.
- Keep to the palette in `mods/dewdrop/palette.js`. `tests/assets.test.js` checks that sprites and the theme only use those colors.
- If a change affects how the layout looks or behaves, update `RECIPE.md` and, where it makes sense, the README and its screenshots.

## Art

- SVG sprites come from `scripts/draw-art.js` and the valley scenes from `bun scripts/draw-scenes.js`. Change the script and regenerate rather than editing the output files by hand.
- `scripts/render-pictures.js` reads source pictures from the maintainer's machine, so you probably can't run it. If you want to change a portrait or pet frame, open an issue first.
- New art has to be your own or under a license that allows it. Add a line for it in `mods/dewdrop/art/CREDITS.md`.
- Keep it crisp pixel art: no blur or anti-aliasing, and 2px black borders on boxes.

## Commits and pull requests

- Commit messages use [Conventional Commits](https://www.conventionalcommits.org/) in plain lowercase, e.g. `feat: make the road pet react when clicked` or `fix: center the pet on the road`. Use `feat`, `fix`, `docs`, `chore`, `test` or `refactor`.
- Keep each commit to one change and each PR to one topic.
- Branch off `main` and open the PR against `main`.
- In the PR description, say what changed and how you tested it, and add a screenshot for anything visual.

## License

By contributing you agree that your work is released under the [MIT License](LICENSE).
