import { IDisposable } from '@lumino/disposable';
import { IObservableJSON, ObservableJSON } from '@jupyterlab/observables';

/**
* currently rendered neuron information
*/
export interface IFBLWidgetModel extends IDisposable {
  data: IObservableJSON | {};
  metadata: IObservableJSON | {};
  states: IObservableJSON | {};
}

/**
* FBL Widget Model Class
*/
export class FBLWidgetModel implements IFBLWidgetModel {
  constructor(options?: Partial<IFBLWidgetModel>){
    this.data = new ObservableJSON({values: options?.data ?? {}});
    this.metadata = new ObservableJSON({values: options?.metadata ?? {}});
    this.states = new ObservableJSON({values: options?.states ?? {}});
    this.data.changed.connect(this.onDataChanged, this);
    this.metadata.changed.connect(this.onMetadataChanged, this);
    this.states.changed.connect(this.onStatesChanged, this);
  }

  /**
   * Handle data Change within the model.
   * To be overload by child class
   * @param sender 
   * @param args 
   */
  private onDataChanged(
    sender: IObservableJSON, 
    args: IObservableJSON.IChangedArgs
  ): void {
    // no-op
    return;
  }

  /**
   * Handle States Change within the model.
   * To be overload by child class
   * @param sender 
   * @param args 
   */
  private onMetadataChanged(
    sender: IObservableJSON, 
    args: IObservableJSON.IChangedArgs
  ): void {
    // no-op
    return;
  }

  /**
   * Handle States Change within the model.
   * To be overload by child class
   * @param sender 
   * @param args 
   */
  private onStatesChanged(
    sender: IObservableJSON, 
    args: IObservableJSON.IChangedArgs
  ): void {
    // no-op
    return;
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
    this.data.dispose();
    this.metadata.dispose();
    this.states.dispose();
    this._isDisposed = true;
  }
  

  
  private _isDisposed = false;
  readonly data: IObservableJSON; // can only set/get/keys/values but not directly modified
  readonly metadata: IObservableJSON; // can only set/get/keys/values but not directly modified
  readonly states: IObservableJSON; // can only set/get/keys/values but not directly modified
}