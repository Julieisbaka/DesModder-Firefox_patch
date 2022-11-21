// dcg-right-buttons
import {
  containingCreateElementCall,
  findIdentifierThis,
} from "../overrideHelpers/moduleUtils";
import { DependencyNameMap } from "../overrideHelpers/withDependencyMap";
import template from "@babel/template";
import * as t from "@babel/types";

export default (dependencyNameMap: DependencyNameMap) => ({
  StringLiteral(path: babel.NodePath<t.StringLiteral>) {
    if (path.node.value === "dcg-right-buttons") {
      /* @plugin text-mode
      
      @what Add text mode toggle button
      
      @how
        Splices in a new <If predicate></If> before the other elements in
          <span class="dcg-expression-edit-actions">
            // here
            <If predicate> enter ELM cogwheel </If>
            <If predicate> exit ELM button </If>
            <If predicate> hide exprs button </If>
          </span>
      */
      const createElementCall = containingCreateElementCall(path);
      if (createElementCall === null) return;
      createElementCall.node.arguments.splice(
        2, // (1 for the "span") + (1 for the props)
        0,
        template.expression(`
          %%DCGView%%.createElement(
            %%DCGView%%.Components.If,
            {
              predicate: function() {
                return window.DesModder?.controller?.isPluginEnabled?.("text-mode") && !%%this%%.controller.isInEditListMode(); 
              }
            },
            function() {
              return %%DCGView%%.createElement(
                %%Tooltip%%.Tooltip,
                {
                  tooltip: () => DesModder.controller.format("text-mode-toggle"),
                  gravity: function() {
                    return %%this%%.controller.isNarrow() ? 'n' : 's';
                  }
                },
                %%DCGView%%.createElement(
                  'span',
                  {
                    class: %%DCGView%%.const('dcg-icon-btn'),
                    handleEvent: %%DCGView%%.const('true'),
                    role: %%DCGView%%.const('button'),
                    tabindex: %%DCGView%%.const('0'),
                    onTap: () => window.DesModder.controller.toggleTextMode()
                  },
                  %%DCGView%%.createElement('i', {
                    class: %%DCGView%%.const('dcg-icon-title')
                  })
                )
              )
            }
          )
        `)({
          DCGView: dependencyNameMap.dcgview,
          Tooltip: dependencyNameMap["../shared-components/tooltip"],
          this: findIdentifierThis(path),
        })
      );
    }
  },
});
