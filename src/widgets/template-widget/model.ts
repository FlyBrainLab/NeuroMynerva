import { IDisposable } from '@lumino/disposable';
// import { IObservableJSON } from '@jupyterlab/observables';
import { Signal, ISignal } from '@lumino/signaling';

export interface IFBLWidgetModel extends IDisposable {
  data: Record<string, unknown> | any;
  metadata: Record<string, unknown> | any;
  states: Record<string, unknown> | any;
}

/**
 * FBL Widget Model Class
 */
export class FBLWidgetModel implements IFBLWidgetModel {
  constructor(options?: Partial<IFBLWidgetModel>) {
    this.data = options?.data ?? {};
    this.metadata = options?.metadata ?? {};
    this.states = options?.states ?? {};
  }

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

    // TODO: Actually may not want to dispose these if shared with IPyFBL
    delete this.data;
    delete this.metadata;
    delete this.states;
    Signal.disconnectAll(this._dataChanged);
    Signal.disconnectAll(this._metadataChanged);
    Signal.disconnectAll(this._statesChanged);
    this._isDisposed = true;
  }

  get dataChanged(): ISignal<this, FBLWidgetModel.IChangeArgs | any> {
    return this._dataChanged;
  }

  get metadataChanged(): ISignal<this, any> {
    return this._metadataChanged;
  }

  get statesChanged(): ISignal<this, any> {
    return this._statesChanged;
  }

  protected _isDisposed = false;
  _dataChanged = new Signal<this, FBLWidgetModel.IChangeArgs | any>(this);
  _metadataChanged = new Signal<this, FBLWidgetModel.IChangeArgs | any>(this);
  _statesChanged = new Signal<this, FBLWidgetModel.IChangeArgs | any>(this);
  data: Record<string, unknown> | any;
  metadata: Record<string, unknown> | any;
  states: Record<string, unknown> | any;
}

export namespace FBLWidgetModel {
  export interface IChangeArgs {
    type: 'data' | 'metadata' | 'states' | string;
    event: 'change' | 'add' | 'remove' | string;
    source: Record<string, unknown> | any; // the object that changed
    key?: string | any; // source[key] should give a way to access the data that's been changed
    oldValue: Record<string, unknown> | any;
    newValue: Record<string, unknown> | any;
  }
}
