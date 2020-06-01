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


/**
* An Neu3D Widget
*/
export class Neu3DWidget extends FBLWidget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super({
      name:options.name || `Neu3D-${Private.count++}`, 
      icon: Icons.neu3DIcon,
      ...options});

    // load in meshes
    this._adultMesh = AdultMesh;
    this._larvaMesh = LarvaMesh;

    this.addClass(Neu3D_CLASS_JLab);
    
    this._neu3dContainer = document.createElement('div')
    this._neu3dContainer.style.height = '100%';
    this._neu3dContainer.style.width = '100%';
    this.node.appendChild(this._neu3dContainer);

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
      this.neu3d.reset(true);
      this.neu3d.addJson({ ffbo_json: this.model.data });
    } else {
      // complete reset
      this.neu3d.reset(true);
      this.neu3d.addJson({ ffbo_json: this.model.data });
    }
  }

  onDataChanged(change: any) {
    this.renderModel(change);
  }

  onStatesChanged(change: any) {
    this.renderModel(change);
  }

  onMetadataChanged(change: any) {
    this.renderModel(change);
  }
  

  onAfterShow(msg: Message){
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
    super.onAfterShow(msg);
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
   * @param newSpecies new species to be added
   *    - If sepcies is `adult` or `larva`, this will display mesh and change metadata settings
   */
  set species(newSpecies: string) {
    if (newSpecies === this._species) {
      return;
    }
    this._species = newSpecies;
    this._speciesChanged.emit(newSpecies);
    
    switch (this._species.toLowerCase()) {
      case 'larva':
        for (let mesh of Object.keys(this.neu3d.meshDict)){
          if (this.neu3d.meshDict[mesh].background) {
            this.neu3d.remove(mesh);
          }
        }
        this.neu3d.addJson({ffbo_json: this._larvaMesh, showAfterLoadAll: true});
        this.neu3d._metadata.resetPosition = {
          x: 263.7529882900178, y: -279.09063424477444, z: -3652.912696805477
        };
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
  private _neu3dContainer: HTMLDivElement;
  model: Neu3DModel;
};


/**
 * A namespace for private data.
 */
namespace Private {
  export let count = 0;

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
