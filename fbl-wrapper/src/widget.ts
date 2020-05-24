import { JupyterFrontEnd } from '@jupyterlab/application';
import { ServiceManager, Kernel, Session } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { Widget, PanelLayout } from '@lumino/widgets';
import {
  ISessionContext, SessionContext, sessionContextDialogs, showDialog, Dialog
} from '@jupyterlab/apputils';

import { Signal, ISignal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';

import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import {
  chartAreaIcon, codeIcon, listAltIcon, playCircleIcon, saveIcon,
  shareAltIcon, shareAltSquareIcon, uploadIcon
} from './icons';
import { LabIcon } from '@jupyterlab/ui-components';
// import commCodeStr from "./launch_session.py";

const VERBOSE = true;
const FBL_CLASS_JLab = "jp-FBL";

// This class is used for keeping track of FBL
// widgets that are associated with a given client session
const FBL_CLASS_Python = "FBL";
const TEMPLATE_COMM_TARGET = "FBL:Dump-data";

var filefloat = document.createElement('div');

declare global {
  interface Window {
    widget: any;
  }
}

export
  interface IFBLWidget {
  // /**
  // * Connection to another widget through signal
  // */
  // connect(signal: ISignal<IFBLWidget, object>): void;
  sessionContext: ISessionContext;

  species: string;
  /**
  * Output signal of child widget (used for connection to master)
  */
  outSignal: ISignal<this, object>;

  /**
   * Dispose current widget
   */
  dispose(): void;

  /**
   * 
   */
  model?: any;
}

/**
* An FBL Widget
*/
export class FBLWidget extends Widget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super();
    console.log('Instantiating Widget');
    let {
      path,
      basePath,
      name,
      app,
      sessionContext
    } = options;
    let manager: ServiceManager = app.serviceManager;
    const count = Private.count++;
    this.id = `FBL-${count}-${UUID.uuid4()}`;
    if (!path) {
      path = `${basePath || ''}/${this.id}`;
    }
    this._commTarget = `${TEMPLATE_COMM_TARGET}-${count}`;

    sessionContext = this.sessionContext =
      sessionContext ||
      new SessionContext({
        sessionManager: manager.sessions,
        specsManager: manager.kernelspecs,
        path,
        name: name || `FBL ${count}`,
        type: 'FBL',
        kernelPreference: {
          shouldStart: true,
          canStart: true,
          name: "python"
        },
        setBusy: options.setBusy
      });

    this.addClass(FBL_CLASS_JLab);
    const layout = (this.layout = new PanelLayout());
    this.toolbar = this._createToolbar();
    layout.addWidget(this.toolbar);
    let div = document.createElement('div')
    div.innerHTML = "TESTSTSTSTSTS";
    this.node.appendChild(div);
    // this.JSONList = new JSONEditor(this.node, {});
    // this.node.appendChild(this._createSaveLoad());
    // let searchbox = this._createSearchBox();
    // this.node.appendChild(searchbox);
    // this.node.tabIndex = -1;

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
      this._ready.resolve(void 0);
    });

    // expose widget to window
    window.widget = this;
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
    this._outSignal.emit({ type: "Dispose" });
    // Dispose Session 
    // if(!this.sessionContext.isDisposed) { 
    //   this.sessionContext.shutdown().then(() => {
    //     this.sessionContext.dispose();
    //   })
    // }
    super.dispose();
    this._isDisposed = true;
    Signal.disconnectAll(this._outSignal);
    if (this._isDisposed) {
      if (VERBOSE) { console.log('[NM] FBL Widget Disposed'); }
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


  get modelChanged(): ISignal<FBLWidget, void> {
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
      // let code = `
      // from ipykernel.comm import Comm
      // if 'comm' not in globals():
      //   comm = Comm(target_name="${this._commTarget}")
      // if comm.target_name != "${this._commTarget}":
      //   comm = Comm(target_name="${this._commTarget}")
      // comm.send(data="comm sent message")
      // # comm.close(data="closing comm")
      // `;

      let code = `
      import flybrainlab as fbl
      from ipykernel.comm import Comm
      from collections import OrderedDict

      if '_FFBOLabcomm' not in globals():
          _FFBOLabcomm = Comm(target_name='${this._commTarget}')
      if _FFBOLabcomm.target_name != '${this._commTarget}':
          _FFBOLabcomm = Comm(target_name='${this._commTarget}')
      _FFBOLabcomm.send(data="FFBOLab comm established")
      _FFBOLabcomm.send(data="Generating FFBOLab Client...")
      if '_FBLAdult' not in globals():
          _FBLAdult = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)

      nm = []
      nm.append(_FBLAdult)
      _FBLLarva = fbl.Client(FFBOLabcomm = _FFBOLabcomm, legacy = True, url = u'wss://neuronlp.fruitflybrain.org:9020/ws')
      nm.append(_FBLLarva)
      nm_client = 0

      if '_FBLWidgets' not in globals():
          _FBLWidgets = OrderedDict()
      if '${FBL_CLASS_Python}' not in _FBLWidgets:
          _FBLWidgets['${FBL_CLASS_Python}'] = OrderedDict()
      _FBLWidgets['${FBL_CLASS_Python}']['${this.id}'] = {'id': '${this.id}', 'comm':_FFBOLabcomm}
      `;

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

  // /**
  //  * Spawn Dialog to specify session options and sets `_sessionOpts`
  //  */
  // private _changeSessionOpts(cancellable?: boolean): Promise<void> {
  //   if (this.isDisposed) {
  //     return Promise.resolve(void 0);
  //   }
  //   const buttons = (cancellable) ? 
  //   [ Dialog.cancelButton(), Dialog.okButton({ label: 'CHANGE' }) ]:
  //   [ Dialog.okButton({ label: 'SPAWN' })];

  //   let dialog = this._dialog = new Dialog({
  //     title: 'FFBOLab Session Specs',
  //     body: new Private.FFBOLabSessionSpec(this.sessionContext.session),
  //     buttons
  //   });

  //   return dialog.launch().then(result => {
  //     if (this.isDisposed || !result.button.accept) {
  //       return;
  //     }

  //     this._sessionOpts.path = result.value.path;
  //     //this._sessionOpts.name = result.value.name;
  //     //this._sessionOpts.type = result.value.type;
  //   }).then(() => { this._dialog = null; });
  // }

  /**
  * A promise that resolves when the FBL widget is ready
  */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  _createToolbar(): Toolbar<Widget> {
    let toolbar = new Toolbar();
    toolbar.node.style.height = 'var(--jp-private-toolbar-height)';
    this._populateToolBar(toolbar);
    //toolbar.node.classList.add("jp-NotebookPanel-toolbar");
    return toolbar;
  }

  /**
   * Populate Master Widget Toolbar
   */
  _populateToolBar(toolbar: Toolbar<Widget>): void {

    toolbar.insertItem(0,
      'compile',
      this._createButton(codeIcon, 'Compile Circuit', 'jp-SearchBar-Compile',
        () => {
          if (VERBOSE) { console.log('[NM Master] compiling') }
          if (this.sessionContext.session) {
            this.sessionContext.session.kernel.requestExecute({ code: '_FFBOLABClient.prepareCircuit()' });
          }
        }
      )
    );

    toolbar.addItem(
      'simulate',
      this._createButton(playCircleIcon, 'Simulate Circuit', 'jp-SearchBar-Simulate',
        () => {
          // this.sessionContext.session.kernel.requestExecute({ code: '_FFBOLABClient.sendExecuteReceiveResults("auto")' });
          // window.neurogfxWidget.contentWindow.postMessage({ messageType: "getExperimentConfig", data: {} }, '*');
          this.sessionContext.session.kernel.requestExecute({ code: '_FFBOLABClient.initiateExperiments()' });
          // window.neurogfxWidget.contentWindow.postMessage({ messageType: "simulate", data: {} }, '*');
          //this._outSignal.emit({type: "GFX", data: { messageType: "simulate", data: {} }});
        }
      )
    );

    toolbar.addItem(
      'layoutview',
      this._createButton(shareAltSquareIcon, 'Layout Circuit without Synapses', 'jp-SearchBar-Layout',
        () => {
          if (this.sessionContext.session) {
            this.sessionContext.session.kernel.requestExecute({ code: '_FFBOLABClient.runLayouting("frontend", model="simple")' });
          }
          //window.neurogfxWidget.contentWindow.postMessage({ messageType: "getExperimentConfig", data: {} }, '*');
        }
      )
    );

    toolbar.addItem(
      'layout',
      this._createButton(shareAltIcon, 'Layout Circuit', 'jp-SearchBar-Layout',
        () => {
          if (this.sessionContext.session) {
            this.sessionContext.session.kernel.requestExecute({ code: '_FFBOLABClient.runLayouting("frontend")' });
          }
          //window.neurogfxWidget.contentWindow.postMessage({ messageType: "simulate", data: {} }, '*');
        }
      )
    );

    toolbar.addItem(
      'plotter',
      this._createButton(chartAreaIcon, 'Toggle Plotter', 'jp-SearchBar-Plotter',
        () => {
          //window.neurogfxWidget.contentWindow.postMessage({ messageType: "togglePlotter", data: {} }, '*');
          this._outSignal.emit({ type: "GFX", data: { messageType: "togglePlotter", data: {} } });
        }
      )
    );

    toolbar.addItem(
      'settings',
      this._createButton(listAltIcon, 'Experiment Settings', 'jp-SearchBar-Settings',
        () => {
          if (this.sessionContext.session) {
            this.sessionContext.session.kernel.requestExecute({ code: '_FFBOLABClient.listInputs()' });
          }
        }
      )
    );

    toolbar.addItem(
      'workspace-save',
      this._createButton(saveIcon, 'Save Workspace', 'jp-SearchBar-Settings',
        () => { this._outSignal.emit({ type: "NLP", data: { messageType: 'save', data: {} } }); }
      )
    );

    toolbar.addItem(
      'workspace-load',
      this._createButton(uploadIcon, 'Load Workspace', 'jp-SearchBar-Settings',
        () => { this.node.appendChild(filefloat); }
      )
    );

    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('restart', Toolbar.createRestartButton(this.sessionContext));
    toolbar.addItem('kernelName', Toolbar.createKernelNameItem(this.sessionContext));
    toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(this.sessionContext));
  }

  _createButton(icon: LabIcon.IMaybeResolvable, tooltip: string, className: string, func: () => void): ToolbarButton {
    let btn = new ToolbarButton({
      icon: icon,
      iconclassName: className,
      onClick: func,
      tooltip: tooltip
    } as any);

    // let i = document.createElement('i');
    // i.classList.add('fa', ...icon.split(' '));
    // btn.node.classList.add('ffbolab-button');
    // btn.node.appendChild(i);
    return btn;
  }


  /**
  * The Elements associated with the widget.
  */
  private _connected: Date;
  private _ready = new PromiseDelegate<void>();
  private _isDisposed = false;
  private _outSignal = new Signal<this, object>(this);
  private toolbar: Toolbar<Widget>;
  _commTarget: string; // cannot be private because we need it in `Private` namespace to update widget title
  private _comm: Kernel.IComm;

  public species: any;
  //A session context which points to the kernel resource
  sessionContext: ISessionContext;
};


/**
 * A namespace for ConsolePanel statics.
 */
export namespace FBLWidget {
  /**
   * The initialization options for a console panel.
   */
  export interface IOptions {
    /**
     * The service manager used by the panel.
     */
    app: JupyterFrontEnd;

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
     * A function to call when the kernel is busy.
     */
    setBusy?: () => IDisposable;
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
        `Name: ${sessionContext.name}\n` +
        `Directory: ${PathExt.dirname(sessionContext.path)}\n` +
        `Kernel: ${widget.sessionContext.kernelDisplayName}` +
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
}
