import { IDisposable } from '@lumino/disposable';
import { Signal, ISignal } from '@lumino/signaling';
export interface IFBLWidgetModel extends IDisposable {
    data: object | any;
    metadata: object | any;
    states: object | any;
}
/**
* FBL Widget Model Class
*/
export declare class FBLWidgetModel implements IFBLWidgetModel {
    constructor(options?: Partial<IFBLWidgetModel>);
    /**
    * Whether the model is disposed.
    */
    get isDisposed(): boolean;
    /**
    * Dipose of the resources used by the model.
    */
    dispose(): void;
    get dataChanged(): ISignal<this, FBLWidgetModel.IChangeArgs | any>;
    get metadataChanged(): ISignal<this, any>;
    get statesChanged(): ISignal<this, any>;
    protected _isDisposed: boolean;
    _dataChanged: Signal<this, any>;
    _metadataChanged: Signal<this, any>;
    _statesChanged: Signal<this, any>;
    data: object | any;
    metadata: object | any;
    states: object | any;
}
export declare namespace FBLWidgetModel {
    interface IChangeArgs {
        type: 'data' | 'metadata' | 'states' | string;
        event: 'change' | 'add' | 'remove' | string;
        source: object | any;
        key?: string | any;
        oldValue: object | any;
        newValue: object | any;
    }
}
