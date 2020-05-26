import { JupyterFrontEnd } from '@jupyterlab/application';
import { ServiceManager, Kernel, Session } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { 
  Widget, 
  PanelLayout 
} from '@lumino/widgets';
import {
  ISessionContext, SessionContext, 
  sessionContextDialogs, showDialog, Dialog,
} from '@jupyterlab/apputils';

import Neu3D from 'neu3d';
import { Signal, ISignal } from '@lumino/signaling';
import { Message } from '@lumino/messaging';
import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import {
  uploadIcon, syncIcon, zoomToFitIcon,
  eyeIcon, eyeSlashIcon, cameraIcon, trashIcon,
  mapUpinIcon
} from './icons';
import { LabIcon } from '@jupyterlab/ui-components';
import '../style/index.css';
import { INeu3DModel, Neu3DModel } from './model';
import {AdultMesh} from './adult_mesh';
import {LarvaMesh} from './larva_mesh';
// import commCodeStr from "./launch_session.py";

const VERBOSE = true;
const Neu3D_CLASS_JLab = "jp-Neu3D";
// This class is used for keeping track of FBL
// widgets that are associated with a given client session
// const Neu3D_CLASS_Python = "Neu3D";
const TEMPLATE_COMM_TARGET = "FBL:Dump-data";

declare global {
  interface Window {
    widget: any;
  }
}


/**
 * Data sent from neu3d's `on` callbacks
 * Only covers `add, remove, pinned, visibility` events
 */
interface INeu3DMessage {
  event: string;
  prop: string;
  value: boolean | any;
  old_value?: boolean | any;
  path?: Array<string> | any;
  obj?: any;
}


export
  interface IFBLWidget {
  // /**
  // * Connection to another widget through signal
  // */
  // connect(signal: ISignal<IFBLWidget, object>): void;


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

  // /** 
  // * Output signal of child widget (used for connection to master)
  // */
  // outSignal: ISignal<this, object>;

  /**
   * Dispose current widget
   */
  dispose(): void;

  /**
   * All neurons current rendered in the workspace. 
   */
  model: INeu3DModel;
}

/**
* An Neu3D Widget
*/
export class Neu3DWidget extends Widget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super({});
    // expose widget to window
    window.widget = this;
    console.log('Instantiating Neu3D Widget');
    let {
      path,
      basePath,
      name,
      app,
      sessionContext,
      model,
      species,
    } = options;

    // create model
    this.model = new Neu3DModel(model);
    let manager: ServiceManager = app.serviceManager;
    const count = Private.count++;
    this.id = `Neu3D-${count}-${UUID.uuid4()}`;
    if (!path) {
      path = `${basePath || ''}/${this.id}`;
    }
    this._commTarget = `${TEMPLATE_COMM_TARGET}-${count}`;

    // load in meshes
    this._adultMesh = AdultMesh;
    this._larvaMesh = LarvaMesh;

    sessionContext = this.sessionContext =
      sessionContext ||
      new SessionContext({
        sessionManager: manager.sessions,
        specsManager: manager.kernelspecs,
        path,
        name: name || `Neu3D ${count}`,
        type: 'FBL',
        kernelPreference: {
          shouldStart: true,
          canStart: true,
          name: "python"
        },
        setBusy: options.setBusy
      });

    this.addClass(Neu3D_CLASS_JLab);
    const layout = (this.layout = new PanelLayout());
    this.toolbar = Private.createToolbar(this);
    layout.addWidget(this.toolbar);
    Private.populateToolBar(this, this.toolbar);
    this._neu3dContainer = document.createElement('div')
    this._neu3dContainer.style.height = '100%';
    this._neu3dContainer.style.width = '100%';
    this.node.appendChild(this._neu3dContainer);

    // create session and `initialize`
    sessionContext.initialize().then(async value => {
      // Setup Main Panel
      
      if (value) {
        await sessionContextDialogs.selectKernel(sessionContext);
      }
      this._connected = new Date();  
      await this._registerComm();
      Private.updateTitle(this, this._connected);
      // register Comm only when kernel is changed
      sessionContext.statusChanged.connect(this._onKernelStatusChanged, this);
      sessionContext.kernelChanged.connect(this._onKernelChanged, this);
      sessionContext.propertyChanged.connect(this._onPathChanged, this);

      if (this.neu3d){ this.neu3d.onWindowResize(); }
      this.species = species; // set species after neu3d is available
    });
  }

  onAfterShow(msg: Message){
    super.onAfterShow(msg);
    if (!this.neu3d){
      this.neu3d = new Neu3D(
        this._neu3dContainer, 
        undefined,
        {
          "enablePositionReset": true
         },
        {
          stats: true,
          datGUI: {
            createButtons: false,
            preset: "Low"
          }
        }
      );
    }

    this.neu3d.meshDict.on('add', (e:INeu3DMessage) => {
      this.model.addMesh(e.prop, e.value);
    });
    this.neu3d.meshDict.on('remove', (e:INeu3DMessage) => {
      this.model.removeMesh(e.prop)
    });
    this.neu3d.meshDict.on('change', 
    (e:INeu3DMessage) =>{
      switch (e.value) {
        case true:
          this.model.pinMeshes(e.path);
          break;
        case false:
          this.model.unpinMeshes(e.path);
          break;
        default:
          break;
      }
    },
    'pinned');
    this.neu3d.meshDict.on('change', 
    (e:INeu3DMessage) =>{
      switch (e.value) {
        case true:
          this.model.showMeshes(e.path);
          break;
        case false:
          this.model.hideMeshes(e.path);
          break;
        default:
          break;
      }
    },
    'visibility');
    this.neu3d.onWindowResize()
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
    delete this.neu3d;
    this._outSignal.emit({ type: "Dispose" });
    // Dispose Session 
    if(!this.sessionContext.isDisposed) { 
      this.sessionContext.shutdown().then(() => {
        this.sessionContext.dispose();
      })
    }
    super.dispose();
    this._isDisposed = true;
    Signal.disconnectAll(this._outSignal);
    if (this._isDisposed) {
      if (VERBOSE) { console.log('[NM] Neu3D Widget Disposed'); }
    } 
  }

  /**
   * Check if Kernel is FBL compatible
   * 1. Checks if contains Comm matches the comms target id
   */
  isFBLKernel(kernel: Kernel.IKernelConnection): string | null {
    let targetCandidates = new Array<any>();
    // interrogate kernel as Kernel class
    for (let c of (kernel as any)._comms.values()) {
      if (c.isDisposed) {
        continue
      }
      if (c._target.includes(TEMPLATE_COMM_TARGET)) {
        targetCandidates.push(c._target);
      };
    }

    if (targetCandidates.length == 0) {
      return null;
    }

    // take only unique target values
    targetCandidates = [...new Set(targetCandidates)];
    if (targetCandidates.length > 1){
      console.warn(`[NM] Multiple FBL Comms found in Kernel ${kernel}, using the first one!
                    found ${targetCandidates.length}: ${targetCandidates}`);
    }
    return targetCandidates[0];
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

    if (newKernel === null || newKernel.isDisposed){
      return;
    }

    let newCommTarget: string = null;
    let oldCommTarget: string = null;
    if (VERBOSE) { console.log('[NM] kernel changed', context, oldKernel, newKernel); }

    // check if FBL Comm exists in the new kernel
    if (newKernel && !newKernel.isDisposed){
      newCommTarget = this.isFBLKernel(newKernel);
    }
    if (oldKernel && !newKernel.isDisposed){
      oldCommTarget = this.isFBLKernel(oldKernel);
    }

    let dialogButtons = [Dialog.okButton()];
    // change _commTarget for this widget if compatible comm found in new kernel
    if (newCommTarget) {
      this._commTarget = newCommTarget;
    } else { // if no _commTarget is found in the new kernel
      let msg = `No FBL compatible Comm target found in new kernel ${newKernel.name}.
                We will need to inject some code into the new kernel to create Comm target ${this._commTarget}`;
      if (oldKernel !== null) { // if switching over from another kernel
        if (oldCommTarget && (!oldKernel.isDisposed)) { // if the 
          msg += `Fortunately, the old Kernel ${oldKernel.name} has the right Comm. 
                You can opt to stay in the older kernel if you want`;
          dialogButtons.push(
            Dialog.cancelButton({
              label: 'Switch Back',
            })
          )
        }
        // We inform the user that code will need to be injected into the 
        // new kernel to make it FBL compatible. 
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
    if (status === "restarting") {
      this.sessionContext.ready.then(() => {
        this._registerComm();
      })
    }
  }

  /**
  * A method that handles changing session Context
  */
  private _onPathChanged(msg?: any): void {
    console.log('[NM] Path Changed', msg);
    if (VERBOSE) { console.log(this.sessionContext.kernelDisplayName); }
    if (this.sessionContext.session) {
      Private.updateTitle(this, this._connected);
      this._outSignal.emit({ type: 'session', data: this.sessionContext.session.path });
    }
  }

  // private _propogateSession(): void {
  //   this._onKernelChanged();
  //   this._onPathChanged();
  // }


  get modelChanged(): ISignal<Neu3DWidget, void> {
    return this.modelChanged;
  }

  /**
   * A signal that connects to child widget
   */
  get outSignal(): ISignal<this, object> {
    return this._outSignal;
  }

  // connectChild(signal: ISignal<IFFBOChildWidget, object>): void {
  //   // TODO: Handle synchronization of this with _registerComm()
  //   signal.connect(this._handleInputActions, this);
  // }

  // updateNotebook(nbk: NotebookPanel): void {
  //   nbk.session.kernelChanged.connect(
  //     (kernel) => {
  //       console.log('kernel changed in notebook');
  //       if (VERBOSE) { console.log(`[NM Master] Notebook Kernel Changed for ${nbk.session.path}`);}
  //       if(nbk.session.kernel)
  //       {
  //         if(nbk.session.kernel.model && (this.sessionContext.session.kernel ? nbk.session.kernel.model != this.sessionContext.session.kernel.model : true))
  //         {
  //           this.sessionContext.session.changeKernel(nbk.session.kernel.model);
  //         }
  //       }
  //     },
  //     this
  //   );
  // }

  private commMessageHandler(msg: any) {
    console.log('[' + msg.content.comm_id + '] ', msg.content.data);
  }

  /**
  * Register a Comm target on both Client and Server sides
  */
  private async _registerComm(): Promise<void> {
    await this.sessionContext.ready;
    let kernel = this.sessionContext.session.kernel;

    if (kernel) {
      // safeguard to ensure if this comm already exists
      if (!kernel.hasComm(this._commTarget)) {
        kernel.registerCommTarget(this._commTarget, (comm, commMsg) => {
          this._comm = comm;
          console.log('Comm Registered', this._comm);
          if (commMsg.content.target_name !== this._commTarget) {
            return;
          }
          comm.onMsg = (msg) => {
            this.commMessageHandler(msg);
          };
          comm.onClose = (msg) => {
            if (VERBOSE) { console.log('[NM] Comm Closed,', this._commTarget, msg.content.data); }
          };
        });
      }

      // TODO Python Safeguard: dup comm
      let code = `
      from ipykernel.comm import Comm
      if 'comm' not in globals():
        comm = Comm(target_name="${this._commTarget}")
      if comm.target_name != "${this._commTarget}":
        comm = Comm(target_name="${this._commTarget}")
      comm.send(data="comm sent message")
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
          showDialog({
            title: `Comm Registration Failed (${this._commTarget})`,
            body: reply.content.traceback.join('')
          }).then(()=>{
            return Promise.reject('Execution Failed');
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
    super.onResize(msg);
    this.neu3d.onWindowResize();
  }
  
  /**
   * Set species
   * @param new_species new species to be added
   *    - If sepcies is `adult` or `larva`, this will display mesh and change metadata settings
   */
  set species(new_species: string) {
    if (new_species === this._species) {
      return;
    }
    this._species = new_species;
    
    switch (this._species.toLowerCase()) {
      case 'larva':
        for (let mesh of Object.keys(this.neu3d.meshDict)){
          if (this.neu3d.meshDict[mesh].background) {
            this.neu3d.remove(mesh);
          }
        }
        this.neu3d.addJson({ffbo_json: this._larvaMesh, showAfterLoadAll: true});
        this.neu3d._metadata.resetPosition = {x: 263.7529882900178, y: -279.09063424477444, z: -3652.912696805477};
        this.neu3d._metadata.upSign = -1.;
        break;
      case 'adult':
        for (let mesh of Object.keys(this.neu3d.meshDict)){
          if (this.neu3d.meshDict[mesh].background) {
            this.neu3d.remove(mesh);
          }
        }
        this.neu3d.addJson({ffbo_json: this._adultMesh, showAfterLoadAll: true});
        this.neu3d._metadata.resetPosition = {x: 0, y: 0, z: 1800};
        this.neu3d._metadata.upSign = 1.;
        break;
      default:
        break; //no-op
    }
  }

  get species(): string {
    return this._species
  }


  /**
  * The Elements associated with the widget.
  */
  private _connected: Date;
  private _isDisposed = false;
  private _outSignal = new Signal<this, object>(this);
  toolbar: Toolbar<Widget>;
  _commTarget: string; // cannot be private because we need it in `Private` namespace to update widget title
  private _comm: Kernel.IComm;
  private _species: any;
  //A session context which points to the kernel resource
  neu3d: Neu3D;
  readonly _adultMesh: Object; // caching for dynamically imported mesh
  readonly _larvaMesh: Object; // caching for dynamically import mesh
  private _neu3dContainer: HTMLDivElement;
  sessionContext: ISessionContext;
  model: Neu3DModel;
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
    model?: INeu3DModel;
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
    widget: Neu3DWidget,
    connected: Date | null,
    // executed: Date | null
  ) {
    const sessionContext = widget.sessionContext.session;
    if (sessionContext) {
      let caption =
        `Name: ${sessionContext.name}\n` +
        `Directory: ${PathExt.dirname(sessionContext.path)}\n` +
        `Kernel: ${widget.sessionContext.kernelDisplayName}\n` +
        `Comm: ${widget._commTarget})`;
      if (connected) {
        caption += `\nConnected: ${Time.format(connected.toISOString())}`;
      }
      // if (executed) {
      //   caption += `\nLast Execution: ${Time.format(executed.toISOString())}`;
      // }
      widget.title.label = sessionContext.name;
      widget.title.caption = caption;
    } else {
      widget.title.label = 'FBL';
      widget.title.caption = '';
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
    widget: Neu3DWidget,
    toolbar: Toolbar
  ): void {
    toolbar.addItem(
      'upload', 
      createButton(uploadIcon, "Upload SWC File", 'jp-Neu3D-Btn jp-SearBar-upload', 
        () => { document.getElementById('neu3d-file-upload').click(); }));
    toolbar.addItem(
      'reset', 
      createButton(syncIcon, "Reset View", 'jp-Neu3D-Btn jp-SearBar-reset', 
      () => { widget.neu3d.resetView() }));
    toolbar.addItem(
      'zoomToFit', 
      createButton(zoomToFitIcon, "Center and zoom into visible Neurons/Synapses", 'jp-Neu3D-Btn jp-SearBar-zoomToFit', 
      () => { widget.neu3d.resetVisibleView() }));
    toolbar.addItem(
      'hideAll', 
      createButton(eyeSlashIcon, "Hide All", 'jp-Neu3D-Btn jp-SearBar-hideAll', 
      () => { widget.neu3d.hideAll() }));
    toolbar.addItem(
      'showAll', 
      createButton(eyeIcon, "Show All", 'jp-Neu3D-Btn jp-SearBar-showAll', 
      () => { widget.neu3d.showAll() }));
    toolbar.addItem(
      'screenshot', 
      createButton(cameraIcon,"Download Screenshot", 'jp-Neu3D-Btn jp-SearBar-camera', 
      () => { widget.neu3d._take_screenshot = true;}));
    toolbar.addItem(
      'unpinAll', 
      createButton(mapUpinIcon, "Unpin All", 'jp-Neu3D-Btn jp-SearBar-unpin', 
      () => { widget.neu3d.unpinAll(); }));
    toolbar.addItem(
      'removeUnpinned', 
      createButton(trashIcon, "Remove Unpinned Neurons", 'jp-Neu3D-Btn jp-SearBar-remove-unpinned', 
      ()=> {widget.neu3d.removeUnpinned();}));
    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('restart', Toolbar.createRestartButton(widget.sessionContext));
    toolbar.addItem('kernelName', Toolbar.createKernelNameItem(widget.sessionContext));
    toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(widget.sessionContext));
  }

  export function createToolbar(
    widget: Neu3DWidget
  ): Toolbar<Widget> {
    let toolbar = new Toolbar();
    toolbar.node.style.height = 'var(--jp-private-toolbar-height)';
    populateToolBar(widget, toolbar);
    return toolbar;
  }
}
