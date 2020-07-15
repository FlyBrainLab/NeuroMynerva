import { NeuAnyWidget } from '@flybrainlab/neuany-widget';
import { InfoWidget } from '@flybrainlab/info-widget';
import { NeuGFXWidget } from '@flybrainlab/neugfx-widget';
import { Neu3DWidget } from '@flybrainlab/neu3d-widget';
// import { Neu3DWidget } from '@flybrainlab/neu3d';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';


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
  showDialog,
  Dialog
} from '@jupyterlab/apputils';

import{
  Kernel,
  Session
} from '@jupyterlab/services';

import {
  LabIcon, listingsInfoIcon
} from '@jupyterlab/ui-components'
import { ISignal } from '@lumino/signaling';
import { 
  Widget
 } from '@lumino/widgets';

import { fblIcon, neu3DIcon, neuGFXIcon } from './icons';
import { MasterWidget } from './master';


// const INFO_MODULE_URL = "http://localhost:7995/build/bundle.js";
// const MASTER_MODULE_URL = "http://localhost:7996/build/bundle.js";
// const NEUGFX_MODULE_URL = "http://localhost:7997/build/bundle.js";
// const NEU3D_MODULE_URL = "http://localhost:7998/build/bundle.js";
// const NEUANY_MODULE_URL = "http://localhost:7999/build/bundle.js"; //placeholder
// const MASTER_CLASS_NAME = '.jp-FBL-Master';
// const INFO_CLASS_NAME = '.jp-FBL-Info';
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
    info: any;
  }
}

export type FBLPanel = MainAreaWidget<IFBLWidget>;
export type FBLTracker = IWidgetTracker<FBLPanel>;

export interface IFBLWidgetTrackers {
  add(name: string, tracker: FBLTracker): void;
  trackers:  {[name: string]: FBLTracker};
  sessionsDict: {[sessionPath: string]: FBLPanel[] };
  sessions: Session.ISessionConnection[];
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
 * Class for maintaining a list of FBLWidgetTrackers
 */
export class FBLWidgetTrackers implements IFBLWidgetTrackers {
  constructor(trackers?: {[name: string]: FBLTracker}){
    if (trackers){
      this.trackers = trackers;
    }else{
      this.trackers = {};
    }
  }
  /**
   * Add a fbl widget tracker
   * @param tracker
   */
  add(name: string, tracker: FBLTracker): void {
    if (!(name in this.trackers)){
      this.trackers[name] = tracker;
    }
  }

  /** 
   * Return alternate view of the trackers, keyed by session
   */
  get sessionsDict(): {[sessionPath: string]: FBLPanel[] } {
    let sessionsDict: {[sessionPath: string]: FBLPanel[] } = {};
    for (const t of Object.values(this.trackers)){
      t.forEach((panel)=>{
        const widget = panel.content;
        if (widget.sessionContext?.session){
          if (!widget.sessionContext.isDisposed){
            if (!(widget.sessionContext.session.path in sessionsDict)) {
              sessionsDict[widget.sessionContext.session.path] = new Array<FBLPanel>();
            }
            sessionsDict[widget.sessionContext.session.path].push(panel);
          }
        }
      });
    }
    return sessionsDict;
  }

  /** 
   * Return a array of unique sessions
   */
  get sessions(): Session.ISessionConnection[] {
    const sessions: Session.ISessionConnection[] = [];
    for (const t of Object.values(this.trackers)){
      t.forEach((panel)=>{
        const widget = panel.content;
        if (widget.sessionContext?.session){
          if (!widget.sessionContext.isDisposed){
            sessions.push(widget.sessionContext.session);
          }
        }
      })
    }
    return Array.from(new Set(sessions));
  }

  trackers: {[name: string]: FBLTracker};
}

export interface IFBLWidget extends Widget {
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

  /**
   * Name of Widget
   */
  name: string

  /**
   * Signal that emits new species name when changed
   */
  speciesChanged: ISignal<IFBLWidget, string>;

  /**
   * Signal that emits model change
   */
  modelChanged: ISignal<IFBLWidget, object>;

  /**
   * Icon associated with the widget
   */
  icon?: LabIcon;

  /**
   * Toolbar to be added to the MainAreaWidget
   * 
   * TODO: This is currently defined here due to an issue with using 
   *   MainAreaWidget class directly
   */
  toolbar?: Toolbar<Widget>;
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
  export const CreateWorkspace = 'fbl-workspace:create';
}




/**
 * Initialization data for the neu3d-extension extension.
 */
const extension: JupyterFrontEndPlugin<IFBLWidgetTrackers> = {
  id: '@flybrainlab/fbl-extension',
  autoStart: true,
  requires: [ICommandPalette, ILauncher, ILayoutRestorer],
  provides: IFBLWidgetTrackers,
  activate: activateFBL
};

/**
 * Activate the FBL widget extension.
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
  const fblWidgetTrackers = new FBLWidgetTrackers({
    "Neu3D": neu3DTracker,
    "NeuGFX": neuGFXTracker,
    "NeuAny": neuAnyTracker,
  })
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
  window.fbltrackers = fblWidgetTrackers;

  // let Neu3DWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  // let NeuGFXWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  // let NeuAnyWidgetModule: Widget = undefined;  // widget constructor, loaded on first instantiation of neu3dwidget
  
  let masterWidget: Widget = undefined;
  let infoWidget: Widget = undefined;

  masterWidget = new MasterWidget(fblWidgetTrackers);
  masterWidget.id = 'FBL-Master';
  masterWidget.title.caption = 'FBL Widgets and Running Sessions';
  masterWidget.title.icon = fblIcon;
  // add to last
  if (restorer) {
    restorer.add(masterWidget, 'FBL-Master');
  }
  app.shell.add(masterWidget, 'left', {rank: 1000});
  window.master = masterWidget;


  infoWidget = new InfoWidget();
  infoWidget.id = 'FBL-Info';
  infoWidget.title.caption = 'Information about neurons and synapses';
  infoWidget.title.icon = listingsInfoIcon;
  // add to last
  if (restorer) {
    restorer.add(infoWidget, 'FBL-Info');
  }
  app.shell.add(infoWidget, 'left', {rank: 2000});
  window.info = infoWidget;


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
      await FBL.createFBLWidget({
        app:app,
        Module:Neu3DWidget,
        icon:NEU3DICON,
        moduleArgs:args,
        tracker:neu3DTracker,
        info:infoWidget,
        species: args.species as string ?? 'No species'
      });
    }
  });
  app.commands.addCommand(CommandIDs.Neu3DOpen, {
    label: 'Open Neu3D Instance',
    icon: NEU3DICON,
    execute: async (args) => {
      await FBL.createFBLWidget({
        app:app,
        Module:Neu3DWidget,
        icon:NEU3DICON,
        moduleArgs:args,
        tracker:neu3DTracker,
        info:infoWidget,
        species: args.species as string ?? 'No species'
      });
    }
  });  

  app.commands.addCommand(CommandIDs.NeuGFXCreate, {
    label: 'Create NeuGFX Instance',
    icon: NEUGFXICON,
    execute: async (args) => {
      await FBL.createFBLWidget(
        {
          app:app,
          Module:NeuGFXWidget,
          icon:NEUGFXICON,
          moduleArgs:args,
          tracker:neuGFXTracker,
          species: args.species as string ?? 'No species'
        });
    }
  });
  app.commands.addCommand(CommandIDs.NeuAnyCreate, {
    label: 'Create NeuAny Instance (Placeholder)',
    icon: NEUANYICON,
    execute: async (args) => {
      await FBL.createFBLWidget(
        {
          app:app,
          Module:NeuAnyWidget,
          icon:NEUGFXICON,
          moduleArgs:args,
          tracker:neuGFXTracker,
          species: args.species as string ?? 'No species'
        });
    }
  });
  // TODO: Open Existing according to path.
  app.commands.addCommand(CommandIDs.NeuAnyOpen, {
    label: 'Open NeuAny Instance',
    icon: NEUANYICON,
    execute: async (args) => {
      await FBL.createFBLWidget(
        {
          app:app,
          Module:NeuAnyWidget,
          icon:NEUANYICON,
          moduleArgs:args,
          tracker:neuAnyTracker,
          species: args.species as string ?? 'No species'
        });
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

  // workspace
  app.commands.addCommand(CommandIDs.CreateWorkspace, {
    label: 'Create FBL Workspace',
    icon: fblIcon,
    execute: async (args) => {
      let species: string = 'No species';
      let abort: boolean = false;
      await showDialog({
        title: 'Change Species',
        body: new FBL.SpeciesSelector(),
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({label: 'No Species'}),
          Dialog.okButton({label: 'Select'})
        ]
      }).then(result =>{
        if (result.button.accept){
          if (result.button.displayType === 'warn'){
            species = 'No Species';
          } else {
            species = result.value;
          }
        } else{
          abort = true;
        }
      });

      if (abort) { // cancel triggers abort
        return;
      }

      let notebook_panel = await app.commands.execute(
        'notebook:create-new',
        { kernelName: 'python3' }
      )

      let neu3d_panel = await FBL.createFBLWidget(
        {
          app: app,
          Module:Neu3DWidget,
          icon:NEU3DICON,
          moduleArgs: args,
          tracker: neu3DTracker,
          species: species,
          info: infoWidget,
          sessionContext: notebook_panel.sessionContext,
          add_widget_options:{ref: notebook_panel.id, mode: 'split-left'}
        });
      
      await FBL.createFBLWidget(
        {
          app: app,
          Module:NeuGFXWidget,
          icon:NEUGFXICON,
          moduleArgs: args,
          tracker: neuGFXTracker,
          species: species,
          sessionContext: notebook_panel.sessionContext,
          add_widget_options:{ref: neu3d_panel.id, mode: 'split-bottom'}
        });
    }
  });

  // Add the widget to launcher
  if (launcher){
    launcher.add({
      command: CommandIDs.CreateWorkspace,
      category: 'FlyBrainLab',
      rank: 0
    });
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

  return Promise.resolve(
    fblWidgetTrackers
  );
}

export namespace FBL {

  /**
   * A widget that provides a species selection.
   */
  export class SpeciesSelector extends Widget {
    /**
     * Create a new kernel selector widget.
     */
    constructor() {
      const species_list = [
        'adult Drosophila melanogaster (FlyCircuit)',
        'adult Drosophila melanogaster (Hemibrain)',
        'larval Drosophila melanogaster'
      ];

      const body = document.createElement('div');
      const text = document.createElement('label');
      text.textContent = `Select species for FBL Workspace`;
      body.appendChild(text);

      const selector = document.createElement('select');
      for (const species of species_list){
        const option = document.createElement('option');
        option.text = species;
        option.value = species;
        selector.appendChild(option);
      }
      body.appendChild(selector);
      super({node: body});
    }

    /**
     * Get the value of the kernel selector widget.
     */
    getValue(): string {
      const selector = this.node.querySelector('select') as HTMLSelectElement;
      return selector.value as string;
    }
  }


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

  export async function createFBLWidget(options: {
    app: JupyterFrontEnd, 
    Module: any,
    icon: LabIcon,
    moduleArgs: any, 
    tracker: WidgetTracker<MainAreaWidget<IFBLWidget>>,
    species?: string, // species for workspace
    info?: Widget, // info panel for neu3d
    sessionContext?: ISessionContext,
    add_widget_options?: DocumentRegistry.IOpenOptions
  }) : Promise<MainAreaWidget<IFBLWidget>> {
    let widget: IFBLWidget;
    const {
      app, Module, icon, moduleArgs, tracker, species, info, add_widget_options
    } = options;

    let sessionContext = options.sessionContext || tracker.currentWidget?.content?.sessionContext;

    if (info) {
      widget = new Module({
        app: app, 
        icon: icon,
        info: info,
        sessionContext: sessionContext,
        species: species,
        ...moduleArgs,
      });
    } else{
      widget = new Module({
        app: app, 
        icon: icon,
        sessionContext: sessionContext,
        species: species,
        ...moduleArgs,
      });
    }
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
    app.shell.add(panel, 'main', add_widget_options);
    widget.update();
    panel.update();
    // Activate the widget
    app.shell.activateById(panel.id);
    return panel;
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