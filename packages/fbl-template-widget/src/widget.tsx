import * as React from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { Kernel, Session, KernelMessage } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable'
import { Message } from '@lumino/messaging';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';
import {
  ISessionContext, SessionContext, 
  sessionContextDialogs, showDialog
} from '@jupyterlab/apputils';
import { Signal, ISignal } from '@lumino/signaling';
import { Toolbar } from '@jupyterlab/apputils';
import { fblIcon } from './icons';
import { LabIcon } from '@jupyterlab/ui-components';
import '../style/index.css';
import { FBLWidgetModel, IFBLWidgetModel } from './model';
import { 
  createSpeciesButton, createSessionDialogButton
} from './session_dialog';

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
      species,
      sessionContext,
      icon,
    } = options;

    
    // keep track of number of instances
    const count = Private.count++;

    // specify name
    this.name = name || `Template-${count}`;

    // specify id
    let id  = options.id ?? `${this.name}-${UUID.uuid4()}`;
    // make sure there is no conflic with existing widgets
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

    // client id for backend
    this.client_id = `client-${this.id}`;

    // specify path
    const path = options.path ?? `${basePath || ''}/${this.id}`;
    this.icon = icon ?? fblIcon;

    // initialize model
    this.initModel(model);

    // specify comm target (unique to this widget)
    this._commTarget = `${TEMPLATE_COMM_TARGET}:${this.id}`;

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
    this.populateToolBar();
  
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
      await this.initFBLClient();
      // register Comm only when kernel is changed
      this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
      this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
      this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
      // set species after session is avaible, in case the setter needs the session
      this.species = species ?? 'No Species';
      Private.updateTitle(this, this._connected);
    });

    Private.updateTitle(this, this._connected);
  }

  /**
   * Wrapper around executeRequest that is specific to current client
   * By default the result will be sent back over Comm.
   * @return a promise that resolves to the reply message when done 
   */
  executeNAQuery(code: string): Kernel.IShellFuture<KernelMessage.IExecuteRequestMsg, KernelMessage.IExecuteReplyMsg> {
    let code_to_send = `
    fbl.client_manager.clients[fbl.widget_manager.widgets['${this.id}'].client_id]['client'].executeNAquery(query='${code}')
    `
    return this.sessionContext.session.kernel.requestExecute({code: code_to_send});
  }

  /**
   * Wrapper around executeRequest that is specific to current client
   * By default the result will be sent back over Comm.
   * @return a promise that resolves to the reply message when done 
   */
  executeNLPQuery(code: string): Kernel.IShellFuture<KernelMessage.IExecuteRequestMsg, KernelMessage.IExecuteReplyMsg> {
    let code_to_send = `
    fbl.client_manager.clients[fbl.widget_manager.widgets['${this.id}'].client_id]['client'].executeNLPquery('${code}')
    `
    return this.sessionContext.session.kernel.requestExecute({code: code_to_send});
  }


  // /**
  //  * Request Information about the connected client from kernel
  //  */
  // requestClientInfo() {
  //   let code_to_send = `
  //   fbl.widget_manager.widgets['${this.id}'].client
  //   `
  //   return this.sessionContext.session.kernel.requestExecute({code: code_to_send});
  // }

  /**
   * After 
   * @param msg 
   */
  onAfterShow(msg: Message): void {
    super.onAfterShow(msg);
    this.renderModel();
  }

  /**
   * Should handle render logic of model
   * @param change - changes to a model for incremental rendering
   */
  renderModel(change?: any) {
    // to be implemented by child widgets
    return;
  }

  /**
   * Send model to the front-end
   * @param change 
   */
  sendModel(change?: Partial<IFBLWidgetModel>) {
    this.comm.send({
      data: change?.data ?? this.model.data,
      metadata: change?.metadata ?? this.model.metadata,
      states: change?.states ?? this.model.states,
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
      /** Popup window shown as dialog */
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
   * To be overloaded by child
   * @param args 
   */
  onDataChanged(sender: IFBLWidgetModel, args: any){
    // no-op
    // overload by child
    return;
  }

  /**
   * Handle model.metadata Change in the widget side. should affect rendering
   * To be overloaded by child
   * @param args 
   */
  onMetadataChanged(sender: IFBLWidgetModel, args: any){
    // no-op
    return;
  }

  /**
   * Handle model.states change in the widget side. should affect rendering
   * To be overloaded by child
   * @param args 
   */
  onStatesChanged(sender: IFBLWidgetModel, args: any){
    // no-op
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
    const code_to_send =`
    try:
        fbl.widget_manager.widgets['${this.id}'].isDisposed = True
        fbl.widget_manager.widgets['${this.id}'].commOpen = False
    except:
        pass
    `;
    if (this.sessionContext?.session?.kernel){
      this.sessionContext?.session?.kernel.requestExecute({code: code_to_send}).done.then(()=>{
        this.comm?.dispose();
      });
    } else {
      this.comm?.dispose();
    }
    this.model?.dispose();
    this.sessionContext?.dispose();
    Signal.disconnectAll(this._modelChanged);
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
    const newKernel: Kernel.IKernelConnection | null = args.newValue;
    if (newKernel === null){
      this.comm?.dispose();
      return;
    }
    if (this.sessionContext.session) {
      await this.sessionContext.ready;
      this.initFBLClient();
      this.onPathChanged();

      this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
      this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
      this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
    }
  }

  /**
   * Kernel Status Changed. Register Comm on restart
   * @param sess 
   * @param status 
   */
  onKernelStatusChanged(sess: ISessionContext, status: Kernel.Status) {
    if (status === 'restarting') {
      this.sessionContext.ready.then(() => {
        this.initFBLClient();
        // re-register callbacks
        this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
        this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
        this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
      });
    }
  }

  /**
  * A method that handles changing session Context
  */
  onPathChanged(msg?: any): void {
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
   * Return A signal that indicates species change
   */
  get speciesChanged(): ISignal<this, string> {
    return this._speciesChanged;
  }

  /** Code for initializing fbl in the connected kernel
   * @return code to be executed
   */
  initFBLCode(): string {
    return `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    fbl.widget_manager.add_widget('${this.id}', '${this.client_id}', '${this.constructor.name}', '${this._commTarget}')
    `;
  }

  /**
   * Code for initializing a client connected to the current widget
   */
  initClientCode(): string {
    return `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    if '${this.client_id}' not in fbl.client_manager.clients:
        _comm = fbl.MetaComm('${this.client_id}', fbl)
        _client = fbl.Client(FFBOLabcomm = _comm)
        fbl.client_manager.add_client('${this.client_id}', _client, client_widgets=['${this.id}'])
    `;
  }

  initAnyClientCode(clientargs?: any): string {
    return `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    if '${this.client_id}' not in fbl.client_manager.clients or True: # Fix the situations in which a client is to be generated
        _comm = fbl.MetaComm('${this.client_id}', fbl)
        _client = fbl.Client(FFBOLabcomm = _comm ${clientargs})
        fbl.client_manager.add_client('${this.client_id}', _client, client_widgets=['${this.id}'])
    `;
  }

  /**
  * Initialize FBLClient on associated kernel
  */
  async initFBLClient(): Promise<void> {
    if (!this.sessionContext.session?.kernel){
      return Promise.resolve(void 0); // no kernel
    }
    await this.sessionContext.ready;
    const kernel = this.sessionContext.session.kernel;

    // Force Comm handling
    if (!kernel.handleComms){
      kernel.handleComms = true;
    }

    // // Query comm by target_name
    // const msg = await kernel.requestCommInfo({ target_name: this._commTarget });
    // const existingComms = (msg.content as any).comms ?? {};
    // const commExists = Object.keys(existingComms).length > 0;
    // // kernel.registerCommTarget
    // console.log('Existing Comms', existingComms, commExists);

    // REMOVE: safeguard to ensure if this comm already exists
    // if (!Object.keys(existingComms).length){
    kernel.registerCommTarget(this._commTarget, (comm, commMsg) => {
      if (commMsg.content.target_name !== this._commTarget) {
        return;
      }
      this.comm = comm;
      comm.onMsg = (msg: KernelMessage.ICommMsgMsg) => {
        this.onCommMsg(msg);
      };
      comm.onClose = (msg: KernelMessage.ICommCloseMsg) => {
        this.onCommClose(msg);
      };
    });
    // } else {
      // if commtarget already exists, set this.comm to that comm
      // TODO
    // }

    const code = this.initClientCode() + this.initFBLCode();
    kernel.requestExecute({ code: code }).done.then((reply) => {
      if (reply && reply.content.status === 'error'){
        const traceback = ANSI.stripReplyError(reply.content.traceback);
        const body = (
          <div>
            {traceback && (
              <details className="jp-mod-wide">
                <pre>{traceback}</pre>
              </details>
            )}
          </div>
        );
        showDialog({
          title: `FBLClient Initialization Registration Failed (${this._commTarget})`,
          body: body
        }).then(()=>{
          return Promise.resolve('Execution Failed');
        })
      } else if (reply && reply.content.status === 'ok'){
        return Promise.resolve(void 0);
      }
    }, (failure) => {
      return Promise.reject(failure);
    });
  }

  /**
   * Populate content of toolbar. Can be overloaded by child.
   * @param toolbar 
   */
  populateToolBar(): void {
    
    this.toolbar.addItem('spacer', Toolbar.createSpacerItem());
    this.toolbar.addItem('Species Changer', createSpeciesButton(this));
    this.toolbar.addItem('Session Dialog', createSessionDialogButton(this));
    this.toolbar.addItem('restart', Toolbar.createRestartButton(this.sessionContext));
    this.toolbar.addItem('kernelName', Toolbar.createKernelNameItem(this.sessionContext));
    this.toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(this.sessionContext));
  }
  
  /**
   * Set species
   * @param newSpecies new species to be added
   * triggers a species changed callback if species has changed
   */
  set species(newSpecies: string) {
    if (newSpecies === this._species) {
      return;
    }
    this._speciesChanged.emit(newSpecies);
    this._species = newSpecies;
  }

  /** 
   * Returns species
   * Note: setter/getter for species need to be redefined in child class
   * See reference: https://github.com/microsoft/TypeScript/issues/338
  */
  get species(): string {
    return this._species
  }


  /**
  * The Elements associated with the widget.
  */
  protected _connected: Date;
  protected _isDisposed = false;
  protected _modelChanged = new Signal<this, object>(this);
  protected _speciesChanged = new Signal<this, string>(this);
  toolbar: Toolbar<Widget>;
  _commTarget: string; // cannot be private because we need it in `Private` namespace to update widget title
  comm: Kernel.IComm; // the actual comm object
  readonly name: string;
  protected _species: any;
  protected client_id: string;
  innerContainer: HTMLDivElement;
  sessionContext: ISessionContext;
  model: FBLWidgetModel;
  icon: LabIcon;
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
     * Species
     */
    species?: string;

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
        `Comm: ${widget._commTarget})`;
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

namespace ANSI {
  export function stripReplyError(msg: Array<string>): string {
    const characters = /\[-|\[[0-1];[0-9]+m|\[[0]m/g;
    return msg.join('\n').replace(characters, '');
  }
}