import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  ISettingRegistry
} from '@jupyterlab/settingregistry';

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
  showDialog,
  Dialog
} from '@jupyterlab/apputils';

import{
  Kernel,
  Session
} from '@jupyterlab/services';

import {
  LabIcon
} from '@jupyterlab/ui-components'
import {
  Widget
 } from '@lumino/widgets';


import { fblIcon, neu3DIcon, neuGFXIcon, neuInfoIcon, masterIcon } from './icons';
import { MasterWidget } from './widgets/master-widget/index';
import { IFBLWidget } from './widgets/template-widget/index';
import { InfoWidget } from './widgets/info-widget/index';
import { NeuGFXWidget } from './widgets/neugfx-widget/index';
import { Neu3DWidget } from './widgets/neu3d-widget/index';
import { FBLWidget } from './widgets/template-widget/index';
import '../style/index.css';


const NEU3D_CLASS_NAME = '.jp-FBL-Neu3D';
const NEUGFX_CLASS_NAME = '.jp-FBL-NeuGFX';
const NEU3DICON = neu3DIcon;
const NEUGFXICON = neuGFXIcon;

declare global {
  interface Window {
    fbltrackers: any;
    app: any;
    master: any;
    info: any;
  }
}

export type FBLPanel = MainAreaWidget<IFBLWidget>;
export type IFBLTracker = IWidgetTracker<FBLPanel>;
export type FBLTracker = WidgetTracker<FBLPanel>;

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
  export const CreateWorkspace = 'fbl-workspace:create';
}

/**
 * Initialization data for the neu3d-extension extension.
 */
const extension: JupyterFrontEndPlugin<IFBLWidgetTrackers> = {
  id: '@neuro-mynerva/fbl-extension:plugin',
  autoStart: true,
  requires: [ICommandPalette, ILauncher, ILayoutRestorer, ISettingRegistry],
  provides: IFBLWidgetTrackers,
  activate: activateFBL
};

export default extension;

/**
 * Activate the FBL widget extension.
 */
async function activateFBL(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  launcher: ILauncher,
  restorer: ILayoutRestorer,
  settings: ISettingRegistry
): Promise<IFBLWidgetTrackers> {
  console.log("FBL Extension Activated");
  const fblWidgetTrackers = new FBLWidgetTrackers({
    "Neu3D": new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neu3d'}),
    "NeuGFX": new WidgetTracker<MainAreaWidget<IFBLWidget>>({namespace: 'fbl-neugfx'})
  })

  const { commands } = app;

  // all available server settings
  let fblServerSettings: FBL.FBLServerSettings = {};
  
  // Wait for the application to be restored and
  // for the settings for this plugin to be loaded
  Promise.all([app.restored, settings.load(extension.id)])
    .then(([, setting]) => {
      // Read the settings
      fblServerSettings = FBL.loadFBLServerSetting(setting);
      fblWidgetTrackers.trackers.Neu3D.forEach((w: FBLPanel)=>{
          w.content.serverSettings = fblServerSettings;
      });
      fblWidgetTrackers.trackers.NeuGFX.forEach((w: FBLPanel)=>{
        w.content.serverSettings = fblServerSettings;
      })
      // Listen for your plugin setting changes using Signal
      setting.changed.connect((setting)=>{
        fblServerSettings = FBL.loadFBLServerSetting(setting);
        fblWidgetTrackers.trackers.Neu3D.forEach((w: FBLPanel)=>{
          w.content.serverSettings = fblServerSettings;
        });
        fblWidgetTrackers.trackers.NeuGFX.forEach((w: FBLPanel)=>{
          w.content.serverSettings = fblServerSettings;
        });
      }, extension);
    })
    .catch(reason => {
      console.error(
        `Something went wrong when reading the FBLServerSettings.\n${reason}`
      );
    });

  // Ensure that the widgets' are aware of all server settings when added
  fblWidgetTrackers.trackers.Neu3D.widgetAdded.connect((tracker:FBLTracker, w:FBLPanel)=>{
    w.content.serverSettings = fblServerSettings;
  }, extension);
  fblWidgetTrackers.trackers.NeuGFX.widgetAdded.connect((tracker:FBLTracker, w:FBLPanel)=>{
    w.content.serverSettings = fblServerSettings;
  }, extension);

  // Handle state restoration.
  restorer.restore(fblWidgetTrackers.trackers.Neu3D, {
    command: CommandIDs.Neu3DOpen,
    args: widget => {
      const { path, name } = widget.content.sessionContext;
      return {
        model: {
          data: widget.content.model?.data,
          metadata: widget.content.model?.metadata,
          states: widget.content.model?.states
        },
        serverSettings: widget.content.serverSettings as unknown as ReadonlyPartialJSONObject,
        server: widget.content.server,
        clientId: widget.content.clientId,
        id: widget.content.id,
        path: path,
        name: name
      };
    },
    name: widget => widget.content.sessionContext.name,
    when: app.serviceManager.ready
  });

  restorer.restore(fblWidgetTrackers.trackers.NeuGFX, {
    command: CommandIDs.NeuGFXOpen,
    args: widget => {
      const { path, name } = widget.content.sessionContext;
      return {
        model: {
          data: widget.content.model?.data,
          metadata: widget.content.model?.metadata,
          states: widget.content.model?.states
        },
        serverSettings: widget.content.serverSettings as unknown as ReadonlyPartialJSONObject,
        clientId: widget.content.clientId,
        id: widget.content.id,
        server: widget.content.server,
        path: path,
        name: name
      };
    },
    name: widget => widget.content.sessionContext.name,
    when: app.serviceManager.ready
  });

  window.app = app;
  window.fbltrackers = fblWidgetTrackers;

  let masterWidget: Widget = undefined;
  let infoWidget: Widget = undefined;

  masterWidget = new MasterWidget(fblWidgetTrackers);
  masterWidget.id = 'FBL-Master';
  masterWidget.title.caption = 'FBL Widgets and Running Sessions';
  masterWidget.title.icon = masterIcon;
  // add to last
  if (restorer) {
    restorer.add(masterWidget, 'FBL-Master');
  }
  app.shell.add(masterWidget, 'left', {rank: 1900});
  window.master = masterWidget;

  // add info panel
  infoWidget = new InfoWidget();
  infoWidget.id = 'FBL-Info';
  infoWidget.title.caption = 'Information about neurons and synapses';
  infoWidget.title.icon = neuInfoIcon;
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
        widget = fblWidgetTrackers.trackers.Neu3D.currentWidget;
        break;
      case 'neugfx':
        widget = fblWidgetTrackers.trackers.NeuGFX.currentWidget;
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

  commands.addCommand(CommandIDs.Neu3DCreate, {
    label: 'Create Neu3D Instance',
    icon: NEU3DICON,
    execute: async (args) => {
      await FBL.createFBLWidget({
        app:app,
        Module:Neu3DWidget,
        icon:NEU3DICON,
        moduleArgs:{
          server: args.server as string ?? 'No Server',
          info:infoWidget, 
          ...args
        },
        tracker:fblWidgetTrackers.trackers.Neu3D
      });
    }
  });
  commands.addCommand(CommandIDs.Neu3DOpen, {
    label: 'Open Neu3D Instance',
    icon: NEU3DICON,
    execute: async (args) => {
      await FBL.createFBLWidget({
        app:app,
        Module:Neu3DWidget,
        icon:NEU3DICON,
        moduleArgs: {
          server: args.server as string ?? 'No Server',
          info:infoWidget, 
          ...args
        },
        tracker:fblWidgetTrackers.trackers.Neu3D
      });
    }
  });

  commands.addCommand(CommandIDs.NeuGFXCreate, {
    label: 'Create NeuGFX Instance',
    icon: NEUGFXICON,
    execute: async (args) => {
      await FBL.createFBLWidget(
        {
          app:app,
          Module:NeuGFXWidget,
          icon:NEUGFXICON,
          moduleArgs:{
            server: args.server as string ?? 'No Server',
            ...args
          },
          tracker:fblWidgetTrackers.trackers.NeuGFX
        });
    }
  });

  commands.addCommand(CommandIDs.Neu3DCreateConsole, {
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


  commands.addCommand(CommandIDs.NeuGFXCreateConsole, {
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


  // workspace
  commands.addCommand(CommandIDs.CreateWorkspace, {
    label: 'Create FBL Workspace',
    icon: fblIcon,
    execute: async (args) => {
      let server: string = 'No Server';
      let abort: boolean = false;
      await showDialog({
        title: 'Change Server',
        body: new FBL.ServerSelector(fblServerSettings),
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({label: 'No Server'}),
          Dialog.okButton({label: 'Select'})
        ]
      }).then(result =>{
        if (result.button.accept){
          if (result.button.displayType === 'warn'){
            server = 'No Server';
          } else {
            server = result.value;
          }
        } else{
          abort = true;
        }
      });

      if (abort) { // cancel triggers abort
        return;
      }

      let notebook_panel = await commands.execute(
        'notebook:create-new',
        { kernelName: 'python3' }
      )

      // 2. create neu3d
      let neu3d_panel = await FBL.createFBLWidget(
        {
          app: app,
          Module:Neu3DWidget,
          icon:NEU3DICON,
          moduleArgs: {
            info: infoWidget, 
            server: server, 
            sessionContext: notebook_panel.sessionContext, 
            ...args
          },
          tracker: fblWidgetTrackers.trackers.Neu3D,
          add_widget_options:{ref: notebook_panel.id, mode: 'split-left'}
        });

      // 2. create neugfx with the same client id
      await FBL.createFBLWidget(
        {
          app: app,
          Module:NeuGFXWidget,
          icon:NEUGFXICON,
          moduleArgs: {
            clientId: neu3d_panel.content.clientId,
            server: server, 
            sessionContext: notebook_panel.sessionContext, 
            ...args
          },
          tracker: fblWidgetTrackers.trackers.NeuGFX,
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

  // Add the command to the palette.
  [
    CommandIDs.Neu3DCreate,
    CommandIDs.Neu3DCreateConsole,
    CommandIDs.NeuGFXCreate,
    CommandIDs.NeuGFXCreateConsole
  ].forEach(command=>{
    palette.addItem({command, category: 'FlyBrainLab' });
  })

  return Promise.resolve(
    fblWidgetTrackers
  );
}

export namespace FBL {
  export function arrToDict(serverSettings: IFBLServerSetting[]): FBLServerSettings {
    let settings: FBLServerSettings = {};
    for (let server of serverSettings) {
      settings[server.name] = server;
    }
    return settings;
  }

  export type FBLServerSettings = {[name: string]: IFBLServerSetting};
  export interface IFBLServerSetting {
    name: string;
    AUTH: {
      ssl: boolean,
      authentication: boolean,
      cert?: string,
      key?: string,
      'chain-cert'?: string,
      ca_cert_file?: string,
      intermediate_cer_file?: string
    };
    USER: {
      user: string,
      secret: string,
    };
    SERVER: {
      ip: string,
      realm: string,
      // dataset: string[]
    };
    DEBUG: {
      debug: boolean
    };
  }
  /**
   * Load and Parse All available FBL Settings
   *
   * @param setting Extension settings
   */
  export function loadFBLServerSetting(setting: ISettingRegistry.ISettings): FBLServerSettings {
    return FBL.arrToDict((setting.get('fbl-servers').composite as any) as IFBLServerSetting[]);
  }

  /**
   * A widget that provides a server selection.
   */
  export class ServerSelector extends Widget {
    /**
     * Create a new kernel selector widget.
     */
    constructor(serverDict: FBLServerSettings) {
      const body = document.createElement('div');
      const text = document.createElement('label');
      text.textContent = `Select server for FBL Workspace`;
      body.appendChild(text);

      const selector = document.createElement('select');
      let all_servers = Object.keys(serverDict);
      all_servers.push('No Server');
      for (const name of all_servers){
        const option = document.createElement('option');
        option.text = name;
        option.value = name;
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
    moduleArgs: Partial<FBLWidget.IOptions>,
    tracker: WidgetTracker<MainAreaWidget<IFBLWidget>>,
    add_widget_options?: DocumentRegistry.IOpenOptions
  }) : Promise<MainAreaWidget<IFBLWidget>> {
    let widget: IFBLWidget;
    const {
      app, Module, icon, moduleArgs, tracker, add_widget_options
    } = options;


    let sessionContext = moduleArgs.sessionContext ?? tracker.currentWidget?.content?.sessionContext;

    if (sessionContext === undefined){
      moduleArgs['kernelPreference'] = {
        shouldStart: false,
        canStart: true,
        name: 'No Kernel'
      }
    }
    widget = new Module({
      app: app,
      icon: icon,
      sessionContext: sessionContext,
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
