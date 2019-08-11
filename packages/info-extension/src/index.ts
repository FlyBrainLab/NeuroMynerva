import { JupyterLab, JupyterLabPlugin, ILayoutRestorer } from '@jupyterlab/application';
import { ICommandPalette, WidgetTracker } from '@jupyterlab/apputils';
import { NeuroInfoWidget } from './widget'
import { JSONExt } from '@phosphor/coreutils';

const VERBOSE = false;

/**
 * Tracker for restoring layout of NeuroInfoWidget
 */
const tracker: JupyterLabPlugin<WidgetTracker<NeuroInfoWidget>> = {
  activate,
  id: '@jupyterlab-neuro-mynerva/info:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer]
};

export default tracker;

/**
 * The command IDs used by the notebook plugin.
 */
namespace CommandIDs {
  export
    const open = 'NeuroMynerva:info-open';
  // export
  //   const maximize = 'NeuroMynerva:info-max';
}

/**
 * Activate the NeuroInfo widget extension.
 * 
 */
function activate(
  app: JupyterLab,
  palette: ICommandPalette,
  restorer: ILayoutRestorer
): WidgetTracker<NeuroInfoWidget> {
  if (VERBOSE) {console.log('[NeuroMynerva-Info] NeuroMynerva (info) extension activated!');}
  const namespace = 'NeuroMynerva-info';
  let tracker = new WidgetTracker<NeuroInfoWidget>({ namespace });
  const { commands, shell } = app;
  let widget: NeuroInfoWidget;

  // Add an application command
  commands.addCommand(CommandIDs.open, {
    label: 'Create Info',
    execute: () => {
      window.FFBOLabrestorer.fetch('ffbo:state').then(_fetch => {
        let newFetch = _fetch;
        if(!_fetch)
        {
          newFetch = {};
        }
        newFetch['info'] = true;
        window.FFBOLabrestorer.save('ffbo:state', newFetch);
      });
      if (!widget || widget.isDisposed) {
        // Create a new widget if one does not exist
        widget = new NeuroInfoWidget();
        widget.update();
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        shell._addToRightArea(widget);
        // shell.addToMainArea(widget);
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

      // let nonexist = true;

      // keys.forEach(function (value) {
      //   if ((<string>value).startsWith(namespace)) {
      //     nonexist = false;
      //   }
      // });

      // return nonexist;
      return false;
    }
  });

  // // Add an application command
  // commands.addCommand(CommandIDs.maximize, {
  //   label: 'Toggle Info Focus',
  //   execute: () => {
  //     // console.log(widget);
  //     // if(widget.node.classList.contains('panel-fullscreen')) {
  //     //   widget.node.classList.remove('panel-fullscreen');
  //     // }
  //     // else {
  //     //   widget.node.classList.add('panel-fullscreen');
  //     // }
  //     window.JLabApp.commands.execute('application:toggle-mode');
  //   },
  //   isEnabled: () => {
  //     let keys = Array.from((<any>restorer)._widgets.keys());
  //     if (VERBOSE) { console.log(keys);}

  //     let nonexist = true;

  //     keys.forEach(function(value) {
  //       if((<string>value).startsWith(namespace))
  //       {
  //         nonexist = false;
  //       }
  //     });

  //     return nonexist;
  //   }
  // });

  // Populate Command Palette
  populatePalette(palette);


  // app.contextMenu.addItem({
  //   command: CommandIDs.maximize,
  //   selector: '.jp-FFBOLabInfo',
  //   rank: 0
  // });
  
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
