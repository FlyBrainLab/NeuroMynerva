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
  sessionContextDialogs, showDialog, Dialog,
  UseSignal, ReactWidget
} from '@jupyterlab/apputils';
import { Signal, ISignal } from '@lumino/signaling';
import { Toolbar, ToolbarButtonComponent } from '@jupyterlab/apputils';
import { fblIcon } from './icons';
import { LabIcon } from '@jupyterlab/ui-components';
import '../style/index.css';
import { FBLWidgetModel, IFBLWidgetModel } from './model';

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


  speciesChanged: ISignal<IFBLWidget, string>;
  modelChanged: ISignal<IFBLWidget, object>;
  icon?: LabIcon;
  toolbar?: Toolbar<Widget>;
}


const TOOLBAR_SPECIES_CLASS = 'jp-FBL-Species';
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
      icon
    } = options;

    // keep track of number of instances
    const count = Private.count++;

    // specify name and id
    this.name = name || `Template-${count}`;
    this.id = `${this.name}-${UUID.uuid4()}`;
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
  * 1. all child widgets
  * 2. session shutdown+dispose
  * 3. mode dispose
  */
  dispose(): void {
    if (this._isDisposed === true) {
      return;
    }

    super.dispose();
    this.model.dispose();
    this._isDisposed = true;
    Signal.disconnectAll(this._modelChanged);
  }

  /**
  * A method that handles changing sessionContext
  */
 async onKernelChanged(
    context: ISessionContext,
    args: Session.ISessionConnection.IKernelChangedArgs
  ) {
    const newKernel: Kernel.IKernelConnection | null = args.newValue;
    if (!newKernel || newKernel?.isDisposed){
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

  initFBLCode(): string {
    return `
    from ipykernel.comm import Comm
    from collections import OrderedDict
    class MyTestClass(object):
        def __init__(self):
            self.comms = OrderedDict()
            self.widgets = OrderedDict()
            self.msg_data = OrderedDict()
    
        def add_comm(self, widget_id, target_name):
            comm = Comm(target_name=target_name)
            self.comms[widget_id] = comm
            self.widgets[comm.comm_id] = widget_id
            self.msg_data[widget_id] = None
    
            @comm.on_msg
            def handle_msg(msg):
                comm_id = msg['content']['comm_id']
                data = msg['content']['data']
                nonlocal self
                widget_id = self.widgets[comm_id]
                self.msg_data[widget_id] = data
          
        def send_data(self, widget_id, data):
            self.comms[widget_id].send(data)
    
    if 'testComms' not in globals():
        testComms = MyTestClass()

    if '${this.id}' not in testComms.widgets:
        testComms.add_comm('${this.id}', '${this._commTarget}')
    testComms.send_data('${this.id}', 'comm sent message')
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

    // safeguard to ensure if this comm already exists
    if (!kernel.hasComm(this._commTarget)) {
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
    }

    const code = this.initFBLCode();

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
      return Promise.reject(`Reply Message not understood ${reply}`);
    }, (failure) => {
      return Promise.reject(failure);
    });
  }

  /**
   * Populate content of toolbar. Can be overloaded by child.
   * @param toolbar 
   */
  populateToolBar(): void {
    this.toolbar.addItem('Species Changer', Private.createSpeciesButton(this));
    this.toolbar.addItem('spacer', Toolbar.createSpacerItem());
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
  protected comm: Kernel.IComm; // the actual comm object
  readonly name: string;
  protected _species: any;
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

  /**
   * A widget that provides a kernel selection.
   */
  class SpeciesSelector extends Widget {
    /**
     * Create a new kernel selector widget.
     */
    constructor(widget: IFBLWidget) {
      const body = document.createElement('div');
      const text = document.createElement('label');
      text.textContent = `Select species for: "${widget.id}"`;
      body.appendChild(text);

      const selector = document.createElement('select');
      for (const species of ['adult', 'larva']){
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
   * React component for a species name button.
   * This wraps the ToolbarButtonComponent and watches the species 
   * keyword
   */
  function SpeciesComponent(
    props: { widget: IFBLWidget }
  ) {
    const { widget } = props;
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

    const signal = widget.speciesChanged;
    const species = widget.species;
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
    el.addClass(TOOLBAR_SPECIES_CLASS);
    return el;
  }
}

namespace ANSI {
  export function stripReplyError(msg: Array<string>): string {
    const characters = /\[-|\[[0-1];[0-9]+m|\[[0]m/g;
    return msg.join('\n').replace(characters, '');
  }
}