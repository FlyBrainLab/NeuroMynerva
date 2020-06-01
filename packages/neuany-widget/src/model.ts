import { FBLWidgetModel, IFBLWidgetModel } from '@flybrainlab/fbl-template-widget';
import { UUID } from '@lumino/coreutils';

// import { ISignal, Signal } from '@lumino/signaling';

/**
* currently rendered neuron information
*/
export interface INeuAnyModel extends IFBLWidgetModel{
  msg: string;
}

/**
* Neu3D Model class
*/
export class NeuAnyModel extends FBLWidgetModel implements INeuAnyModel {
  constructor(options?: Partial<INeuAnyModel>){
    super(options);
    if (options?.msg) {
      this.msg = options.msg;
    } else {
      this.msg = `No Msg in options. ${UUID.uuid4()}`
    }
  }

  testChangeData() {
    let key = 'data:test_key';
    let newValue = `data:test_val ${UUID.uuid4()}`;
    let oldValue = this.data[key];
    this.data[key] = newValue;
    let msg : FBLWidgetModel.IChangeArgs = {
      type: 'data',
      event: `change`,
      source: this.data,
      key: key,
      oldValue: oldValue,
      newValue: newValue
    }
    this._dataChanged.emit(msg);
  }

  testChangeMetaData() {
    let key = 'metadata:test_key';
    let newValue = `metadata:test_val ${UUID.uuid4()}`;
    let oldValue = this.metadata[key];
    this.metadata[key] = newValue;
    let msg : FBLWidgetModel.IChangeArgs = {
      type: 'metadata',
      event: 'change',
      source: this.metadata,
      key: key,
      oldValue: oldValue,
      newValue: newValue
    }
    this._metadataChanged.emit(msg);
  }

  testChangeStates() {
    let key = 'state:test_key';
    let newValue = `state:test_val ${UUID.uuid4()}`;
    let oldValue = this.states[key];
    this.states[key] = newValue;
    let msg : FBLWidgetModel.IChangeArgs = {
      type: 'states',
      event: 'change',
      source: this.states,
      key: key,
      oldValue: oldValue,
      newValue: newValue
    }
    this._statesChanged.emit(msg);
  }

  msg: string;
}