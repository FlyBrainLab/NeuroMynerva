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
import { fblIcon } from '../../icons';
import { LabIcon } from '@jupyterlab/ui-components';
import { FBLWidgetModel, IFBLWidgetModel } from './model';
import { 
  createServerButton, 
  createSessionDialogButton
} from './session_dialog';
import { 
  FBL
} from '../../extension';

import '../../../style/widgets/template-widget/template.css';
import { InfoWidget } from '../info-widget';

export interface IFBLWidget extends Widget {

  /**
   * All available server settings
   */
  serverSettings: FBL.FBLServerSettings;

  /**
   * The sessionContext keeps track of the current running session
   * associated with the widget.
   */
  sessionContext: ISessionContext;

  /**
   * A string indicating the connected server 
   * Has special setter that the neu3d visualization setting and rendered meshes
   */
  server: string;

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
   * Signal that emits new server name when changed
   */
  serverChanged: ISignal<IFBLWidget, string>;

  /**
   * Signal that emits model change
   */
  modelChanged: ISignal<IFBLWidget, object>;

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
      server,
      sessionContext,
      icon,
      clientId,
      serverSettings,
      _count
    } = options;

    this.serverSettings = serverSettings ?? {};

    // keep track of number of instances
    Private.count += _count ?? 0;
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
    this.clientId = clientId || `client-${this.id}`;

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
    toolbar.node.classList.add('fbl-widget-toolbar');
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
      // set server after session is avaible, in case the setter needs the session
      this.server = server ?? 'No Server';
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
      del fbl.widget_manager.widgets['${this.id}']
      if len(fbl.client_manager.clients['${this.clientId}']>1):
          fbl.client_manager.clients['${this.clientId}']['widgets'].remove('${this.id}')
      else:
          del fbl.client_manager.clients['${this.clientId}']
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
   * Return A signal that indicates server change
   */
  get serverChanged(): ISignal<this, string> {
    return this._serverChanged;
  }

  /** Code for initializing fbl in the connected kernel
   * @return code to be executed
   */
  initFBLCode(): string {
    return `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    fbl.widget_manager.add_widget('${this.id}', '${this.clientId}', '${this.constructor.name}', '${this._commTarget}')
    `;
  }

  /**
  * Code for initializing a client connected to the current widget
  * @param clientargs additional argument for client
  */
  initClientCode(server?: string): string {
    let currentServer = this.serverSettings[this.server];
    if (server !== this.server && server in this.serverSettings){
      currentServer = this.serverSettings[server];
    }

    let args = '';
    if (currentServer?.USER?.user) {
      args += `user='${currentServer.USER.user}',`;
    }
    if (currentServer?.USER?.secret) {
      args += `secret='${currentServer.USER.secret}',`;
    }

    // DEBUG: ssl=True won't work for now, force to be False (default)
    // if (currentServer?.AUTH?.ssl === true) {
    //   args += 'ssl=True,';
    // }

    if (currentServer?.AUTH?.ca_cert_file) {
      args += `ca_cert_file="${currentServer.AUTH.ca_cert_file}",`;
    }
    if (currentServer?.AUTH?.intermediate_cer_file) {
      args += `intermediate_cer_file="${currentServer.AUTH.intermediate_cer_file}",`;
    }
    if (currentServer?.DEBUG?.debug === false) {
      args += 'debug=False,';
    }
    if (currentServer?.AUTH?.authentication === false) {
      args += 'authentication=False';
    }

    let websocket = currentServer?.AUTH?.ssl === true ? 'wss' : 'ws';
    if (currentServer?.SERVER?.ip) {
      args += `url=u"${websocket}://${currentServer.SERVER.ip}/ws",`;
    }

    if (currentServer?.SERVER?.realm) {
      args += `realm=u"${currentServer.SERVER.realm}",`;
    }

    let code = `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    # if '${this.clientId}' not in fbl.client_manager.clients:
    _comm = fbl.MetaComm('${this.clientId}', fbl)
    _client = fbl.Client(FFBOLabcomm=_comm, ${args})
    fbl.client_manager.add_client('${this.clientId}', _client, client_widgets=['${this.id}'])
    `
    return code;
    // console.warn('[FBL-Widgets] initClientCode will be replaced by initClient after 0.2.0 beta release');
    // return `
    // if 'fbl' not in globals():
    //     import flybrainlab as fbl
    //     fbl.init()
    // # if '${this.clientId}' not in fbl.client_manager.clients:
    // _comm = fbl.MetaComm('${this.clientId}', fbl)
    // _client = fbl.Client(FFBOLabcomm = _comm ${clientargs || ''})
    // fbl.client_manager.add_client('${this.clientId}', _client, client_widgets=['${this.id}'])
    // `;
  }

  /**
   * Initialize Client Based on Current Server Setting
   * @param server 
   */
  initClient(server?: string): void{
    let code = this.initClientCode(server);
    try {
      this.sessionContext.session.kernel.requestExecute({ code: code });
    } catch(reason) {
      console.warn(`[FBL-Widget] initClient failed, ${reason}`);
    }
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
    this.toolbar.addItem('Server Changer', createServerButton(this));
    this.toolbar.addItem('Session Dialog', createSessionDialogButton(this));
    this.toolbar.addItem('restart', Toolbar.createRestartButton(this.sessionContext));
    this.toolbar.addItem('stop', Toolbar.createInterruptButton(this.sessionContext));
    this.toolbar.addItem('kernelName', Toolbar.createKernelNameItem(this.sessionContext));
    this.toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(this.sessionContext));
  }
  
  /**
   * Set server
   * @param newServer new Server to connect to
   * triggers a server changed callback if server has changed
   */
  set server(newServer: string) {
    if (newServer === this._server) {
      return;
    }
    if (newServer === 'No Server'){
      this._serverChanged.emit(newServer);
      this._server = newServer;
      return;
    }
    if (!(newServer in this.serverSettings)){
      return;
    }

    this._serverChanged.emit(newServer);
    this._server = newServer;
  }

  /** 
   * Returns server
   * Note: setter/getter for server need to be redefined in child class
   * See reference: https://github.com/microsoft/TypeScript/issues/338
  */
  get server(): string {
    return this._server
  }

  /**
  * The Elements associated with the widget.
  */
  serverSettings: FBL.FBLServerSettings = {};
  protected _connected: Date;
  protected _isDisposed = false;
  protected _modelChanged = new Signal<this, object>(this);
  protected _serverChanged = new Signal<this, string>(this);
  toolbar: Toolbar<Widget>;
  _commTarget: string; // cannot be private because we need it in `Private` namespace to update widget title
  comm: Kernel.IComm; // the actual comm object
  readonly name: string;
  protected _server: any;
  clientId: string;
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
     * Server
     */
    server?: string;

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
    info?: any;

    /**
     * All available server settings
     */
    serverSettings?: FBL.FBLServerSettings;

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