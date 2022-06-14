import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer,
  ILabStatus,
  ILabShell
} from '@jupyterlab/application';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ILauncher } from '@jupyterlab/launcher';
import { ReadonlyPartialJSONObject, Token } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  IWidgetTracker,
  showDialog,
  Dialog,
  SessionContext
} from '@jupyterlab/apputils';
import { Kernel, Session } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { INotification } from 'jupyterlab_toastify';
import {
  RenderMimeRegistry,
  standardRendererFactories as initialFactories
} from '@jupyterlab/rendermime';
import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

// components from widgets
import {
  fblIcon,
  neu3DIcon,
  neuGFXIcon,
  neuInfoIcon,
  masterIcon
} from './icons';
import { FFBOProcessor } from './ffboprocessor';
import { MasterWidget } from './widgets/master-widget/index';
import { IFBLWidget } from './widgets/template-widget/index';
import { InfoWidget } from './widgets/info-widget/index';
import { NeuGFXWidget } from './widgets/neugfx-widget/index';
import { Neu3DWidget } from './widgets/neu3d-widget/index';
import { FBLWidget } from './widgets/template-widget/index';

// import all css files to make sure that npm packages this files when publishing
import '../style/index.css';
import '../style/info-widget/info.css';
import '../style/info-widget/summary.css';
import '../style/master-widget/master.css';
import '../style/neu3d-widget/neu3d.css';
import '../style/neugfx-widget/neugfx.css';
import '../style/template-widget/template.css';

const FBL_CLASS_NAME = '.jp-FBL';
const NEU3D_CLASS_NAME = '.jp-FBL-Neu3D';
const NEUGFX_CLASS_NAME = '.jp-FBL-NeuGFX';
const DIRTY_CLASS = 'jp-mod-dirty';
const NEU3DICON = neu3DIcon;
const NEUGFXICON = neuGFXIcon;
/**
 * Currently Supported FBLClient Version
 *
 * Version is checked when client is initialized
 */
export const SUPPORTED_FBLCLIENT_VERSION = '1.1.0';

/* eslint-disable */
declare global {
  interface Window {
    fbltrackers: any;
    app: any;
    master: any;
    info: any;
  }
}
/* eslint-enable */

export type FBLPanel = MainAreaWidget<IFBLWidget | Neu3DWidget | NeuGFXWidget>;
export type IFBLTracker = IWidgetTracker<FBLPanel>;
export type FBLTracker = WidgetTracker<FBLPanel>;

export interface IFBLWidgetTrackers {
  add(name: string, tracker: FBLTracker): void;
  trackers: { [name: string]: FBLTracker };
  sessionsDict: { [sessionPath: string]: FBLPanel[] };
  sessions: Session.ISessionConnection[];
  addWidget(
    widget: MainAreaWidget<IFBLWidget>,
    ModuleName: string,
    status: ILabStatus
  ): Promise<any>;
  saveState(): void;
  totalSize: number;
}

/* tslint:disable */
/**
 * The FBL Widget Tracker Token
 */
export const IFBLWidgetTrackers = new Token<IFBLWidgetTrackers>(
  '@flybrainlab/neuromynerva:IFBLWidgetTrackers'
);
/* tslint:enable */

/**
 * Class for maintaining a list of FBLWidgetTrackers
 */
export class FBLWidgetTrackers implements IFBLWidgetTrackers {
  constructor(trackers?: { [name: string]: FBLTracker }) {
    if (trackers) {
      this.trackers = trackers;
    } else {
      this.trackers = {};
    }
  }
  /**
   * Add a fbl widget tracker
   * @param tracker
   */
  add(name: string, tracker: FBLTracker): void {
    if (!(name in this.trackers)) {
      this.trackers[name] = tracker;
    }
  }

  addWidget(
    panel: MainAreaWidget<IFBLWidget>,
    ModuleName: string,
    status: ILabStatus
  ): Promise<any> {
    if (!(ModuleName in this.trackers)) {
      console.warn(`[FBL Extension] Tracker ${ModuleName} not found`);
      return Promise.resolve(null);
    }

    // when widget dirty state changes, need to
    // 1. if became dirty, set labstatus to be dirty
    // 2. if no longer dity, dispose labstatus dirty
    let disposable: IDisposable | null = null;
    panel.content.dirty.connect((_, dirty: boolean) => {
      if (dirty === true) {
        if (!disposable) {
          disposable = status.setDirty();
        }
        if (!panel.title.className.includes(DIRTY_CLASS)) {
          panel.title.className += ` ${DIRTY_CLASS}`;
        }
      } else {
        if (disposable) {
          disposable.dispose();
          disposable = null;
        }
        panel.title.className = panel.title.className.replace(DIRTY_CLASS, '');
      }
    });

    // when widget is disposed, disregard busy status.
    panel.content.gettingDisposed.connect(() => {
      if (disposable) {
        disposable.dispose();
        disposable = null;
      }
    });

    return this.trackers[ModuleName].add(panel);
  }

  /**
   * Return alternate view of the trackers, keyed by session
   */
  get sessionsDict(): { [sessionPath: string]: FBLPanel[] } {
    const sessionsDict: { [sessionPath: string]: FBLPanel[] } = {};
    for (const t of Object.values(this.trackers)) {
      t.forEach(panel => {
        const widget = panel.content;
        if (widget.sessionContext?.session) {
          if (!widget.sessionContext.isDisposed) {
            if (!(widget.sessionContext.session.path in sessionsDict)) {
              sessionsDict[widget.sessionContext.session.path] =
                new Array<FBLPanel>();
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
    for (const t of Object.values(this.trackers)) {
      t.forEach(panel => {
        const widget = panel.content;
        if (widget.sessionContext?.session) {
          if (!widget.sessionContext.isDisposed) {
            sessions.push(widget.sessionContext.session);
          }
        }
      });
    }
    return Array.from(new Set(sessions));
  }

  /**
   * Save the state of all the widgets
   */
  saveState(): void {
    for (const key of Object.keys(this.trackers)) {
      this.trackers[key].forEach(p => {
        this.trackers[key].save(p);
        p.content.setDirty(false);
      });
    }
  }

  /**
   * Return total number of widgets in the ftracker
   */
  get totalSize(): number {
    let size = 0;
    for (const key of Object.keys(this.trackers)) {
      size += this.trackers[key].size;
    }
    return size;
  }

  trackers: { [name: string]: FBLTracker };
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
  /** Save state for a given widget */
  export const SaveNeu3DState = 'fbl-neu3d:save-state';
  export const SaveNeuGFXState = 'fbl-neugfx:save-state';
  export const SaveAllState = 'fbl:save-state';
}

/**
 * Initialization data for the neu3d-extension extension.
 */
const extension: JupyterFrontEndPlugin<IFBLWidgetTrackers> = {
  id: '@flybrainlab/neuromynerva:plugin',
  autoStart: true,
  requires: [
    ICommandPalette,
    ILauncher,
    ILayoutRestorer,
    ISettingRegistry,
    ILabStatus,
    ILabShell
  ],
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
  settings: ISettingRegistry,
  status: ILabStatus,
  labShell: ILabShell
): Promise<IFBLWidgetTrackers> {
  console.debug('NeuroMynerva Extension Activated!');
  const fblWidgetTrackers = new FBLWidgetTrackers({
    Neu3D: new WidgetTracker<MainAreaWidget<IFBLWidget>>({
      namespace: 'fbl-neu3d'
    }),
    NeuGFX: new WidgetTracker<MainAreaWidget<IFBLWidget>>({
      namespace: 'fbl-neugfx'
    })
  });

  const { commands } = app;

  // Handle state restoration.
  restorer.restore(fblWidgetTrackers.trackers.Neu3D, {
    command: CommandIDs.Neu3DOpen,
    args: widget => {
      const { path } = widget.content.sessionContext;
      const name = widget.content.name;
      return {
        model: {
          data: widget.content.model?.data,
          metadata: widget.content.model?.metadata,
          states: widget.content.model?.states
        },
        ffboProcessors: widget.content
          .ffboProcessors as unknown as ReadonlyPartialJSONObject,
        processor: widget.content.processor,
        clientId: widget.content.clientId,
        id: widget.content.id,
        path: path,
        name: name
      };
    },
    name: widget => widget.content.id,
    when: app.serviceManager.ready
  });

  // restorer.restore(fblWidgetTrackers.trackers.NeuGFX, {
  //   command: CommandIDs.NeuGFXOpen,
  //   args: widget => {
  //     const { path } = widget.content.sessionContext;
  //     const name = widget.content.name;
  //     return {
  //       model: {
  //         data: widget.content.model?.data,
  //         metadata: widget.content.model?.metadata,
  //         states: widget.content.model?.states
  //       },
  //       ffboProcessors: widget.content.ffboProcessors as unknown as ReadonlyPartialJSONObject,
  //       clientId: widget.content.clientId,
  //       id: widget.content.id,
  //       iFrameSrc: (widget.content as any).iFrameSrc,
  //       processor: widget.content.processor,
  //       path: path,
  //       name: name
  //     };
  //   },
  //   name: widget => widget.content.id,
  //   when: app.serviceManager.ready
  // });

  window.app = app;
  window.fbltrackers = fblWidgetTrackers;

  let masterWidget: MasterWidget = undefined;
  let infoWidget: InfoWidget = undefined;

  // all available processor settings
  let ffboProcessorSetting: ISettingRegistry.ISettings = undefined;

  // Wait for the application to be restored and
  // for the settings for this plugin to be loaded
  Promise.all([app.restored, settings.load(extension.id)])
    .then(([, setting]) => {
      // Read the settings
      ffboProcessorSetting = setting;

      if (masterWidget === undefined) {
        masterWidget = new MasterWidget(
          app.serviceManager.sessions,
          labShell,
          fblWidgetTrackers,
          ffboProcessorSetting,
          commands
        );
        masterWidget.id = 'FBL-Master';
        masterWidget.title.caption = 'FBL Widgets and Running Sessions';
        masterWidget.title.icon = masterIcon;
        // add to last
        if (restorer) {
          restorer.add(masterWidget, 'FBL-Master');
        }
        app.shell.add(masterWidget, 'left', { rank: 1900 });
        window.master = masterWidget;
      } else {
        masterWidget.ffboProcessorSetting = ffboProcessorSetting;
      }

      let _settings = FBL.getProcessors(setting);
      fblWidgetTrackers.trackers.Neu3D.forEach((w: FBLPanel) => {
        w.content.ffboProcessors = _settings;
      });
      fblWidgetTrackers.trackers.NeuGFX.forEach((w: FBLPanel) => {
        w.content.ffboProcessors = _settings;
      });

      // Listen for your plugin setting changes using Signal
      setting.changed.connect(setting => {
        _settings = FBL.getProcessors(setting);
        fblWidgetTrackers.trackers.Neu3D.forEach((w: FBLPanel) => {
          w.content.ffboProcessors = _settings;
        });
        fblWidgetTrackers.trackers.NeuGFX.forEach((w: FBLPanel) => {
          w.content.ffboProcessors = _settings;
        });
        masterWidget.ffboProcessorSetting = ffboProcessorSetting;
      }, extension);
    })
    .catch(reason => {
      console.error(
        `Something went wrong when reading the FFBO Processor Settings.\n${reason}`
      );
    });

  // Ensure that the widgets' are aware of all processor settings when added
  fblWidgetTrackers.trackers.Neu3D.widgetAdded.connect(
    (tracker: FBLTracker, w: FBLPanel) => {
      w.content.ffboProcessors = FBL.getProcessors(ffboProcessorSetting);
    },
    extension
  );
  fblWidgetTrackers.trackers.NeuGFX.widgetAdded.connect(
    (tracker: FBLTracker, w: FBLPanel) => {
      w.content.ffboProcessors = FBL.getProcessors(ffboProcessorSetting);
    },
    extension
  );

  // add info panel
  infoWidget = new InfoWidget();
  infoWidget.id = 'FBL-Info';
  infoWidget.title.caption = 'Information about neurons and synapses';
  infoWidget.title.icon = neuInfoIcon;
  // add to last
  if (restorer) {
    restorer.add(infoWidget, 'FBL-Info');
  }
  app.shell.add(infoWidget, 'left', { rank: 2000 });
  window.info = infoWidget;

  // Check FBLClient is installed and version matches
  // let clientCheckPassed = await FBL.checkFBLClientAndVersions(app.serviceManager.sessions);
  // TODO: clientCheckPassed should be used to statefully render some warnings for each widget

  // although this returns a promise, we cannot make this blocking using await because it may
  // cause the entire JLab to stall
  const version_check_toast_id = await INotification.inProgress(
    'Checking FlyBrainLab Backend Package Installations...'
  );
  FBL.checkFBLClientAndVersions(app, version_check_toast_id);

  // Get the current widget of a given widget type and activate unless the args specify otherwise.
  function getCurrent(
    args: ReadonlyPartialJSONObject
  ): MainAreaWidget<IFBLWidget> | null {
    let widget = undefined;
    switch (args['widget']) {
      case 'neu3d':
        widget = fblWidgetTrackers.trackers.Neu3D.currentWidget;
        break;
      case 'neugfx':
        widget = fblWidgetTrackers.trackers.NeuGFX.currentWidget;
        break;
      default:
        // not understood
        console.warn(`Cannot getCurrent widget of type ${args['widget']}.`);
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
    execute: async args => {
      await FBL.createFBLWidget({
        app: app,
        Module: Neu3DWidget,
        icon: NEU3DICON,
        moduleArgs: {
          processor: (args.processor as string) ?? FFBOProcessor.NO_PROCESSOR,
          info: infoWidget,
          ...args
        },
        fbltracker: fblWidgetTrackers,
        ModuleName: 'Neu3D',
        status: status
      });
    }
  });
  commands.addCommand(CommandIDs.Neu3DOpen, {
    label: 'Open Neu3D Instance',
    icon: NEU3DICON,
    execute: async args => {
      await FBL.createFBLWidget({
        app: app,
        Module: Neu3DWidget,
        icon: NEU3DICON,
        moduleArgs: {
          processor: (args.processor as string) ?? FFBOProcessor.NO_PROCESSOR,
          info: infoWidget,
          ...args
        },
        fbltracker: fblWidgetTrackers,
        ModuleName: 'Neu3D',
        status: status
      });
    }
  });

  commands.addCommand(CommandIDs.NeuGFXCreate, {
    label: 'Create NeuGFX Instance',
    icon: NEUGFXICON,
    execute: async args => {
      await FBL.createFBLWidget({
        app: app,
        Module: NeuGFXWidget,
        icon: NEUGFXICON,
        moduleArgs: {
          processor: (args.processor as string) ?? FFBOProcessor.NO_PROCESSOR,
          ...args
        },
        fbltracker: fblWidgetTrackers,
        ModuleName: 'NeuGFX',
        status: status
      });
    }
  });

  commands.addCommand(CommandIDs.NeuGFXOpen, {
    label: 'Open Existing NeuGFX Instance',
    icon: NEUGFXICON,
    execute: async args => {
      await FBL.createFBLWidget({
        app: app,
        Module: NeuGFXWidget,
        icon: NEUGFXICON,
        moduleArgs: {
          processor: (args.processor as string) ?? FFBOProcessor.NO_PROCESSOR,
          ...args
        },
        fbltracker: fblWidgetTrackers,
        ModuleName: 'NeuGFX',
        status: status
      });
    }
  });

  commands.addCommand(CommandIDs.Neu3DCreateConsole, {
    label: 'Create Console for Neu3D Widget',
    icon: NEU3DICON,
    execute: args => {
      const current = getCurrent({ ...args, widget: 'neu3d', activate: false });
      if (!current) {
        return;
      }
      FBL.createConsole(app, current, args);
    },
    isEnabled: () => {
      const current = getCurrent({ widget: 'neu3d', activate: false });
      return FBL.hasRunningSession(current);
    }
  });

  commands.addCommand(CommandIDs.NeuGFXCreateConsole, {
    label: 'Create Console for NeuGFX Widget',
    icon: NEUGFXICON,
    execute: args => {
      const current = getCurrent({
        ...args,
        widget: 'neugfx',
        activate: false
      });
      if (!current) {
        return;
      }
      FBL.createConsole(app, current, args);
    },
    isEnabled: () => {
      const current = getCurrent({ widget: 'neu3d', activate: false });
      return FBL.hasRunningSession(current);
    }
  });

  // workspace
  commands.addCommand(CommandIDs.CreateWorkspace, {
    label: 'Create FBL Workspace',
    icon: fblIcon,
    execute: async args => {
      let processor: string = FFBOProcessor.NO_PROCESSOR;
      let abort = false;
      await showDialog({
        title: 'Change Processor',
        body: new FBL.ProcessorSelector(ffboProcessorSetting),
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({ label: FFBOProcessor.NO_PROCESSOR }),
          Dialog.okButton({ label: 'Select' })
        ]
      }).then(result => {
        if (result.button.accept) {
          if (result.button.displayType === 'warn') {
            processor = FFBOProcessor.NO_PROCESSOR;
          } else {
            processor = result.value;
          }
        } else {
          abort = true;
        }
      });

      if (abort) {
        // cancel triggers abort
        return;
      }

      const notebook_panel = await commands.execute('notebook:create-new', {
        kernelName: 'python3'
      });

      // 2. create neu3d
      const neu3d_panel = await FBL.createFBLWidget({
        app: app,
        Module: Neu3DWidget,
        icon: NEU3DICON,
        moduleArgs: {
          info: infoWidget,
          processor: processor,
          sessionContext: notebook_panel.sessionContext,
          ...args
        },
        fbltracker: fblWidgetTrackers,
        ModuleName: 'Neu3D',
        status: status,
        add_widget_options: { ref: notebook_panel.id, mode: 'split-left' }
      });

      // 2. create neugfx with the same client id
      await FBL.createFBLWidget({
        app: app,
        Module: NeuGFXWidget,
        icon: NEUGFXICON,
        moduleArgs: {
          clientId: neu3d_panel.content.clientId,
          processor: processor,
          sessionContext: notebook_panel.sessionContext,
          ...args
        },
        fbltracker: fblWidgetTrackers,
        ModuleName: 'NeuGFX',
        status: status,
        add_widget_options: { ref: neu3d_panel.id, mode: 'split-bottom' }
      });
    }
  });

  commands.addCommand(CommandIDs.SaveNeu3DState, {
    label: 'Save the State of a Neu3D Widget For Restoration',
    icon: NEU3DICON,
    execute: args => {
      const current = getCurrent({ ...args, widget: 'neu3d', activate: false });
      if (!current) {
        return;
      }
      fblWidgetTrackers.trackers['Neu3D'].save(current);
      current.content.setDirty(false);
    },
    isEnabled: () => {
      const current = getCurrent({ widget: 'neu3d', activate: false });
      if (current?.content?.isDirty) {
        return true;
      }
      return false;
    }
  });

  commands.addCommand(CommandIDs.SaveNeuGFXState, {
    label: 'Save the State of a NeuGFX Widget For Restoration',
    icon: NEUGFXICON,
    execute: args => {
      const current = getCurrent({
        ...args,
        widget: 'neugfx',
        activate: false
      });
      if (!current) {
        return;
      }
      fblWidgetTrackers.trackers['NeuGFX'].save(current);
      current.content.setDirty(false);
    },
    isEnabled: () => {
      const current = getCurrent({ widget: 'neugfx', activate: false });
      if (current?.content?.isDirty) {
        return true;
      }
      return false;
    }
  });

  commands.addCommand(CommandIDs.SaveAllState, {
    label: 'Save the State of a All FBL Widgets For Restoration',
    icon: fblIcon,
    execute: args => {
      fblWidgetTrackers.saveState();
    },
    isEnabled: () => {
      return fblWidgetTrackers.totalSize > 0;
    }
  });

  // Add the widget to launcher
  if (launcher) {
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
  app.contextMenu.addItem({
    command: CommandIDs.SaveNeu3DState,
    selector: NEU3D_CLASS_NAME,
    rank: Infinity
  });
  app.contextMenu.addItem({
    command: CommandIDs.SaveNeuGFXState,
    selector: NEUGFX_CLASS_NAME,
    rank: Infinity
  });

  /**
   * Add keyboard shortcuts to save the widget states.
   * `Accel` correspond to `Command` on Mac and `Ctrl` on Windows/Linux
   */
  app.commands.addKeyBinding({
    command: CommandIDs.SaveNeu3DState,
    args: {},
    keys: ['Accel S'],
    selector: NEU3D_CLASS_NAME
  });

  app.commands.addKeyBinding({
    command: CommandIDs.SaveNeuGFXState,
    args: {},
    keys: ['Accel S'],
    selector: NEUGFX_CLASS_NAME
  });

  app.commands.addKeyBinding({
    command: CommandIDs.SaveAllState,
    args: {},
    keys: ['Accel Shift S'],
    selector: FBL_CLASS_NAME
  });

  // Add the command to the palette.
  [
    CommandIDs.Neu3DCreate,
    CommandIDs.Neu3DCreateConsole,
    CommandIDs.NeuGFXCreate,
    CommandIDs.NeuGFXCreateConsole,
    CommandIDs.SaveNeu3DState,
    CommandIDs.SaveNeuGFXState,
    CommandIDs.SaveAllState
  ].forEach(command => {
    palette.addItem({ command, category: 'FlyBrainLab' });
  });

  return Promise.resolve(fblWidgetTrackers);
}

/**
 * FBL Namespace with helper functions
 */
export namespace FBL {
  export function getProcessors(
    setting?: ISettingRegistry.ISettings
  ): FFBOProcessor.IProcessors {
    if (!setting) {
      return {};
    }
    return FFBOProcessor.arrToDict(
      setting.get('fbl-processors')
        .composite as any as FFBOProcessor.ISettings[]
    );
  }

  /**
   * A widget that provides a processor selection.
   */
  export class ProcessorSelector extends Widget {
    /**
     * Create a new processor selector widget.
     */
    constructor(setting: ISettingRegistry.ISettings) {
      const body = document.createElement('div');
      const text = document.createElement('label');
      text.textContent = 'Select processor for FBL Workspace';
      body.appendChild(text);

      const selector = document.createElement('select');

      const all_processors = Object.keys(FBL.getProcessors(setting));
      all_processors.push(FFBOProcessor.NO_PROCESSOR);
      for (const name of all_processors) {
        const option = document.createElement('option');
        option.text = name;
        option.value = name;
        selector.appendChild(option);
      }
      body.appendChild(selector);
      super({ node: body });
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
  export function hasRunningSession(
    widget: MainAreaWidget<IFBLWidget>
  ): boolean {
    if (!widget) {
      return false;
    }
    try {
      if (widget.content.sessionContext.isReady) {
        if (widget.content.sessionContext.session) {
          // check if has kenrel
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
  export async function isFBLKernel(
    kernel: Kernel.IKernelConnection
  ): Promise<string | null> {
    let targetCandidates = new Array<any>();
    // interrogate kernel as Kernel class
    const msg = await kernel.requestCommInfo({});
    if (!kernel.handleComms) {
      // force kernel to handleComms
      kernel.handleComms = true;
    }
    if (msg.content && msg.content?.status === 'ok') {
      for (const c of Object.values(msg.content.comms)) {
        if (c.target_name.includes('FBL')) {
          targetCandidates.push(c.target_name);
        }
      }
    } else {
      return Promise.resolve(null);
    }

    if (targetCandidates.length === 0) {
      return Promise.resolve(null);
    }

    // take only unique target values
    targetCandidates = [...new Set(targetCandidates)];
    return Promise.resolve(targetCandidates[0]);
  }

  export async function createFBLWidget(options: {
    app: JupyterFrontEnd;
    Module: any;
    icon: LabIcon;
    moduleArgs: Partial<FBLWidget.IOptions>;
    fbltracker: FBLWidgetTrackers;
    ModuleName: 'Neu3D' | 'NeuGFX' | string;
    status: ILabStatus;
    add_widget_options?: DocumentRegistry.IOpenOptions;
  }): Promise<MainAreaWidget<IFBLWidget>> {
    const {
      app,
      Module,
      icon,
      moduleArgs,
      fbltracker,
      ModuleName,
      status,
      add_widget_options
    } = options;

    const sessionContext =
      moduleArgs.sessionContext ??
      fbltracker.trackers[ModuleName].currentWidget?.content?.sessionContext;

    if (sessionContext === undefined) {
      moduleArgs['kernelPreference'] = {
        shouldStart: false,
        canStart: true,
        name: 'No Kernel'
      };
    }
    const widget = new Module({
      app: app,
      icon: icon,
      sessionContext: sessionContext,
      ...moduleArgs
    });

    const panel = new MainAreaWidget({
      content: widget,
      toolbar: widget.toolbar
    });
    panel.node.classList.add(FBL_CLASS_NAME);

    if (!fbltracker.trackers[ModuleName].has(panel)) {
      await fbltracker.addWidget(panel, ModuleName, status);
      // await fbltracker.trackers[ModuleName].add(panel);
    }
    widget.sessionContext.propertyChanged.connect(() => {
      void fbltracker.trackers[ModuleName].save(panel);
    });

    // widget.modelChanged.connect(()=>{
    //   void tracker.save(panel);
    // });
    // Attach the widget to the main work area if it's not there
    app.shell.add(panel, 'main', add_widget_options);
    widget.update();
    panel.update();
    // Activate the widget
    app.shell.activateById(panel.id);

    return panel;
  }

  export function createConsole(
    app: JupyterFrontEnd,
    panel: MainAreaWidget<IFBLWidget>,
    args: any
  ): void {
    app.commands.execute('console:create', {
      path: panel.content.sessionContext.path,
      ref: panel.id,
      insertMode: args['insertMode'] ?? 'split-right',
      activate: args['activate'] as unknown as boolean
    });
  }

  /**
   * Check that FBLClient is installed and Versions match
   * @param app
   * @param toastProgressId
   */
  export async function checkFBLClientAndVersions(
    app: JupyterFrontEnd,
    toastProgressId?: string | number
  ): Promise<boolean> {
    // check fbl installed
    const client_check_code = `
import flybrainlab as fbl
    `;
    const clientRes = await executeCodeInCodeCell(
      app,
      client_check_code,
      null,
      false
    );
    const session = clientRes.session;
    const clientBtns = [
      {
        label: 'Call Stack',
        callback: () =>
          showDialog({
            title: 'FBLClient Not Installed!',
            body: clientRes.codeCell
          })
      }
    ];
    if (clientRes.executeReply.content.status !== 'ok') {
      if (toastProgressId) {
        INotification.update({
          toastId: toastProgressId,
          message: 'FBLClient Not Installed!',
          type: 'error',
          autoClose: null,
          buttons: clientBtns
        });
      } else {
        INotification.error('FBLClient Not Installed!', {
          buttons: clientBtns
        });
      }
      app.serviceManager.sessions.shutdown(session.session.id);
      session.dispose();
      return Promise.resolve(false);
    } else {
      clientRes.codeCell.dispose();
    }

    // check Client Version
    const client_version_code = `
import flybrainlab as fbl
fbl.check_FBLClient_version('${SUPPORTED_FBLCLIENT_VERSION}')
    `;
    const clientVersionRes = await executeCodeInCodeCell(
      app,
      client_version_code,
      session,
      false
    );

    if (clientVersionRes.executeReply.content.status === 'error') {
      const errMessage = `
      FBLClient Version Check Failed!
      Error: ${clientVersionRes.executeReply.content.evalue}
      `;
      const clientVersionBtns = [
        {
          label: 'Call Stack',
          callback: () =>
            showDialog({
              title: errMessage,
              body: clientVersionRes.codeCell
            })
        }
      ];
      if (toastProgressId) {
        INotification.update({
          toastId: toastProgressId,
          message: errMessage,
          type: 'error',
          autoClose: null,
          buttons: clientVersionBtns
        });
      } else {
        INotification.error(errMessage, { buttons: clientVersionBtns });
      }
      app.serviceManager.sessions.shutdown(session.session.id);
      session.dispose();
      return Promise.resolve(false);
    } else {
      clientVersionRes.codeCell.dispose();
    }

    // check Client Update
    const client_update_code = `
import flybrainlab as fbl
fbl.check_for_update()
    `;
    const clientUpdateRes = await executeCodeInCodeCell(
      app,
      client_update_code,
      session,
      false
    );
    if (clientUpdateRes.executeReply.content.status === 'error') {
      const msg = clientUpdateRes.executeReply.content;
      if (msg.ename === 'FlyBrainLabVersionUpgradeException') {
        const errMessage = clientUpdateRes.executeReply.content.evalue;
        INotification.info(errMessage, { autoClose: null });
      }
    }
    clientUpdateRes.codeCell.dispose();

    // check NM Version
    const NM_version_code = `
import flybrainlab as fbl
fbl.check_NeuroMynerva_version()
    `;
    const NMVersionRes = await executeCodeInCodeCell(
      app,
      NM_version_code,
      session,
      false
    );
    if (NMVersionRes.executeReply.content.status === 'error') {
      const errMessage = `
      NeuroMynerva Version Check Failed!
      Error: ${NMVersionRes.executeReply.content.evalue}
      `;
      const NMVersionBtns = [
        {
          label: 'Details',
          callback: () =>
            showDialog({
              title: errMessage,
              body: NMVersionRes.codeCell
            })
        }
      ];
      if (toastProgressId) {
        INotification.update({
          toastId: toastProgressId,
          message: errMessage,
          type: 'error',
          autoClose: null,
          buttons: NMVersionBtns
        });
      } else {
        INotification.error(errMessage, { buttons: NMVersionBtns });
      }
      app.serviceManager.sessions.shutdown(session.session.id);
      session.dispose();
      return Promise.resolve(false);
    } else {
      NMVersionRes.codeCell.dispose();
    }

    // success
    app.serviceManager.sessions.shutdown(session.session.id);
    NMVersionRes.session.dispose();
    if (toastProgressId) {
      INotification.update({
        toastId: toastProgressId,
        message: 'FlyBrainLab Backend Check Successful!',
        type: 'success',
        autoClose: 1500
      });
    }
    return Promise.resolve(true);
  }

  /**
   * Execute Code in a given Code Cell and return the result
   * @param app
   * @param code
   */
  export async function executeCodeInCodeCell(
    app: JupyterFrontEnd,
    code: string,
    sessionContext?: SessionContext,
    closeSession = true
  ): Promise<{
    codeCell: CodeCell;
    executeReply: any;
    session: SessionContext;
  }> {
    sessionContext =
      sessionContext ??
      new SessionContext({
        sessionManager: app.serviceManager.sessions,
        specsManager: app.serviceManager.kernelspecs,
        path: 'NeuroMynerva-Version-Check',
        name: 'NeuroMnyerva-Version-Check',
        type: 'console',
        kernelPreference: {
          shouldStart: true,
          canStart: true,
          name: 'python3'
        }
      });

    await sessionContext.initialize();
    const model = new CodeCellModel({});
    model.value.text = code;
    const rendermime = new RenderMimeRegistry({ initialFactories });
    const widget = new CodeCell({
      model: model,
      rendermime: rendermime
    });
    widget.readOnly = true;
    widget.initializeState();
    const executeReply = await CodeCell.execute(widget, sessionContext);
    if (closeSession) {
      app.serviceManager.sessions.shutdown(sessionContext.session.id);
      sessionContext.dispose();
    }
    return {
      codeCell: widget,
      executeReply: executeReply,
      session: sessionContext
    };
  }
}
