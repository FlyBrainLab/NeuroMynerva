import { JupyterLab, JupyterLabPlugin, ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, InstanceTracker } from '@jupyterlab/apputils';
import { Neu3DWidget } from './widget'
import { JSONExt } from '@phosphor/coreutils';

const VERBOSE = false;
/**
 * Initialization data for FFBOLab Plugin
 */
const tracker: JupyterLabPlugin<InstanceTracker<Neu3DWidget>> = {
  activate,
  id: '@jupyterlab-neuro-mynerva/neu3d:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer]
};

export default tracker;

/**
 * The command IDs used by the notebook plugin.
 */
namespace CommandIDs {
  export
    const open = 'NeuroMynerva:neu3d-open';
}

/**
 * Activate the Neu3D widget extension.
 */
function activate(
  app: JupyterLab,
  palette: ICommandPalette,
  restorer: ILayoutRestorer
): InstanceTracker<Neu3DWidget> {
  if (VERBOSE) {console.log('[NM Neu3d] NeuroMynerva (neu3d) extension activated!');}
  const namespace = 'NeuroMynerva-neu3d';
  let tracker = new InstanceTracker<Neu3DWidget>({ namespace });
  const { commands, shell } = app;
  let widget: Neu3DWidget;

  // Add an application command
  commands.addCommand(CommandIDs.open, {
    label: 'Create Neu3D',
    execute: () => {
      if (VERBOSE) {console.log('[NM NEU3D] OPEN call');}
      if (!widget || widget.isDisposed) {
        // Create a new widget if one does not exist
        widget = new Neu3DWidget();
        widget.update();
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        shell.addToMainArea(widget, { mode: 'split-bottom'});
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
      let keys = Array.from((<any>restorer)._widgets.keys());

      let nonexist = true;

      keys.forEach(function(value) {
        if((<string>value).startsWith(namespace))
        {
          nonexist = false;
        }
      });

      return nonexist;
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
