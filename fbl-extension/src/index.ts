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
  ICommandPalette, 
  MainAreaWidget, 
  WidgetTracker, 
  ISessionContext,
  Toolbar
} from '@jupyterlab/apputils';

import { ISignal } from '@lumino/signaling';
import { 
  Widget
 } from '@lumino/widgets';

import { fblIcon, neu3DIcon, neuGFXIcon } from './icons';

const NEU3D_MODULE_URL = "http://localhost:7998/build/bundle.js";
const NEUGFX_MODULE_URL = "http://localhost:7997/build/bundle.js";
const NEUANY_MODULE_URL = "http://localhost:7999/build/bundle.js"; //placeholder
const NEU3D_CLASS_NAME = '.jp-Neu3D';
const NEUGFX_CLASS_NAME = '.jp-NeuGFX';
const NEUANY_CLASS_NAME = '.jp-NeuAny';

declare global {
  interface Window {
    neu3dTracker: any;
    neuAnyTracker: any;
    app: any;
  }
}


// NOTE: this is taken exactly from the WidgetModule class
// it is put here so we have something to reference in the widget tracker
interface IFBLWidget extends Widget {
  toolbar?: Toolbar<Widget>;

  modelChanged: ISignal<this, object>;

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
  export const Neu3DCreate = 'fbl-neu3d:create';
  export const Neu3DOpen = 'fbl-neu3d:open';
  export const Neu3DCreateConsole = 'fbl-neu3d:create-console';
  export const NeuGFXCreate = 'fbl-neugfx:create';
  export const NeuGFXOpen = 'fbl-neugfx:open';
  export const NeuGFXCreateConsole = 'fbl-neugfx:create-console';
  export const NeuAnyCreate = 'fbl-neuany:create';
  export const NeuAnyOpen = 'fbl-neuany:open';
  export const NeuAnyCreateConsole = 'fbl-neuany:create-console';
}

/**
 * Initialization data for the neu3d-extension extension.
 */
const extension: JupyterFrontEndPlugin<void> = {
  id: 'fbl-extension',
  autoStart: true,
  requires: [ICommandPalette, ILauncher, ILayoutRestorer],
  activate: activateFBL
};

/**
 * Load Module dynamically, makes sure that the module is only loaded once
 * @param url the URL to load the module from
 * @param plugin the plugin that contains the widget module. 
 *  will need to resolve to specific module like `plugin.Neu3DWidget` after return
 */
async function loadModule(url: String): Promise<any> {
  await injectRequired;
  return new Promise<any>((resolve, reject)=>{
    (<any>window).require([url], (plugin: any)=>{
      console.log(`Loaded plugin from ${url} with RequireJS`, plugin);
      resolve(plugin);
    });
  });
}

/**
 * Injected RequiredJS into the window if it's not there already
 * @param hasRequire indicate if require has been loaded by this extension already
 * @return a promise that resolves to true after requireJS is loaded
 */
const injectRequired = new Promise<any>((resolve, reject)=>{
  (function(d) {
    if (window.hasOwnProperty('require') && (typeof((window as any).require) === 'function')) {
          return;
    }
    const script = d.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = 'https://requirejs.org/docs/release/2.3.6/comments/require.js';
    d.getElementsByTagName('head')[0].appendChild(script);
  }(window.document));
  resolve(void 0);
});


/**
 * Activate the FBL widget extension.
 * The extension is automatically loaded, which injects RequireJS into browser if it's not there already
 * The command `neu3d:open` then does the following:
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
  console.log("FBL Extension Activated");
  const neu3DTracker = new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neu3d'});
  const neuGFXtracker = new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neugfx'});
  const neuAnyTracker = new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neuany'});

  // Handle state restoration.
  restorer.restore(neu3DTracker, {
    command: CommandIDs.Neu3DOpen,
    args: widget => {
      const { path, name } = widget.content.sessionContext;
      return {
        model: widget.content.model,
        species: widget.content.species,
        path: path,
        name: name
      };
    },
    name: widget => widget.content.sessionContext.name,
    when: app.serviceManager.ready
  });

  restorer.restore(neuAnyTracker, {
    command: CommandIDs.NeuAnyOpen,
    args: widget => {
      const { path, name } = widget.content.sessionContext;
      return {
        model: widget.content.model,
        species: widget.content.species,
        path: path,
        name: name
      };
    },
    name: widget => widget.content.sessionContext.name,
    when: app.serviceManager.ready
  });

  window.app = app;
  window.neu3dTracker = neu3DTracker;
  window.neuAnyTracker = neuAnyTracker;

  let Neu3DWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  let NeuGFXWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  let NeuAnyWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyPartialJSONObject): MainAreaWidget<IFBLWidget> | null {
    let widget = undefined;
    switch (args['widget']) {
      case 'neu3d':
        widget = neu3DTracker.currentWidget;
        break;
      case 'neugfx':
        widget = neuGFXtracker.currentWidget;
        break;
      case 'neuany':
        widget = neuAnyTracker.currentWidget;
        break;
      default: // not understood
        console.warn(`Cannot getCurrent widget of type ${args['widget']}.`)
        return widget;
    }
    const activate = args['activate'] !== false;
    if (activate && widget) {
      app.shell.activateById(widget.id);
    }
    return widget;
  }

  app.commands.addCommand(CommandIDs.Neu3DCreate, {
    label: 'Create Neu3D Instance',
    icon: neu3DIcon,
    execute: async (args) => {
      if (!Neu3DWidgetModule){
        let plugin = await loadModule(NEU3D_MODULE_URL);
        Neu3DWidgetModule = plugin.Neu3DWidget;  
      }
      // Create a new widget if one does not exist
      let widget: IFBLWidget = new (Neu3DWidgetModule as any)({app: app, ...args});
      let panel = new MainAreaWidget({content: widget, toolbar: widget.toolbar});
      // Attach the widget to the main work area if it's not there
      if (!neu3DTracker.has(panel)){
        await neu3DTracker.add(panel);
      }
      widget.sessionContext.propertyChanged.connect(()=>{
        void neu3DTracker.save(panel);
      })
      widget.modelChanged.connect(()=>{
        void neu3DTracker.save(panel);
      })

      app.shell.add(panel, 'main');
      widget.update()
      panel.update()
      // Activate the widget
      app.shell.activateById(panel.id);
    }
  });  
  // TODO: Open Existing according to path.
  app.commands.addCommand(CommandIDs.Neu3DOpen, {
    label: 'Open Neu3D Instance',
    icon: neu3DIcon,
    execute: async (args) => {
      if (!Neu3DWidgetModule){
        let plugin = await loadModule(NEU3D_MODULE_URL);
        Neu3DWidgetModule = plugin.Neu3DWidget;  
      }
      // Create a new widget if one does not exist
      let widget: IFBLWidget = new (Neu3DWidgetModule as any)({
        app: app, 
        ...args
      });
      let panel = new MainAreaWidget({content: widget, toolbar: widget.toolbar});
      if (!neu3DTracker.has(panel)){
        await neu3DTracker.add(panel);
      }
      widget.sessionContext.propertyChanged.connect(()=>{
        void neu3DTracker.save(panel);
      });
      widget.modelChanged.connect(()=>{
        void neu3DTracker.save(panel);
      });
      // Attach the widget to the main work area if it's not there
      app.shell.add(panel, 'main');
      widget.update();
      panel.update()
      // Activate the widget
      app.shell.activateById(panel.id);
    }
  });  

  app.commands.addCommand(CommandIDs.NeuGFXCreate, {
    label: 'Create NeuGFX Instance',
    icon: neuGFXIcon,
    execute: async (args) => {
      if (!NeuGFXWidgetModule){
        let plugin = await loadModule(NEUGFX_MODULE_URL);
        NeuGFXWidgetModule = plugin.NeuGFXWidget;
      }
      // Create a new widget if one does not exist
      let widget: IFBLWidget = new (NeuGFXWidgetModule as any)({app: app, ...args});
      let panel = new MainAreaWidget({content: widget, toolbar: widget.toolbar});
      if (!neuGFXtracker.has(panel)){
        neuGFXtracker.add(panel);
      }
      widget.sessionContext.propertyChanged.connect(()=>{
        void neuGFXtracker.save(panel);
      })
      // Attach the widget to the main work area if it's not there
      app.shell.add(panel, 'main');
      widget.update();
      panel.update();
      // Activate the widget
      app.shell.activateById(panel.id);
    }
  });
  app.commands.addCommand(CommandIDs.NeuAnyCreate, {
    label: 'Create NeuAny Instance (Placeholder)',
    icon: fblIcon,
    execute: async (args) => {
      if (!NeuAnyWidgetModule){
        let plugin = await loadModule(NEUANY_MODULE_URL);
        NeuAnyWidgetModule = plugin.NeuAnyWidget;
      }
      // Create a new widget if one does not exist
      let widget: IFBLWidget = new (NeuAnyWidgetModule as any)({app: app, ...args});
      let panel = new MainAreaWidget({content: widget, toolbar: widget.toolbar});
      if (!neuAnyTracker.has(panel)){
        neuAnyTracker.add(panel);
      }
      widget.sessionContext.propertyChanged.connect(()=>{
        void neuAnyTracker.save(panel);
      })
      // Attach the widget to the main work area if it's not there
      app.shell.add(panel, 'main');
      widget.update();
      panel.update();
      // Activate the widget
      app.shell.activateById(panel.id);
    }
  });
  // TODO: Open Existing according to path.
  app.commands.addCommand(CommandIDs.NeuAnyOpen, {
    label: 'Open NeuAny Instance',
    icon: fblIcon,
    execute: async (args) => {
      if (!NeuAnyWidgetModule){
        let plugin = await loadModule(NEUANY_MODULE_URL);
        NeuAnyWidgetModule = plugin.NeuAnyWidget;  
      }
      // Create a new widget if one does not exist
      let widget: IFBLWidget = new (NeuAnyWidgetModule as any)({app: app, ...args});
      let panel = new MainAreaWidget({content: widget, toolbar: widget.toolbar});
      if (!neuAnyTracker.has(panel)){
        await neuAnyTracker.add(panel);
      }
      widget.sessionContext.propertyChanged.connect(()=>{
        void neuAnyTracker.save(panel);
      });
      widget.modelChanged.connect(()=>{
        void neuAnyTracker.save(panel);
      });
      // Attach the widget to the main work area if it's not there
      app.shell.add(panel, 'main');
      widget.update();
      panel.update()
      // Activate the widget
      app.shell.activateById(panel.id);
    }
  });  

  app.commands.addCommand(CommandIDs.Neu3DCreateConsole, {
    label: 'Create Console for Neu3D Widget',
    icon: neu3DIcon,
    execute: args => {
      const current = getCurrent({ ...args, widget:'neu3d', activate:false});
      if (!current) {
        return;
      }
      app.commands.execute(
        'console:create', 
        {
          path: current.content.sessionContext.path,
          ref: current.id,
          insertMode: 'split-right',
          activate: args['activate'] as boolean
        });
    },
    isEnabled: ()=>{
      const current = getCurrent({widget:'neu3d', activate: false});
      return Private.hasRunningSession(current);
    }
  });


  app.commands.addCommand(CommandIDs.NeuGFXCreateConsole, {
    label: 'Create Console for NeuGFX Widget',
    icon: neuGFXIcon,
    execute: args => {
      const current = getCurrent({ ...args, widget:'neugfx', activate:false});
      if (!current) {
        return;
      }
      app.commands.execute(
        'console:create', 
        {
          path: current.content.sessionContext.path,
          ref: current.id,
          insertMode: 'split-right',
          activate: args['activate'] as boolean
        });
    },
    isEnabled: ()=>{
      const current = getCurrent({widget:'neu3d', activate: false});
      return Private.hasRunningSession(current);
    }
  });

  app.commands.addCommand(CommandIDs.NeuAnyCreateConsole, {
    label: 'Create Console for NeuAny Widget (Place holder)',
    icon: fblIcon,
    execute: args => {
      const current = getCurrent({ ...args, widget:'neuany', activate:false});
      if (!current) {
        return;
      }
      app.commands.execute(
        'console:create', 
        {
          path: current.content.sessionContext.path,
          ref: current.id,
          insertMode: 'split-right',
          activate: args['activate'] as boolean
        });
    },
    isEnabled: ()=>{
      const current = getCurrent({widget:'neuany', activate: false});
      return Private.hasRunningSession(current);
    }
  });

  // Add the widget to launcher
  if (launcher){
    launcher.add({
      command: CommandIDs.Neu3DCreate,
      category: 'Fly Brain Lab',
      rank: 0
    });
    launcher.add({
      command: CommandIDs.NeuGFXCreate,
      category: 'Fly Brain Lab',
      rank: 0
    });
    launcher.add({
      command: CommandIDs.NeuAnyCreate,
      category: 'Fly Brain Lab',
      rank: 0
    });
  }

  /** 
   * Add the create-console to context Menu
   * The browser will look class `selecttor` to see if the command should be enabled
   * These classnames should be the classnames of the individual FBL Widgets
   */ 
  app.contextMenu.addItem({
    command: CommandIDs.Neu3DCreateConsole,
    selector: NEU3D_CLASS_NAME,
    rank: Infinity
  });
  app.contextMenu.addItem({
    command: CommandIDs.NeuGFXCreateConsole,
    selector: NEUGFX_CLASS_NAME,
    rank: Infinity
  });
  app.contextMenu.addItem({
    command: CommandIDs.NeuAnyCreateConsole,
    selector: NEUANY_CLASS_NAME,
    rank: Infinity
  });
    
  // Add the command to the palette.
  [
    CommandIDs.Neu3DCreate,
    CommandIDs.Neu3DOpen,
    CommandIDs.Neu3DCreateConsole,
    CommandIDs.NeuGFXCreate,
    CommandIDs.NeuGFXOpen,
    CommandIDs.NeuGFXCreateConsole,
    CommandIDs.NeuAnyCreate,
    CommandIDs.NeuAnyOpen,
    CommandIDs.NeuAnyCreateConsole,
  ].forEach(command=>{
    palette.addItem({command, category: 'Fly Brain Lab' });
  })
}


/**
 * Bunch of State-less Utility Functions
 */
namespace Private {
  /**
   * Check if a given widget has a running session
   * @param args 
   */
  export function hasRunningSession(widget: MainAreaWidget<IFBLWidget>): boolean {
    if (!widget){
      return false;
    }
    try{
      if (widget.content.sessionContext.isReady){
        return true;
      }
      return false;
    } catch (error) {
      // in case content or sessionContext or isReady not found
      return false;
    }
  }
}

export default extension;