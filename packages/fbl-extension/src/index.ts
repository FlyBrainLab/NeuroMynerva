import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import { 
  ILauncher 
} from '@jupyterlab/launcher';

import {
  ReadonlyPartialJSONObject,
  Token
} from '@lumino/coreutils';

import {
  ICommandPalette, 
  MainAreaWidget, 
  WidgetTracker, 
  IWidgetTracker,
  ISessionContext,
  Toolbar,
} from '@jupyterlab/apputils';

import{
  Kernel
} from '@jupyterlab/services';

import {
  LabIcon
} from '@jupyterlab/ui-components'
import { ISignal } from '@lumino/signaling';
import { 
  Widget
 } from '@lumino/widgets';

import { fblIcon, neu3DIcon, neuGFXIcon } from './icons';

const MASTER_MODULE_URL = "http://localhost:7996/build/bundle.js";
const NEUGFX_MODULE_URL = "http://localhost:7997/build/bundle.js";
const NEU3D_MODULE_URL = "http://localhost:7998/build/bundle.js";
const NEUANY_MODULE_URL = "http://localhost:7999/build/bundle.js"; //placeholder
// const MASTER_CLASS_NAME = '.jp-FBL-Master';
const NEU3D_CLASS_NAME = '.jp-FBL-Neu3D';
const NEUGFX_CLASS_NAME = '.jp-FBL-NeuGFX';
const NEUANY_CLASS_NAME = '.jp-FBL-NeuAny';
const NEU3DICON = neu3DIcon;
const NEUGFXICON = neuGFXIcon;
const NEUANYICON = fblIcon;

declare global {
  interface Window {
    fbltrackers: any;
    app: any;
    master: any;
  }
}


// NOTE: this interface should be used by all widgets using npm install/import
// for now it needs to be copy-pasted around
export interface IFBLWidget extends Widget{
  /**
   * The sessionContext keeps track of the current running session
   * associated with the widget.
   */
  sessionContext: ISessionContext;

  /**
   * A string indicating whether it's adult or larva.
   * Has special setter that the neu3d visualization setting and rendered meshes
   */
  species: string;

  /**
   * Dispose current widget
   */
  dispose(): void;

  /**
   * All neurons current rendered in the workspace. 
   */
  model: any;


  speciesChanged: ISignal<IFBLWidget, string>;
  modelChanged: ISignal<IFBLWidget, object>;
  icon?: LabIcon
  toolbar?: Toolbar<Widget>
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


export interface IFBLWidgetTrackers {
  [widget:string]: IWidgetTracker<MainAreaWidget<IFBLWidget>>
}
/* tslint:disable */
/**
 * The FBL Widget Tracker Token
 */
export const IFBLWidgetTrackers = new Token<IFBLWidgetTrackers>(
  '@flybrainlab/fbl-extension:IFBLWidgetTrackers'
);

/* tslint:enable */

/**
 * Initialization data for the neu3d-extension extension.
 */
const extension: JupyterFrontEndPlugin<IFBLWidgetTrackers> = {
  id: 'fbl-extension',
  autoStart: true,
  requires: [ICommandPalette, ILauncher, ILayoutRestorer],
  provides: IFBLWidgetTrackers,
  activate: activateFBL
};

/**
 * Load Module dynamically, makes sure that the module is only loaded once
 * @param url the URL to load the module from
 * @param plugin the plugin that contains the widget module. 
 *  will need to resolve to specific module like `plugin.Neu3DWidget` after return
 */
async function loadModule(url: String): Promise<any> {
  await injectRequired();
  return new Promise<any>((resolve, reject)=>{
    (<any>window).require([url], 
      (plugin: any)=>{
        console.log(`Loaded plugin from ${url} with RequireJS`, plugin);
        resolve(plugin);
      }, (error: any) => {
        reject(error);
      }
    );
  });
}

/**
 * Injected RequiredJS into the window if it's not there already
 * @param hasRequire indicate if require has been loaded by this extension already
 * @return a promise that resolves to true after requireJS is loaded
 */
function injectRequired(): Promise<any> {
  return new Promise<any>((resolve, reject)=>{
    (function(w) {
      if (w.hasOwnProperty('require') && (typeof((w as any).require) === 'function')) {
        resolve(void 0);
      }
      const script = w.document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://requirejs.org/docs/release/2.3.6/comments/require.js';
      w.document.getElementsByTagName('head')[0].appendChild(script);
    }(window));
    setTimeout(() => resolve(void 0), 500);
  });
}

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
): Promise<IFBLWidgetTrackers> {
  console.log("FBL Extension Activated");
  const neu3DTracker = new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neu3d'});
  const neuGFXTracker = new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neugfx'});
  const neuAnyTracker = new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neuany'});
  
  // Handle state restoration.
  restorer.restore(neu3DTracker, {
    command: CommandIDs.Neu3DOpen,
    args: widget => {
      const { path, name } = widget.content.sessionContext;
      return {
        model: {
          data: widget.content.model?.data,
          metadata: widget.content.model?.metadata,
          states: widget.content.model?.states
        },
        id: widget.content.id,
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
        model: {
          data: widget.content.model?.data,
          metadata: widget.content.model?.metadata,
          states: widget.content.model?.states
        },
        id: widget.content.id,
        species: widget.content.species,
        path: path,
        name: name
      };
    },
    name: widget => widget.content.sessionContext.name,
    when: app.serviceManager.ready
  });

  window.app = app;
  window.fbltrackers = {
    'Neu3D': neu3DTracker,
    'NeuGFX': neuGFXTracker,
    'NeuAny': neuAnyTracker,
  }

  let Neu3DWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  let NeuGFXWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  let NeuAnyWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  
  await injectRequired();
  await loadModule(MASTER_MODULE_URL).then((plugin)=>{
    const MasterWidgetModule = plugin.MasterWidget;
    const masterWidget = new MasterWidgetModule({
      "Neu3D": neu3DTracker,
      "NeuAny": neuAnyTracker,
      "NeuGFX": neuGFXTracker,
    });
    masterWidget.id = 'jp-FBL-Master';
    masterWidget.title.caption = 'FBL Widgets and Running Sessions';
    masterWidget.title.icon = fblIcon;
    masterWidget.title.iconClass = 'jp-SideBar-tabIcon';
    // add to last
    if (restorer) {
      restorer.add(masterWidget, 'FBL-Master');
    }
    app.shell.add(masterWidget, 'left', {rank: Infinity});
    window.master = masterWidget;
  }).catch(error=>{
    console.log('Master Widget Loading Failed, skipping injection', error);
  });

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyPartialJSONObject): MainAreaWidget<IFBLWidget> | null {
    let widget = undefined;
    switch (args['widget']) {
      case 'neu3d':
        widget = neu3DTracker.currentWidget;
        break;
      case 'neugfx':
        widget = neuGFXTracker.currentWidget;
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
    icon: NEU3DICON,
    execute: async (args) => {
      if (!Neu3DWidgetModule){
        let plugin = await loadModule(NEU3D_MODULE_URL);
        Neu3DWidgetModule = plugin.Neu3DWidget;  
      }
      await FBL.createFBLWidget(
        app,
        <any>Neu3DWidgetModule,
        NEU3DICON,
        args,
        neu3DTracker
      );
    }
  });
  app.commands.addCommand(CommandIDs.Neu3DOpen, {
    label: 'Open Neu3D Instance',
    icon: NEU3DICON,
    execute: async (args) => {
      if (!Neu3DWidgetModule){
        let plugin = await loadModule(NEU3D_MODULE_URL);
        Neu3DWidgetModule = plugin.Neu3DWidget;  
      }
      await FBL.createFBLWidget(
        app,
        <any>Neu3DWidgetModule,
        NEU3DICON,
        args,
        neu3DTracker
      );
    }
  });  

  app.commands.addCommand(CommandIDs.NeuGFXCreate, {
    label: 'Create NeuGFX Instance',
    icon: NEUGFXICON,
    execute: async (args) => {
      if (!NeuGFXWidgetModule){
        let plugin = await loadModule(NEUGFX_MODULE_URL);
        NeuGFXWidgetModule = plugin.NeuGFXWidget;
      }
      await FBL.createFBLWidget(
        app,
        <any>NeuGFXWidgetModule,
        NEUGFXICON,
        args,
        neuGFXTracker
      );
    }
  });
  app.commands.addCommand(CommandIDs.NeuAnyCreate, {
    label: 'Create NeuAny Instance (Placeholder)',
    icon: NEUANYICON,
    execute: async (args) => {
      if (!NeuAnyWidgetModule){
        let plugin = await loadModule(NEUANY_MODULE_URL);
        NeuAnyWidgetModule = plugin.NeuAnyWidget;
      }
      await FBL.createFBLWidget(
        app,
        <any>NeuAnyWidgetModule,
        NEUANYICON,
        args,
        neuAnyTracker
      );
    }
  });
  // TODO: Open Existing according to path.
  app.commands.addCommand(CommandIDs.NeuAnyOpen, {
    label: 'Open NeuAny Instance',
    icon: NEUANYICON,
    execute: async (args) => {
      if (!NeuAnyWidgetModule){
        let plugin = await loadModule(NEUANY_MODULE_URL);
        NeuAnyWidgetModule = plugin.NeuAnyWidget;  
      }
      await FBL.createFBLWidget(
        app,
        <any>NeuAnyWidgetModule,
        NEUANYICON,
        args,
        neuAnyTracker
      );
    }
  });  

  app.commands.addCommand(CommandIDs.Neu3DCreateConsole, {
    label: 'Create Console for Neu3D Widget',
    icon: NEU3DICON,
    execute: args => {
      const current = getCurrent({ ...args, widget:'neu3d', activate:false});
      if (!current) { return; }
      FBL.createConsole(app, current, args);
    },
    isEnabled: ()=>{
      const current = getCurrent({widget:'neu3d', activate: false});
      return FBL.hasRunningSession(current);
    }
  });


  app.commands.addCommand(CommandIDs.NeuGFXCreateConsole, {
    label: 'Create Console for NeuGFX Widget',
    icon: NEUGFXICON,
    execute: args => {
      const current = getCurrent({ ...args, widget:'neugfx', activate:false});
      if (!current) { return; }
      FBL.createConsole(app, current, args);
    },
    isEnabled: ()=>{
      const current = getCurrent({widget:'neu3d', activate: false});
      return FBL.hasRunningSession(current);
    }
  });

  app.commands.addCommand(CommandIDs.NeuAnyCreateConsole, {
    label: 'Create Console for NeuAny Widget (Place holder)',
    icon: NEUANYICON,
    execute: args => {
      const current = getCurrent({ ...args, widget:'neuany', activate:false});
      if (!current) { return; }
      FBL.createConsole(app, current, args);
    },
    isEnabled: ()=>{
      const current = getCurrent({widget:'neuany', activate: false});
      return FBL.hasRunningSession(current);
    }
  });

  // Add the widget to launcher
  if (launcher){
    launcher.add({
      command: CommandIDs.Neu3DCreate,
      category: 'FlyBrainLab',
      rank: 0
    });
    launcher.add({
      command: CommandIDs.NeuGFXCreate,
      category: 'FlyBrainLab',
      rank: 0
    });
    launcher.add({
      command: CommandIDs.NeuAnyCreate,
      category: 'FlyBrainLab',
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
    CommandIDs.Neu3DCreateConsole,
    CommandIDs.NeuGFXCreate,
    CommandIDs.NeuGFXCreateConsole,
    CommandIDs.NeuAnyCreate,
    CommandIDs.NeuAnyCreateConsole,
  ].forEach(command=>{
    palette.addItem({command, category: 'FlyBrainLab' });
  })

  return Promise.resolve({
    'Neu3D': neu3DTracker,
    'NeuGFX': neuGFXTracker,
    'NeuAny': neuAnyTracker,
  })
}

export namespace FBL {
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
        if (widget.content.sessionContext.session) { // check if has kenrel
          return true;
        }
      }
      return false;
    } catch (error) {
      // in case content or sessionContext or isReady not found
      return false;
    }
  }
  /**
   * Check if Kernel is FBL compatible
   * 1. Check if kernel handles comm
   * 2. Checks if contains Comm matches the comms target template
   * 3. Return the first Comm targetName if found
   * @param kernel - kernel to be changed
   */
  export async function isFBLKernel(kernel: Kernel.IKernelConnection): Promise<string|null> {
    let targetCandidates = new Array<any>();
    // interrogate kernel as Kernel class
    let msg = await kernel.requestCommInfo({});
    if (!kernel.handleComms){ 
      // force kernel to handleComms
      kernel.handleComms = true;
    }
    if (msg.content && msg.content?.status == 'ok') {
      for (let c of Object.values(msg.content.comms)) {
        if (c.target_name.includes('FBL')) {
          targetCandidates.push(c.target_name);
        };
      }
    } else{
      return Promise.resolve(null);
    }
    
    if (targetCandidates.length == 0) {
      return Promise.resolve(null);
    }

    // take only unique target values
    targetCandidates = [...new Set(targetCandidates)];
    return Promise.resolve(targetCandidates[0]);
  }

  export async function createFBLWidget(
    app: JupyterFrontEnd, 
    Module: any,
    icon: LabIcon,
    moduleArgs: any, 
    tracker: WidgetTracker<MainAreaWidget<IFBLWidget>>
  ) {
    let widget: IFBLWidget = new Module({
      app: app, 
      icon: icon,
      ...moduleArgs,
    });
    let panel = new MainAreaWidget({content: widget, toolbar: widget.toolbar});
    if (!tracker.has(panel)){
      await tracker.add(panel);
    }
    widget.sessionContext.propertyChanged.connect(()=>{
      void tracker.save(panel);
    });
    widget.modelChanged.connect(()=>{
      void tracker.save(panel);
    });
    // Attach the widget to the main work area if it's not there
    app.shell.add(panel, 'main');
    widget.update();
    panel.update()
    // Activate the widget
    app.shell.activateById(panel.id);
  }

  export function createConsole(
    app:JupyterFrontEnd,
    panel:MainAreaWidget<IFBLWidget>,
  args: any) {
    app.commands.execute(
      'console:create', 
      {
        path: panel.content.sessionContext.path,
        ref: panel.id,
        insertMode: args['insertMode'] ?? 'split-right',
        activate: args['activate'] as boolean
      });
  }

  export const testAttr: string = 'test';
}

export default extension;