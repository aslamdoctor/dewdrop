// Dewdrop layout: one mod, drawn by role. The layout gives each copy props { role }:
//   titlebar  wooden title bar with the clock box
//   header    a pane's plank header
//   sky       the see-through strip above the panes: clouds and birds, or stars and fireflies
//   hotbar    spaces as inventory slots, with the pet walking the road under the box
//   picker    dialog to choose the portrait
//   tabmore   popup listing the tabs the title bar had no room for
//   petpick   dialog to choose the pet
//   agents    popup listing the farmhands and their helpers
//   empty     nothing (the hidden peek-spacer)

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Titlebar from "./titlebar.js";
import Header from "./header.js";
import Hotbar from "./hotbar.js";
import Sky from "./sky.js";
import TabMore from "./tabs.js";
import Picker from "./picker.js";
import PetPick from "./petpick.js";
import Agents from "./agents.js";

// A role that paints nothing (the hidden peek-spacer block).
class Empty {
  render() {
    return div();
  }
}

const ROLES = { titlebar: Titlebar, header: Header, sky: Sky, hotbar: Hotbar, tabmore: TabMore, picker: Picker, petpick: PetPick, agents: Agents, empty: Empty };

export default class Dewdrop extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().text_color("#f3e2b8").child(`dewdrop: no role "${props()?.role}" yet`);
    return this.role.render(cx);
  }
}
