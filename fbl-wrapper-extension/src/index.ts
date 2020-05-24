import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { 
  ILauncher 
} from '@jupyterlab/launcher';

import {
  ReadonlyPartialJSONObject
} from '@lumino/coreutils';

import {
  ICommandPalette, MainAreaWidget, WidgetTracker
} from '@jupyterlab/apputils';

import { ISessionContext } from '@jupyterlab/apputils';
import { ISignal } from '@lumino/signaling';
import { Widget } from '@lumino/widgets';

import { fblIcon } from './icons';

// NOTE: this is taken exactly from the WidgetModule class
// it is put here so we have something to reference in the widget tracker
interface IFBLWidget extends Widget {
  // /**
  // * Connection to another widget through signal
  // */
  // connect(signal: ISignal<IFBLWidget, object>): void;
  sessionContext: ISessionContext;

  species: string;
   /**
   * Output signal of child widget (used for connection to master)
   */
  outSignal: ISignal<this, object>;

  /**
   * Dispose current widget
   */
  dispose(): void;

  /**
   * 
   */
  model?: any;  
}


/**
 * The command IDs used by the console plugin.
 */
namespace CommandIDs {
  export const create = 'fbl-wrapper:create';
  export const open = 'fbl-wrapper:open';
  export const createConsole = 'fbl-wrapper:create-console';
}

/**
 * Initialization data for the fbl-wrapper-extension extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'fbl-wrapper-extension',
  autoStart: true,
  requires: [ICommandPalette, ILauncher],
  activate: activateFBL
};

/**
 * Activate the FBL widget extension.
 * The extension is automatically loaded, which injects RequireJS into browser if it's not there already
 * The command `fbl-wrapper:open` then does the following:
 *     1. load your WidgetModule from your local http-server (hard-coded to be served on port 7999, can be 
 *          changed in the `npm:dev` script in `package.json`)
 *     2. in the callback for loading the WidgetModule, the usual launch sequence for JLab extension is initiated.
 */
async function activateFBL(
  app: JupyterFrontEnd, 
  palette: ICommandPalette,
  launcher: ILauncher,
  restorer: ILayoutRestorer
) {
  await app.serviceManager.ready;
  const tracker = new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'FBL'});
  console.log("FBL Extension Activated");
  (function(d) {
    let hasRequire = false;
    let scripts = d.getElementsByTagName('head')[0].children;
    for (let s of scripts){
      if ((<any>s).src){
         if ((<any>s).src.includes("require.js")){
            hasRequire = true;
            break;
         }
     }}
    if (!hasRequire){
      const script = d.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://requirejs.org/docs/release/2.3.6/comments/require.js';
      d.getElementsByTagName('head')[0].appendChild(script);
    }
  }(window.document));

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyPartialJSONObject): MainAreaWidget<IFBLWidget> | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;
    if (activate && widget) {
      app.shell.activateById(widget.id);
    }

    return widget;
  }

  
  // Declare a widget variable
  let widget: MainAreaWidget<IFBLWidget>;
  let WidgetModule: any = undefined;
  app.commands.addCommand(CommandIDs.create, {
    label: 'FBL',
    icon: fblIcon,
    execute: () => {
      if (!WidgetModule){
        (<any>window).require(["http://localhost:7999/build/bundle.js"], (plugin: any)=>{
          console.log('Loaded plugin from 7779 with RequireJS', plugin);
          WidgetModule = plugin.FBLWidget;

          // Create a new widget if one does not exist
          const content = new WidgetModule({app: app});
          widget = new MainAreaWidget({content});

          if (!tracker.has(widget)){
            tracker.add(widget);
          }

          widget.content.sessionContext.propertyChanged.connect((change)=>{
            console.log('Property Changed', change);
            void tracker.save(widget);
          })
          // Attach the widget to the main work area if it's not there
          app.shell.add(widget, 'main');
          widget.content.update();
          // Activate the widget
          app.shell.activateById(widget.id);
        })
      }else{
        // Create a new widget if one does not exist
        const content = new WidgetModule({app: app});
        widget = new MainAreaWidget({content});

        if (!tracker.has(widget)){
          tracker.add(widget);
        }
        
        widget.content.sessionContext.propertyChanged.connect((change)=>{
          console.log('Property Changed', change);
          void tracker.save(widget);
        });
        // Attach the widget to the main work area if it's not there
        app.shell.add(widget, 'main');
        widget.content.update();
        // Activate the widget
        app.shell.activateById(widget.id);
      }
    }
  });  

  // TODO: Open Existing according to path.
  // app.commands.addCommand(CommandIDs.open, {
  //   label: 'Open FBL',
  //   icon: fblIcon,
  //   execute: () => {
  //     if (!WidgetModule){
  //       (<any>window).require(["http://localhost:7999/build/bundle.js"], (plugin: any)=>{
  //         console.log('Loaded plugin from 7779 with RequireJS', plugin);
  //         WidgetModule = plugin.FBLWidget;
  //         if (!widget) {
  //           // Create a new widget if one does not exist
  //           const content = new WidgetModule({app: app});
  //           widget = new MainAreaWidget({content});
  //         }
  //         if (!widget.isAttached) {
  //           // Attach the widget to the main work area if it's not there
  //           app.shell.add(widget, 'main');
  //         }
  //         widget.content.update();
    
  //         // Activate the widget
  //         app.shell.activateById(widget.id);
  //       })
  //     }else{
  //       if (!widget) {
  //         // Create a new widget if one does not exist
  //         const content = new WidgetModule({app: app});
  //         widget = new MainAreaWidget({content});
  //       }
  //       if (!widget.isAttached) {
  //         // Attach the widget to the main work area if it's not there
  //         app.shell.add(widget, 'main');
  //       }
  //       widget.content.update();
  
  //       // Activate the widget
  //       app.shell.activateById(widget.id);
  //     }
  //   }
  // });  

  app.commands.addCommand(CommandIDs.createConsole, {
    label: 'Create Console for FBL Widget',
    icon: fblIcon,
    execute: args => {
      const current = getCurrent({ ...args, activate:false});
      if (!current) {
        return;
      }

      app.commands.execute(
        'console:create', 
        {
          path: current.content.sessionContext.path,
          ref: widget.id,
          insertMode: 'split-right',
          activate: args['activate'] as boolean
        });
    },
    isEnabled: () => {
      if (!widget){
        return false;
      }
      if (widget.content){
        if (widget.content.sessionContext) {
          if (widget.content.sessionContext.isReady){
            return true;
          }
        } 
      }
      return false;
    }
  });

  if (launcher){
    // Add the widget to launcher
    launcher.add({
      command: CommandIDs.create,
      category: '',
      rank: 0
    });
  }

  app.contextMenu.addItem({
    command: CommandIDs.createConsole,
    selector: '.jp-FBL',
    rank: Infinity
  });

    // Add the command to the palette.
    [
      CommandIDs.create,
      CommandIDs.createConsole
    ].forEach(command=>{
      palette.addItem({command, category: 'Fly Brain Lab' });
    })
  
}

export default extension;