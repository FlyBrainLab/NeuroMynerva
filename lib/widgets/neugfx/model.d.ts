import { FBLWidgetModel, IFBLWidgetModel } from '../template/index';
import { ISignal, Signal } from '@lumino/signaling';
/**
* currently rendered neuron information
*/
export interface INeuGFXModel extends IFBLWidgetModel {
    placeholder: string;
}
/**
* NeuGFX Model class
*/
export declare class NeuGFXModel extends FBLWidgetModel implements INeuGFXModel {
    constructor(options?: Partial<INeuGFXModel>);
    get dataChanged(): ISignal<this, any>;
    get metadataChanged(): ISignal<this, any>;
    get statesChanged(): ISignal<this, any>;
    _dataChanged: Signal<this, any>;
    _metadataChanged: Signal<this, any>;
    _statesChanged: Signal<this, any>;
    placeholder: string;
    data: object | any;
    metadata: object | any;
    states: object | any;
}
