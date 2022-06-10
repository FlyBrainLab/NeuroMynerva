import * as React from 'react';
import Neu3D from 'neu3d';
import { Message } from '@lumino/messaging';
import { Signal, ISignal } from '@lumino/signaling';
import { PromiseDelegate } from '@lumino/coreutils';
import {
  ToolbarButton,
  showDialog,
  Dialog,
  ISessionContext
} from '@jupyterlab/apputils';
import { LabIcon, settingsIcon } from '@jupyterlab/ui-components';
import { INotification } from 'jupyterlab_toastify';
import { Kernel, Session, KernelMessage } from '@jupyterlab/services';
import { Neu3DModel, INeu3DModel, IMeshDictItem } from './model';
import { IFBLWidget, FBLWidget } from '../template-widget/index';
import { InfoWidget } from '../info-widget/index';
import { PRESETS, PRESETS_NAMES } from './presets';

import * as Icons from '../../icons';
import '../../../style/neu3d-widget/neu3d.css';

const Neu3D_CLASS_JLab = 'jp-FBL-Neu3D';
const Neu3D_BLOCKING_DIV = 'jp-FBL-Neu3D-Blocking-Div';
const Neu3D_CONTAINER_DIV = 'jp-FBL-Neu3D-Container';

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
function toHexString(hex: number) {
  hex = Math.floor(hex);
  return ('000000' + hex.toString(16)).slice(-6);
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

/* eslint-disable */
declare global {
  interface Window {
    neu3d_widget: any; // Latest created neu3d widget
    active_neu3d_widget: any; // Latest actively accessed neu3d widget
  }
}
/* eslint-enable */

/**
 * An Neu3D Widget
 */
export class Neu3DWidget extends FBLWidget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super({
      name: options.name || `Neu3D-${Private.count++}`,
      icon: Icons.neu3DIcon,
      ...options
    });

    // load in meshes
    this.info = options.info;

    this.addClass(Neu3D_CLASS_JLab);
    this._neu3dContainer = document.createElement('div');
    this._neu3dContainer.className = Neu3D_CONTAINER_DIV;
    this.node.appendChild(this._neu3dContainer);
    this._neu3dFooter = Private.createFooterBar(this);
    this.node.appendChild(this._neu3dFooter);
    window.neu3d_widget = this;

    if (options.model?.metadata || options.model?.states) {
      this.neu3DReady.then(() => {
        this._blockingDiv = document.createElement('div');
        this._blockingDiv.className = `jp-Dialog-header ${Neu3D_BLOCKING_DIV}`;
        this._blockingDiv.innerText = 'Reload previous visualization settings?';
        const acceptBtn = document.createElement('button');
        acceptBtn.innerText = 'Yes';
        acceptBtn.className = 'jp-Dialog-button jp-mod-accept jp-mod-styled';
        acceptBtn.onclick = () => {
          try {
            if (!objEmpty(options.model?.metadata)) {
              this.neu3d.import_settings(options.model.metadata);
            }
            if (!objEmpty(options.model?.states)) {
              this.neu3d.import_state(options.model.states);
            }
          } catch (error) {
            this.model.metadata = this.neu3d.export_settings();
            this.model.states = this.neu3d.export_state();
            console.warn(
              `[Neu3D-Widget] Visualization Settings Restore Failed.
              Ignoring previous settings.`,
              error
            );
          }
          this._blockingDiv.remove();
        };
        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'No';
        cancelBtn.className = 'jp-Dialog-button jp-mod-reject jp-mod-styled';
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
  }

  /**
   * Block and unblock input field in neu3d when kernel is busy/not busy
   * @param sess
   * @param status
   */
  onKernelStatusChanged(sess: ISessionContext, status: Kernel.Status): void {
    super.onKernelStatusChanged(sess, status);
    const queryBar = this._neu3dFooter.getElementsByTagName('input')[0];
    if (status === 'busy') {
      queryBar.disabled = true;
    } else {
      if (this.hasClient) {
        queryBar.disabled = false;
      } else {
        queryBar.disabled = true;
      }
    }
  }

  /**
   * Dispose of the widget and free-up resource
   */
  dispose(): void {
    this.neu3d.dispose();
    delete this.neu3d;
    super.dispose();
  }

  /**
   * Initialize the model and connect model change signals
   * @param model
   */
  initModel(model: Partial<INeu3DModel>): void {
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
      const data: any = {};
      data[key] = value;
      const color = (value as any).color;
      if (typeof color === 'number') {
        (value as any).color = toHexString(color);
      }
      if ('type' in (value as any)) {
        this.neu3d.addJson({ ffbo_json: data, type: (value as any).type });
      } else {
        this.neu3d.addJson({ ffbo_json: data });
      }
    }
    this.hideMeshes('Neuropil');

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
   * TODO: to be added to handle rendering changes
   * @param change
   */
  onDataChanged(change: any): void {
    // this.renderModel(change);
    // do nothing
    return;
  }

  /**
   * Callback for when model.metadata is changed
   *
   * TODO: to be added to handle rendering changes
   * @param change
   */
  onStatesChanged(change: any): void {
    // this.renderModel(change);
    // no-op
    return;
  }

  /**
   * Callback for when model.metadata is changed
   *
   * TODO: to be added to handle rendering changes
   * @param change
   */
  onMetadataChanged(change: any): void {
    // do nothing
    // this.renderModel(change);
    return;
  }

  /**
   * Get signal if the data in the neu3D workspace has changed
   */
  get workspaceChanged(): ISignal<this, any> {
    return this._workspaceChanged;
  }

  /**
   * Handle Command message from Comm from Kernel
   * @param message
   */
  _receiveCommand(message: any): void {
    if (!('commands' in message)) {
      return;
    }
    if ('reset' in message['commands']) {
      this.neu3d.reset();
      delete message.commands.reset;
    }
    for (const cmd in message['commands']) {
      this.neu3d.execCommand({
        commands: [cmd],
        neurons: message['commands'][cmd][0],
        args: message['commands'][cmd][1]
      });
    }
  }

  /**
   * Handle Command message from Comm from Kernel
   * @param message
   */
  onCommMsg(msg: any): void {
    super.onCommMsg(msg);
    const thisMsg = msg.content.data as any;
    console.debug('NLP received message:', thisMsg);
    if (!['NLP', 'INFO'].includes(thisMsg.widget)) {
      return;
    }

    if (thisMsg.widget === 'NLP') {
      switch (thisMsg.messageType) {
        case 'Message': {
          if (thisMsg.data.info.success) {
            INotification.success(thisMsg.data.info.success, {
              autoClose: 1500
            });
          } else if (thisMsg.data.info.error) {
            INotification.error(thisMsg.data.info.error, { autoClose: 5000 });
          }
          console.debug('[NEU3D] Message received.', thisMsg.data);
          break;
        }
        case 'Data': {
          if (thisMsg.data.data) {
            const rawData = thisMsg.data.data;
            const processedData = Private.processMeshesFromCommData(rawData);
            if (Object.keys(processedData.meshOrSWC).length > 0) {
              this.neu3d.addJson({
                ffbo_json: processedData.meshOrSWC,
                type: 'morphology_json'
              });
            }

            if (Object.keys(processedData.unknown).length > 0) {
              this.neu3d.addJson({
                ffbo_json: processedData.unknown,
                type: 'general_json'
              });
            }
            // if (Object.keys(rawData)[0][0] == '#') {  // check if returned contain rids for neuron morphology data
            //   // this.n3dlog.push(JSON.parse(JSON.stringify(rawData)));
            //   let neu3Ddata = { ffbo_json: rawData, type: 'morphology_json' }
            //   this.neu3d.addJson(neu3Ddata);
            // }
            // else {
            //   let neu3Ddata = { ffbo_json: rawData, type: 'general_json' }
            //   this.neu3d.addJson(neu3Ddata);
            // }
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
          this._receiveCommand(thisMsg.data);
          break;
        }
      }
    } else {
      // INFO
      if (thisMsg.data.messageType !== 'Data') {
        return;
      }
      // trigger datachanged event for info panel, will cause re-rendering of data
      this.info?.setData(this, thisMsg.data.data.data);
    }
  }

  /**
   * Check if an object is in the workspace.
   *
   * @param rid -  rid of target object (neuron/synapse)
   * @returns  if object in workspace
   */
  isInWorkspace(rid: string): boolean {
    if (this.model?.data) {
      return rid in this.model.data;
    }
    return false;
  }

  /**
   * Return string for NA query that is aware of the right clientId
   */
  querySender(): string {
    const code = `
    _ = fbl.client_manager.clients['${this.clientId}']['client'].executeNAquery(_fbl_query)
    `;
    return code;
  }

  /**
   * Return string for NLP query that is aware of the right clientId
   */
  NLPquerySender(): string {
    const code = `
    _ = fbl.client_manager.clients['${this.clientId}']['client'].executeNLPquery(_fbl_query)
    `;
    return code;
  }

  // /**
  //  * Method passed to info panel to ensure stateful data
  //  *
  //  * Addresses
  //  * @param command
  //  */
  // infoCommandWrapper(command: any){

  // }

  /**
   * Add an object into the workspace using Uname by Kernel Call.
   *
   * @param uname -  uname of target object (neuron/synapse)
   */
  async addByUname(uname: string | Array<string>): Promise<any> {
    let code = `
    _fbl_query = {}
    _fbl_query['verb'] = 'add'
    _fbl_query['query']= [{'action': {'method': {'query': {'uname': ${JSON.stringify(
      uname
    )}}}},
                    'object': {'class': ['Neuron', 'Synapse']}}]
    `;
    code = code + this.querySender();
    const kernel = this.sessionContext.session.kernel;
    const result = await kernel.requestExecute({ code: code }).done;
    console.debug('addByUname', uname, result);
    return result;
  }

  /**
   * Remove an object into the workspace using Uname by Kernel Call.
   *
   * WARNING: Deprecated! Do not use addByUname since uname may no longer be unique.
   *  Use addByRid instead
   *
   * @param uname -  uname of target object (neuron/synapse)
   */
  async removeByUname(uname: string | Array<string>): Promise<any> {
    let code = `
    _fbl_query = {}
    _fbl_query['verb'] = 'remove'
    _fbl_query['query']= [{'action': {'method': {'query': {'uname': ${JSON.stringify(
      uname
    )}}}},
                    'object': {'class': ['Neuron', 'Synapse']}}]
    `;
    code = code + this.querySender();
    const kernel = this.sessionContext.session.kernel;
    const result = await kernel.requestExecute({ code: code }).done;
    console.debug('removeByUname', uname, result);
    return result;
  }

  /**
   * Add an object into the workspace using Rid by Kernel Call.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  async addByRid(rid: string | Array<string>): Promise<any> {
    let code = `
    _fbl_query = {}
    _fbl_query['verb'] = 'add'
    _fbl_query['query']= [{'action': {'method': {'query': {}}},
                    'object': {'rid': ${JSON.stringify(rid)}}}]
    _fbl_query['format'] = 'morphology'
    `;
    code = code + this.querySender();
    const kernel = this.sessionContext.session.kernel;
    const result = await kernel.requestExecute({ code: code }).done;
    console.debug('addByRid', rid, result);
    return result;
  }

  /**
   * Remove an object from the workspace using Rid by Kernel Call.
   *
   * @param rid -  rid of target object (neuron/synapse)
   */
  async removeByRid(rid: string | Array<string>): Promise<any> {
    let code = `
    _fbl_query = {}
    _fbl_query['verb'] = 'remove'
    _fbl_query['query']= [{'action': {'method': {'query': {}}},
                    'object': {'rid': ${JSON.stringify(rid)}}}]
    `;
    code = code + this.querySender();
    const kernel = this.sessionContext.session.kernel;
    const result = await kernel.requestExecute({ code: code }).done;
    console.debug('removeByRid', rid, result);
    return result;
  }

  /**
   * Send an NLP query.
   *
   * @param query -  query to send(text)
   */
  async executeNLPquery(query: string): Promise<boolean> {
    let code = `
    _fbl_query = '${query}'
    `;
    code = code + this.NLPquerySender();
    const kernel = this.sessionContext.session.kernel;
    const result = await kernel.requestExecute({ code: code }).done;
    if (result.content.status === 'error') {
      return Promise.resolve(false);
    }
    console.debug('NLPquery', result);
    return Promise.resolve(true);
  }

  /**
   * Get Info of a given neuron
   * @param rid - rid of the neuron/synapse to query info about
   * @return a promise that resolves to the reply message when done
   */
  executeInfoQuery(
    rid: string
  ): Kernel.IShellFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > {
    const code_to_send = `
    fbl.client_manager.clients[fbl.widget_manager.widgets['${this.id}'].client_id]['client'].getInfo('${rid}')
    `;
    return this.sessionContext.session.kernel.requestExecute({
      code: code_to_send
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
    if (!this.neu3d) {
      this.neu3d = new Neu3D(
        this._neu3dContainer,
        undefined,
        {
          enablePositionReset: true
        },
        {
          stats: true,
          datGUI: {
            createButtons: false,
            preset: 'Low'
          }
        }
      );
    }

    /** Get Neuron Information */
    this.neu3d.on('click', (e: INeu3DMessage) => {
      this.executeInfoQuery(e.value);
    });

    /** Add Mesh */
    this.neu3d.meshDict.on('add', (e: INeu3DMessage) => {
      this.model.addMesh(e.prop, e.value);
      this._modelChanged.emit(e);
      this._workspaceChanged.emit(e);
    });

    /** Remove Mesh */
    this.neu3d.meshDict.on('remove', (e: INeu3DMessage) => {
      this.model.removeMesh(e.prop);
      this._modelChanged.emit(e);
      this._workspaceChanged.emit(e);
    });

    /** Pin/UnPin */
    this.neu3d.meshDict.on(
      'change',
      (e: INeu3DMessage) => {
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
      'pinned'
    );

    /** Hide/Show */
    this.neu3d.meshDict.on(
      'change',
      (e: INeu3DMessage) => {
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
      'visibility'
    );

    /** Callback when Visualization Settings Change */
    this.neu3d.settings.on(
      'change',
      (e: any) => {
        const settings = this.neu3d.export_settings();
        this.model.metadata = settings;
        this.model._metadataChanged.emit(settings);
        this._modelChanged.emit(e);
      },
      [
        'pinLowOpacity',
        'pinOpacity',
        'defaultOpacity',
        'backgroundOpacity',
        'backgroundWireframeOpacity',
        'synapseOpacity',
        'highlightedObjectOpacity',
        'nonHighlightableOpacity',
        'lowOpacity'
      ]
    );

    /** Callback when Shape/Size Settings Change */
    this.neu3d.settings.on(
      'change',
      (e: any) => {
        const settings = this.neu3d.export_settings();
        this.model.metadata = settings;
        this.model._metadataChanged.emit(settings);
        this._modelChanged.emit(e);
      },
      ['radius', 'strength', 'threshold', 'enabled']
    );

    /** Callback when ToneMappingPass Settings Change */
    /**
    this.neu3d.settings.toneMappingPass.on(
      'change',
      (e: any) => {
        const settings = this.neu3d.export_settings();
        this.model.metadata = settings;
        this.model._metadataChanged.emit(settings);
        this._modelChanged.emit(e);
      },
      'brightness'
    );
    */

    /** Callback when Background Settings Change */
    this.neu3d.settings.on(
      'change',
      (e: any) => {
        const settings = this.neu3d.export_settings();
        this.model.metadata = settings;
        this.model._metadataChanged.emit(settings);
        this._modelChanged.emit(e);
      },
      'backgroundColor'
    );

    /** trackball control end interaction save camera*/
    this.neu3d.controls.addEventListener('end', (e: any) => {
      const states = this.neu3d.export_state();
      this.model.states = states;
      this.model._statesChanged.emit(states);
      this._modelChanged.emit(e);
    });

    if (!objEmpty(this.model.metadata)) {
      this.neu3d.import_settings(this.model.metadata);
    }
    if (!objEmpty(this.model.states)) {
      this.neu3d.import_state(this.model.states);
    }

    /** Initialize neu3d's model metadata and states */
    this.model.metadata = this.neu3d.export_settings();
    this.model.states = this.neu3d.export_state();
    this.renderModel();

    /** Widget is ready */
    this._neu3DReady.resolve(void 0);
  }

  /**
   * Resize neu3d after widget is shown to ensure the right aspect ratio.
   * @param msg
   */
  onAfterShow(msg: Message): void {
    this.neu3d?.onWindowResize();
  }

  /**
   * Propagate resize event to neu3d
   * @param msg
   */
  onResize(msg: any): void {
    super.onResize(msg);
    this.neu3d?.onWindowResize();
  }

  async onKernelChanged(
    context: ISessionContext,
    args: Session.ISessionConnection.IKernelChangedArgs
  ): Promise<void> {
    await super.onKernelChanged(context, args);
    if (args.oldValue === null && args.newValue === null) {
      // this is called by the restart routine by default
      return; // no op
    }
    if (this.hasClient) {
      if ((this.neu3d as any).groups.back.children.length === 0) {
        this.getMeshesfromDB().then(() => {
          this.hideMeshes('Neuropil');
        });
      }
    }
  }
  /**
   * Returns processor.
   *
   * Processors are the objects that manage connection to the backend.
   */
  get processor(): string {
    return this._processor;
  }

  /**
   * Setter for processor to ignore startUp keyword
   */
  set processor(newProcessor: string) {
    this.setProcessor(newProcessor);
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
  setProcessor(newProcessor: string, startUp = false): void {
    const differentProcessor = newProcessor !== this.processor;
    super.setProcessor(newProcessor, startUp);

    this.neu3DReady.then(() => {
      if (differentProcessor && !startUp) {
        this.neu3d.reset(true);
      }

      /**
       * Return the preset of the current neu3d instance.
       * The final return value is based on value in schema and what's avaiable in PRESETS.
       * If processor cannot be found anywhere, will return disconnected.
       */
      let preset: PRESETS_NAMES = 'default';
      let settings: {
        [field: string]: { x: number; y: number; z: number };
      } = null;
      // let meshes: any = null;
      let placeholder = PRESETS.disconnected.searchPlaceholder;
      const inputQueryBar: HTMLInputElement =
        this._neu3dFooter.getElementsByTagName('input')[0];
      // return the corresponding preset in schema if found
      if (this.processor in this.ffboProcessors) {
        const schemaProcessor = this.ffboProcessors[this.processor];
        const processorPreset = schemaProcessor.PRESETS.preset;
        if (!(processorPreset in PRESETS)) {
          // preset not found in available PRESETS
          console.warn(
            `[Neu3D-Widget] processor (${this.processor}) preset (${preset}) not found, set to default.`
          );
          const schemaSettings = schemaProcessor.PRESETS.neu3dSettings;
          settings = {
            resetPosition:
              schemaSettings.resetPosition ??
              PRESETS.default.neu3dSettings.resetPosition,
            upVector:
              schemaSettings.upVector ?? PRESETS.default.neu3dSettings.upVector,
            cameraTarget:
              schemaSettings.cameraTarget ??
              PRESETS.default.neu3dSettings.cameraTarget
          };
          placeholder = PRESETS.default.searchPlaceholder;
        } else {
          preset = processorPreset as PRESETS_NAMES;
          settings = PRESETS[preset].neu3dSettings;
          placeholder = PRESETS[preset].searchPlaceholder;
        }
        this.initClient().then(success => {
          this.setHasClient(success); // can fail
          if (success && differentProcessor) {
            if ((this.neu3d as any).groups.back.children.length === 0) {
              this.getMeshesfromDB().then(() => {
                this.hideMeshes('Neuropil');
              });
            }
          }
        });
      } else {
        placeholder = PRESETS.disconnected.searchPlaceholder;
        this.setHasClient(false);
        console.warn(
          `[Neu3D-Widget] Processor (${this.processor}) not recognized. Disconnected`
        );
      }
      inputQueryBar.placeholder = placeholder;

      if (settings) {
        this.neu3d._metadata.resetPosition =
          settings.resetPosition ?? PRESETS.default.neu3dSettings.resetPosition;
        this.neu3d._metadata.upVector =
          settings.upVector ?? PRESETS.default.neu3dSettings.upVector;
        this.neu3d._metadata.cameraTarget =
          settings.cameraTarget ?? PRESETS.default.neu3dSettings.cameraTarget;
      }
      this.neu3d.updateControls();
      this.neu3d.resetView();
      window.active_neu3d_widget = this;
      // reset info panel - clear evrerything
      this.info.reset(true);
    });
  }

  /**
   * Get Meshes from DB
   */
  async getMeshesfromDB(
    type?: Private.MeshTypes
  ): Promise<KernelMessage.IExecuteReplyMsg | null> {
    type = type ?? ['Neuropil', 'Tract', 'Subregion', 'Tract', 'Subsystem'];
    let code = `
    _fbl_query = {}
    _fbl_query['verb'] = 'add'
    _fbl_query['format'] = 'morphology'
    _fbl_query['query']= [{'action': {'method': {'query': {}}},
                           'object': {'class': ${JSON.stringify(type)}}}]
    `;
    code = code + this.querySender();
    if (!this.sessionContext?.session?.kernel) {
      return null;
    }
    const kernel = this.sessionContext.session.kernel;
    const result = await kernel.requestExecute({ code: code }).done;
    console.debug('getMeshesfromDB', result);
    return result;
  }

  /**
   * Hide Background Meshes except some
   * @param exceptClasses
   */
  hideMeshes(exceptClasses?: Private.MeshTypes): void {
    exceptClasses = Private.asarray(exceptClasses) ?? [];
    for (const [rid, mesh] of Object.entries(this.model.background)) {
      if (exceptClasses.includes(mesh.class)) {
        continue;
      } else {
        this.neu3d.hide(rid);
      }
    }
  }

  /**
   * Populate the toolbar on the top of the widget
   */
  populateToolBar(): void {
    this.toolbar.addItem(
      'upload',
      Private.createButton(
        Icons.uploadIcon,
        'Upload SWC File',
        'jp-Neu3D-Btn jp-SearBar-upload',
        () => {
          this.neu3d.fileUploadInput.click();
        }
      )
    );
    this.toolbar.addItem(
      'reset',
      Private.createButton(
        Icons.syncIcon,
        'Reset View',
        'jp-Neu3D-Btn jp-SearBar-reset',
        () => {
          this.neu3d.resetView();
        }
      )
    );
    this.toolbar.addItem(
      'zoomToFit',
      Private.createButton(
        Icons.zoomToFitIcon,
        'Center and zoom into visible Neurons/Synapses',
        'jp-Neu3D-Btn jp-SearBar-zoomToFit',
        () => {
          this.neu3d.resetVisibleView();
        }
      )
    );
    this.toolbar.addItem(
      'hideAll',
      Private.createButton(
        Icons.eyeSlashIcon,
        'Hide All',
        'jp-Neu3D-Btn jp-SearBar-hideAll',
        () => {
          this.neu3d.hideAll();
        }
      )
    );
    this.toolbar.addItem(
      'showAll',
      Private.createButton(
        Icons.eyeIcon,
        'Show All',
        'jp-Neu3D-Btn jp-SearBar-showAll',
        () => {
          this.neu3d.showAll();
        }
      )
    );
    // this.toolbar.addItem(
    //   'screenshot',
    //   Private.createButton(Icons.cameraIcon,"Download Screenshot", 'jp-Neu3D-Btn jp-SearBar-camera',
    //   () => { this.neu3d._take_screenshot = true;}));
    this.toolbar.addItem(
      'unpinAll',
      Private.createButton(
        Icons.mapUpinIcon,
        'Unpin All',
        'jp-Neu3D-Btn jp-SearBar-unpin',
        () => {
          this.neu3d.unpinAll();
        }
      )
    );
    this.toolbar.addItem(
      'removeUnpinned',
      Private.createButton(
        Icons.trashIcon,
        'Remove Unpinned Neurons',
        'jp-Neu3D-Btn jp-SearBar-remove-unpinned',
        () => {
          const orids: string[] = Object.values(this.model.unpinned).map(
            mesh => mesh.orid
          );
          if (this.sessionContext?.session?.kernel) {
            this.removeByRid(orids);
          } else {
            this.neu3d.removeUnpinned();
          }
        }
      )
    );
    this.toolbar.addItem(
      'toggleControlPanel',
      Private.createButton(
        settingsIcon,
        'Toggle Control Panel',
        'jp-Neu3D-Btn jp-SearBar-showAll',
        () => {
          this.neu3d.controlPanel.domElement.style.display === ''
            ? this.neu3d.controlPanel.hide()
            : this.neu3d.controlPanel.show();
        }
      )
    );
    this.toolbar.addItem(
      'updateMesh',
      Private.createButton(
        Icons.fblIcon,
        'Fetch Brain Meshes from NeuroArch',
        'jp-Neu3D-Btn jp-SearBar-updateMesh',
        () => {
          this.getMeshesfromDB();
          this.hideMeshes('Neuropil');
        }
      )
    );
    super.populateToolBar();
  }

  /**
   * The Elements associated with the widget.
   */
  neu3d: Neu3D;
  private _neu3DReady = new PromiseDelegate<void>();
  private _neu3dContainer: HTMLDivElement;
  private _neu3dFooter: HTMLDivElement;
  private _blockingDiv: HTMLDivElement; // On browser refresh, a blocking div is shown to prompt user
  private _workspaceChanged = new Signal<this, any>(this);
  model: Neu3DModel;
  info: InfoWidget; // info panel widget that this extension is connected to
}

/**
 * A namespace for private data.
 */
namespace Private {
  // The count is for managing the name of the widget every time a new one is added to the browser
  export let count = 1; // eslint-disable-line

  export function asarray(
    string_or_array: string | Array<string>
  ): Array<string> | undefined {
    if (string_or_array === undefined || string_or_array === null) {
      return undefined;
    }
    if (string_or_array.constructor !== Array) {
      string_or_array = [string_or_array as string];
    }
    return string_or_array as Array<string>;
  }

  export type MeshTypes =
    | 'Neuropil'
    | 'Tract'
    | 'Subregion'
    | 'Tract'
    | 'Subsystem'
    | Array<string>;

  export function processMeshesFromCommData(dictOfMeshes: {
    [rid: string]: IMeshDictItem;
  }): {
    meshOrSWC: { [rid: string]: IMeshDictItem };
    unknown: { [rid: string]: IMeshDictItem };
  } {
    const processed: {
      meshOrSWC: { [rid: string]: IMeshDictItem };
      unknown: { [rid: string]: IMeshDictItem };
    } = {
      meshOrSWC: {},
      unknown: {}
    };
    for (const [rid, mesh] of Object.entries(dictOfMeshes)) {
      if (mesh.morph_type === 'mesh') {
        if (
          ['Neuropil', 'Tract', 'Subregion', 'Tract', 'Subsystem'].includes(
            mesh.class
          )
        ) {
          mesh.background = mesh.background ?? true;
        } else {
          mesh.background = mesh.background ?? false;
        }
        processed.meshOrSWC[rid] = mesh;
      } else if (
        ['sample', 'parent', 'identifier', 'x', 'y', 'z', 'r'].every(l => {
          return l in mesh;
        })
      ) {
        mesh.background = mesh.background ?? false;
        processed.meshOrSWC[rid] = mesh;
      } else {
        processed.unknown[rid] = mesh;
      }
    }
    return processed;
  }

  export function createButton(
    icon: LabIcon.IMaybeResolvable,
    tooltip: string,
    className: string,
    func: () => void
  ): ToolbarButton {
    const btn = new ToolbarButton({
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
  export function createFooterBar(neu3d: Neu3DWidget): HTMLDivElement {
    const footer = document.createElement('div');
    footer.classList.add('navbar');

    const searchWrapper = document.createElement('div');
    searchWrapper.classList.add('neu3dSearchWrapper');

    //create search input
    const searchInput = document.createElement('input');
    searchInput.classList.add('neu3dSearchInput');
    searchInput.type = 'text';
    searchInput.placeholder =
      'Write Query (Example: show neurons in ellipsoid body)';

    // create search button
    const searchButton = document.createElement('button');
    searchButton.classList.add('neu3dSearchButton');
    searchButton.type = 'submit';
    const searchButtonIcon = document.createElement('i');
    searchButtonIcon.classList.add('fa');
    searchButtonIcon.classList.add('fa-search');
    searchButton.appendChild(searchButtonIcon);

    //create search hint
    const hintButton = document.createElement('button');
    hintButton.classList.add('neu3dHintButton');
    const hintButtonIcon = document.createElement('i');
    hintButtonIcon.classList.add('fa');
    hintButtonIcon.classList.add('fa-info');
    hintButton.appendChild(hintButtonIcon);

    searchWrapper.appendChild(hintButton);
    searchWrapper.appendChild(searchInput);
    searchWrapper.appendChild(searchButton);

    neu3d.clientConnect.connect((_, hasClient) => {
      if (hasClient) {
        searchInput.disabled = false;
        if (neu3d.processor in PRESETS) {
          searchInput.placeholder = (PRESETS as any)[
            neu3d.processor
          ].searchPlaceholder;
        } else if (
          neu3d.processor in neu3d.ffboProcessors &&
          neu3d.ffboProcessors[neu3d.processor].PRESETS.preset in PRESETS
        ) {
          const preset = neu3d.ffboProcessors[neu3d.processor].PRESETS.preset;
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
      if (searchInput.value && neu3d.hasClient) {
        neu3d.executeNLPquery(searchInput.value);
      }
      searchInput.value = '';
    };
    searchInput.addEventListener('keyup', ({ key }) => {
      if (key === 'Enter') {
        if (searchInput.value && neu3d.hasClient) {
          neu3d.executeNLPquery(searchInput.value);
        }
        searchInput.value = '';
      }
    });
    hintButton.onclick = () => {
      // show hint
      let hints: Array<any> = [];
      if (neu3d.processor in PRESETS) {
        hints = (PRESETS as any)[neu3d.processor].hints;
      } else if (
        neu3d.processor in neu3d.ffboProcessors &&
        neu3d.ffboProcessors[neu3d.processor].PRESETS.preset in PRESETS
      ) {
        const preset = neu3d.ffboProcessors[neu3d.processor].PRESETS.preset;
        hints = (PRESETS as any)[preset].hints;
      } else {
        if (neu3d.hasClient) {
          hints = PRESETS.default.hints;
        } else {
          hints = PRESETS.disconnected.hints;
        }
      }
      const hint_ul = hints.map((h, idx) => (
        <li key={idx}>
          <b>{h.query}</b>
          {`: ${h.effect}`}
        </li>
      ));
      let hint_header = <p>Connect to a Processor to see example queries.</p>;
      if (hint_ul.length > 0) {
        hint_header = <p>Here are a list of example queries you can try:</p>;
      }
      showDialog({
        title: 'Quick Query Reference',
        body: (
          <>
            <p>
              The Search Bar is the central querying interface. It supports
              natural language queries of neurons, synaptic partners, etc. By
              combining various attributes of query targets, you can create some
              very powerful queries.
            </p>
            {hint_header}
            <ul> {hint_ul}</ul>
          </>
        ),
        buttons: [Dialog.okButton()]
      });
    };
    footer.appendChild(searchWrapper);
    return footer;
  }
}
