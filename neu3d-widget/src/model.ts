import { IDisposable } from '@lumino/disposable';
// import { ISignal, Signal } from '@lumino/signaling';

/**
* A json object with `rid` as key
*/
interface IMeshDict {
  [rid: string]: IMeshDictItem
}

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
  pinned?: boolean 
}

/**
* currently rendered neuron information
*/
export interface INeu3DModel extends IDisposable {
  readonly meshDict: IMeshDict;
  // readonly ModelChanged: ISignal<Neu3DModel, IMeshDict>;
}

/**
* Neu3D Model class
*/
export class Neu3DModel implements INeu3DModel {
  constructor(model?: INeu3DModel){
    if (model){
      if (model.meshDict) {
        this._meshDict = model.meshDict;
      }else{
        this._meshDict = {};
      }
    } else {
      this._meshDict = {};
    }
  }
  
  get meshDict(): IMeshDict {
    return this._meshDict;
  }
  
  /**
   * Synchronize with real meshDict from the Neu3D instance
   */
  syncWithWidget(meshDict: any){
    this._meshDict = Private.loadNeu3DMeshDict(meshDict);
  }

  addMesh(rid:string, value:IMeshDictItem){
    this._meshDict[rid] = Private.convertRawMesh(value);
  }

  removeMesh(rid:string){
    delete this._meshDict[rid];
  }

  pinMeshes(rids:Array<string>){
    for (let rid of rids){
      this._meshDict[rid]['pinned'] = true;
    }
  }

  unpinMeshes(rids:Array<string>){
    for (let rid of rids){
      this._meshDict[rid]['pinned'] = false;
    }
  }

  hideMeshes(rids:Array<string>){
    for (let rid of rids){
      this._meshDict[rid]['visibility'] = false;
    }
  }

  showMeshes(rids:Array<string>){
    for (let rid of rids){
      this._meshDict[rid]['visibility'] = true;
    }
  }

  // /** 
  //  * Signal for when the model has changed
  //  */
  // get ModelChanged(): ISignal<this, IMeshDict> {
  //   return this._modelChanged;
  // }

  /**
  * Whether the model is disposed.
  */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
  * Dipose of the resources used by the model.
  */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    // Signal.clearData(this);
    delete this._meshDict;
  }
  
  // private _modelChanged = new Signal<this, IMeshDict>(this);
  private _isDisposed = false;
  private _meshDict: IMeshDict;
}


namespace Private {
  /**
   * Convert Neu3D's raw meshDict object to what we have
   * @param meshDict Neu3D's raw meshDict object
   */
  export function loadNeu3DMeshDict(meshDict: any): IMeshDict {
    let modelMeshDict: IMeshDict = {};
    for (let rid of Object.keys(meshDict)){
      modelMeshDict[rid] = convertRawMesh(meshDict[rid]);
    }
    return modelMeshDict;
  }


  /**
   * Convert Raw Neu3D Mesh to `IMeshDict`
   */
  export function convertRawMesh(mesh: any): IMeshDict {
    return {
      label: mesh['label'],
      highlight: mesh['highlight'],
      opacity: mesh['opacity'],
      visibility: mesh['visibility'],
      background: mesh['background'],
      color: mesh['color'],
      pinned: mesh['pinned'],
    }
  }
}