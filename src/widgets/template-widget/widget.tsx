import * as React from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Kernel, Session, KernelMessage } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
// import { PromiseDelegate } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable'
// import { Message } from '@lumino/messaging';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';
import {
  ISessionContext, SessionContext,
  sessionContextDialogs, showDialog,
  ToolbarButton
} from '@jupyterlab/apputils';
import { Signal, ISignal } from '@lumino/signaling';
import { Toolbar } from '@jupyterlab/apputils';
import { INotification } from "jupyterlab_toastify";
import { LabIcon } from '@jupyterlab/ui-components';

import { fblIcon, syncConsoleIcon } from '../../icons';
import { FBLWidgetModel, IFBLWidgetModel } from './model';
import {
  createProcessorButton,
  createSessionDialogButton
} from './session_dialog';

import '../../../style/template-widget/template.css';
import { InfoWidget } from '../info-widget';
import { FBLClient } from './client';
import { FFBOProcessor } from '../../ffboprocessor';

export interface IFBLWidget extends Widget {
  /**
   * All available processor settings
   */
  ffboProcessors: FFBOProcessor.IProcessors;

  /**
   * Allow NM Extension to overwrite the processor values
   * @param newProcessors new processor settings to replace current values
   */
  setFFBOProcessors(newProcessors: FFBOProcessor.IProcessors): void;

  /**
   * The sessionContext keeps track of the current running session
   * associated with the widget.
   */
  sessionContext: ISessionContext;

  /**
   * A string indicating the connected processor
   * Has special setter that the neu3d visualization setting and rendered meshes
   */
  processor: string;

  /**
   * Set new Processor value
   * @param newProcessor
   * @param startUp
   */
  setProcessor(newProcessor: string, startUp?: boolean): void;

  /**
   * Dispose current widget
   */
  dispose(): void;

  /**
   * All neurons current rendered in the workspace.
   */
  model: any;

  /**
   * Render the current model
   * @param change optional changes for incremental rendering
   */
  renderModel(change?: any): void;

  /**
   * FBLClient instance that handles communication with kernel
   *
   * A client can only be connected to a given widget when
   * 1. there is a running kernel attached to the widget
   * 2. there is a processor for the widget (that is not `no processor`)
   * 3. flybrainlab is installed in the corresponding kernel
   * The intended way of using the API is to use `client.checkConnection` to force
   * a function call to the python kernel to check for if a client exists.
   *
   * The `client.connectionChanged` signal can be used to trigger stateful rendering of
   * widgets based on the status of the client connection.
   */
  client: FBLClient;

  /**
   * Name of Widget
   */
  name: string

  /**
   * targetname of the current comm
   */
  commTarget: string;

  /**
   * comm object with kernel
   */
  comm: Kernel.IComm;

  /**
   * Signal that emits new processor name when changed
   */
  processorChanged: ISignal<FBLWidget, string>;

  /**
   * Signal that emits model change
   */
  modelChanged: ISignal<FBLWidget, object>;

  /**
   * Signal that emits the widget when it is getting disposed. Only fires once.
   */
  gettingDisposed: ISignal<FBLWidget, object>;


  /**
   * Icon associated with the widget
   */
  icon: LabIcon;

  /**
   * Toolbar to be added to the MainAreaWidget
   *
   * TODO: This is currently defined here due to an issue with using
   *   MainAreaWidget class directly
   */
  toolbar: Toolbar<Widget>;


  /**
   * Id of FBLClient Id
   */
  clientId: string;


  /**
   * Reference to Info Widget
   *
   * Note: currently only required by Neu3D-Widget.
   */
  info?: InfoWidget


  /**
   * The dirty state of the widget reflects whether there is unsaved changes
   * that is required to be manually saved to layout restorer for state-persistence.
   *
   * The intended way of using the API is to call `setDirty` which will trigger an event
   * `dirty` which can be used to handle changes in the dirty state.
   *
   * setDirty to `true` (dirty) is typically emitted by the widget when the state changes.
   * setDirty for `false` (clean) is typically emitted by the extension when the state changes
   * have been saved by the user to the layout restorer's stateDB.
   */
  isDirty: boolean
  dirty: ISignal<FBLWidget, boolean>;
  setDirty(state: boolean): void;
}

const TEMPLATE_COMM_TARGET = 'FBL-Comm';

/**
* An FBL Template Widget
*/
export class FBLWidget extends Widget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super();
    const {
      app,
      basePath,
      name,
      model,
      sessionContext,
      icon,
      clientId,
      ffboProcessors
    } = options;

    // keep a reference to list of all ffboProcessors in the schema
    this._ffboProcessors = ffboProcessors;
    const processor = options.processor ?? FFBOProcessor.NO_PROCESSOR;

    // keep track of number of instances
    const count = Private.count++;

    // specify name, this is the display name of the widget
    this.name = name || `Template-${count}`;

    // specify id of the widget, and
    // make sure there is no conflic with existing widgets
    // if the supplied `options.name` is found, append UUID
    let id  = options.id ?? `${this.name}-${UUID.uuid4()}`;
    let _widgets_iter = app.shell.widgets('main').iter();
    let _w = _widgets_iter.next();
    while (_w){
      if ((_w.id === id) || ((_w as any).content?.id === id)) {
        id = `${this.name}-${UUID.uuid4()}`;
        break;
      }
      _w = _widgets_iter.next();
    }
    this.id = id;

    // client id for associated client in the backend
    this.clientId = clientId || `client-${this.id}`;

    // specify path that's associated with the current widget
    const path = options.path ?? `${basePath || ''}/${this.id}`;
    this.icon = icon ?? fblIcon;

    // initialize model
    this.initModel(model);

    // specify comm target (unique to this widget)
    this.commTarget = `${TEMPLATE_COMM_TARGET}:${this.id}`;

    // create session Context, default to using console.
    this.sessionContext =
      sessionContext ||
      new SessionContext({
        sessionManager: options.sessionManager ?? app.serviceManager.sessions,
        specsManager: options.specsManager ?? app.serviceManager.kernelspecs,
        path: path,
        name: this.name,
        type: 'console',
        kernelPreference: options.kernelPreference ?? {
          shouldStart: true,
          canStart: true,
          name: 'python3'
        },
        setBusy: options.setBusy
      });

    // Create Toolbar (to be consumed by MainAreaWidget in `fbl-extension`);
    const toolbar = this.toolbar = new Toolbar();
    toolbar.node.style.height = 'var(--jp-private-toolbar-height)';
    toolbar.node.classList.add('fbl-widget-toolbar');
    this.populateToolBar();

    // initialize client
    this.client = this.createClient();

    // initialize session
    this.sessionContext.initialize().then(async value => {
      // Setup Main Panel
      if (value) {
        await sessionContextDialogs.selectKernel(this.sessionContext);
      }
      if (this.sessionContext.session?.kernel){
        // Force it to handle comms
        this.sessionContext.session.kernel.handleComms = true;
      }
      this._connected = new Date();
      await this.initComm();
      await this.client.init();
      // register Comm only when kernel is changed
      this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
      this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
      this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
      // set processor after session is avaible, in case the setter needs the session
      this.setProcessor(processor, true);
      Private.updateTitle(this, this._connected);
    });

    Private.updateTitle(this, this._connected);

    // connect model changed signal to dirty state after initialization
    this.modelChanged.connect(() => {
      this.setDirty(true);
    })
    // connect cient changed signal to dirty state after initialization
    this.client.connectionChanged.connect(() => {
      this.setDirty(true);
    });
  }

  /**
   * Create a new client instance
   *
   * This is exposed as  method so that the children classes can change the
   * client class by overwriting this method
   */
  createClient(): FBLClient {
    return new FBLClient(this);
  }

  /**
   * Should handle render logic of model
   * @param change - changes to a model for incremental rendering
   */
  renderModel(change?: any): void {
    // to be implemented by child widgets
    return;
  }

  /**
   * Send model to the front-end
   * @param change
   */
  sendModel(change?: Partial<IFBLWidgetModel>) {
    this.comm.send({
      messageType: 'model',
      data: {
        data: change?.data ?? this.model.data,
        metadata: change?.metadata ?? this.model.metadata,
        states: change?.states ?? this.model.states,
      }
    })
  }

  /**
   * Initialize model. Overload this method with child's own model class.
   * It is called in the constructor of the widget
   * @param model partial information of the model data
   */
  initModel(model: Partial<IFBLWidgetModel>){
    // create model
    this.model = new FBLWidgetModel(model);
    this.model.dataChanged.connect(this.onDataChanged, this);
    this.model.metadataChanged.connect(this.onMetadataChanged, this);
    this.model.statesChanged.connect(this.onStatesChanged, this);
  }

  /**
   * Handle comm message from kernel
   * To be overload by children
   * @param msg
   */
  onCommMsg(msg: KernelMessage.ICommMsgMsg) {
    let thisMsg = msg.content.data as any;
    if (typeof thisMsg === 'undefined') {
      return;
    }

    switch (thisMsg.widget) {
      // Popup window shown as dialog
      case "popout": {
        showDialog({
          title: `FBL Kernel Message`,
          body: (
            <div>
            <p>Widget: ${this.id}</p><br></br>
            <p>{thisMsg.data}</p>
            </div>)
        }).then(()=>{
          return Promise.resolve(void 0);
        })
        break;
      }
      case 'toast': {
        for (let [type, data] of Object.entries(thisMsg.data.info)){
          switch (type) {
            case 'success':
              INotification.success(data, {'autoClose': 1500});
              break;
            case 'error':
              INotification.error(data, {'autoClose': 5000});
              break;
            default:
              INotification.info(data, {'autoClose': 2000});
              break;
          }
        }
      }
      default: {
        // no-op
        return;
      }
    }
    // no-op
    return;
  }

  /**
   * Handle comm close msg
   * To be overload by children
   * @param msg
   */
  onCommClose(msg: KernelMessage.ICommCloseMsg) {
    // no-op
    return;
  }

  /**
   * Handle model.data Change in the widget side. should affect rendering
   * @param args
   */
  onDataChanged(sender: IFBLWidgetModel, args: any){
    // overload by child
    return;
  }

  /**
   * Handle model.metadata Change in the widget side. should affect rendering
   * @param args
   */
  onMetadataChanged(sender: IFBLWidgetModel, args: any){
    // overload by child
    return;
  }

  /**
   * Handle model.states change in the widget side. should affect rendering
   * @param args
   */
  onStatesChanged(sender: IFBLWidgetModel, args: any){
    // overload by child
    return
  }

  /**
  * Dispose the current session
  *
  * 1. comm dispose
  * 2. model dispose
  * 3. disconnect signal slots
  */
  dispose(): void {
    if (this._isDisposed === true) {
      return;
    }
    this._gettingDisposed.emit(this);
    this.client.dispose().then(()=>{
      this.comm?.dispose();
    })
    this.model?.dispose();
    Signal.disconnectAll(this._modelChanged);
    Signal.disconnectAll(this._gettingDisposed);
    super.dispose();
    this._isDisposed = true;
  }

  /**
  * A method that handles changing sessionContext
  */
 async onKernelChanged(
    context: ISessionContext,
    args: Session.ISessionConnection.IKernelChangedArgs
 ) {
   console.debug('KERNEL Changed', args, context);
   if (args.oldValue === null && args.newValue === null) {
     // this is called by the restart routine by default
     return; // no op
   }

    const newKernel: Kernel.IKernelConnection | null = args.newValue;
    this.setDirty(true);
    Private.updateTitle(this, this._connected);
    if (newKernel === null){
      this.comm?.dispose();
      this.client.setConnection(false);
      return;
    }
    if (this.sessionContext.session) {
      await this.sessionContext.ready;
      await this.initComm();
      await this.client.init();
      this.onPathChanged();

      this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
      this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
      this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
      return;
    } else {
      this.client.setConnection(false);
      return
    }
  }

  /**
   * Handle Change in Kernel Status
   *
   * Note: re-registering client and comms should be handled by the `onKernelChanged` callback
   * since the statuschanged eventually call the onKernelChanged.
   *
   * This function call is mainly for the purpose of detecting busy state of the kernel.
   */
  onKernelStatusChanged(sess: ISessionContext, status: Kernel.Status) {
    return;
  }

  /**
  * A method that handles changing session Context
  */
  onPathChanged(msg?: any): void {
    console.debug('PATH Changed', msg);
    this.setDirty(true);
    if (this.sessionContext.session) {
      Private.updateTitle(this, this._connected);
    }
  }

  /**
   * Return A signal that indicates model changed
   */
  get modelChanged(): ISignal<this, object> {
    return this._modelChanged;
  }

  /**
   * Return A signal that indicates processor change
   */
  get processorChanged(): ISignal<this, string> {
    return this._processorChanged;
  }



  // /**
  //  * Initialize FBL
  //  *
  //  * This code does 2 things:
  //  *   1. import `flybrainlab` into global `fbl` singleton if not found
  //  *   2. add current widget to the `fbl.widget_manager`
  //  */
  // async initFBL(): Promise<boolean> {
  //   let code = PyTemplate.initFBLCode(
  //     this.id, this.clientId, this.constructor.name, this.commTarget
  //   );
  //   console.debug('initFBL Called', code);
  //   const model = new OutputAreaModel();
  //   const rendermime = new RenderMimeRegistry({ initialFactories });
  //   const outputArea = new OutputArea({ model, rendermime });
  //   outputArea.future = this.sessionContext.session.kernel.requestExecute({ code });
  //   outputArea.node.style.display = 'block';
  //   return outputArea.future.done.then((reply) => {
  //     if (reply && reply.content.status === 'ok') {
  //       outputArea.dispose();
  //       return Promise.resolve(true);
  //     } else {
  //       showDialog({
  //         title: `FBL Initialization Registration Failed`,
  //         body: outputArea,
  //       });
  //       return Promise.resolve(false);
  //     }
  //   }, (failure) => {
  //     outputArea.dispose();
  //     return Promise.resolve(false);
  //   });
  // }

  // /**
  //  * Initialize Client Based on Current Processor Setting
  //  *
  //  * See `this.initClientCode` for detailed description of the code being executed.
  //  *
  //  * @param processorname of the processor setting to use, needs to be
  //  *   an entry in `this.ffboProcessors` that reflects the FBL Schema
  //  */
  // async initClient(processor?: string): Promise<boolean> {
  //   let code = PyTemplate.initClientCode(
  //     processor, this.ffboProcessors, this.id, this.clientId
  //   );
  //   console.debug('initClient Called', code);
  //   const model = new OutputAreaModel();
  //   const rendermime = new RenderMimeRegistry({ initialFactories });
  //   const outputArea = new OutputArea({ model, rendermime });

  //   // immediately resolve to false if no kernel is found
  //   if (!this.sessionContext?.session?.kernel) {
  //     return Promise.resolve(false);
  //   }

  //   outputArea.future = this.sessionContext.session.kernel.requestExecute({ code });
  //   outputArea.node.style.display = 'block';
  //   let reply = await this.sessionContext.session.kernel.requestExecute({ code: code }).done;
  //   if (reply && reply.content.status === 'ok') {
  //     // outputArea.dispose();
  //     return Promise.resolve(true);
  //   } else {
  //     showDialog({
  //       title: `FBLClient Initialization Registration Failed`,
  //       body: outputArea,
  //     });
  //     return Promise.resolve(false);
  //   }
  // }

  /**
   * Create Comm if none exist
   *
   * @return a promise that resolves to whether comm initialization is successful
   */
  async initComm(): Promise<boolean> {
    console.debug('Initializing Comm');

    if (this.comm !== null && this.comm !== undefined) {
      if (!this.comm.isDisposed){
        if (this.comm.targetName === this.commTarget) {
          return Promise.resolve(true);
        }
      }
    }

    if (!this.sessionContext.session?.kernel) {
      return Promise.resolve(false);
    }

    // wait until sessionContext is ready
    await this.sessionContext.ready;
    const kernel = this.sessionContext.session.kernel;

    // Force Comm handling
    // FIXME: From the JupyterLab core developers, having multiple KernelConnections
    //  handling comms could lead to difficult to fix bugs. It has not caused any
    //  noticeable issues yet but will need to double check to be sure and potentially
    //  find an alternative.
    if (!kernel.handleComms){
      kernel.handleComms = true;
    }

    // register comm and callback
    kernel.registerCommTarget(this.commTarget, (comm, commMsg) => {
      if (commMsg.content.target_name !== this.commTarget) {
        return Promise.resolve(void 0);
      }
      this.comm = comm;
      comm.onMsg = (msg: KernelMessage.ICommMsgMsg) => {
        this.onCommMsg(msg);
      };
      comm.onClose = (msg: KernelMessage.ICommCloseMsg) => {
        this.onCommClose(msg);
      };
      return Promise.resolve(void 0);
    });
    return Promise.resolve(void 0);
  }

  // /**
  // * Initialize FBL and Client on associated kernel
  // *
  // * *NOTE*: this is meant as the main entry point for initializing everything related
  // * to a given widget.
  // *
  // * This will call:
  // *   1. `this.setHasClient(false)` if session has no kernel
  // *   2. `this.registerCommTarget` to setup comm target with backend
  // *   3. `this.initFBL` to setup global `fbl` singleton
  // *   4. `initClient`: initialize Client in Kernel
  // *
  // * Returns a promise that resolves to true only when
  // *   1. kernel is connected, the comms is setup and the client is connected
  // *   2. kernel is connected, the comms is setup but initClient is false
  // */
  // async initFBLClient(initClient = true): Promise<boolean> {
  //   if (!this.sessionContext.session?.kernel) {
  //     // if no kernel then no client and promises resolves
  //     // to false indicating failure
  //     return Promise.resolve(false);
  //   }

  //   let commConnected = await this.initComm();
  //   if (!commConnected) {
  //     Promise.resolve(false);
  //   }

  //   // Initial FBL global singleton in the associated kernel
  //   // this will import flybrainlab and add current widget to widget_manager in kernel
  //   // see `initFBL` for more details
  //   let initFBLSuccess = await this.initFBL();
  //   if (!initFBLSuccess){
  //     INotification.error(`
  //       FBL Initialization Failed. This is most likely because the
  //       flybrainlab python package cannot be found.
  //     `);
  //     return Promise.resolve(false);
  //   }

  //   // on startup, initClient is false since there may already be a client in workspace
  //   // that is connected to the current widget, which means we
  //   if (initClient === false) {
  //     // since we don't initialize client, we will resolve to true regardless of
  //     // whether a client actually exists or not
  //     // FIXME: should this actually be `client.isConnected` to let user know if there
  //     // are no active client found?
  //     return Promise.resolve(true);
  //   }

  //   // create client instance with a processor connection.
  //   let initClientSuccess = await this.client.init();
  //   return Promise.resolve(initClientSuccess);
  // }

  /**
   * Populate content of toolbar.
   *
   * Can be overloaded by child.
   */
  populateToolBar(): void {
    this.toolbar.addItem('spacer', Toolbar.createSpacerItem());
    this.toolbar.addItem('Processor Changer', createProcessorButton(this));
    this.toolbar.addItem('Session Dialog', createSessionDialogButton(this));
    this.toolbar.addItem('Send Data to Kernel', new ToolbarButton({
      icon: syncConsoleIcon,
      onClick: this.sendModel.bind(this)
    }));
    this.toolbar.addItem('restart', Toolbar.createRestartButton(this.sessionContext));
    this.toolbar.addItem('stop', Toolbar.createInterruptButton(this.sessionContext));
    this.toolbar.addItem('kernelName', Toolbar.createKernelNameItem(this.sessionContext));
    this.toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(this.sessionContext));
  }

  /**
   * Set processor
   *
   * 1. triggers a processor changed callback if processor has changed
   * 2. set the `dirty` state to be `true`
   *
   * @param newProcessor new Processor to connect to
   * @param startUp optional argument for check if the setProcessor is
   *  called at startup
   */
  setProcessor(newProcessor: string, startUp=false) {
    if (newProcessor === this._processor) {
      return;
    }
    if (newProcessor === FFBOProcessor.NO_PROCESSOR){
      this._processorChanged.emit(newProcessor);
      this._processor = newProcessor;
      this.client.disconnect();
      this.setDirty(true);
      return;
    }
    if (!(newProcessor in this.ffboProcessors)){
      return;
    }

    this._processorChanged.emit(newProcessor);
    this._processor = newProcessor;
    this.setDirty(true);
  }

  /**
   * Returns processor
   * Note: setter/getter for processor need to be redefined in child class
   * See reference: https://github.com/microsoft/TypeScript/issues/338
   */
  get processor(): string {
    return this._processor
  }

  /**
   * A signal that emits the current object when it is getting disposed
   */
  get gettingDisposed(): ISignal<this, object> {
    return this._gettingDisposed;
  }

  /**
   * Return the state of the widget being dirty or not
   */
  get isDirty(): boolean {
    return this._isDirty;
  }

  /**
   * A signal that emits the current dirty state of the widget
   */
  get dirty(): ISignal<this, boolean> {
    return this._dirty;
  }

  /**
   * Set the dirty state of the given widget
   *
   * This will emit the dirty state when:
   * 1. the provided `state` is `true`, regardless of what `_dirty` currently is
   * 2. the provided `state` is `false`, but the `_dirty` value is `true`
   *
   * @param state dirty state, `true` means it's dirty
   */
  setDirty(state: boolean) {
    if (state === true) {
      // if new state is dirty, always emit signal
      this._dirty.emit(true);
    } else {

      if (state !== this._isDirty) {
        // if new state is not dirty but used to be dirty then emit
        this._dirty.emit(false);
      }
    }
    this._isDirty = state;
  }

  /**
   * Return the ffbo processors from schema
   */
  get ffboProcessors(): FFBOProcessor.IProcessors {
    return this._ffboProcessors;
  }


  /**
   * Allow NM Extension to overwrite the processor values
   * @param newProcessors new processor settings to replace current values
   */
  setFFBOProcessors(newProcessors: FFBOProcessor.IProcessors): void {
    this._ffboProcessors = newProcessors;
  }

  /**
  * The Elements associated with the widget.
  */
  private _ffboProcessors: FFBOProcessor.IProcessors;
  protected _connected: Date;
  protected _isDisposed = false;
  protected _modelChanged = new Signal<this, object>(this);
  protected _processorChanged = new Signal<this, string>(this);
  protected _gettingDisposed = new Signal<this, object>(this);
  toolbar: Toolbar<Widget>;
  commTarget: string; // cannot be private because we need it in `Private` namespace to update widget title
  private _isDirty = false;
  protected _dirty = new Signal<this, boolean>(this);
  comm: Kernel.IComm; // the actual comm object
  readonly name: string;
  protected _processor: string;
  clientId: string;
  innerContainer: HTMLDivElement;
  sessionContext: ISessionContext;
  model: FBLWidgetModel;
  icon: LabIcon;
  client: FBLClient;
};


/**
 * A namespace for FBL Widget statics.
 */
export namespace FBLWidget {
  /**
   * The initialization options for a FBL Widget
   */
  export interface IOptions extends SessionContext.IOptions {
    /**
     * The service manager used by the panel.
     */
    app: JupyterFrontEnd;

    /**
     * Processor
     */
    processor?: string;

    /**
     * The path of an existing widget.
     */
    path?: string;

    /**
     * The base path for a new widget.
     */
    basePath?: string;

    /**
     * The name of the widget.
     */
    name?: string;

    /**
     * An existing session context to use (with existing kernel).
     */
    sessionContext?: ISessionContext;

    /**
     * Function to call when setting busy
     */
    setBusy?: () => IDisposable;


    /**
     * Existing model to be loaded into widget
     */
    model?: IFBLWidgetModel;


    /**
     * Icon associated with this widget, default to fblIcon
     */
    icon?: LabIcon;

    /**
     * Optionally Specify Widget Id
     */
    id?: string


    /**
     * Client Id
    */
    clientId?: string

    /**
     * Info panel widget
     */
    info?: InfoWidget;

    /**
     * All available processor settings
     */
    ffboProcessors?: FFBOProcessor.IProcessors;

    /**
     * Tracker instance to see how many widgets of the same kind already exist in the
     * current workspace
     */
    _count?: number
  }

}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The counter for new consoles.
   */
  export let count = 1;

  /**
   * Update the title of a console panel.
   */
  export function updateTitle(
    widget: FBLWidget,
    connected: Date | null,
    // executed: Date | null
  ) {
    const sessionContext = widget.sessionContext.session;
    if (sessionContext) {
      let caption =
        `Session Name: ${sessionContext.name}\n` +
        `Directory: ${PathExt.dirname(sessionContext.path)}\n` +
        `Kernel: ${widget.sessionContext.kernelDisplayName}\n` +
        `Comm: ${widget.commTarget})`;
      if (connected) {
        caption += `\nConnected: ${Time.format(connected.toISOString())}`;
      }
      widget.title.label = `${widget.name}::${sessionContext.name}`;
      widget.title.icon = widget.icon;
      widget.title.caption = caption;
    } else {
      widget.title.label = `${widget.name}::No Kernel`;
      widget.title.icon = widget.icon;
      widget.title.caption = 'No Kernel';
    }
  }
}