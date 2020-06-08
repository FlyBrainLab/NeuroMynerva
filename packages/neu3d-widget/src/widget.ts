import { IFBLWidget, FBLWidget } from '@flybrainlab/fbl-template-widget';
import Neu3D from 'neu3d';
import { Message } from '@lumino/messaging';
import { ToolbarButton } from '@jupyterlab/apputils';
import { Icons } from '@flybrainlab/fbl-template-widget';
import { LabIcon } from '@jupyterlab/ui-components';
import '../style/index.css';
import { Neu3DModel, INeu3DModel } from './model';
import { AdultMesh } from './adult_mesh';
import { LarvaMesh } from './larva_mesh';
import { HemibrainMesh } from './hemibrain_mesh';

const Neu3D_CLASS_JLab = "jp-FBL-Neu3D";

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
  constructor(options: Neu3D.IOptions) {
    super({
      name:options.name || `Neu3D-${Private.count++}`,
      icon: Icons.neu3DIcon,
      ...options});

    // load in meshes
    this.info = options.info;
    this._adultMesh = AdultMesh;
    this._larvaMesh = LarvaMesh;
    this._hemibrainMesh = HemibrainMesh;

    this.addClass(Neu3D_CLASS_JLab);
    
    this._neu3dContainer = document.createElement('div')
    this._neu3dContainer.style.height = '100%';
    this._neu3dContainer.style.width = '100%';
    this.node.appendChild(this._neu3dContainer);
    window.neu3d_widget = this;
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

  renderModel(change?: any): void {
    if (change) {
      // TODO: Handle incremental rendering for model change
      // currently re-rendering the whole scene regardless
      this.neu3d.addJson({ ffbo_json: this.model.data });
    } else {
      // complete reset
      this.neu3d.addJson({ ffbo_json: this.model.data });
    }
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

  onCommMsg(msg: any) {
    super.onCommMsg(msg);
    let thisMsg = msg.content.data as any;
    console.log('NLP received message:', thisMsg)
    if (thisMsg.widget !== 'NLP') {
      return;
    }

    switch (thisMsg.messageType) {
      case "Message": {
        /*(izi as any).success({
          id: "success",
          message: (thisMsg.data).info.success,
          transitionIn: 'bounceInLeft',
          position: 'bottomRight',
        });*/
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
        } else if (thisMsg.data.info) {
        } else{
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
    
    fbl.client_manager.clients['${this.client_id}']['client'].executeNAquery(res)
    `;

    return code;
  }

  /** 
   * Add an object into the workspace.
   *
   * @param uname -  uname of target object (neuron/synapse)
   * @param uname -  uname of target object (neuron/synapse)
   */
  async addByUname(uname: string): Promise<any> {
    let code = `
    res = {}
    res['verb'] = 'add'
    res['query']= [{'action': {'method': {'query': {'uname': '${uname}'}}},
                    "'object': {'class': ['Neuron', 'Synapse']}}]
    `;

    code = code + this.querySender();

    let result = await this.sessionContext.session.kernel.requestExecute({code: code}).done;
    console.log('addByUname', result);
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
    console.log('removeByUname', result);
    return result;
  }
  
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

    this.neu3d.meshDict.on('add', (e:INeu3DMessage) => {
      this.model.addMesh(e.prop, e.value);
      this._modelChanged.emit(e);
    });
    this.neu3d.meshDict.on('remove', (e:INeu3DMessage) => {
      this.model.removeMesh(e.prop)
      this._modelChanged.emit(e);
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
      this._modelChanged.emit(e);
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
      this._modelChanged.emit(e);
    },
    'visibility');
    this.neu3d.onWindowResize();
    this.renderModel();
  }

  /**
   * Instantiate neu3d and setup callback hooks after widget is shown
   * @param msg 
   */
  onAfterShow(msg: Message){
    this.neu3d?.onWindowResize();
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
   * Set species
   * @param newSpecies new species to be added
   *    - If sepcies is `adult` or `larva`, this will display mesh and change metadata settings
   */
  set species(newSpecies: string) {
    if (newSpecies === this._species) {
      return;
    }
    this._species = newSpecies;
    this._speciesChanged.emit(newSpecies);
    
    switch (this._species) {
      case 'larval Drosophila melanogaster':
        for (let mesh of Object.keys(this.neu3d.meshDict)){
          if (this.neu3d.meshDict[mesh].background) {
            this.neu3d.remove(mesh);
          }
        }
        this.neu3d._metadata.resetPosition = {x: 32.727408729704834, y: -436.2980011559806, z: -36.71433643232834};
        this.neu3d._metadata.upVector = {x: 0.09683632485855452, y: 0.9768955647317704, z: 0.19051976746566937};
        this.neu3d._metadata.cameraTarget = {x: 44.591928805676524, y: -21.014991704094935, z: 49.28748557815412};
        this.neu3d.updateControls();
        this.neu3d.addJson({ffbo_json: this._larvaMesh, showAfterLoadAll: true});
        window.active_neu3d_widget = this;
        this.neu3d.resetView();
        this.sessionContext.session.kernel.requestExecute({code: super.initAnyClientCode(', url=u"ws://amacrine.ee.columbia.edu:6651/ws", ssl = None, default_key = False')}).done;
        
        break;
      case 'adult Drosophila melanogaster (FlyCircuit)':
        for (let mesh of Object.keys(this.neu3d.meshDict)){
          if (this.neu3d.meshDict[mesh].background) {
            this.neu3d.remove(mesh);
          }
        }
        this.neu3d._metadata.resetPosition = {x: 0, y: 0, z: 1800};
        this.neu3d._metadata.upVector = {x: 0., y: 1., z: 0.};
        this.neu3d.updateControls();
        this.neu3d.addJson({ffbo_json: this._adultMesh, showAfterLoadAll: true});
        window.active_neu3d_widget = this;
        this.neu3d.resetView();
        this.sessionContext.session.kernel.requestExecute({code: super.initAnyClientCode('')}).done;
        break;
      case 'adult Drosophila melanogaster (Hemibrain)':
        for (let mesh of Object.keys(this.neu3d.meshDict)){
          if (this.neu3d.meshDict[mesh].background) {
            this.neu3d.remove(mesh);
          }
        }
        this.neu3d._metadata.resetPosition = {x: -0.41758013880199485, y: 151.63625728674563, z: -50.50723330508691};
        this.neu3d._metadata.upVector = {x: -0.0020307520395871814, y: -0.500303768173525, z: -0.8658475706482184};
        this.neu3d._metadata.cameraTarget = {x: 17.593074756823892, y: 22.60567192152306, z: 21.838699853616273};
        this.neu3d.updateControls();
        this.neu3d.addJson({ffbo_json: this._hemibrainMesh, showAfterLoadAll: true});
        window.active_neu3d_widget = this;
        this.neu3d.resetView();
        this.sessionContext.session.kernel.requestExecute({code: super.initAnyClientCode(', url=u"ws://amacrine.ee.columbia.edu:20206/ws", ssl = None, default_key = False')}).done;
        break;
      default:
        break; //no-op
    }
  }

  populateToolBar(): void {
    this.toolbar.addItem(
      'upload', 
      Private.createButton(Icons.uploadIcon, "Upload SWC File", 'jp-Neu3D-Btn jp-SearBar-upload', 
        () => { document.getElementById('neu3d-file-upload').click(); }));
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
      'screenshot', 
      Private.createButton(Icons.cameraIcon,"Download Screenshot", 'jp-Neu3D-Btn jp-SearBar-camera', 
      () => { this.neu3d._take_screenshot = true;}));
      this.toolbar.addItem(
      'unpinAll', 
      Private.createButton(Icons.mapUpinIcon, "Unpin All", 'jp-Neu3D-Btn jp-SearBar-unpin', 
      () => { this.neu3d.unpinAll(); }));
    this.toolbar.addItem(
      'removeUnpinned', 
      Private.createButton(Icons.trashIcon, "Remove Unpinned Neurons", 'jp-Neu3D-Btn jp-SearBar-remove-unpinned', 
      ()=> {this.neu3d.removeUnpinned();}));
    super.populateToolBar();
  }

  /**
  * The Elements associated with the widget.
  */
  neu3d: Neu3D;
  readonly _adultMesh: Object; // caching for dynamically imported mesh
  readonly _larvaMesh: Object; // caching for dynamically import mesh
  readonly _hemibrainMesh: Object; // caching for dynamically import mesh
  private _neu3dContainer: HTMLDivElement;
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

namespace Neu3D {
  export interface IOptions extends FBLWidget.IOptions {
    info?: any; // info panel widget
  }
}
