import * as React from 'react';
import Neu3D from 'neu3d';
import { Message } from '@lumino/messaging';
import { Signal, ISignal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';
import { ToolbarButton, showDialog, Dialog, ISessionContext } from '@jupyterlab/apputils';
import { LabIcon, settingsIcon } from '@jupyterlab/ui-components';
import { INotification } from "jupyterlab_toastify";
import { Kernel } from '@jupyterlab/services';
import { Neu3DModel, INeu3DModel } from './model';
import { AdultMesh } from './adult_mesh';
import { LarvaMesh } from './larva_mesh';
import { HemibrainMesh } from './hemibrain_mesh';
import { IFBLWidget, FBLWidget } from '../template-widget/index';
import { InfoWidget } from '../info-widget/index';
import { PRESETS, PRESETS_NAMES } from './presets';
import { Neu3DClient } from './client';
import * as Icons from '../../icons';
import '../../../style/neu3d-widget/neu3d.css';

const Neu3D_CLASS_JLab = "jp-FBL-Neu3D";
const Neu3D_BLOCKING_DIV = "jp-FBL-Neu3D-Blocking-Div";
const Neu3D_CONTAINER_DIV = "jp-FBL-Neu3D-Container";

/**
 * Interface for Event Message sent from neu3d's `on` callbacks
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

/**
 * Expose some things to window
 */
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
      name:options.name || `Neu3D-${Private.count++}`,
      icon: Icons.neu3DIcon,
      ...options
    });
    this.addClass(Neu3D_CLASS_JLab);

    // load in meshes
    this.info = options.info;
    this._adultMesh = AdultMesh;
    this._larvaMesh = LarvaMesh;
    this._hemibrainMesh = HemibrainMesh;

    // create a container for neu3d's rendering component to reside
    this._neu3dContainer = document.createElement('div');
    this._neu3dContainer.className = Neu3D_CONTAINER_DIV;
    this.node.appendChild(this._neu3dContainer);
    this._neu3dFooter = Private.createFooterBar(this);
    this.node.appendChild(this._neu3dFooter);

    // expose this widget to window
    window.neu3d_widget = this;

    // restore visualization settings if provided
    if (options.model?.metadata || options.model?.states) {
      this.restoreVizDialog(options.model?.metadata, options.model?.states);
    }
  }

  /**
   * Asynchronously, create a dialog on Neu3D window to ask if visualization settings
   * should be restored, and restore previous visualization settings if selected
   * Yes
   *
   * @param metadata
   * @param states
   */
  private async restoreVizDialog(metadata?: object, states?: object): Promise<void> {
    return this.neu3DReady.then(() => {
      this._blockingDiv = document.createElement('div');
      this._blockingDiv.className = `jp-Dialog-header ${Neu3D_BLOCKING_DIV}`;
      this._blockingDiv.innerText = `Reload previous visualization settings?`
      let acceptBtn = document.createElement('button');
      acceptBtn.innerText = "Yes"
      acceptBtn.className = "jp-Dialog-button jp-mod-accept jp-mod-styled";
      acceptBtn.onclick = () => {
        try {
          if (!Private.objEmpty(metadata)) {
            this.neu3d.import_settings(metadata)
          }
          if (!Private.objEmpty(states)) {
            this.neu3d.import_state(states);
          }
        } catch (error) {
          this.model.metadata = this.neu3d.export_settings();
          this.model.states = this.neu3d.export_state();
          console.error(
            `[Neu3D-Widget] Visualization Settings Restore Failed.
            Ignoring previous settings.`,
            error
          );
        }
        this._blockingDiv.remove();
      };
      let cancelBtn = document.createElement('button');
      cancelBtn.innerText = "No"
      cancelBtn.className = "jp-Dialog-button jp-mod-reject jp-mod-styled";
      cancelBtn.onclick = () => {
        this.model.metadata = this.neu3d.export_settings();
        this.model.states = this.neu3d.export_state();
        this._blockingDiv.remove();
      };
      this._blockingDiv.appendChild(cancelBtn);
      this._blockingDiv.appendChild(acceptBtn);
      this.node.insertBefore(this._blockingDiv, this.node.childNodes[0]);
    });
  }

  createClient(): Neu3DClient {
    return new Neu3DClient(this);
  }

  /**
   * Block and unblock input field in neu3d when kernel is busy/not busy
   * @param sess
   * @param status
   */
  onKernelStatusChanged(sess: ISessionContext, status: Kernel.Status) {
    super.onKernelStatusChanged(sess, status);
    let queryBar = this._neu3dFooter.getElementsByTagName('input')[0];
    if (status === 'busy') {
      queryBar.disabled = true;
    } else {
      queryBar.disabled = !this.client.isConnected;
    }
  }

  /**
   * Dispose of the widget and free-up resource
   */
  dispose() {
    this.neu3d.dispose();
    delete this.neu3d;
    super.dispose();
  }


  /**
   * Initialize the model and connect model change signals
   *
   * @param model if provided, this.model is created based on content of the argument
   */
  initModel(model?: Partial<INeu3DModel>){
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
   * *NOTE*: incremental rendering is not yet supported
   *
   * @param change change in model for incremental rendering
   */
  renderModel(change?: any): void {
    for (const [key, value] of Object.entries(this.model.data)) {
      let data: any = {};
      data[key] = value;
      const color = (value as any).color;
      if (typeof(color) === 'number') {
        (value as any).color = Private.toHexString(color);
      }
      if ('type' in (value as any)) {
        this.neu3d.addJson({ ffbo_json: data, type: (value as any).type });
      } else{
        this.neu3d.addJson({ ffbo_json: data });
      }
    }

    // TODO: Handle incremental rendering for model change
    // if (change) {
    //   this.neu3d.addJson({ ffbo_json: this.model.data });
    // } else {
    //   // complete reset
    //   this.neu3d.addJson({ ffbo_json: this.model.data });
    // }
  }


  /**
   * Callback for when model.metadata is changed
   *
   * @param change
   */
  onDataChanged(change: any) {
    // TODO: to be added to handle rendering changes
    return;
  }


  /**
   * Callback for when model.metadata is changed
   *
   * @param change
   */
  onStatesChanged(change: any) {
    // TODO: to be added to handle rendering changes
    return;
  }


  /**
   * Callback for when model.metadata is changed
   *
   * @param change
   */
  onMetadataChanged(change: any) {
    // TODO: to be added to handle rendering changes
    return;
  }


  /**
   * A signal if the meshes in the neu3D meshDict has changed
   *
   * Emits the Neu3D `on` signal's message that causes such a change.
   * Should either be on `add` or on `remove` in Neu3D
   */
  get workspaceChanged(): ISignal<this, INeu3DMessage> {
    return this._workspaceChanged;
  }

  /**
   * Handle Command message from Comm from Kernel
   * @param message Comm Message
   */
  onCommMsg(msg: any) {
    super.onCommMsg(msg);
    let thisMsg = msg.content.data as any;
    console.debug('NLP received message:', thisMsg)
    if (!['NLP', 'INFO'].includes(thisMsg.widget)) {
      return;
    }

    if (thisMsg.widget == 'NLP') {
      switch (thisMsg.messageType) {
        case "Message": {
          if (thisMsg.data.info.success) {
            INotification.success(thisMsg.data.info.success, {'autoClose': 1500});
          } else if (thisMsg.data.info.error) {
            INotification.error(thisMsg.data.info.error, {'autoClose': 5000});
          }
          console.debug('[NEU3D] Message received.', thisMsg.data);
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
          console.debug('[NEU3D] RESET', thisMsg.data);
          // this.n3dlog = [];
          if ('commands' in thisMsg.data){
            if ('reset' in thisMsg.data.commands) {
              this.neu3d.reset();
            }
            for (var cmd in thisMsg.data.commands)
              this.neu3d.execCommand({
                "commands": [cmd],
                "neurons": thisMsg.data.commands[cmd][0],
                "args": thisMsg.data.commands[cmd][1]
              });
          }
          break;
        }

      }
    } else { // INFO
      if (thisMsg.data.messageType !== 'Data') {
        return;
      }
      // trigger datachanged event for info panel, will cause re-rendering of data
      this.info?.setData(this, thisMsg.data.data.data)
    }
  }


  /**
   * Check if an object is in the workspace.
   *
   * @param rid rid of target object (neuron/synapse)
   */
  isInWorkspace(rid: string): boolean {
    if(this.model?.data){
      return (rid in this.model.data);
    }
    return false;
  }

  /**
   * Add an object into the workspace using Uname by Kernel Call.
   *
   * @param uname -  uname of target object (neuron/synapse)
   */
  async addByUname(uname: string | Array<string>): Promise<any> {
    return this.client.addByUname(uname);
  }


  /**
   * Remove an object into the workspace using Uname by Kernel Call.
   *
   * @param uname -  uname of target object (neuron/synapse)
   */
  async removeByUname(uname: string | Array<string>): Promise<any> {
    return this.client.removeByUname(uname);
  }


  /**
   * Add an object into the workspace using Rid by Kernel Call.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  async addByRid(rid: string | Array<string>): Promise<any> {
    this.client.addByRid(rid);
  }


  /**
   * Remove an object from the workspace using Rid by Kernel Call.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  async removeByRid(rid: string | Array<string>): Promise<any> {
    this.client.removeByRid(rid);
  }

  /**
   * Creat a Neu3D instance
   */
  createNeu3D(): Neu3D {
    return new Neu3D(
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

  /**
   * Set up callbacks for Neu3D
   * @param neu3d a neu3d instance
   */
  setupNeu3DCallbacks(neu3d: Neu3D): void {
    // Get Neuron Information
    neu3d.on('click', (e: INeu3DMessage) => {
      this.client.executeInfoQuery(e.value);
    });

    // Add Mesh
    neu3d.meshDict.on('add', (e:INeu3DMessage) => {
      this.model.addMesh(e.prop, e.value);
      this._modelChanged.emit(e);
      this._workspaceChanged.emit(e);
    });

    // Remove Mesh
    neu3d.meshDict.on('remove', (e:INeu3DMessage) => {
      this.model.removeMesh(e.prop)
      this._modelChanged.emit(e);
      this._workspaceChanged.emit(e);
    });

    // Pin/UnPin
    neu3d.meshDict.on('change',
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

    // Hide/Show
    neu3d.meshDict.on('change',
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

    // Callback when Visualization Settings Change
    neu3d.settings.on("change", ((e:any) => {
      let settings = neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), [
      "pinLowOpacity", "pinOpacity", "defaultOpacity", "backgroundOpacity",
      "backgroundWireframeOpacity", "synapseOpacity",
      "highlightedObjectOpacity", "nonHighlightableOpacity", "lowOpacity"
    ]);

    // Callback when Shape/Size Settings Change
    neu3d.settings.on('change', ((e:any) => {
      let settings = neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), ['radius', 'strength', 'threshold', 'enabled']);

    // Callback when ToneMappingPass Settings Change
    neu3d.settings.toneMappingPass.on('change', ((e:any) => {
      let settings = neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), 'brightness');

    // Callback when Background Settings Change
    neu3d.settings.on('change', ((e:any) => {
      let settings = neu3d.export_settings();
      this.model.metadata = settings;
      this.model._metadataChanged.emit(settings);
      this._modelChanged.emit(e);
    }), 'backgroundColor');

    // trackball control end interaction save camer
    neu3d.controls.addEventListener('end', (e:any)=>{
      let states = neu3d.export_state();
      this.model.states = states;
      this.model._statesChanged.emit(states);
      this._modelChanged.emit(e);
    });
  }

  /**
   * Callback after the DOM element is attached to the Browser.
   *
   * Note: Does the following
   * 1. Instantiate Neu3D and add to DOM
   * 2. Setup Callbacks
   * */
  onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.neu3d = this.neu3d ?? this.createNeu3D();
    this.setupNeu3DCallbacks(this.neu3d);

    // update visualiaztion based on meta data and states
    this.updateVisualization(this.model.metadata, this.model.states);

    // Initialize neu3d's model metadata and states
    this.model.metadata = this.neu3d.export_settings();
    this.model.states = this.neu3d.export_state();

    // render model
    this.renderModel();

    // Widget is ready
    this._neu3DReady.resolve(void 0);
  }

  /**
   * Update Neu3D Visualization based on metadata and states
   * @param metadata
   * @param states
   */
  updateVisualization(metadata: object, states: object): void {
    if (!Private.objEmpty(metadata)) {
      this.neu3d.import_settings(metadata);
    }
    if (!Private.objEmpty(states)) {
      this.neu3d.import_state(states);
    }
  }

  /**
   * Resize neu3d after widget is shown to ensure the right aspect ratio.
   * @param msg
   */
  onAfterShow(msg: Message){
    super.onAfterShow(msg);
    this.neu3d?.onWindowResize();
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
   * Returns processor.
   *
   * Processors are the objects that manage connection to the backend.
   */
  get processor(): string {
    return this._processor
  }


  /**
   * A promise for when the extension is ready that is resolved after OnAfterAttach.
   */
  get neu3DReady(): Promise<void> {
    return this._neu3DReady.promise;
  }


  /**
   * Change processor.
   *
   * A change in processor promotes:
   * 1. Change the rendering settings (coordinate systems, camera angles)
   * 2. search bar content
   * 3. Brain meshes
   *
   * @param newProcessor new processor to be added
   * @param startUp whether this setter is being called on startup,
   *    if on startup, the dialog for removing neuron will not be shown
   */
  setProcessor(newProcessor: string, startUp: boolean = false) {
    if (newProcessor === this._processor) {
      return;
    }
    super.setProcessor(newProcessor, startUp);

    this.neu3DReady.then(()=>{
      if (startUp) { // only remove meshes on startup
        for (let mesh of Object.keys(this.neu3d.meshDict)){
          if (this.neu3d.meshDict[mesh].background) {
            this.neu3d.remove(mesh);
          }
        }
      } else{ // Remove everything
        this.neu3d.reset(true);
      }

      /**
       * Return the preset of the current neu3d instance.
       * The final return value is based on value in schema and what's avaiable in PRESETS.
       * If processor cannot be found anywhere, will return disconnected.
       */
      let preset: PRESETS_NAMES = "default";
      let settings: {[field: string]: {x:number, y:number, z:number}} = null;
      let meshes: any = null;
      let placeholder = PRESETS.disconnected.searchPlaceholder;
      let inputQueryBar: HTMLInputElement = this._neu3dFooter.getElementsByTagName('input')[0];
        // return the corresponding preset in schema if found
      if (this.processor in this.ffboProcessors) {
        let processorPreset = this.ffboProcessors[this._processor].PRESETS.preset;
        if (!(processorPreset in PRESETS)) {
          // preset not found in available PRESETS
          console.warn(`[Neu3D-Widget] processor (${this.processor}) preset (${preset}) not found, set to default.`);
          let schemaSettings = this.ffboProcessors[this.processor].PRESETS.neu3dSettings;
          settings = {
            resetPosition: schemaSettings.resetPosition ?? PRESETS.default.neu3dSettings.resetPosition,
            upVector: schemaSettings.upVector ?? PRESETS.default.neu3dSettings.upVector,
            cameraTarget: schemaSettings.cameraTarget ?? PRESETS.default.neu3dSettings.cameraTarget,
          };
          placeholder = PRESETS.default.searchPlaceholder;
        } else {
          preset = processorPreset as PRESETS_NAMES;
          settings = PRESETS[preset].neu3dSettings;
          meshes = PRESETS[preset].meshes;
          placeholder = PRESETS[preset].searchPlaceholder;
        }
        this.client.init().then((success) => {
          this.client.setConnection(success); // can fail
        });
      } else {
        placeholder = PRESETS.disconnected.searchPlaceholder;
        this.client.setConnection(false);
        console.error(`[Neu3D-Widget] Processor (${this.processor}) not recognized. Disconnected`);
      }
      inputQueryBar.placeholder = placeholder;

      if (settings) {
        this.neu3d._metadata.resetPosition = settings.resetPosition ?? PRESETS.default.neu3dSettings.resetPosition;
        this.neu3d._metadata.upVector = settings.upVector ?? PRESETS.default.neu3dSettings.upVector;
        this.neu3d._metadata.cameraTarget = settings.cameraTarget ?? PRESETS.default.neu3dSettings.cameraTarget;
      }
      if (meshes) {
        this.neu3d.addJson({ ffbo_json: meshes, showAfterLoadAll: true });
      }
      this.neu3d.updateControls();
      this.neu3d.resetView();
      window.active_neu3d_widget = this;
      // reset info panel - clear evrerything
      this.info.reset(true);
    });
  }

  /**
   * Populate the toolbar on the top of the widget
   */
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
    this.toolbar.addItem(
      'unpinAll',
      Private.createButton(Icons.mapUpinIcon, "Unpin All", 'jp-Neu3D-Btn jp-SearBar-unpin',
      () => { this.neu3d.unpinAll(); }));
    this.toolbar.addItem(
      'removeUnpinned',
      Private.createButton(Icons.trashIcon, "Remove Unpinned Neurons", 'jp-Neu3D-Btn jp-SearBar-remove-unpinned',
        () => {
          let unames: string[] = Object.values(this.model.unpinned).map((mesh) => mesh.label);
          this.removeByUname(unames);
          // this.neu3d.removeUnpinned();
        }));
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
  private _neu3dFooter: HTMLDivElement;
  private _blockingDiv: HTMLDivElement; // On browser refresh, a blocking div is shown to prompt user
  private _workspaceChanged = new Signal<this, INeu3DMessage>(this);
  model: Neu3DModel;
  info: InfoWidget; // info panel widget that this extension is connected to
  client: Neu3DClient;
};


/**
 * A namespace for private data.
 */
namespace Private {

  // The count is for managing the name of the widget every time a new one is added to the browser
  export let count = 1;

  /**
   * Check if object is empty
   * @param obj
   */
  export function objEmpty(obj: any): boolean {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  /**
   * Convert integer Hex to rgb format
   * @param hex
   */
  export function toHexString( hex: number ) {
    hex = Math.floor( hex );
    return ( '000000' + hex.toString( 16 ) ).slice( - 6 );
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


  /**
   * Creater Footer Bar with search and info as footer
   */
  export function createFooterBar(
    neu3d: Neu3DWidget
  ): HTMLDivElement {
    let footer = document.createElement('div');
    footer.classList.add("navbar");

    var searchWrapper = document.createElement('div');
    searchWrapper.classList.add("neu3dSearchWrapper");

    //create search input
    var searchInput = document.createElement('input');
    searchInput.classList.add("neu3dSearchInput");
    searchInput.type = "text";
    searchInput.placeholder = "Write Query (Example: show neurons in ellipsoid body)";

    // create search button
    var searchButton = document.createElement('button');
    searchButton.classList.add("neu3dSearchButton");
    searchButton.type = "submit";
    var searchButtonIcon = document.createElement('i');
    searchButtonIcon.classList.add("fa");
    searchButtonIcon.classList.add("fa-search");
    searchButton.appendChild(searchButtonIcon);

    //create search hint
    var hintButton = document.createElement('button');
    hintButton.classList.add("neu3dHintButton");
    var hintButtonIcon = document.createElement('i');
    hintButtonIcon.classList.add("fa");
    hintButtonIcon.classList.add("fa-info");
    hintButton.appendChild(hintButtonIcon);

    searchWrapper.appendChild(hintButton);
    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(searchButton);

    neu3d.client.connectionChanged.connect((_, hasClient) => {
      if (hasClient) {
        searchInput.disabled = false;
        if (neu3d.processor in PRESETS) {
          searchInput.placeholder = (PRESETS as any)[neu3d.processor].searchPlaceholder;
        } else if ((neu3d.processor in neu3d.ffboProcessors) && (neu3d.ffboProcessors[neu3d.processor].PRESETS.preset in PRESETS)) {
          let preset = neu3d.ffboProcessors[neu3d.processor].PRESETS.preset;
          searchInput.placeholder = (PRESETS as any)[preset].searchPlaceholder;
        } else {
          searchInput.placeholder = PRESETS.default.searchPlaceholder;
        }
      } else {
        searchInput.placeholder = PRESETS.disconnected.searchPlaceholder;
        searchInput.disabled = true;
      }
    });

    searchButton.onclick = () => {
      if ((searchInput.value) && (neu3d.client.isConnected)) {
        neu3d.client.executeNLPQuery(searchInput.value);
      }
      searchInput.value = "";
    }
    searchInput.addEventListener('keyup', ({key}) => {
      if (key === "Enter") {
        if ((searchInput.value) && (neu3d.client.isConnected)) {
          neu3d.client.executeNLPQuery(searchInput.value);
        }
        searchInput.value = "";
      }
    });
    hintButton.onclick = () => {
      // show hint
      let hints: Array<any> = [];
      if (neu3d.processor in PRESETS) {
        hints = (PRESETS as any)[neu3d.processor].hints;
      } else if ((neu3d.processor in neu3d.ffboProcessors) && (neu3d.ffboProcessors[neu3d.processor].PRESETS.preset in PRESETS)) {
        let preset = neu3d.ffboProcessors[neu3d.processor].PRESETS.preset;
        hints = (PRESETS as any)[preset].hints;
      } else {
        if (neu3d.client.isConnected) {
          hints = PRESETS.default.hints;
        } else {
          hints = PRESETS.disconnected.hints;
        }
      }
      const hint_ul = hints.map((h, idx) => <li key={idx}><b>{h.query}</b>{`: ${h.effect}`}</li>);
      let hint_header = <p>Connect to a Processor to see example queries.</p>;
      if (hint_ul.length > 0) {
        hint_header = <p>Here are a list of example queries you can try:</p>;
      }
      showDialog({
        title: 'Quick Query Reference',
        body:<>
          <p>
            The Search Bar is the central querying interface. It supports natural language queries of neurons,
            synaptic partners, etc. By combining various attributes of query targets, you can create some very
            powerful queries.
          </p>
          {hint_header}
          <ul> {hint_ul}</ul>
        </>,
        buttons: [
          Dialog.okButton()
        ]
      });
    }
    footer.appendChild(searchWrapper);
    return footer;
  }
}