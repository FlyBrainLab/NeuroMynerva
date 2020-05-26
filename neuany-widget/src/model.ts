import { IDisposable } from '@lumino/disposable';

/**
* currently rendered neuron information
*/
export interface INeuAnyModel extends IDisposable {
  msg: string; 
}

/**
* Neu3D Model class
*/
export class NeuAnyModel implements INeuAnyModel {
  constructor(model?: INeuAnyModel){
    if (model?.msg) {
      this.msg = model.msg;
    } else {
      this.msg = 'Empty NeuAny Model';
    }
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
    this._isDisposed = true;
    delete this.msg;
  }
  

  private _isDisposed = false;
  msg: string;
}