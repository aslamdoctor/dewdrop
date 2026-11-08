// Dewdrop layout: one mod, drawn by role. The layout gives each copy props { role }:
//   titlebar  wooden title bar with the clock box
//   header    a pane's plank header
//   hotbar    spaces as inventory slots
//   chicken   the floating critter
//   pet       the same critter, as the layout names it
//   empty     nothing (the hidden peek-spacer)

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Titlebar from "./titlebar.js";
import Header from "./header.js";
import Hotbar from "./hotbar.js";
import Chicken from "./chicken.js";

// A role that paints nothing (the hidden peek-spacer block).
class Empty {
  render() {
    return div();
  }
}

// "pet" is the chicken view until Task 10 brings the pet cast.
const ROLES = { titlebar: Titlebar, header: Header, hotbar: Hotbar, chicken: Chicken, pet: Chicken, empty: Empty };

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
