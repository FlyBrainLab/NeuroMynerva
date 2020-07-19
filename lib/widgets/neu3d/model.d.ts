import { ISignal, Signal } from '@lumino/signaling';
import { FBLWidgetModel, IFBLWidgetModel } from '../template/index';
/**
* ID and a few selected attributes of the associated mesh dict items
*
*/
interface IMeshDictItem {
    label?: String;
    highlight?: Boolean;
    opacity?: Number;
    visibility?: Boolean;
    background?: Boolean;
    color?: {
        r: Number;
        g: Number;
        b: Number;
    };
    pinned?: boolean;
    filename?: string;
    filetype?: 'swc' | string;
    dataStr?: string;
    sample?: Array<number>;
    parent?: Array<number>;
    identifier?: Array<number>;
    x?: Array<number>;
    y?: Array<number>;
    z?: Array<number>;
    r?: Array<number>;
    object?: any;
    type?: 'morphology_json' | 'general_json' | string;
}
/**
* currently rendered neuron information
*/
export interface INeu3DModel extends IFBLWidgetModel {
    data: {
        [rid: string]: IMeshDictItem;
    };
}
/**
* Neu3D Model class
*/
export declare class Neu3DModel extends FBLWidgetModel implements INeu3DModel {
    constructor(options?: Partial<INeu3DModel>);
    /**
     * Synchronize with real meshDict from the Neu3D instance
     */
    syncWithWidget(meshDict: any): void;
    addMesh(rid: string, value: IMeshDictItem): void;
    removeMesh(rid: string): void;
    pinMeshes(rids: Array<string>): void;
    unpinMeshes(rids: Array<string>): void;
    hideMeshes(rids: Array<string>): void;
    showMeshes(rids: Array<string>): void;
    get dataChanged(): ISignal<this, any>;
    get metadataChanged(): ISignal<this, any>;
    get statesChanged(): ISignal<this, any>;
    _dataChanged: Signal<this, any>;
    _metadataChanged: Signal<this, any>;
    _statesChanged: Signal<this, any>;
    data: object | any;
    metadata: object | any;
    states: object | any;
}
export {};
