import { JupyterLab, JupyterLabPlugin, ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, InstanceTracker } from '@jupyterlab/apputils';
import { NeuroGFXWidget } from './widget'
import { JSONExt } from '@phosphor/coreutils';

const VERBOSE = false;

declare global {
  interface Window {
    neurogfxWidget: any;
  }
}
/**
 * Initialization data for FFBOLab Plugin
 */
const tracker: JupyterLabPlugin<InstanceTracker<NeuroGFXWidget>> = {
  activate,
  id: '@jupyterlab-neuro-mynerva/neugfx:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer]
};

export default tracker;

/**
 * The command IDs used by the notebook plugin.
 */
namespace CommandIDs {
  export
    const open = 'NeuroMynerva:neurogfx-open';
}

/**
 * Activate the Neu3D widget extension.
 */
function activate(
  app: JupyterLab,
  palette: ICommandPalette,
  restorer: ILayoutRestorer
): InstanceTracker<NeuroGFXWidget> {
  if (VERBOSE) {console.log('[NM Neugfx] NeuroMynerva (neugfx) extension activated!');}
  const namespace = 'NeuroMynerva-gfx';
  let tracker = new InstanceTracker<NeuroGFXWidget>({ namespace });
  const { commands, shell } = app;
  let widget: NeuroGFXWidget;

  // Add an application command
  commands.addCommand(CommandIDs.open, {
    label: 'Create NeuroGFX',
    execute: () => {
      if (VERBOSE) { console.log('NEUGFX OPEN call');}
      if (!widget || widget.isDisposed) {
        // Create a new widget if one does not exist
        widget = new NeuroGFXWidget();
        widget.update();
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        shell.addToMainArea(widget, { mode: 'split-right'});
      } else {
        // Refresh widget
        widget.update();
      }
      // Activate the widget
      widget.activate();
      commands.notifyCommandChanged(CommandIDs.open);
      return widget;
    },
    isEnabled: () => {
      // let keys = Array.from((<any>restorer)._widgets.keys());
      // if (VERBOSE) { console.log(keys);}

      // let nonexist = true;

      // keys.forEach(function(value) {
      //   if((<string>value).startsWith(namespace))
      //   {
      //     nonexist = false;
      //   }
      // });

      // return nonexist;
      return false;
    }
  });

  // Populate Command Palette
  populatePalette(palette);
  
  // Track and restore the widget state
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: () => JSONExt.emptyObject,
    name: () => namespace
  });

  return tracker;
};

/**
 * Populate the application's command palette
 */
function populatePalette(palette: ICommandPalette): void {
  let category = 'NeuroMynerva Operations';
  [
    CommandIDs.open,
  ].forEach(command => { palette.addItem({ command, category }); });
}
