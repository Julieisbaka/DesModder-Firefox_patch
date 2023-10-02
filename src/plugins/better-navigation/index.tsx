/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { Calc } from "src/globals";
import { PluginController } from "../PluginController";
import { hookIntoOverrideKeystroke } from "src/utils/listenerHelpers";
import { MathQuillView } from "src/components";
import { getController } from "../intellisense/latex-parsing";

function isWordMQElem(el?: HTMLElement) {
  return (
    el &&
    (el.classList.contains("dcg-mq-digit") ||
      el.tagName.toUpperCase() === "VAR" ||
      el.classList.contains("dcg-mq-supsub"))
  );
}

export default class BetterNavigation extends PluginController {
  static id = "better-navigation" as const;
  static enabledByDefault = true;

  afterConfigChange(): void {}

  dispatcherID: string | undefined;

  customRemoveHandlers: (() => void)[] = [];

  keydownHandler = () => {
    if (Calc.focusedMathQuill) {
      const remove = hookIntoOverrideKeystroke(
        Calc.focusedMathQuill.mq,
        (key, _) => {
          const mq = MathQuillView.getFocusedMathquill();

          if (!mq) return true;
          if (
            key !== "Ctrl-Left" &&
            key !== "Ctrl-Right" &&
            key !== "Ctrl-Shift-Left" &&
            key !== "Ctrl-Shift-Right"
          )
            return true;

          const right = key === "Ctrl-Right" || key === "Ctrl-Shift-Right";
          const shift = key === "Ctrl-Shift-Left" || key === "Ctrl-Shift-Right";

          // remove the "Ctrl-" to get the normal arrow op to emulate.
          const arrowOp = key.slice(5);

          const ctrlr = getController(mq);

          // don't do anything if there's nowhere we can go
          const next = ctrlr.cursor?.[right ? 1 : -1];
          if (!next) return;

          // if the next element is a bracket, fraction, or sum/prod/etc
          // then skip over the entire thing when ctrl+arrowing (don't edit internals)
          // Shift-arrow already does this behavior perfectly so we first do that.
          // Then we do a normal arrow press to delete the selection.
          if (
            next._el?.classList.contains("dcg-mq-bracket-container") ||
            next._el?.classList.contains("dcg-mq-fraction") ||
            next._el?.classList.contains("dcg-mq-large-operator") ||
            next._el?.classList.contains("dcg-mq-int")
          ) {
            mq.keystroke(right ? "Shift-Right" : "Shift-Left");
            if (!shift) mq.keystroke(arrowOp);

            // skip over entire variable names, numbers, and operatornames
          } else if (isWordMQElem(next._el)) {
            let i = 0;
            while (
              isWordMQElem(ctrlr.cursor?.[right ? 1 : -1]?._el) &&
              i < 1000
            ) {
              mq.keystroke(arrowOp);

              // if at the start/end of a subscript/superscript block,
              // then escape it
              if (
                (ctrlr.cursor?.parent?._el?.classList.contains("dcg-mq-sup") ||
                  ctrlr.cursor?.parent?._el?.classList.contains(
                    "dcg-mq-sub"
                  )) &&
                !ctrlr.cursor?.[right ? 1 : -1]
              ) {
                mq.keystroke(arrowOp);
              }
              i++;
            }

            // treat it as a normal arrow key press in all other respects
          } else {
            mq.keystroke(arrowOp);
          }
          return false;
        },
        0,
        "better-nav-ctrl"
      );

      if (remove) this.customRemoveHandlers.push(remove);
    }
  };

  afterEnable() {
    document.addEventListener("keydown", this.keydownHandler);
  }

  afterDisable() {
    document.removeEventListener("keydown", this.keydownHandler);
    for (const handler of this.customRemoveHandlers) handler();
  }
}
