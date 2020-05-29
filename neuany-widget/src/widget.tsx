import * as React from 'react';
import { JupyterFrontEnd } from '@jupyterlab/application';
import { ServiceManager, Kernel, Session, KernelMessage } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';
import {
  ISessionContext, SessionContext, 
  sessionContextDialogs, showDialog, Dialog,
  UseSignal, ReactWidget
} from '@jupyterlab/apputils';
import { Signal, ISignal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import { Toolbar, ToolbarButton, ToolbarButtonComponent } from '@jupyterlab/apputils';
import { uploadIcon, fblIcon } from './icons';
import { LabIcon } from '@jupyterlab/ui-components';
import '../style/index.css';
import { INeuAnyModel, NeuAnyModel } from './model';

const VERBOSE = true;
const NEUANY_CLASS_JLab = "jp-FBL-NeuAny";
const TOOLBAR_SPECIES_CLASS = "jp-NeuAny-Species";
// This class is used for keeping track of FBL
// widgets that are associated with a given client session
// const Neu3D_CLASS_Python = "Neu3D";
const TEMPLATE_COMM_TARGET = "FBL:Dump-data";

declare global {
  interface Window {
    widget: any;
  }
}

export
  interface IFBLWidget extends Widget{
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
  model: INeuAnyModel;


  speciesChanged: ISignal<IFBLWidget, string>;
  modelChanged: ISignal<IFBLWidget, object>;
}

/**
* An Neu3D Widget
*/
export class NeuAnyWidget extends Widget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super();
    let {
      path,
      basePath,
      name,
      app,
      sessionContext,
      model,
      species,
    } = options;

    let _startup_log = `
    [Startup] Instantiating with options<br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- path: ${path} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- basePath: ${basePath} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- name: ${name} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- app: ${app} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- sessionContext: ${sessionContext} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- model: ${model} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- species: ${species}
    `;
    // create model
    this.model = new NeuAnyModel(model);
    _startup_log += `<br>[Startup] Model Created with input: ${model}`;
    if (model) {
      _startup_log += `<br>&nbsp;&nbsp;&nbsp;&nbsp; Input Model Content: ${model.msg}`;
    }
    let manager: ServiceManager = app.serviceManager;
    const count = Private.count++;
    this.id = `NeuAny-${count}-${UUID.uuid4()}`;
    if (!path) {
      path = `${basePath || ''}/${this.id}`;
    }
    this.name = name || `NeuAny ${count}`;
    this._commTarget = `${TEMPLATE_COMM_TARGET}-${count}`;
    _startup_log += `
    <br>[Startup] Creating SessionContext with options. <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- path: ${path} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- name: ${name}
    `;
    sessionContext = this.sessionContext =
      sessionContext ||
      new SessionContext({
        sessionManager: manager.sessions,
        specsManager: manager.kernelspecs,
        path,
        name: this.name,
        type: 'console',
        kernelPreference: {
          shouldStart: true,
          canStart: true,
          name: "python"
        },
        setBusy: options.setBusy
      });

    _startup_log += `
    <br>[Startup] Output SessionContext with options. <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- path: ${sessionContext.path} <br>
    &nbsp;&nbsp;&nbsp;&nbsp; |-- name: ${sessionContext.name}
    `;
    this.addClass(NEUANY_CLASS_JLab);
    // const layout = (this.layout = new PanelLayout());
    this.toolbar = Private.createToolbar(this);
    // layout.addWidget(this.toolbar);
    Private.populateToolBar(this, this.toolbar);
    _startup_log += `<br>[Startup] Toolbar Populated`;
    // create container that could hold custom JS 
    this.innerContainer = document.createElement('div');
    this.innerContainer.style.height = '100%';
    this.innerContainer.style.width = '100%';
    this.innerContainer.style.overflow = 'scroll';

    this.node.appendChild(this.innerContainer);
    Private.logToWidget(this, _startup_log);

    // create session and `initialize`
    Private.logToWidget(this, '<br>[Startup] Initializing Session with callback.');
    sessionContext.initialize().then(async value => {
      Private.logToWidget(this, '[Startup - callback] Session Initialized');
      // Setup Main Panel
      if (value) {
        await sessionContextDialogs.selectKernel(sessionContext);
      }
      // Force it to handle comms
      sessionContext.session.kernel.handleComms = true;
      Private.logToWidget(this, '[Startup - callback] Forcing kernel to handleComm');
      this._connected = new Date();  
      await this._registerComm();
      Private.logToWidget(this, '[Startup - callback] Comm Registered');
      Private.updateTitle(this, this._connected);
      // register Comm only when kernel is changed
      sessionContext.statusChanged.connect(this._onKernelStatusChanged, this);
      sessionContext.kernelChanged.connect(this._onKernelChanged, this);
      sessionContext.propertyChanged.connect(this._onPathChanged, this);
      Private.logToWidget(this, '[Startup - callback] session signals connected.');
      // set species after session is avaible, in case the setter needs the session
      this.species = species ?? 'No Species';
    });
    Private.logToWidget(this, '[Startup] Exited Constructor.');
  }

  onAfterShow(msg: Message){
    super.onAfterShow(msg);
    Private.logToWidget(this, '[Widget Event] OnAfterShow Called.');
  }
  onAfterAttach(msg: Message){
    super.onAfterAttach(msg);
    Private.logToWidget(this, '[Widget Event] OnAfterAttach Called.');
  }
  onBeforeAttach(msg: Message){
    super.onBeforeDetach(msg);
    Private.logToWidget(this, '\n[Widget Event] OnBeforeAttach Called.');
  }
  onActivateRequest(msg: Message){
    super.onActivateRequest(msg);
    Private.logToWidget(this, '[Widget Event] onActivateRequest Called.');
  }

  /**
  * Dispose the current session 
  * 
  * 1. all child widgets
  * 2. session shutdown+dispose
  * 3. mode dispose
  */
  dispose(): void {
    if (this._isDisposed == true) {
      return;
    }

    super.dispose();
    this.model.dispose();
    this._isDisposed = true;
    Signal.disconnectAll(this._modelChanged);
  }

  /**
   * Check if Kernel is FBL compatible
   * 1. Check if kernel handles comm
   * 2. Checks if contains Comm matches the comms target template
   * 3. Return the first Comm targetName if found
   */
  async isFBLKernel(kernel: Kernel.IKernelConnection): Promise<string|null> | null {
    Private.logToWidget(this, 
      `[FBL Event] isFBLKernel Called <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- kernel name: ${kernel?.model.name} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- kernel id: ${kernel?.model.id} `);
    let targetCandidates = new Array<any>();
    // interrogate kernel as Kernel class
    let msg = await kernel.requestCommInfo({});
    if (!kernel.handleComms){ 
      // force kernel to handleComms
      kernel.handleComms = true;
    }
    if (msg.content && msg.content?.status == 'ok') {
      for (let c of Object.values(msg.content.comms)) {
        if (c.target_name.includes(TEMPLATE_COMM_TARGET)) {
          targetCandidates.push(c.target_name);
        };
      }
    } else{
      return Promise.resolve(null);
    }
    
    if (targetCandidates.length == 0) {
      Private.logToWidget(this, 
        `[FBL Event] isFBLKernel Comm Target not found`);
      return Promise.resolve(null);
    }

    // take only unique target values
    targetCandidates = [...new Set(targetCandidates)];
    if (targetCandidates.length > 1){
      Private.logToWidget(this,
        `[NM] Multiple FBL Comms found in Kernel ${kernel}, using the first one!
         found ${targetCandidates.length}: ${targetCandidates}`
         );
    }
    Private.logToWidget(this, 
      `[FBL Event] isFBLKernel Comm Target found: ${targetCandidates.toString()}`);
    return Promise.resolve(targetCandidates[0]);
  }

  /**
  * A method that handles changing sessionContext
  */
 private async _onKernelChanged(
    context: ISessionContext,
    args: Session.ISessionConnection.IKernelChangedArgs
  ) {
    let oldKernel: Kernel.IKernelConnection | null = args.oldValue;
    let newKernel: Kernel.IKernelConnection | null = args.newValue;
    Private.logToWidget(this, 
      `[Session Event] Kernel Changed <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- old name: ${oldKernel?.model.name} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- old id: ${oldKernel?.model.id} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- new name: ${newKernel?.model.name} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- new id: ${newKernel?.model.id}`);
    
    if (!newKernel || newKernel?.isDisposed){
      return;
    }

    let newCommTarget: string = null;
    let oldCommTarget: string = null;

    // check if FBL Comm exists in the new kernel
    if (newKernel && !newKernel.isDisposed){
      newCommTarget = await this.isFBLKernel(newKernel);
    }
    if (oldKernel && !oldKernel.isDisposed){
      oldCommTarget = await this.isFBLKernel(oldKernel);
    }

    let dialogButtons = [Dialog.okButton()];
    // change _commTarget for this widget if compatible comm found in new kernel
    if (newCommTarget) {
      this._commTarget = newCommTarget;
    } else { // if no _commTarget is found in the new kernel
      let msg = `No FBL compatible Comm target found in new kernel ${newKernel.name}.<br>
                We will need to inject some code into the new kernel to create Comm target ${this._commTarget}`;
      if (oldKernel !== null) { // if switching over from another kernel
        if (oldCommTarget && (!oldKernel.isDisposed)) { // if the 
          msg += `Fortunately, the old Kernel ${oldKernel.name} has the right Comm ${oldCommTarget}.<br>
                You can opt to stay in the older kernel if you want`;
          dialogButtons.push(
            Dialog.cancelButton({
              label: 'Switch Back',
            })
          )
        }
        // We inform the user that code will need to be injected 
        // into the new kernel to make it FBL compatible. 
        // If the old kernel is still running as has the appropriate comm,
        // we allow the user to revert the kernel change. 
        // Else we force the user to accept the code injection.
        await showDialog({
          title: 'Uncompatible new kernel detected',
          body: msg,
          buttons: dialogButtons,
        }).then(result => {
          if (result.button.accept){
            this._registerComm();
            this._onPathChanged();
          }
        });
      }
    }

    if (this.sessionContext.session) {
      this._registerComm();
      this._onPathChanged();
    }
  }

  private _onKernelStatusChanged(sess: ISessionContext, status: Kernel.Status) {
    Private.logToWidget(this, `[Session Event] Kernel Status Changed. ${status}`);
    if (status === "restarting") {
      this.sessionContext.ready.then(() => {
        this._registerComm();
      });
    }
  }

  /**
  * A method that handles changing session Context
  */
  private _onPathChanged(msg?: any): void {
    Private.logToWidget(this, `[Session Event] Path Changed. ${msg}`);
    if (this.sessionContext.session) {
      Private.updateTitle(this, this._connected);
    }
  }

  get modelChanged(): ISignal<this, object> {
    return this._modelChanged;
  }
 
  get speciesChanged(): ISignal<this, string> {
    return this._speciesChanged;
  }

  private commMessageHandler(msg: KernelMessage.ICommMsgMsg) {
    Private.logToWidget(this,
      `[Comm Message] Comm_id: ${msg.content.comm_id} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- message: ${msg.content.data.toString()}
      `);
  }

  /**
  * Register a Comm target on both Client and Server sides
  */
  private async _registerComm(): Promise<void> {
    await this.sessionContext.ready;
    let kernel = this.sessionContext.session.kernel;
    Private.logToWidget(this, `[Comm Event] Registering Comm with target: ${this._commTarget}`);
    if (kernel?.handleComms) {
      // safeguard to ensure if this comm already exists
      if (!kernel.hasComm(this._commTarget)) {
        kernel.registerCommTarget(this._commTarget, (comm, commMsg) => {
          // this._comm = comm;
          Private.logToWidget(this, `[Comm Event] Comm registered, target: ${this._commTarget}`);
          if (commMsg.content.target_name !== this._commTarget) {
            return;
          }
          comm.onMsg = (msg: KernelMessage.ICommMsgMsg) => {
            Private.logToWidget(this, `[Comm Event] Comm message received, target: ${this._commTarget}`);
            Private.logToWidget(this, `&nbsp;&nbsp;&nbsp;&nbsp |-- Message received: ${msg.content.data}`);
            this.commMessageHandler(msg);
          };
          comm.onClose = (msg: KernelMessage.ICommCloseMsg) => {
            Private.logToWidget(this, `[Comm Event] Comm closed, target: ${this._commTarget}`);
          };
        });
      }

      // TODO Python Safeguard: dup comm
      let code = `
      from ipykernel.comm import Comm
      from collections import OrderedDict
      if 'comms' not in globals():
        comms = OrderedDict()
      if '${this.id}' not in comms:
        comm = Comm(target_name="${this._commTarget}")
        comms['${this.id}'] = comm
      if not any([comm.target_name != "${this._commTarget}" for widget_id, comm in comms.items()]):
        comm = Comm(target_name="${this._commTarget}")
        comms['${this.id}'] = comm

      comms['${this.id}'].send(data="comm sent message")
      # comm.close(data="closing comm")
      `;

      // let code = `
      // import flybrainlab as fbl
      // from ipykernel.comm import Comm
      // from collections import OrderedDict

      // if '_FFBOLabcomm' not in globals():
      //     _FFBOLabcomm = Comm(target_name='${this._commTarget}')
      // if _FFBOLabcomm.target_name != '${this._commTarget}':
      //     _FFBOLabcomm = Comm(target_name='${this._commTarget}')
      // _FFBOLabcomm.send(data="FFBOLab comm established")
      // _FFBOLabcomm.send(data="Generating FFBOLab Client...")
      // if '_FBLAdult' not in globals():
      //     _FBLAdult = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)

      // nm = []
      // nm.append(_FBLAdult)
      // _FBLLarva = fbl.Client(FFBOLabcomm = _FFBOLabcomm, legacy = True, url = u'wss://neuronlp.fruitflybrain.org:9020/ws')
      // nm.append(_FBLLarva)
      // nm_client = 0

      // if '_FBLWidgets' not in globals():
      //     _FBLWidgets = OrderedDict()
      // if '${Neu3D_CLASS_Python}' not in _FBLWidgets:
      //     _FBLWidgets['${Neu3D_CLASS_Python}'] = OrderedDict()
      // _FBLWidgets['${Neu3D_CLASS_Python}']['${this.id}'] = {'id': '${this.id}', 'comm':_FFBOLabcomm}
      // `;

      kernel.requestExecute({ code: code }).done.then((reply) => {
        if (reply && reply.content.status === "error"){
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
            title: `Comm Registration Failed (${this._commTarget})`,
            body: body
          }).then(()=>{
            return Promise.resolve('Execution Failed');
          })
        } else if (reply && reply.content.status === 'ok'){
          return Promise.resolve(void 0);
        }
        return Promise.reject(`Reply Message not understood ${reply}`);
      }, (failure) => {
        return Promise.reject(failure);
      });
    }
    return Promise.resolve(void 0);
  }

  /**
   * Propagate resize event to neu3d
   * @param msg 
   */
  onResize(msg: any) {
    Private.logToWidget(this, `[Widget Event] onResize Called.`);
    super.onResize(msg);
  }
  
  /**
   * Set species
   * @param new_species new species to be added
   *    - If sepcies is `adult` or `larva`, this will display mesh and change metadata settings
   */
  set species(new_species: string) {
    Private.logToWidget(this, `[FBL Event] species setter called: ${new_species}.`);
    if (new_species === this._species) {
      return;
    }
    this._species = new_species;
    this._speciesChanged.emit(this._species);
  }

  get species(): string {
    return this._species
  }


  /**
  * The Elements associated with the widget.
  */
  private _connected: Date;
  private _isDisposed = false;
  private _modelChanged = new Signal<this, object>(this);
  private _speciesChanged = new Signal<this, string>(this);
  toolbar: Toolbar<Widget>;
  _commTarget: string; // cannot be private because we need it in `Private` namespace to update widget title
  readonly name: string;
  // private _comm: Kernel.IComm;
  private _species: any;
  innerContainer: HTMLDivElement;
  sessionContext: ISessionContext;
  model: NeuAnyModel;
};


/**
 * A namespace for FBL Widget statics.
 */
export namespace FBLWidget {
  /**
   * The initialization options for a FBL Widget
   */
  export interface IOptions {
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
    model?: INeuAnyModel;
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
    widget: NeuAnyWidget,
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
      widget.title.icon = fblIcon;
      widget.title.caption = caption;
    } else {
      widget.title.label = widget.name;
      widget.title.icon = fblIcon;
      widget.title.caption = `No Kernel`;
    }
  }

  function createButton(
    icon: LabIcon.IMaybeResolvable,
    tooltip: string,
    className: string,
    func: () => void
  ): ToolbarButton {
    let btn = new ToolbarButton({
      icon: icon,
      iconclassName: className,
      onClick: func,
      tooltip: tooltip
    } as any);
    return btn;
  }

  export function populateToolBar(
    widget: NeuAnyWidget,
    toolbar: Toolbar
  ): void {
    toolbar.addItem(
      'upload',
      createButton(uploadIcon, "Upload SWC File", 'jp-Neu3D-Btn jp-SearBar-upload', 
        () => { Private.logToWidget(widget, '[Toolbar Event] Upload Button Clicked'); }));
    toolbar.addItem(
      'Species Changer',
      createSpeciesButton(widget));
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('restart', Toolbar.createRestartButton(widget.sessionContext));
    toolbar.addItem('kernelName', Toolbar.createKernelNameItem(widget.sessionContext));
    toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(widget.sessionContext));
  }

  export function createToolbar(
    widget: NeuAnyWidget
  ): Toolbar<Widget> {
    let toolbar = new Toolbar();
    toolbar.node.style.height = 'var(--jp-private-toolbar-height)';
    populateToolBar(widget, toolbar);
    return toolbar;
  }

  /**
   * Helper to log information into the _innerContainer of NeuAny Widget
   * only helpful for sandboxing
   * @param widget 
   * @param msg 
   */
  export function logToWidget(
    widget: NeuAnyWidget,
    msg: string
  ): void {
    widget.innerContainer.innerHTML += `<br>${msg}`;
    if (VERBOSE) { console.log(msg); }
  }

  /**
   * A widget that provides a kernel selection.
   */
  export class SpeciesSelector extends Widget {
    /**
     * Create a new kernel selector widget.
     */
    constructor(widget: IFBLWidget) {
      const body = document.createElement('div');
      const text = document.createElement('label');
      text.textContent = `Select species for: "${widget.id}"`;
      body.appendChild(text);

      const selector = document.createElement('select');
      for (let species of ['adult', 'larva']){
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


  interface ISpeciesComponentProps {
    widget: IFBLWidget
  }
  /**
   * React component for a spcies name button.
   * This wraps the ToolbarButtonComponent and watches the species 
   * keyword
   */
  function SpeciesComponent(
    props: ISpeciesComponentProps
  ) {
    let { widget } = props;
    const callback = () => showDialog({
      title: 'Change Species',
      body: new SpeciesSelector(widget),
      buttons: [
        Dialog.cancelButton(),
        Dialog.warnButton({label: 'Change'})
      ]
    }).then(result =>{
      if (result.button.accept){
        widget.species = result.value;
      }
    });

    let signal = widget.speciesChanged;
    let species = widget.species;
    return (
      <UseSignal signal={signal} initialArgs={species}>
        {(_, species) => (
          <ToolbarButtonComponent
            className={TOOLBAR_SPECIES_CLASS}
            onClick={callback}
            label={species}
            tooltip={'Change Species'}
          />
        )}
      </UseSignal>
    );
  }

  export function createSpeciesButton(
    widget: IFBLWidget
  ): Widget {
    const el = ReactWidget.create(
      <SpeciesComponent widget={widget}/>
    );
    el.addClass('jp-FBL-species');
    return el;
  }
}

namespace ANSI {
  export function stripReplyError(msg:Array<string>): string {
    let characters = /\[-|\[[0-1];[0-9]+m|\[[0]m/g;
    return msg.join('\n').replace(characters, "");
  }
}