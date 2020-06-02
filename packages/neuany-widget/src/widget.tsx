import { IFBLWidget, FBLWidget, Icons } from '@flybrainlab/fbl-template-widget';
import { Message } from '@lumino/messaging';
import { LabIcon } from '@jupyterlab/ui-components';
import { Kernel, Session, KernelMessage } from '@jupyterlab/services';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';
import { ISessionContext } from '@jupyterlab/apputils';
import { Signal } from '@lumino/signaling';
import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import '../style/index.css';
import { NeuAnyModel, INeuAnyModel } from './model';


declare global {
  interface Window {
    widget: any;
  }
}

const VERBOSE = true;
const NEUANY_CLASS_JLab = "jp-FBL-NeuAny";

/**
* An Neu3D Widget
*/
export class NeuAnyWidget extends FBLWidget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super({
      name: `NeuAny-${Private.count++}`, 
      icon: Icons.fblIcon,
      ...options});
    window.widget = this;
    this.addClass(NEUANY_CLASS_JLab);
 
    // create container that could hold custom JS 
    this.innerContainer = document.createElement('div');
    this.innerContainer.style.height = '50%';
    this.innerContainer.style.width = '100%';
    this.innerContainer.style.overflow = 'scroll';
    this.node.appendChild(this.innerContainer);

    // create container shows model information
    this.msgContainer = document.createElement('div');
    this.node.appendChild(this.msgContainer);

    let btnContainer =  document.createElement('div');
    let changeDataBtn = document.createElement('button');
    changeDataBtn.innerText = 'Change Data';
    changeDataBtn.onclick = () =>{
      this.model.testChangeData();
    }
    btnContainer.appendChild(changeDataBtn);
    let changeMetaDataBtn = document.createElement('button');
    changeMetaDataBtn.innerText = 'Change MetaData';
    changeMetaDataBtn.onclick = () =>{
      this.model.testChangeMetaData();
    }
    btnContainer.appendChild(changeMetaDataBtn);
    let changeStatesBtn = document.createElement('button');
    changeStatesBtn.onclick = () =>{
      this.model.testChangeStates();
    }
    changeStatesBtn.innerText = 'Change State';
    btnContainer.appendChild(changeStatesBtn);
    this.node.appendChild(btnContainer);

    this.dataContainer = document.createElement('div');
    this.dataContainer.style.height = '15%';
    this.dataContainer.style.width = '100%';
    this.dataContainer.style.overflow = 'scroll';
    this.node.appendChild(this.dataContainer);
    // create container shows model information
    this.statesContainer = document.createElement('div');
    this.statesContainer.style.height = '15%';
    this.statesContainer.style.width = '100%';
    this.statesContainer.style.overflow = 'scroll';
    this.node.appendChild(this.statesContainer);
    // create container shows model information
    this.metadataContainer = document.createElement('div');
    this.metadataContainer.style.height = '15%';
    this.metadataContainer.style.width = '100%';
    this.metadataContainer.style.overflow = 'scroll';
    this.node.appendChild(this.metadataContainer);

    this.renderModel();
  }

  initFBLCode(): string {
    let code = super.initFBLCode();
    code += `a = 1`
    return code;
  }

  initModel(model: Partial<INeuAnyModel>){
    // create model
    this.model = new NeuAnyModel(model);
    this.model.dataChanged.connect(this.onDataChanged, this);
    this.model.metadataChanged.connect(this.onMetadataChanged, this);
    this.model.statesChanged.connect(this.onStatesChanged, this);
  }

  renderModel(change?: any){
    this.msgContainer.innerHTML = this.model.msg;
    this.dataContainer.innerHTML = JSON.stringify(this.model.data);
    this.statesContainer.innerHTML = JSON.stringify(this.model.states);
    this.metadataContainer.innerHTML = JSON.stringify(this.model.metadata);
    
    if (change){
      switch (change.type) {
        case 'data':
          this.dataContainer.innerHTML += `
          <br>----------------------------------------------------<br>
            Changed: Event: Type ${change.type}, Key ${change.key},<br>
            OldValue: ${change.oldValue}<br>
            NewValue: ${change.newValue}
          `
          break;
        case 'metadata':
          this.metadataContainer.innerHTML += `
          <br>----------------------------------------------------<br>
            Changed: Event: Type ${change.type}, Key ${change.key},<br>
            OldValue: ${change.oldValue}<br>
            NewValue: ${change.newValue}
          `
          break;
        case 'states':
          this.statesContainer.innerHTML += `
          <br>----------------------------------------------------<br>
            Changed: Event: Type ${change.type}, Key ${change.key},<br>
            OldValue: ${change.oldValue}<br>
            NewValue: ${change.newValue}
          `
          break;
        default:
          this.msgContainer.innerHTML += `<br> Change of type ${change.type} not understood`;
          console.log(change);
          break;
      }

    }
  }

  onDataChanged(sender: INeuAnyModel, args: any){
    Private.logToWidget(this, `Data Changed, ${args}`);
    this.renderModel(args);
    this._modelChanged.emit({msg: 'data changed'});
  }

  onMetadataChanged(sender: INeuAnyModel, args: any){
    Private.logToWidget(this, `Metadata Changed, ${args}`);
    this.renderModel(args);
    this._modelChanged.emit({msg: 'metadata changed'});
  }

  onStatesChanged(sender: INeuAnyModel, args: any){
    Private.logToWidget(this, `States Changed, ${args}`);
    this.renderModel(args);
    this._modelChanged.emit({msg: 'states changed'});
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

  

 async onKernelChanged(
    context: ISessionContext,
    args: Session.ISessionConnection.IKernelChangedArgs
  ) {
    let oldKernel: Kernel.IKernelConnection | null = args.oldValue;
    let newKernel: Kernel.IKernelConnection | null = args.newValue;
    super.onKernelChanged(context, args);
    Private.logToWidget(this, 
      `[Session Event] Kernel Changed <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- old name: ${oldKernel?.model.name} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- old id: ${oldKernel?.model.id} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- new name: ${newKernel?.model.name} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- new id: ${newKernel?.model.id}`);
  }


  onKernelStatusChanged(sess: ISessionContext, status: Kernel.Status) {
    Private.logToWidget(this, `[Session Event] Kernel Status Changed. ${status}`);
    super.onKernelStatusChanged(sess, status);
  }

  onPathChanged(msg?: any): void {
    Private.logToWidget(this, `[Session Event] Path Changed. ${msg}`);
    super.onPathChanged(msg);
  }

  onCommMsg(msg: KernelMessage.ICommMsgMsg) {
    Private.logToWidget(this,
      `[Comm Message] Comm_id: ${msg.content.comm_id} <br>
      &nbsp;&nbsp;&nbsp;&nbsp |-- message: ${msg.content.data.toString()}
      `);
    super.onCommMsg(msg);
  }

  async initFBLClient(): Promise<void> {
    Private.logToWidget(this, `[FBLCLient Init Event] Registering Comm with target: ${this._commTarget}`);
    return super.initFBLClient();
  }

  /**
   * Propagate resize event to neu3d
   * @param msg 
   */
  onResize(msg: any) {
    Private.logToWidget(this, `[Widget Event] onResize Called.`);
    super.onResize(msg);
  }

  populateToolBar() {
    this.toolbar.addItem(
      'upload',
      Private.createButton(Icons.uploadIcon, "Upload SWC File", 'jp-Neu3D-Btn jp-SearBar-upload', 
        () => { Private.logToWidget(this, '[Toolbar Event] Upload Button Clicked'); }));
    super.populateToolBar();
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

  /**
  * The Elements associated with the widget.
  */
  protected _connected: Date;
  protected _isDisposed = false;
  protected _speciesChanged = new Signal<this, string>(this);
  toolbar: Toolbar<Widget>;
  _commTarget: string; // cannot be private because we need it in `Private` namespace to update widget title
  comm: Kernel.IComm;
  readonly name: string;
  // private _comm: Kernel.IComm;
  protected _species: any;
  innerContainer: HTMLDivElement;
  dataContainer: HTMLDivElement;
  metadataContainer: HTMLDivElement;
  statesContainer: HTMLDivElement;
  msgContainer: HTMLDivElement;
  sessionContext: ISessionContext;
  model: NeuAnyModel;
  icon: LabIcon;
};


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
      widget.title.icon = widget.icon;
      widget.title.caption = caption;
    } else {
      widget.title.label = `${widget.name}::No Kernel`;
      widget.title.icon = widget.icon;
      widget.title.caption = `No Kernel`;
    }
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

  export function createButton(
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
}