import { Message } from '@phosphor/messaging';

import { Widget, PanelLayout } from '@phosphor/widgets';
import { IClientSession, ClientSession, Dialog, MainAreaWidget } from '@jupyterlab/apputils';
import { UUID } from '@phosphor/coreutils';
import { Signal, ISignal } from '@phosphor/signaling';
import { JSONObject, PromiseDelegate } from '@phosphor/coreutils';


import JSONEditor = require('jsoneditor');

import { FFBOLabModel } from './model';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Toolbar, ToolbarButton } from '@jupyterlab/apputils';
import { Kernel, KernelMessage } from '@jupyterlab/services';


const VERBOSE = false;


const FFBOLAB_MASTER_CLASS = "jp-FFBOLabMaster";
const TEMPLATE_COMM_ID = "FFBOLab:Dump-data";
const DEFAULT_SESSION_OPTS ={
  path: "FFBOLabTest.ipynb",
  name: "FFBOLab",
  type: "file",
  kernelPreference: {
    shouldStart: true,
    canStart: true,
    name: "python"
  }
};

var filefloat = document.createElement('div');


export
  type IFFBOChildType = "Neu3D" | "GFX";


export
  interface IFFBOLabWidget {
  /**
  * Response to change in `FFBOLabModel`
  * 
  * All widgets and child widgets should respond to changes in widget model
  */
  onModelChanged(sender: FFBOLabModel, value: JSONObject): void;

  /**
  * Connection to child widget through signal
  */
  connectChild(signal: ISignal<IFFBOChildWidget, object>): void;

  /**
  * FFBOLabModel
  */
  readonly model: FFBOLabModel;
  species: string;

  readonly session: IClientSession | null;

  /**
   * Dispose current widget
   */
  dispose(): void;
}

export
  interface IFFBOChildWidget {
  /**
  * Connection to parent widget through signal
  */
  connect(inSignal: ISignal<IFFBOLabWidget, object>): void;

  /**
   * Output signal of child widget (used for connection to master)
   */
  outSignal: ISignal<this, object>;

  /**
   * Dispose current widget
   */
  dispose(): void;

}


/**
* An FFBOLab Master Widget
*/
export class FFBOLabWidget extends Widget implements IFFBOLabWidget{
  
  /**
  * 
  * Construct a Master FFBOLab Widget
  * 
  * @param notebook: pass notebook object here
  *   
  */
  constructor(options: ClientSession.IOptions) {
    super();
    this.node.tabIndex = -1;
    let model = new FFBOLabModel();
    this.species = "adult";
    this.workspaceData = {adult: {model: '', data: ''}, larva: {model: '', data: ''}};
    
    
    

    //model.valueChanged.connect(this.onModelChanged, this);
    this.model = model;
    this._sessionOpts = options;

    this.title.dataset = {
      type: 'ffbo-title',
      ...this.title.dataset
    };
    // create session and `initialize`
    this._commId = TEMPLATE_COMM_ID;
    if(options.path)
    {
      this._sessionOpts.path = options.path;
      this._createClientSession(this._sessionOpts).then(session => {
        this.session = session;
        this.session.initialize();
        this.session.propertyChanged.connect(this.onPathChanged, this);
        this.session.kernelChanged.connect(this.onKernelChanged, this);
        // Setup Main Panel
        this.id = 'FFBOLab-' + UUID.uuid4();
        this.title.label = '[Master]' + this.session.path;
        this.title.closable = true;
        this.addClass(FFBOLAB_MASTER_CLASS);
        
        let layout = this.layout = new PanelLayout();
        
        this.toolbar = this._createToolbar();
        layout.addWidget(this.toolbar);
    
        let searchbox = this._createSearchBox();
        this.node.appendChild(searchbox);
        this.JSONList = new JSONEditor(this.node, {});
        this.node.appendChild(this._createSaveLoad());
        this.session.ready.then(()=>{
          this._onSessionReady();
          this._ready.resolve(void 0);
        });
      })
    }
    else
    {
      window.JLabApp.commands.execute(
        'docmanager:new-untitled', { type: 'notebook'}
      ).then(model => {
        // console.log(model);
        this._sessionOpts.path = model.path;
        this._createClientSession(this._sessionOpts).then(session => {
          this.session = session;
          this.session.initialize();
          this.session.propertyChanged.connect(this.onPathChanged, this);
          this.session.kernelChanged.connect(this.onKernelChanged, this);

          // Setup Main Panel
          this.id = 'FFBOLab-' + UUID.uuid4();
          this.title.label = '[NM Master]' + this.session.path;
          this.title.closable = true;
          this.addClass(FFBOLAB_MASTER_CLASS);
          
          let layout = this.layout = new PanelLayout();
          
          this.toolbar = this._createToolbar();
          layout.addWidget(this.toolbar);
      
          let searchbox = this._createSearchBox();
          this.node.appendChild(searchbox);
          this.JSONList = new JSONEditor(this.node, {});
          this.node.appendChild(this._createSaveLoad());
          this.session.ready.then(()=>{
            this._onSessionReady();
            this._ready.resolve(void 0);
          });
        });
      });   
    }
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
    this._outSignal.emit({type: "Dispose"});
    
    if(this.session.kernel)
    {
      this.session.kernel.dispose();
    }

    // kill session
    if(this.session)
    {
      if (!this.session.isDisposed){
        this.session.shutdown().then(() => {
          this.session.dispose();
        })
      }
    }
    
    if(this.JSONList)
    {
      this.JSONList.destroy();
    }
    this.model.dispose();
    super.dispose();
    this._isDisposed = true;
    
    // Signal.clearData(this);
    Signal.disconnectAll(this._outSignal);
    // Signal.disconnectAll(this);
    
    if (this._isDisposed){
      if (VERBOSE) { console.log('[NM Master] disposed');}
    }
  }
  
  /**
   * Responde to `activate` calls on instance
   * @param msg 
   */
  onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  /**
   * Dispose resources when widget panel is closed
   * @param msg 
   */
  onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  /**
  * A method that handles changing context in notebook
  */
  onKernelChanged(): void {
    if (VERBOSE) { console.log(this.session.kernelDisplayName);}
    if(!this.session.kernel) {
      this.title.label = '[NM Master] DISCONNECTED';
      this._outSignal.emit({type: 'session', data: 'DISCONNECTED'});
    }
    if(this.session.kernel) {
      this.onPathChanged();
    }
  }

  /**
  * A method that handles changing context in notebook
  */
  onPathChanged(): void {
    if (VERBOSE) { console.log(this.session.kernelDisplayName);}
    if(this.session.kernel)
    {
      this.title.label = '[Master] ' + this.session.path;

      this._outSignal.emit({type: 'session', data: this.session.path});
    }
  }

  propogateSession(): void {
    this.onKernelChanged();
    this.onPathChanged();
  }

  /**
  * Handle changes in model
  * 
  * Change model displayed in JSON
  */
  onModelChanged(sender: FFBOLabModel, value: JSONObject): void {
    console.log("[MODEL] sent from original onModelChanged THIS IS BAD");
    this._outSignal.emit({type: 'model', data: {sender: sender, value: value}});
    this.JSONList.set(this.model.names);
    return;
  }
  
  get modelChanged(): ISignal<FFBOLabWidget, void> {
    return this.modelChanged;
  }
  
  /**
  * Instantiate Child Widgets on Master Widget's `session.ready`,
  * resolves promise for `ready` of entire Widget
  */
  private _onSessionReady(): Promise<void> {
    // register Comm only when kernel is changed
    this.session.kernelChanged.connect(this._registerComm, this);
    this.session.statusChanged.connect(this._reComm, this);
    
    // return this._registerComm().then(() => {
    //     // this.Neu3DWidget.userAction.connect(this._handleNeu3DActions, this);
    //   if (VERBOSE) { console.log('ALL ready!!');}
    // })

    return Promise.resolve(void 0);
  }
  
  /**
   * A signal that connects to child widget
   */
  get outSignal(): ISignal<this, object>{
    return this._outSignal;
  }

  /**
   * handle searchbar query
   * @param sender 
   * @param value 
   */
  private _handleNLPQuery(msg:any): void {
    switch (msg.messageType){
      case 'NLPquery':{
        let _query = '_FFBOLABClient.executeNLPquery(query="' + msg.query + '")';
        if(this.session.kernel)
        {
          this.session.kernel.requestExecute({ code: _query });
        }
        break;
      }
      default: {
        console.warn('[NM Master]SearchBar Message Type not recognized');
        break;
      }
    }
  }

  connectChild(signal: ISignal<IFFBOChildWidget, object>): void {
    // TODO: Handle synchronization of this with _registerComm()
    signal.connect(this._handleInputActions, this);
  }

  updateNotebook(nbk: NotebookPanel): void {
    nbk.session.kernelChanged.connect(
      (kernel) => {
        console.log('kernel changed in notebook');
        if (VERBOSE) { console.log(`[NM Master] Notebook Kernel Changed for ${nbk.session.path}`);}
        if(nbk.session.kernel)
        {
          if(nbk.session.kernel.model && (this.session.kernel ? nbk.session.kernel.model != this.session.kernel.model : true))
          {
            this.session.changeKernel(nbk.session.kernel.model);
          }
        }
      },
      this
    );
  }

  /**
   * handle user actions in neu3D canvas
   * @param sender 
   * @param value 
   */
  private _handleInputActions(sender: IFFBOChildWidget, value:JSONObject): void{
    if (VERBOSE) { console.log('[NM Master] INPUT:', sender,value)}
    switch (value.action){
      case 'execute':{
        if(this.session.kernel)
        {
          this.session.kernel.requestExecute(<any>value.content);
        }
        break;
      }
      case 'model-add':{
        this.model.append(<string>(<any>value.content).rid, <JSONObject>(<any>value.content).data);
        break;
      }
      case 'model-remove':{
        this.model.remove(<string>(<any>value.content).rid);
        break;
      }
      case 'forward':{
        this._outSignal.emit({type: value.target, data: value.content});
        break;
      }
      case 'state':{
        console.log('[STATE?]');
        console.log(<any>value.content);
        console.log((<any>value.content).species == 'larva');
        if((<any>value.content).species == 'larva') {
          this.workspaceData.larva.data = (<any>value.content).data;
        }
        else {
          this.workspaceData.adult.data = (<any>value.content).data;
        }
        break;
      }
      case 'save':{
        let savedata = {model: '', species: '', json: ''};
        savedata.model = JSON.parse(JSON.stringify(this.model.value));
        savedata.species = this.species;
        savedata.json = (<any>value.content).data.json;
        this.session.kernel.requestExecute({code: "import json\nlateststate = json.loads('"+JSON.stringify(savedata)+"')"});
        // this.session.kernel.requestExecute({code: "_FFBOLabcomm.send({'data': '<p>"+JSON.stringify(savedata)+"</p>', 'messageType':'HTML', 'widget':'popout', 'width':500})"});

        var outBlob = new Blob([JSON.stringify(savedata)], {type: 'application/json'});
        var dlLink = document.createElement('a');
        dlLink.download = this.session.path.split('.')[0] + '.fbl';
        dlLink.href = window.URL.createObjectURL(outBlob);
        dlLink.dataset.downloadurl = ['text/plain', dlLink.download, dlLink.href].join(':');
        dlLink.click();
        console.log(savedata);
        break;
      }
      default : {
        console.warn('action [', value.action, '] not recognized' )
        break;
      }
    }
  }
  
  /**
  * Redo the operation of Register a Comm target on both Client and Server sides on restart
  */
  private _reComm(msg): void {
    if (VERBOSE) { console.log('[NM Master] _reComm, kernel Status:', msg.status);}
    if(msg.status == 'restarting') {
      this.session.kernel.ready.then(() => {
        if (VERBOSE) { console.log('[NM Master] reregistering comms');}

        this._registerComm();
      });
    }
  }

  private commMessageHandler(msg) {
    console.log('['+msg.content.comm_id+'] ', msg.content.data);
    let thisMsg = msg.content.data as JSONObject;
    if (typeof thisMsg.widget == "undefined") {
      return;
    }
    // dispatch messages to corresponding widgets for handling
    switch (thisMsg.widget) {
      case "NLP": {
        if (VERBOSE) {console.log("{NLP emitted}");}
        this._outSignal.emit({type: "NLP", data: thisMsg});

        if ("info" in (thisMsg.data as any)) {
          //if ("success" in (thisMsg.data as any).info && (thisMsg.data as any).info.success == "Finished fetching all results from database" || (thisMsg.data as any).info.success == "Finished processing command")
          if (("success" in (thisMsg.data as any).info && (thisMsg.data as any).info.success != "Fetching results from NeuroArch") || "timeout" in (thisMsg.data as any).info)
          {
            console.log("[MODEL] sent");
            this._outSignal.emit({type: 'model', data: {sender: this.model, value: this.model.value}});
            this.JSONList.set(this.model.names);
          }
        }
        //this._outSignal.emit({type: "GFX", data: thisMsg});
        break;
      }
      case "GFX":{
        if (VERBOSE) {console.log("{GFX emitted}");}
        this._outSignal.emit({type: "GFX", data: thisMsg});
        //this._outSignal.emit({type: "NLP", data: thisMsg});
        break;
      }
      case "INFO":{
        if (VERBOSE) {console.log("{INFO emitted}");}
        this._outSignal.emit({type: "INFO", data: thisMsg});
        break;
      }
      case "JSONEditor":{
        this.JSONList.set({ values: thisMsg.data as JSONObject });
        break;
      }
      case "popout": {
        let tempHeight = NaN;
        let tempWidth = NaN;
        if ('height' in thisMsg) {
          tempHeight = thisMsg.height as number;
        }
        if ('width' in thisMsg) {
          tempWidth = thisMsg.width as number;
        }
        this._makePopup(thisMsg.data as string, tempWidth, tempHeight);
        break;
      }
      case 'import':{
        console.log('[IMPORT]');
        console.log(thisMsg);
        if (thisMsg.species == "larva") {
          this.session.kernel.requestExecute({ code: 'nm_client = 1; _FFBOLABClient = nm[1]' });
          this.species = "larva";
          if(thisMsg.data != '')
          {
            this.model.value = thisMsg.model as any;
            this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'larva', state: thisMsg.data}}});
          }
          else
          {
            this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'larva'}}});
          }
        }
        else {
          this.session.kernel.requestExecute({ code: 'nm_client = 0; _FFBOLABClient = nm[0]' });
          this.species = "adult";
          if(thisMsg.data != '')
          {
            this.model.value = thisMsg.model as any;
            this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'adult', state: thisMsg.data}}});
          }
          else
          {
            this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'adult'}}});
          }
        }
        console.log("[MODEL] sent [switched]");
        this._outSignal.emit({type: 'model', data: {sender: this.model, value: this.model.value}});
        this.JSONList.set(this.model.names);
        this.workspaceData = {adult: {model: '', data: ''}, larva: {model: '', data: ''}};
        break;
      }
      default: {
        console.warn('message widget = ', thisMsg.widget, "not recognized!");
      }
    }
  }


  /**
  * Register a Comm target on both Client and Server sides
  */
  private _registerComm(): Promise<void> {
    if(this.session.kernel)
    {
      console.log(this.session.kernel.model);
    }
    if(this.session.kernel)
    {
      return this.session.kernel.requestCommInfo({ target_name: 'test' }).then((info) => {
        let tempComms = info.content.comms;
        let found = '';
        console.log(tempComms);
        Object.keys(tempComms).forEach(element => {
          console.log(tempComms[element].target_name);
          if(tempComms[element].target_name == TEMPLATE_COMM_ID)
          {
            found = element;
            console.log('DUPLICATE TARGET');
            console.log(element);
          }
        });
        if(found) {
          let testComm = this.session.kernel.connectToComm(this._commId, found);
          console.log(testComm);
          testComm.onMsg = (msg) => {
            this.commMessageHandler(msg);
          };
          testComm.onClose = (msg) => {
            if (VERBOSE) { console.log('[NM] Comm Closed,', this._commId, msg.content.data); }
          };

          // TODO Python Safeguard: dup comm
          // let code = [
          //   // 'from ipykernel.comm import Comm',
          //   // '_FFBOLabcomm = Comm(target_name="' + this._commId + '")',
          //   '_FFBOLabcomm.send(data="FFBOLab comm established")',
          //   '_FFBOLabcomm.send(data="Generating FFBOLab Client...")',
          //   // 'import flybrainlab as fbl',
          //   // '_FFBOLABClient = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)',
          //   'nm = []',
          //   'nm.append(_FFBOLABClient)',
          // ].join('\n');
          let code = [
            // 'from ipykernel.comm import Comm',
            // '_FFBOLabcomm = Comm(target_name="' + this._commId + '")',
            '_FFBOLabcomm.send(data="FFBOLab comm established")',
            '_FFBOLabcomm.send(data="Generating FFBOLab Client...")',
            // 'import flybrainlab as fbl',
            '_FBLAdult = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)',
            '_FFBOLABClient = _FBLAdult',
            'nm = []',
            'nm.append(_FBLAdult)',
            "_FBLLarva = fbl.Client(FFBOLabcomm = _FFBOLabcomm, legacy = True, url = u'wss://neuronlp.fruitflybrain.org:9020/ws')",
            'nm.append(_FBLLarva)',
            'nm_client = 0'
          ].join('\n');
          
          // console.log('before requestExecute');
          // console.log(this.session.kernel);
          return this.session.kernel.requestExecute({ code: code }).done.then(() => {
            window.FFBOLabsession = this.session;
            // console.log('after requestExecute');
          });

          return Promise.resolve(void 0);
        }
        this.session.kernel.registerCommTarget(this._commId,(comm, commMsg)=>{
          if (commMsg.content.target_name !== this._commId) {
            return;
          }
          comm.onMsg = (msg) => {
            this.commMessageHandler(msg);
          };
          comm.onClose = (msg) => {
            if (VERBOSE) { console.log('[NM] Comm Closed,', this._commId, msg.content.data); }
          };
        });
        
        // TODO Python Safeguard: dup comm
        let code = [
          'from ipykernel.comm import Comm',
          '_FFBOLabcomm = Comm(target_name="' + this._commId + '")',
          '_FFBOLabcomm.send(data="FFBOLab comm established")',
          '_FFBOLabcomm.send(data="Generating FFBOLab Client...")',
          'import flybrainlab as fbl',
          '_FBLAdult = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)',
          '_FFBOLABClient = _FBLAdult',
          'nm = []',
          'nm.append(_FBLAdult)',
          "_FBLLarva = fbl.Client(FFBOLabcomm = _FFBOLabcomm, legacy = True, url = u'wss://neuronlp.fruitflybrain.org:9020/ws')",
          'nm.append(_FBLLarva)',
          'nm_client = 0'
        ].join('\n');
        
        // console.log('before requestExecute');
        // console.log(this.session.kernel);

        return this.session.kernel.requestExecute({ code: code }).done.then(() => {
          window.FFBOLabsession = this.session;
          // console.log('after requestExecute');
        });
      });
    }
    return Promise.resolve(void 0);
  }
    /**
   * Create a client session object. 
   * 
   * @param options: `ClientSession.IOptions` 
   * @returns
   * A promise that returns a new `ClientSession` instance when resolved
   */
  private _createClientSession(options: ClientSession.IOptions): Promise<ClientSession> {
    let manager = options.manager;
    return manager.ready.then(() => {
      return new ClientSession({
        manager,
        path: options.path || DEFAULT_SESSION_OPTS.path,
        name: "FFBOLab: " + options.path,
        type: options.type,
        kernelPreference: options.kernelPreference || {
          shouldStart: true,
          canStart: true,
          name: manager.specs.default
        }
      });
      // return new ClientSession({
      //   manager,
      //   path: options.path || DEFAULT_SESSION_OPTS.path, // uuid()
      //   name: options.name || DEFAULT_SESSION_OPTS.name,
      //   type: options.type || DEFAULT_SESSION_OPTS.type,
      //   kernelPreference: options.kernelPreference || DEFAULT_SESSION_OPTS.kernelPreference
      // });
    });
  }

  /**
   * Spawn Dialog to specify session options and sets `_sessionOpts`
   */
  private _changeSessionOpts(cancellable?: boolean): Promise<void> {
    if (this.isDisposed) {
      return Promise.resolve(void 0);
    }
    const buttons = (cancellable) ? 
    [ Dialog.cancelButton(), Dialog.okButton({ label: 'CHANGE' }) ]:
    [ Dialog.okButton({ label: 'SPAWN' })];

    let dialog = this._dialog = new Dialog({
      title: 'FFBOLab Session Specs',
      body: new Private.FFBOLabSessionSpec(this.session),
      buttons
    });

    return dialog.launch().then(result => {
      if (this.isDisposed || !result.button.accept) {
        return;
      }

      this._sessionOpts.path = result.value.path;
      //this._sessionOpts.name = result.value.name;
      //this._sessionOpts.type = result.value.type;
    }).then(() => { this._dialog = null; });
  }

  /**
   * Spawn Dialog to select Kernel
   */
  private _selectKernel(): Promise<void> {
    return this.session.selectKernel();
  }

  /**
  * A promise that resolves when the FFBOLab widget is ready
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

  _createSaveLoad(): HTMLElement{
    let divfloat1 = document.createElement('div');
    let divfloat2 = document.createElement('div');
    let filein = document.createElement('input');
    let fileaccept = document.createElement('button');
    fileaccept.id = 'fileSubmit';
    fileaccept.innerText = "Submit";
    filein.id = 'fileForUpload';
    filefloat.className = 'NM-filein';
    filein.type = "file";
    filein.accept = ".fbl";
    fileaccept.onclick = (e) => {
      var file = (<any>document.getElementById("fileForUpload")).files[0];
      console.log('INFILE: ' + file.name);
      if (file) {
          var reader = new FileReader();
          reader.readAsText(file, "UTF-8");
          reader.onload = (evt) => {
              console.log(JSON.parse((<any>evt.target).result));
              var thisMsg = JSON.parse((<any>evt.target).result);
              console.log('[IMPORT from file]');
              console.log(thisMsg);
              if (thisMsg.species == "larva") {
                this.session.kernel.requestExecute({ code: 'nm_client = 1; _FFBOLABClient = nm[1]' });
                this.species = "larva";
                if(thisMsg.data != '')
                {
                  this.model.value = thisMsg.model as any;
                  this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'larva', state: {state: '', json: thisMsg.json}}}});
                }
                else
                {
                  this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'larva'}}});
                }
              }
              else {
                this.session.kernel.requestExecute({ code: 'nm_client = 0; _FFBOLABClient = nm[0]' });
                this.species = "adult";
                if(thisMsg.data != '')
                {
                  this.model.value = thisMsg.model as any;
                  this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'adult', state: {state: '', json: thisMsg.json}}}});
                }
                else
                {
                  this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'adult'}}});
                }
              }
              console.log("[MODEL] sent [switched]");
              this._outSignal.emit({type: 'model', data: {sender: this.model, value: this.model.value}});
              this.JSONList.set(this.model.names);
              this.workspaceData = {adult: {model: '', data: ''}, larva: {model: '', data: ''}};
              this.node.removeChild(filefloat);
          }
          reader.onerror = function (evt) {
              console.log("error reading file");
              return;
          }
      }
    };
    divfloat2.style.cssFloat = 'right';
    divfloat1.appendChild(filein);
    divfloat2.appendChild(fileaccept);
    filefloat.appendChild(divfloat1);
    filefloat.appendChild(divfloat2);
    return filefloat;
  }

  _createSearchBox(): HTMLElement{
    let container = document.createElement('div');

    let logo = document.createElement("img");
    logo.className = "jp-FFBOLabMasterLogo";
    logo.src = "https://ffbolab.neurogfx.fruitflybrain.org/flylablogo_basic.png";

    container.appendChild(logo);

    let divWrap = document.createElement("div");
    divWrap.className = "wrap";
    let divSearch = document.createElement("div");
    divSearch.className = "search";
    divWrap.appendChild(divSearch);
    let sbar = document.createElement('input');
    sbar.className = "searchTerm";
    divSearch.appendChild(sbar);
    let buttonEl = document.createElement("button");
    buttonEl.className = "searchButton";
    divSearch.appendChild(buttonEl);
    let iEl = document.createElement("i");
    iEl.className = "fa fa-search";
    buttonEl.appendChild(iEl);
    sbar.placeholder = 'Enter NLP query...';
    // set searchbar callbacks after session is setup
    sbar.addEventListener('keydown', (event) => {
      if (event.keyCode == 13) {
        if (sbar.value.length == 0) {
          return;
        }
        this._handleNLPQuery({ query: sbar.value, messageType: 'NLPquery' });
        //postMessage({ query: sbar.value, messageType: 'NLPquery' }, '*');
        // window.neurogfxWidget.contentWindow.postMessage({ messageType: "GFXquery", data: sbar.value }, '*');
        this._outSignal.emit({type: "GFX", data: { messageType: "GFXquery", data: sbar.value }});
        sbar.value = "";
      }
    });

    buttonEl.onclick = () => {
      this._handleNLPQuery({ query: sbar.value, messageType: 'NLPquery' });
      // console.log('clicked, query fired');
      //postMessage({ query: sbar.value, messageType: 'NLPquery' }, '*');
      // window.neurogfxWidget.contentWindow.postMessage({ messageType: "GFXquery", data: sbar.value }, '*');
      this._outSignal.emit({type: "GFX", data: { messageType: "GFXquery", data: sbar.value }});
      sbar.value = ""; 
    };

    container.appendChild(divWrap);

    return container;
  }

  /**
   * Populate Master Widget Toolbar
   */
  _populateToolBar(toolbar:Toolbar<Widget>):void {

    toolbar.insertItem(0,
      'compile',
      this._createButton('fas fa-code', 'Compile Circuit', 'jp-SearchBar-Compile',
        () => {
          if (VERBOSE) { console.log('[NM Master] compiling')}
          if(this.session.kernel)
          {
            this.session.kernel.requestExecute({ code: '_FFBOLABClient.prepareCircuit()' });
          }
        }
      )
    );

    toolbar.addItem(
      'simulate',
      this._createButton('fas fa-play-circle', 'Simulate Circuit', 'jp-SearchBar-Simulate',
        () => {
          // this.session.kernel.requestExecute({ code: '_FFBOLABClient.sendExecuteReceiveResults("auto")' });
          window.neurogfxWidget.contentWindow.postMessage({ messageType: "getExperimentConfig", data: {} }, '*');
          this.session.kernel.requestExecute({ code: '_FFBOLABClient.initiateExperiments()' });
          
          // window.neurogfxWidget.contentWindow.postMessage({ messageType: "simulate", data: {} }, '*');
          //this._outSignal.emit({type: "GFX", data: { messageType: "simulate", data: {} }});
        }
      )
    );

    toolbar.addItem(
      'layoutview',
      this._createButton('fas fa-share-alt-square', 'Layout Circuit without Synapses', 'jp-SearchBar-Layout',
        () => {
          if(this.session.kernel)
          {
            this.session.kernel.requestExecute({ code: '_FFBOLABClient.runLayouting("frontend", model="simple")' });
          }
          //window.neurogfxWidget.contentWindow.postMessage({ messageType: "getExperimentConfig", data: {} }, '*');
        }
      )
    );

    toolbar.addItem(
      'layout',
      this._createButton('fas fa-share-alt', 'Layout Circuit', 'jp-SearchBar-Layout',
        () => {
          if(this.session.kernel)
          {
            this.session.kernel.requestExecute({ code: '_FFBOLABClient.runLayouting("frontend")' });
          }
          //window.neurogfxWidget.contentWindow.postMessage({ messageType: "simulate", data: {} }, '*');
        }
      )
    );

    toolbar.addItem(
      'plotter',
      this._createButton('fas fa-chart-area', 'Toggle Plotter', 'jp-SearchBar-Plotter',
        () => {
          //window.neurogfxWidget.contentWindow.postMessage({ messageType: "togglePlotter", data: {} }, '*');
          this._outSignal.emit({type: "GFX", data: { messageType: "togglePlotter", data: {} }});
        }
      )
    );

    toolbar.addItem(
      'settings',
      this._createButton('fas fa-list-alt', 'Experiment Settings', 'jp-SearchBar-Settings',
        () => {
          if(this.session.kernel)
          {
            this.session.kernel.requestExecute({ code: '_FFBOLABClient.listInputs()' });
          }
        }
      )
    );

    toolbar.addItem(
      'syncer',
      this._createButton('fas fa-pen-square', 'Sync Variable', 'jp-SearchBar-Sync',
        () => {
          // TODO: SingleNeuronStr handling
          var wholeCircuitStr = JSON.stringify(window.FFBOLabWidget.JSONList.get());
          // var SingleNeuronStr = JSON.stringify(window.FFBOLabWidget.InfoWidget.INFOList.jsoneditor.get());
          if(this.session.kernel)
          {
            this.session.kernel.requestExecute({ code: '_FFBOLABClient.updateBackend(type = "WholeCircuit",data = """' + wholeCircuitStr + '""")' });
          }
          // window.FFBOLabsession.kernel.requestExecute({ code: '_FFBOLABClient.updateBackend(type = "SingleNeuron",data = """' + SingleNeuronStr + '""")' });
          this._outSignal.emit({type: "INFO", data: "save"});
        }
      )
    );

    toolbar.addItem(
      'workspace-switch',
      this._createButton('fas fa-toggle-on', 'Switch Workspace', 'jp-SearchBar-Settings',
        () => {
          if (this.session.kernel) {
            this.session.kernel.requestExecute({ code: 'nm_client = 1 - nm_client; _FFBOLABClient = nm[nm_client]' });
            if (this.species == "adult") {
              this.workspaceData.adult.model = JSON.parse(JSON.stringify(this.model.value));
              this.species = "larva";
              if(this.workspaceData.larva.data != '')
              {
                this.model.value = this.workspaceData.larva.model;
                this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'larva', state: this.workspaceData.larva.data}}});
              }
              else
              {
                this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'larva'}}});
              }
            }
            else {
              this.workspaceData.larva.model = JSON.parse(JSON.stringify(this.model.value));
              this.species = "adult";
              if(this.workspaceData.adult.data != '')
              {
                this.model.value = this.workspaceData.adult.model;
                this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'adult', state: this.workspaceData.adult.data}}});
              }
              else
              {
                this._outSignal.emit({type: "NLP", data: {messageType: 'switchWorkspace', data: {species: 'adult'}}});
              }
            }
            console.log("[MODEL] sent [switched]");
            this._outSignal.emit({type: 'model', data: {sender: this.model, value: this.model.value}});
            this.JSONList.set(this.model.names);
          }
        }
      )
    );
    /*
    toolbar.addItem(
      'workspace-save',
      this._createButton('fas fa-save', 'Save Workspace', 'jp-SearchBar-Settings',
        () => {this._outSignal.emit({type: "NLP", data: {messageType: 'save', data: {}}});}
      )
    );

    toolbar.addItem(
      'workspace-load',
      this._createButton('fas fa-upload', 'Load Workspace', 'jp-SearchBar-Settings',
        () => {this.node.appendChild(filefloat);}
      )
    );
  */
    toolbar.addItem(
      'open-notebook',
      this._createButton('fas fa-book-open', 'Open Notebook', 'jp-SearchBar-Open-Notebook',
        () => {
          if (VERBOSE) { console.log('openning notebook');}

          if(!this.session.kernel)
          {
            this.session.kernel.restart();
          }

          this.session.kernel.ready.then(() => {
            window.JLabApp.commands.execute('docmanager:open', {
              path: this.session.path,
              kernel: this.session.kernel.model
            })
            .catch(() => {
              window.JLabApp.commands.execute(
                'docmanager:new-untitled', { type: 'notebook'}
              ).then(model => {
                if (VERBOSE) { console.log(model);}
                window.JLabApp.commands.execute('docmanager:open', {
                  path: model.path,
                  kernel: this.session.kernel.model
                })
                .then((_nbk) => {
                  this.updateNotebook(_nbk);
                });
              });
            });
          });
        }
      )
    );

    toolbar.addItem('spacer', Toolbar.createSpacerItem());
    toolbar.addItem('restart', Toolbar.createRestartButton(this.session));
    toolbar.addItem('kernelName', Toolbar.createKernelNameItem(this.session));
    toolbar.addItem(
      'kernelStatus',
      Toolbar.createKernelStatusItem(this.session)
    );

  }

  _createButton(icon: string, tooltip: string, className: string, func: () => void): ToolbarButton {
    let btn = new ToolbarButton({
      iconClassName: icon,
      className: className,
      onClick: func,
      tooltip: tooltip
    } as any);

    // let i = document.createElement('i');
    // i.classList.add('fa', ...icon.split(' '));
    // btn.node.classList.add('ffbolab-button');
    // btn.node.appendChild(i);
    return btn;
  }

  _makePopup(contents: string, width, height) {
    if (isNaN(width)) {
      width = 300;
    }
    if (isNaN(height)) {
      height = 300;
    }
    let newWindow = open('about:blank', 'example', 'width='+width+', height='+height);
    newWindow.document.head.insertAdjacentHTML('afterend','<base href="localhost:8888">')
    newWindow.document.body.innerHTML = (contents);
  }
  /**
  * The Elements associated with the widget.
  */
  private _commId: string;
  private _ready = new PromiseDelegate<void>();
  private _isDisposed = false;
  private _sessionOpts : ClientSession.IOptions;
  private _dialog: Dialog<any>;

  private _outSignal = new Signal<this, object>(this);

  readonly model: FFBOLabModel;
  public species: any;
  private workspaceData: any;
  public session: ClientSession;
  private toolbar: Toolbar<Widget>;

  public JSONList: JSONEditor;
};

/**
 * Private Namespace for internally used 
 */
namespace Private {
  /**
   * Create a Widget that specifies Session Options for current widget
   */
  export
  class FFBOLabSessionSpec extends Widget {
    /**
     * Create a new kernel selector widget.
     * 
     * @param currentOptions: current ClientSession.IOptions object
     */
    constructor(session?: ClientSession) {
      super({ node: createNode(session || null) });
    }
    /**
     * Get the value of the session specifier widget.
     * 
     * @return `Partial<ClientSession.IOptions>`, should at least return 
     *  {'name','type','path'}
     */
    getValue(): Partial<ClientSession.IOptions> {
      let inputs = this.node.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

      let opts = {
        path: inputs[0].value,
        //name: inputs[1].value,
        //type: inputs[2].value,
      }
      return opts as Partial<ClientSession.IOptions>;
    }
  }

  /**
   * Create a node for a Session Specification widget.
   * 
   * ### Note
   * The Session now only takes path as optional input, no other input is used. 
   */
  function createNode(session?:ClientSession): HTMLDivElement {
    // Create the dialog body.
    let body = document.createElement('div');
    
    // name is used as path to notebook
    let inputPath = document.createElement('input');
    //let inputName = document.createElement('input');
    //let inputType = document.createElement('input');


    if (session){
      inputPath.value = session.path;
      //inputName.value = session.name;
      //inputType.value = session.type;
    }else{
      inputPath.placeholder = 'enter session Path ('+ DEFAULT_SESSION_OPTS.path + ')';
      //inputName.placeholder = 'enter session Name'+ DEFAULT_SESSION_OPTS.name;
      //inputType.placeholder = 'enter session Type'+ DEFAULT_SESSION_OPTS.type;
    }
  
    body.appendChild(inputPath);
    //body.appendChild(inputName);
    //body.appendChild(inputType);
    return body;
  }
}