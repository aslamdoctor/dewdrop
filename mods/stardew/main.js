// Stardew layout: one mod, drawn by role. The layout gives each copy props { role }:
//   titlebar  wooden title bar with the clock box
//   header    a pane's plank header
//   hotbar    spaces as inventory slots
//   chicken   the floating critter

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Titlebar from "./titlebar.js";

const ROLES = { titlebar: Titlebar };

export default class Stardew extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().text_color("#f3e2b8").child(`stardew: no role "${props()?.role}" yet`);
    return this.role.render(cx);
  }
}
