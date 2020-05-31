import { FBLWidgetModel, IFBLWidgetModel } from '@flybrainlab/fbl-template';
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
    let key = 'test_key';
    let newValue = 'test_val';
    let oldValue = this.data[key];
    this.data[key] = newValue;
    let msg : FBLWidgetModel.IChangeArgs = {
      type: 'data:data',
      event: `data:change ${UUID.uuid4}`,
      source: this.data,
      key: key,
      oldValue: oldValue,
      newValue: newValue
    }
    this._dataChanged.emit(msg);
  }

  testChangeMetaData() {
    let key = 'metadata:test_key';
    let newValue = `metadata:test_val ${UUID.uuid4}`;
    let oldValue = this.data[key];
    this.data[key] = newValue;
    let msg : FBLWidgetModel.IChangeArgs = {
      type: 'data',
      event: 'change',
      source: this.data,
      key: key,
      oldValue: oldValue,
      newValue: newValue
    }
    this._dataChanged.emit(msg);
  }

  testChangeStates() {
    let key = 'state:test_key';
    let newValue = `state:test_val ${UUID.uuid4}`;
    let oldValue = this.data[key];
    this.data[key] = newValue;
    let msg : FBLWidgetModel.IChangeArgs = {
      type: 'states',
      event: 'change',
      source: this.data,
      key: key,
      oldValue: oldValue,
      newValue: newValue
    }
    this._dataChanged.emit(msg);
  }
  // get dataChanged(): ISignal<this, any> {
  //   return this._dataChanged;
  // }

  // get metadataChanged():ISignal<this, any>{
  //   return this._metadataChanged;
  // }
  
  // get statesChanged(): ISignal<this, any>{
  //   return this._statesChanged;
  // }

  // _dataChanged = new Signal<this, any>(this);
  // _metadataChanged = new Signal<this, any>(this);
  // _statesChanged = new Signal<this, any>(this);
  // data: object | any;
  // metadata:  object | any;
  // states: object | any;
  msg: string;
}