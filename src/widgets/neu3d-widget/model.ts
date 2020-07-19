import { ISignal, Signal } from '@lumino/signaling';
import { FBLWidgetModel, IFBLWidgetModel } from '../template-widget/index';

/**
* ID and a few selected attributes of the associated mesh dict items
* 
*/
interface IMeshDictItem {
  label?: String,
  highlight?: Boolean,
  opacity?: Number,
  visibility?: Boolean,
  background?: Boolean
  color?: {r: Number, g:Number, b:Number},
  pinned?: boolean,
  filename?: string,  // specified if downloaded mesh
  filetype?: 'swc' | string,  // 'swc'
  dataStr?: string, // datastring of swcs
  sample?: Array<number>, // content of loading raw object
  parent?: Array<number>, // content of loading raw object
  identifier?: Array<number>, // content of loading raw object
  x?: Array<number>, // content of loading raw object
  y?: Array<number>, // content of loading raw object
  z?: Array<number>, // content of loading raw object
  r?: Array<number>,  // content of loading raw object
  object?: any // THREEJS 3D Object
  type?: 'morphology_json' | 'general_json' | string; // type, used to keep track of morphology json objects
}

/**
* currently rendered neuron information
*/
export interface INeu3DModel extends IFBLWidgetModel{
  data: {[rid: string]: IMeshDictItem};
}

/**
* Neu3D Model class
*/
export class Neu3DModel extends FBLWidgetModel implements INeu3DModel {
  constructor(options?: Partial<INeu3DModel>){
    super(options)
  }
  
  /**
   * Synchronize with real meshDict from the Neu3D instance
   */
  syncWithWidget(meshDict: any){
    let oldValue = this.data;
    this.data = Private.loadNeu3DMeshDict(meshDict);
    this._dataChanged.emit({
      event: (oldValue) ? 'change' : 'add',
      source: this.data,
      oldValue: oldValue,
      newValue: this.data
    });
  }

  addMesh(rid:string, value:IMeshDictItem){
    let oldValue = this.data[rid];
    this.data[rid] = Private.convertRawMesh(value);
    this._dataChanged.emit({
      event: (oldValue) ? 'change' : 'add',
      source: this.data,
      key: rid,
      oldValue: oldValue,
      newValue: this.data[rid]
    });
  }

  removeMesh(rid:string){
    let oldValue = this.data[rid];
    if (oldValue) { // check if mesh exists
      delete this.data[rid];
      this._dataChanged.emit({
        event: 'remove',
        source: this.data,
        key: rid,
        oldValue: oldValue,
        newValue: undefined
      });
    }
  }

  pinMeshes(rids:Array<string>){
    for (let rid of rids){
      let oldValue = this.data[rid]['pinned'];
      let newValue = true;
      if (oldValue !== newValue){
        this.data[rid]['pinned'] = newValue;
        this._dataChanged.emit({
          event: 'change',
          source: this.data[rid],
          key: 'pinned',
          oldValue: oldValue,
          newValue: newValue
        });
      }
    }
  }

  unpinMeshes(rids:Array<string>){
    for (let rid of rids){
      let oldValue = this.data[rid]['pinned'];
      let newValue = false;
      if (oldValue !== newValue){
        this.data[rid]['pinned'] = newValue;
        this._dataChanged.emit({
          event: 'change',
          source: this.data[rid],
          key: 'pinned',
          oldValue: oldValue,
          newValue: newValue
        });
      }
    }
  }

  hideMeshes(rids:Array<string>){
    for (let rid of rids){
      let oldValue = this.data[rid]['visibility'];
      let newValue = false;
      if (oldValue !== newValue){
        this.data[rid]['visibility'] = newValue;
        this._dataChanged.emit({
          event: 'change',
          source: this.data[rid],
          key: 'visibility',
          oldValue: oldValue,
          newValue: false
        });
      }
    }
  }

  showMeshes(rids:Array<string>){
      for (let rid of rids){
        let oldValue = this.data[rid]['visibility'];
        let newValue = true;
        if (oldValue !== true){
          this.data[rid]['visibility'] = newValue;
          this._dataChanged.emit({
            event: 'change',
            source: this.data[rid],
            key: 'visibility',
            oldValue: oldValue,
            newValue: newValue
          });
        }
      }
  }

  get dataChanged(): ISignal<this, any> {
    return this._dataChanged;
  }

  get metadataChanged():ISignal<this, any>{
    return this._metadataChanged;
  }
  
  get statesChanged(): ISignal<this, any>{
    return this._statesChanged;
  }

  _dataChanged = new Signal<this, any>(this);
  _metadataChanged = new Signal<this, any>(this);
  _statesChanged = new Signal<this, any>(this);
  data: object | any;
  metadata:  object | any;
  states: object | any;
}


namespace Private {
  /**
   * Convert Neu3D's raw meshDict object to what we have
   * @param meshDict Neu3D's raw meshDict object
   */
  export function loadNeu3DMeshDict(meshDict: any):{[rid: string]: IMeshDictItem}  {
    let modelMeshDict: {[rid: string]: IMeshDictItem} = {};
    for (let rid of Object.keys(meshDict)){
      modelMeshDict[rid] = convertRawMesh(meshDict[rid]);
    }
    return modelMeshDict;
  }


  /**
   * Convert Raw Neu3D Mesh to `IMeshDict`
   */
  export function convertRawMesh(mesh: any): IMeshDictItem {
    if (mesh.filename){
      return {
        label: mesh['label'],
        highlight: mesh['highlight'],
        opacity: mesh['opacity'],
        visibility: mesh['visibility'],
        background: mesh['background'],
        // color: mesh['color'],
        pinned: mesh['pinned'],
        filetype: mesh['filetype'],
        filename: mesh['filename']
      }
    } else if (mesh.dataStr){
      return {
        label: mesh['label'],
        highlight: mesh['highlight'],
        opacity: mesh['opacity'],
        visibility: mesh['visibility'],
        background: mesh['background'],
        // color: mesh['color'],
        pinned: mesh['pinned'],
        filetype: mesh['filetype'],
        dataStr: mesh['dataStr']
      }
    } else if (['sample', 'parent', 'identifier', 'x', 'y', 'z', 'r'].every(l => { return l in mesh })) { // raw data
      return {
        label: mesh['label'],
        highlight: mesh['highlight'],
        opacity: mesh['opacity'],
        visibility: mesh['visibility'],
        background: mesh['background'],
        // color: mesh['color'],
        pinned: mesh['pinned'],
        sample: mesh['sample'],
        parent: mesh['parent'],
        identifier: mesh['identifier'],
        x: mesh['x'],
        y: mesh['y'],
        z: mesh['z'],
        r: mesh['r'],
        // object: mesh.object ?? {},
        type: 'morphology_json'
      }
    }
    else {
      return {}; // neither mesh nor swc
    }
    
  }
}