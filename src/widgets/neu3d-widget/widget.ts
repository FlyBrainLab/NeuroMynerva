import Neu3D from 'neu3d';
import { Message } from '@lumino/messaging';
import { Signal, ISignal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';
import { ToolbarButton, showDialog, Dialog } from '@jupyterlab/apputils';
import { LabIcon, settingsIcon } from '@jupyterlab/ui-components';
import { INotification } from "jupyterlab_toastify";

import { Neu3DModel, INeu3DModel } from './model';
import { AdultMesh } from './adult_mesh';
import { LarvaMesh } from './larva_mesh';
import { HemibrainMesh } from './hemibrain_mesh';
import { IFBLWidget, FBLWidget } from '../template-widget/index';
import * as Icons from '../../icons';
import '../../../style/widgets/neu3d-widget/neu3d.css';
import { FFBOProcessor } from '../../ffboprocessor';

const Neu3D_CLASS_JLab = "jp-FBL-Neu3D";

/**
 * Check if object is empty
 * @param obj 
 */
function objEmpty(obj: any): boolean {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

/**
 * Convert integer Hex to rgb format
 * @param hex 
 */
function toHexString( hex: number ) {
  hex = Math.floor( hex );
  return ( '000000' + hex.toString( 16 ) ).slice( - 6 );
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

declare global {
  interface Window {
    neu3d_widget: any; // Latest created neu3d widget
    active_neu3d_widget: any; // Latest actively accessed neu3d widget
  }
}


/**
* An Neu3D Widget
*/
export class Neu3DWidget extends FBLWidget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super({
      name:options.name || `Neu3D-${options._count ? Private.count+=options._count : Private.count++}`,
      icon: Icons.neu3DIcon,
      ...options});

    // load in meshes
    this.info = options.info;
    this._adultMesh = AdultMesh;
    this._larvaMesh = LarvaMesh;
    this._hemibrainMesh = HemibrainMesh;

    this.addClass(Neu3D_CLASS_JLab);
    this._neu3dContainer = document.createElement('div');
    this._neu3dContainer.style.height = 'calc(100% - 40px)';
    this._neu3dContainer.style.width = '100%';
    this.node.appendChild(this._neu3dContainer);
    this._neu3dSearchbar = document.createElement('div');
    this._neu3dSearchbar.classList.add("navbar");
    this._neu3dSearchbar.style.height = '40px';
    this._neu3dSearchbar.style.background = '#333333';
    this.node.appendChild(this._neu3dSearchbar);
    var searchWrapper = document.createElement('div');
    searchWrapper.classList.add("neu3dSearchWrapper");
    var searchInput = document.createElement('input');
    searchInput.classList.add("neu3dSearchInput");
    searchInput.type = "text";
    searchInput.placeholder = "Write Query (Example: show neurons in ellipsoid body)";
    var searchButton = document.createElement('button');
    searchButton.classList.add("neu3dSearchButton");
    searchButton.type = "submit";
    var searchButtonIcon = document.createElement('i');
    searchButtonIcon.classList.add("fa");
    searchButtonIcon.classList.add("fa-search");
    searchButton.appendChild(searchButtonIcon);
    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(searchButton);
    // initialized with no kernel
    // if (this.sessionContext.session  === null) {
    //   searchInput.style.display ='none';
    //   searchButton.style.display ='none';
    // }
    this._neu3dSearchbar.appendChild(searchWrapper);

    window.neu3d_widget = this;
    var _this = this;
    searchButton.onclick = function () {
      _this.executeNLPquery(searchInput.value);
      searchInput.value = "";
    }
    searchInput.addEventListener('keyup', ({key}) => {
      if (key === "Enter") {
        _this.executeNLPquery(searchInput.value);
        searchInput.value = "";
      }
    });

    if (options.model?.metadata || options.model?.states) {
      this.neu3DReady.then(()=>{
        this._blockingDiv = document.createElement('div');
        this._blockingDiv.className = "jp-Dialog-header";
        this._blockingDiv.style.height= '80px';
        this._blockingDiv.style.top= 'calc(50% - 40px)';
        this._blockingDiv.style.position = 'absolute';
        this._blockingDiv.style.width= '100%';
        this._blockingDiv.style.backgroundColor = 'var(--jp-warn-color3)';
        this._blockingDiv.style.opacity = '.8';
        this._blockingDiv.style.display = 'flex';
        this._blockingDiv.style.alignItems = 'center';
        this._blockingDiv.style.justifyContent = 'center';
        this._blockingDiv.style.fontSize = '2rem';
        this._blockingDiv.innerText = `Reload previous visualization settings?`
        let acceptBtn = document.createElement('button');
        acceptBtn.innerText = "Yes"
        acceptBtn.className = "jp-Dialog-button jp-mod-accept jp-mod-styled";
        acceptBtn.onclick = ()=>{
          try {
            if (!objEmpty(options.model?.metadata)) {
              this.neu3d.import_settings(options.model.metadata)
            }
            if (!objEmpty(options.model?.states)) {
              this.neu3d.import_state(options.model.states);
            }
          } catch (error) {
            this.model.metadata = this.neu3d.export_settings();
            this.model.states = this.neu3d.export_state();
            console.error(`[Neu3D-Widget] Visualization Settings Restore Failed. Ignoring previous settings.`, error);
          }
          this._blockingDiv.remove();
        };
        let cancelBtn = document.createElement('button');
        cancelBtn.innerText = "No"
        cancelBtn.className = "jp-Dialog-button jp-mod-reject jp-mod-styled";
        cancelBtn.onclick = ()=>{
          this.model.metadata = this.neu3d.export_settings();
          this.model.states = this.neu3d.export_state();
          this._blockingDiv.remove();
        };
        this._blockingDiv.appendChild(cancelBtn);
        this._blockingDiv.appendChild(acceptBtn);

        this.node.insertBefore(this._blockingDiv, this.node.childNodes[0]);
      })
    }
  }

  // /**
  //  * When kernel does not exist, hide search bar
  //  * @param contexts
  //  * @param args 
  //  */
  // async onKernelChanged(
  //   context: ISessionContext,
  //   args: Session.ISessionConnection.IKernelChangedArgs
  // ){
  //   const newKernel: Kernel.IKernelConnection | null = args.newValue;
  //   const inputWrapperDiv = this._neu3dSearchbar.children[0] as HTMLDivElement;
  //   if (newKernel === null ){  
  //     for (const el of inputWrapperDiv.children) {
  //       (el as HTMLElement).style.display = "none";
  //     }
  //   } else {
  //     for (const el of inputWrapperDiv.children) {
  //       (el as HTMLElement).style.display = "inline-block";
  //     }
  //   }
  //   super.onKernelChanged(context, args);
  // }

  dispose() {
    this.neu3d.dispose();
    delete this.neu3d;
    super.dispose();
  }

  initFBLCode(): string {
    return super.initFBLCode();
  }

  initModel(model: Partial<INeu3DModel>){
    // create model
    this.model = new Neu3DModel(model);
    this.model.dataChanged.connect(this.onDataChanged, this);
    this.model.metadataChanged.connect(this.onMetadataChanged, this);
    this.model.statesChanged.connect(this.onStatesChanged, this);
  }

  /**
   * Render objects stored within model
   * 
   * Currently used for state restoration on reload
   * Currently re-rendering the whole scene regardless
   * 
   * TODO: Handle incremental rendering for model change
   * 
   * @param change 
   */
  renderModel(change?: any): void {
    for (const [key, value] of Object.entries(this.model.data)) {
      let data: any = {};
      data[key] = value;
      const color = (value as any).color;
      if (typeof(color) === 'number') {
        (value as any).color = toHexString(color);
      }
      if ('type' in (value as any)) {
        this.neu3d.addJson({ ffbo_json: data, type: (value as any).type });
      } else{
        this.neu3d.addJson({ ffbo_json: data });
      }
    }


    // if (change) {
    //   this.neu3d.addJson({ ffbo_json: this.model.data });
    // } else {
    //   // complete reset
    //   this.neu3d.addJson({ ffbo_json: this.model.data });
    // }
  }

  onDataChanged(change: any) {
    // this.renderModel(change);
    // do nothing
    return;
  }

  onStatesChanged(change: any) {
    // this.renderModel(change);
    // no-op
    return;
  }

  onMetadataChanged(change: any) {
    // do nothing
    // this.renderModel(change);
    return;
  }

  get workspaceChanged(): ISignal<this, any> {
    return this._workspaceChanged;
  }

  /**
   * Handle Command CommMsg
   * @param message 
   */
  _receiveCommand(message: any) {
    if (!('commands' in message))
      return;
    if ('reset' in message['commands']) {
      this.neu3d.reset();
      delete message.commands.reset;
    }
    for (var cmd in message["commands"])
      this.neu3d.execCommand({
        "commands": [cmd],
        "neurons": message["commands"][cmd][0], 
        "args": message['commands'][cmd][1] 
      });
  }

  /**
   * Handle Messages for Comm or Info
   * @param msg 
   */
  onCommMsg(msg: any) {
    super.onCommMsg(msg);
    let thisMsg = msg.content.data as any;
    console.log('NLP received message:', thisMsg)
    if (!['NLP', 'INFO'].includes(thisMsg.widget)) {
      return;
    }

    if (thisMsg.widget == 'NLP') {
      switch (thisMsg.messageType) {
        case "Message": {
          if (thisMsg.data.info.success) {
            INotification.success(thisMsg.data.info.success);  
          } else if (thisMsg.data.info.error) {
            INotification.error(thisMsg.data.info.error);  
          }
          console.log('[NEU3D] Message received.', thisMsg.data);
          break;
        }
        case "Data": {
          if (thisMsg.data.data){
            let rawData = thisMsg.data.data
            if (Object.keys(rawData)[0][0] == '#') {  // check if returned contain rids for neuron morphology data
              // this.n3dlog.push(JSON.parse(JSON.stringify(rawData)));
              let neu3Ddata = { ffbo_json: rawData, type: 'morphology_json' }
              this.neu3d.addJson(neu3Ddata);
            }
            else {
              let neu3Ddata = { ffbo_json: rawData, type: 'general_json' }
              this.neu3d.addJson(neu3Ddata);
            }
          } else {
            // no-op
          }
          break;
        }
        /*case "statePush": {
          let tempstate = thisMsg.data;
          tempstate.json.forEach((element) => {
            this.n3dlog.push(JSON.parse(JSON.stringify(element)));
            // console.log(JSON.parse(JSON.stringify(element)));
            let neu3Ddata = { ffbo_json: JSON.parse(JSON.stringify(element)), type: 'morphology_json' };
          });
          break;
        }
        case "save": {
          this._userAction.emit({ action: 'save', content: { origin: 'NLP', data: {state: this.neu3D.export_state(), json: this.n3dlog }} });
          break;
        }*/
        default: {
          console.log('[NEU3D] RESET', thisMsg.data);
          // this.n3dlog = [];
          this._receiveCommand(thisMsg.data);
          break;
        }

      }
    } else { // INFO
      if (thisMsg.data.messageType !== 'Data') {
        return;
      }
      // trigger datachanged event for info panel, will cause re-rendering of data
      this.info?.dataChanged.emit({
        data: thisMsg.data.data.data,
        inWorkspace: this.isInWorkspace,
        neu3d: this
      });
    }
  }


  /**
   * Check if an object is in the workspace.
   *
   * @param rid -  rid of target object (neuron/synapse)
   * @returns  if object in workspace
  */
  isInWorkspace(rid: string): boolean {
    if(this.model?.data)
    {
      return (rid in this.model.data);
    }
    return false;
  }

  /** 
   * Fires a query
   */
  querySender(): string {
    let code = `
    fbl.client_manager.clients['${this.clientId}']['client'].executeNAquery(res)
    `;

    return code;
  }


  /** 
   * Fires an NLP query
   */
  NLPquerySender(): string {
    let code = `
    fbl.client_manager.clients['${this.clientId}']['client'].executeNLPquery(res)
    `;

    return code;
  }

  /**
   * Method passed to info panel to ensure stateful data
   * 
   * Addresses 
   * @param command 
   */
  infoCommandWrapper(command: any){ 

  }

  /** 
   * Add an object into the workspace.
   *
   * @param uname -  uname of target object (neuron/synapse)
   */
  async addByUname(uname: string): Promise<any> {
    let code = `
    res = {}
    res['verb'] = 'add'
    res['query']= [{'action': {'method': {'query': {'uname': '${uname}'}}},
                    'object': {'class': ['Neuron', 'Synapse']}}]
    `;

    code = code + this.querySender();

    let result = await this.sessionContext.session.kernel.requestExecute({code: code}).done;
    console.log('addByUname', uname, result);
    return result;
  }

  /**
   * Remove an object into the workspace.
   *
   * @param uname -  uname of target object (neuron/synapse)
   */
  async removeByUname(uname: string): Promise<any> {
    let code = `
    res = {}
    res['verb'] = 'remove'
    res['query']= [{'action': {'method': {'query': {'uname': '${uname}'}}},
                    'object': {'class': ['Neuron', 'Synapse']}}]
    `;

    code = code + this.querySender();

    let result = await this.sessionContext.session.kernel.requestExecute({code: code}).done;
    console.log('removeByUname', uname, result);
    return result;
  }

  /** 
   * Add an object into the workspace.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  async addByRid(rid: string): Promise<any> {
    let code = `
    res = {}
    res['verb'] = 'add'
    res['query']= [{'action': {'method': {'query': {'rid': '${rid}'}}},
                    'object': {'rid': '${rid}'}}]
    res['format'] = 'morphology'
    `;

    code = code + this.querySender();

    let result = await this.sessionContext.session.kernel.requestExecute({code: code}).done;
    console.log('addByRid', rid, result);
    return result;
  }


  /** 
   * Remove an object from the workspace.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  async removeByRid(rid: string): Promise<any> {
    let code = `
    res = {}
    res['verb'] = 'remove'
    res['query']= [{'action': {'method': {'query': {'rid': '${rid}'}}},
                    'object': {'rid': '${rid}'}}]
    `;

    code = code + this.querySender();

    let result = await this.sessionContext.session.kernel.requestExecute({code: code}).done;
    console.log('removeByRid', rid, result);
    return result;
  }

  /** 
   * Send an NLP query.
   *
   * @param query -  query to send(text)
   */
  async executeNLPquery(query: string): Promise<any> {
    let code = `
    res = '${query}'

    `;

    code = code + this.NLPquerySender();

    let result = await this.sessionContext.session.kernel.requestExecute({code: code}).done;
    console.log('NLPquery', result);
    return result;
  }

  /**
   * Get Info of a given neuron
   * @return a promise that resolves to the reply message when done 
   */
  executeInfoQuery(uname: string): any {
    let code_to_send = `
    fbl.client_manager.clients[fbl.widget_manager.widgets['${this.id}'].client_id]['client'].getInfo('${uname}')
    `
    return this.sessionContext.session.kernel.requestExecute({code: code_to_send});
  }
  
  /** 
   * Instantiate Neu3D and add to DOM after widget attached to DOM 
   * */
  onAfterAttach(msg: Message){
    super.onAfterAttach(msg);
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

    /** Get Neuron Information */
    this.neu3d.on('click', (e: INeu3DMessage) => {
      this.executeInfoQuery(e.value);
    });

    /** Add Mesh */
    this.neu3d.meshDict.on('add', (e:INeu3DMessage) => {
      this.model.addMesh(e.prop, e.value);
      this._modelChanged.emit(e);
      this._workspaceChanged.emit(e);
    });

    /** Remove Mesh */
    this.neu3d.meshDict.on('remove', (e:INeu3DMessage) => {
      this.model.removeMesh(e.prop)
      this._modelChanged.emit(e);
      this._workspaceChanged.emit(e);
    });

    /** Pin/UnPin */
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
      this._modelChanged.emit(e);
    },
    'pinned');

    /** Hide/Show */
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
      this._modelChanged.emit(e);
    },
    'visibility');

    /** Visualization Setting */
    this.neu3d.settings.on("change", ((e:any) => {
      let settings = this.neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), [
        "pinLowOpacity", "pinOpacity", "defaultOpacity", "backgroundOpacity",
        "backgroundWireframeOpacity", "synapseOpacity",
        "highlightedObjectOpacity", "nonHighlightableOpacity", "lowOpacity"
      ]);

    this.neu3d.settings.on('change', ((e:any) => {
      let settings = this.neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), ['radius', 'strength', 'threshold', 'enabled']);
  
    this.neu3d.settings.toneMappingPass.on('change', ((e:any) => {
      let settings = this.neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), 'brightness');

    this.neu3d.settings.on('change', ((e:any) => {
      let settings = this.neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), 'backgroundColor');

    /** trackball control end interaction save camera*/
    this.neu3d.controls.addEventListener('end', (e:any)=>{
      let states = this.neu3d.export_state();
      this.model.states = states;
      this.model._statesChanged.emit(states);
      this._modelChanged.emit(e);
    });

    /** State Setting */
    this.neu3d.states.on('change',
    (e: any) => {
      let states = this.neu3d.export_state();
      this.model.states = states;
      this.model._statesChanged.emit(states);
      this._modelChanged.emit(e);
    }, 'highlight');

    if (!objEmpty(this.model.metadata)) {
      this.neu3d.import_settings(this.model.metadata);
    }
    if (!objEmpty(this.model.states)) {
      this.neu3d.import_state(this.model.states);
    }
    this.model.metadata = this.neu3d.export_settings();
    this.model.states = this.neu3d.export_state();
    this.renderModel();
    this._neu3DReady.resolve(void 0);
  }

  /**
   * Instantiate neu3d and setup callback hooks after widget is shown
   * @param msg 
   */
  onAfterShow(msg: Message){
    this.neu3d?.onWindowResize();
    if (!objEmpty(this.model.metadata)) {
      this.neu3d?.import_settings(this.model.metadata);
    }
    if (!objEmpty(this.model.states)) {
      this.neu3d?.import_state(this.model.states);
    }
    super.onAfterShow(msg);
  }

  /**
   * Propagate resize event to neu3d
   * @param msg 
   */
  onResize(msg: any) {
    super.onResize(msg);
    this.neu3d?.onWindowResize();
  }
  
  /** 
   * Returns processor
   */
  get processor(): string {
    return this._processor
  }

  get neu3DReady(): Promise<void> {
    return this._neu3DReady.promise;
  }

  /**
   * Set processor
   * @param newProcessor new processor to be added
   */
  set processor(newProcessor: string) {
    if (newProcessor === this._processor) {
      return;
    }

    if (newProcessor === FFBOProcessor.NO_PROCESSOR){
      (this._neu3dSearchbar.children[0].children[0] as HTMLInputElement).placeholder = 'Not connected to database.';
      this._processorChanged.emit(newProcessor);
      this._processor = newProcessor;
      return;
    }
    if (!(newProcessor in this.ffboProcessors)){
      return;
    }
  
    this._processorChanged.emit(newProcessor);
    this._processor = newProcessor;

    let removeNeurons = false;
    this.neu3DReady.then(()=>{
      let selected = new PromiseDelegate();
      if ((this.neu3d as any).groups.front.children.length > 0){
        showDialog({
          title: 'Remove Neurons/Synapses?',
          body: `
            Current Neu3D contains neurons/synapses, do you want to 
            keep the neurons or remove them after changing processor?
          `,
          buttons: [
              Dialog.cancelButton({ label: 'Keep' }),
              Dialog.warnButton({ label: 'Remove' })
          ]
        }).then(result => {
            if (result.button.accept) {
                if (result.button.displayType === 'warn') {
                  removeNeurons = true
                }
            }
            selected.resolve(void 0);
        });
      } else {
        selected.resolve(void 0);
      }

      selected.promise.then(()=>{
        if (removeNeurons) {
          this.neu3d.reset(true)
        } else{
          for (let mesh of Object.keys(this.neu3d.meshDict)){
            if (this.neu3d.meshDict[mesh].background) {
              this.neu3d.remove(mesh);
            }
          }
        }
        switch (this._processor) {
          case 'larva(l1em)':
            this.neu3d._metadata.resetPosition =  {x: 42.057169835814626, y: 18.465885594337543, z: -509.65272951348953};
            this.neu3d._metadata.upVector = {x: 0.0022681554337180836, y: -0.9592325957384876, z: 0.2826087096034669};
            this.neu3d._metadata.cameraTarget = {x: 42.11358557008077, y: 74.90946190543991, z: 58.654427921234685};
            this.neu3d.updateControls();
            this.neu3d.addJson({ffbo_json: this._larvaMesh, showAfterLoadAll: true});
            window.active_neu3d_widget = this;
            this.neu3d.resetView();
            // this.sessionContext.session.kernel.requestExecute({code: super.initClientCode(', custom_config = "larva_config.ini"')});
            this.initClient();
            (this._neu3dSearchbar.children[0].children[0] as HTMLInputElement).placeholder = "Write Query (Example: show OSNs)";
            break;
          case 'adult(flycircuit)':
            this.neu3d._metadata.resetPosition = {x: 0, y: 0, z: 1800};
            this.neu3d._metadata.upVector = {x: 0., y: 1., z: 0.};
            this.neu3d.updateControls();
            this.neu3d.addJson({ffbo_json: this._adultMesh, showAfterLoadAll: true});
            window.active_neu3d_widget = this;
            this.neu3d.resetView();
            // this.sessionContext.session.kernel.requestExecute({code: super.initClientCode(', custom_config = "flycircuit_config.ini"')});
            this.initClient();
            (this._neu3dSearchbar.children[0].children[0] as HTMLInputElement).placeholder = "Write Query (Example: show neurons in ellipsoid body)";

            break;
          case 'adult(hemibrain)':
            this.neu3d._metadata.resetPosition = {x: -0.41758013880199485, y: 151.63625728674563, z: -50.50723330508691};
            this.neu3d._metadata.upVector = {x: -0.0020307520395871814, y: -0.500303768173525, z: -0.8658475706482184};
            this.neu3d._metadata.cameraTarget = {x: 17.593074756823892, y: 22.60567192152306, z: 21.838699853616273};
            this.neu3d.updateControls();
            this.neu3d.addJson({ffbo_json: this._hemibrainMesh, showAfterLoadAll: true});
            window.active_neu3d_widget = this;
            this.neu3d.resetView();
            // this.sessionContext.session.kernel.requestExecute({code: super.initClientCode(', custom_config = "hemibrain_config.ini"')});
            this.initClient();
            (this._neu3dSearchbar.children[0].children[0] as HTMLInputElement).placeholder = "Write Query (Example: show OSNs)";
            break;
          default:
            (this._neu3dSearchbar.children[0].children[0] as HTMLInputElement).placeholder = 'Not connected to database.';
            console.error(`[Neu3D-Widget] Processor ${newProcessor} not recognized.`);
            break;
        }

        // reset info panel
        this.info.reset();
      });
    });
  }

  populateToolBar(): void {
    this.toolbar.addItem(
      'upload', 
      Private.createButton(Icons.uploadIcon, "Upload SWC File", 'jp-Neu3D-Btn jp-SearBar-upload', 
        () => { this.neu3d.fileUploadInput.click();}));
    this.toolbar.addItem(
      'reset', 
      Private.createButton(Icons.syncIcon, "Reset View", 'jp-Neu3D-Btn jp-SearBar-reset', 
      () => { this.neu3d.resetView() }));
    this.toolbar.addItem(
      'zoomToFit', 
      Private.createButton(Icons.zoomToFitIcon, "Center and zoom into visible Neurons/Synapses", 'jp-Neu3D-Btn jp-SearBar-zoomToFit', 
      () => { this.neu3d.resetVisibleView() }));
    this.toolbar.addItem(
      'hideAll', 
      Private.createButton(Icons.eyeSlashIcon, "Hide All", 'jp-Neu3D-Btn jp-SearBar-hideAll', 
      () => { this.neu3d.hideAll() }));
    this.toolbar.addItem(
      'showAll', 
      Private.createButton(Icons.eyeIcon, "Show All", 'jp-Neu3D-Btn jp-SearBar-showAll', 
      () => { this.neu3d.showAll() }));
    // this.toolbar.addItem(
    //   'screenshot', 
    //   Private.createButton(Icons.cameraIcon,"Download Screenshot", 'jp-Neu3D-Btn jp-SearBar-camera', 
    //   () => { this.neu3d._take_screenshot = true;}));
    this.toolbar.addItem(
      'unpinAll', 
      Private.createButton(Icons.mapUpinIcon, "Unpin All", 'jp-Neu3D-Btn jp-SearBar-unpin', 
      () => { this.neu3d.unpinAll(); }));
    this.toolbar.addItem(
      'removeUnpinned', 
      Private.createButton(Icons.trashIcon, "Remove Unpinned Neurons", 'jp-Neu3D-Btn jp-SearBar-remove-unpinned', 
      ()=> {this.neu3d.removeUnpinned();}));
    this.toolbar.addItem(
      'toggleControlPanel', 
      Private.createButton(settingsIcon, "Toggle Control Panel", 'jp-Neu3D-Btn jp-SearBar-showAll', 
      () => { 
        this.neu3d.controlPanel.domElement.style.display === "" ? this.neu3d.controlPanel.hide() : this.neu3d.controlPanel.show();
      }));

    super.populateToolBar();
  }

  /**
  * The Elements associated with the widget.
  */
  neu3d: Neu3D;
  readonly _adultMesh: Object; // caching for dynamically imported mesh
  readonly _larvaMesh: Object; // caching for dynamically import mesh
  readonly _hemibrainMesh: Object; // caching for dynamically import mesh
  private _neu3DReady = new PromiseDelegate<void>();
  private _neu3dContainer: HTMLDivElement;
  private _neu3dSearchbar: HTMLDivElement;
  private _blockingDiv: HTMLDivElement;
  private _workspaceChanged = new Signal<this, any>(this);
  model: Neu3DModel;
  info: any; // info panel widget
};


/**
 * A namespace for private data.
 */
namespace Private {
  export let count = 1;

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