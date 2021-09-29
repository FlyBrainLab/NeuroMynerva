import { ISignal, Signal } from '@lumino/signaling';
import { FBLWidgetModel, IFBLWidgetModel } from '../template-widget/index';
import * as THREE from 'three';

export interface IDataChangeArgs {
  event: string;
  source: any;
  oldValue: any;
  newValue: any;
  key?: string;
  rid?: string;
}

/**
 * ID and a few selected attributes of the associated mesh dict items
 */
export interface IMeshDictBaseItem {
  orid?: string; // neuron/synapse/mesh node rid. used to removeByRid
  uname?: string;
  name?: string;
  label?: string;
  highlight?: boolean;
  opacity?: number;
  visibility?: boolean;
  background?: boolean;
  color?: number[];
  pinned?: boolean;
  type?: 'morphology_json' | 'general_json' | string; // type, used to keep track of morphology json objects
  morph_type?: 'swc' | 'mesh' | string; // specify mesh with faces and vertices enabled will parse background
  class?: 'Neuron' | 'Neuropil' | 'Synapse' | string;
}

export interface IMeshDictSWCItem extends IMeshDictBaseItem {
  sample?: Array<number>; // content of loading raw object
  parent?: Array<number>; // content of loading raw object
  identifier?: Array<number>; // content of loading raw object
  x?: Array<number>; // content of loading raw object
  y?: Array<number>; // content of loading raw object
  z?: Array<number>; // content of loading raw object
  r?: Array<number>; // content of loading raw object
}

export interface IMeshDictMeshItem extends IMeshDictBaseItem {
  faces?: Array<number>; // mesh faces
  vertices?: Array<number>; // mesh faces
}

export interface IMeshDictObjItem extends IMeshDictBaseItem {
  filetype?: string;
  dataStr?: string; // datastring of swcs
}

export interface IMeshDictFileItem extends IMeshDictBaseItem {
  filename?: string; // specified if downloaded mesh
  filetype?: string; // 'swc'
}

export type IMeshDictItem =
  | IMeshDictBaseItem
  | IMeshDictSWCItem
  | IMeshDictMeshItem
  | IMeshDictObjItem
  | IMeshDictFileItem;

/**
 * currently rendered neuron information
 */
export interface INeu3DModel extends IFBLWidgetModel {
  data: { [rid: string]: IMeshDictItem };
}

/**
 * Neu3D Model class
 */
export class Neu3DModel extends FBLWidgetModel implements INeu3DModel {
  constructor(options?: Partial<INeu3DModel>) {
    super(options);
  }

  /**
   * Synchronize with real meshDict from the Neu3D instance
   */
  syncWithWidget(meshDict: any): void {
    const oldValue = this.data;
    this.data = Private.loadNeu3DMeshDict(meshDict);
    this._dataChanged.emit({
      event: oldValue ? 'change' : 'add',
      source: this.data,
      oldValue: oldValue,
      newValue: this.data
    });
  }

  /**
   * Add Mesh
   *
   * Will save the mesh information in the data object (dict)
   * and emit a dataChanged signal
   *
   * @param rid
   * @param value
   */
  addMesh(rid: string, value: IMeshDictItem): void {
    // if (value.background) {
    //   return;
    // }
    const oldValue = this.data[rid];
    const mesh = Private.convertRawMesh(value);
    if (mesh === null) {
      console.warn(
        `[Neu3D-Widget] Mesh rid ${rid} mesh parse failed, ignoring.`
      );
      return;
    }
    this.data[rid] = mesh;
    this.states.color[rid] = mesh.color;
    this.states.visibility[rid] = mesh.visibility;

    this._dataChanged.emit({
      event: oldValue ? 'change' : 'add',
      source: this.data,
      key: rid,
      rid: rid,
      oldValue: oldValue,
      newValue: mesh
    });
  }

  /**
   * Remove Mesh
   *
   * Will remove the mesh information from the data object (dict)
   * and emit a dataChanged signal
   *
   * @param rid
   */
  removeMesh(rid: string): void {
    const oldValue = this.data[rid];
    if (oldValue) {
      // check if mesh exists
      delete this.data[rid];
      delete this.states.color[rid];
      delete this.states.visibility[rid];

      this._dataChanged.emit({
        event: 'remove',
        source: this.data,
        key: rid,
        rid: rid,
        oldValue: oldValue,
        newValue: undefined
      });
    }
  }

  /**
   * Pin Mesh
   *
   * Will updated the pin information in the data object (dict)
   * and emit a dataChanged signal
   *
   * @param rid
   */
  pinMeshes(rids: Array<string>): void {
    for (const rid of rids) {
      const oldValue = this.data[rid]['pinned'];
      const newValue = true;
      if (oldValue !== newValue) {
        this.data[rid]['pinned'] = newValue;
        this._dataChanged.emit({
          event: 'change',
          source: this.data[rid],
          key: 'pinned',
          rid: rid,
          oldValue: oldValue,
          newValue: newValue
        });
      }
    }
  }

  /**
   * UnPin Mesh
   *
   * Will updated the pin information in the data object (dict)
   * and emit a dataChanged signal
   *
   * @param rid
   */
  unpinMeshes(rids: Array<string>): void {
    for (const rid of rids) {
      const oldValue = this.data[rid]['pinned'];
      const newValue = false;
      if (oldValue !== newValue) {
        this.data[rid]['pinned'] = newValue;
        this._dataChanged.emit({
          event: 'change',
          source: this.data[rid],
          key: 'pinned',
          rid: rid,
          oldValue: oldValue,
          newValue: newValue
        });
      }
    }
  }

  /**
   * Hide Mesh
   *
   * Will updated the visilibity information in the data object (dict)
   * and emit a dataChanged signal
   *
   * @param rid
   */
  hideMeshes(rids: Array<string>): void {
    for (const rid of rids) {
      const oldValue = this.data[rid]['visibility'];
      const newValue = false;
      if (oldValue !== newValue) {
        this.data[rid]['visibility'] = newValue;
        this._dataChanged.emit({
          event: 'change',
          source: this.data[rid],
          key: 'visibility',
          oldValue: oldValue,
          newValue: false,
          rid: rid
        });
      }
    }
  }

  /**
   * Show Meshes
   *
   * Will updated the visibility information in the data object (dict)
   * and emit a dataChanged signal
   *
   * @param rid
   */
  showMeshes(rids: Array<string>): void {
    for (const rid of rids) {
      const oldValue = this.data[rid]['visibility'];
      const newValue = true;
      if (oldValue !== true) {
        this.data[rid]['visibility'] = newValue;
        this._dataChanged.emit({
          event: 'change',
          source: this.data[rid],
          key: 'visibility',
          oldValue: oldValue,
          newValue: newValue,
          rid: rid
        });
      }
    }
  }

  get dataChanged(): ISignal<this, any> {
    return this._dataChanged;
  }

  get metadataChanged(): ISignal<this, any> {
    return this._metadataChanged;
  }

  get statesChanged(): ISignal<this, any> {
    return this._statesChanged;
  }

  /** Return Partial of Data Object of all pinned neurons & synapses*/
  get pinned(): { [rid: string]: IMeshDictItem } {
    return Private.filter(
      this.data,
      (mesh: IMeshDictItem) => !mesh.background && mesh.pinned
    );
  }

  /** Return Partial of Data Object of all background meshes*/
  get background(): { [rid: string]: IMeshDictItem } {
    return Private.filter(this.data, (mesh: IMeshDictItem) => mesh.background);
  }

  /** Return Partial of Data Object of all unpinned neurons & synapses*/
  get unpinned(): { [rid: string]: IMeshDictItem } {
    return Private.filter(
      this.data,
      (mesh: IMeshDictItem) => !mesh.background && !mesh.pinned
    );
  }

  _dataChanged = new Signal<this, IDataChangeArgs>(this);
  _metadataChanged = new Signal<this, any>(this);
  _statesChanged = new Signal<this, any>(this);
  data: Record<string, unknown> | any;
  metadata: Record<string, unknown> | any;
  states: Record<string, unknown> | any;
}

namespace Private {
  /**
   * Filter Object based on predicate on each obj
   * @param obj
   * @param predicate
   */
  export function filter(
    obj: Record<string, unknown>,
    predicate: CallableFunction
  ): Record<string, unknown> | any {
    return Object.keys(obj)
      .filter((key: string) => predicate((obj as any)[key]))
      .reduce(
        (res: Record<string, unknown>, key: string) => (
          ((res as any)[key] = (obj as any)[key]), res
        ),
        {}
      );
  }

  /**
   * Convert Neu3D's raw meshDict object to what we have
   * @param meshDict Neu3D's raw meshDict object
   */
  export function loadNeu3DMeshDict(meshDict: any): {
    [rid: string]: IMeshDictItem;
  } {
    const modelMeshDict: { [rid: string]: IMeshDictItem } = {};
    for (const rid of Object.keys(meshDict)) {
      if (meshDict[rid].background) {
        continue;
      }
      const mesh = convertRawMesh(meshDict[rid]);
      if (mesh === null) {
        continue;
      }
      modelMeshDict[rid] = mesh;
    }
    return modelMeshDict;
  }

  /**
   * Parse Color to [r,g,b] array
   */
  export function parseColor(color: string | number | THREE.Color): number[] {
    return new THREE.Color(color).toArray();
  }

  export function parseSWC(mesh: any): IMeshDictSWCItem {
    return {
      orid: mesh['orid'],
      uname: mesh['uname'],
      name: mesh['name'] ?? mesh['uname'],
      label: mesh['label'],
      highlight: mesh['highlight'],
      opacity: mesh['opacity'],
      visibility: mesh['visibility'],
      background: mesh['background'],
      color: parseColor(mesh['color']),
      pinned: mesh['pinned'],
      sample: mesh['sample'],
      parent: mesh['parent'],
      identifier: mesh['identifier'],
      x: mesh['x'],
      y: mesh['y'],
      z: mesh['z'],
      r: mesh['r'],
      type: 'morphology_json',
      morph_type: 'swc',
      class: mesh['class'] ?? 'Neuron'
    };
  }

  export function parseMesh(mesh: any): IMeshDictMeshItem {
    return {
      orid: mesh['orid'],
      uname: mesh['uname'],
      name: mesh['name'] ?? mesh['uname'],
      label: mesh['label'],
      highlight: mesh['highlight'],
      opacity: mesh['opacity'],
      visibility: mesh['visibility'],
      background: mesh['background'],
      color: parseColor(mesh['color']),
      pinned: mesh['pinned'],
      faces: mesh['faces'],
      vertices: mesh['vertices'],
      type: 'morphology_json',
      morph_type: 'mesh',
      class: mesh['class'] ?? 'Neuropil'
    };
  }

  /**
   * Convert Raw Neu3D Mesh to `IMeshDict`
   */
  export function convertRawMesh(mesh: any): IMeshDictItem | null {
    if ('morph_type' in mesh && 'class' in mesh) {
      switch (mesh.morph_type) {
        case 'swc':
          return parseSWC(mesh);
        case 'mesh':
          return parseMesh(mesh);
        default:
          break;
      }
    } else {
      if (mesh.filename) {
        // file
        return {
          orid: mesh['orid'],
          uname: mesh['uname'],
          name: mesh['name'] ?? mesh['uname'],
          label: mesh['label'],
          highlight: mesh['highlight'],
          opacity: mesh['opacity'],
          visibility: mesh['visibility'],
          background: mesh['background'],
          color: parseColor(mesh['color']),
          pinned: mesh['pinned'],
          filetype: mesh['filetype'],
          filename: mesh['filename']
        };
      } else if (mesh.dataStr) {
        return {
          orid: mesh['orid'],
          uname: mesh['uname'],
          name: mesh['name'] ?? mesh['uname'],
          label: mesh['label'],
          highlight: mesh['highlight'],
          opacity: mesh['opacity'],
          visibility: mesh['visibility'],
          background: mesh['background'],
          color: parseColor(mesh['color']),
          pinned: mesh['pinned'],
          filetype: mesh['filetype'],
          dataStr: mesh['dataStr']
        };
      } else if (
        ['sample', 'parent', 'identifier', 'x', 'y', 'z', 'r'].every(l => {
          return l in mesh;
        })
      ) {
        // raw data
        return {
          orid: mesh['orid'],
          uname: mesh['uname'],
          name: mesh['name'] ?? mesh['uname'],
          label: mesh['label'],
          highlight: mesh['highlight'],
          opacity: mesh['opacity'],
          visibility: mesh['visibility'],
          background: mesh['background'],
          color: parseColor(mesh['color']),
          pinned: mesh['pinned'],
          sample: mesh['sample'],
          parent: mesh['parent'],
          identifier: mesh['identifier'],
          x: mesh['x'],
          y: mesh['y'],
          z: mesh['z'],
          r: mesh['r'],
          type: 'morphology_json'
        };
      } else {
        return null; // neither mesh nor swc
      }
    }
  }
}
