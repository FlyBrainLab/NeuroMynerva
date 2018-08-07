import { JSONObject } from '@phosphor/coreutils';
import { IDisposable } from '@phosphor/disposable';
import { ISignal, Signal} from '@phosphor/signaling';

/**
* An FFBOLab model.
*/
export
interface IFFBOLabModel extends IDisposable {
  /**
  * The JSON object stored in the model.
  * {rid: {name: '', state}} 
  */
  readonly value: JSONObject;

  /**
  * The JSON object stored in the model.
  * {rid: {name: '', state}} 
  */
  readonly names: Array<string>;

  /**
   * Signal emitted when the value of the model is changed
   * 
   * emits type is {type:'',data:{}}
   */
  readonly valueChanged: ISignal<IFFBOLabModel, JSONObject>;
}

/**
* The default implementation of the FFBOLab model.
*/
export
class FFBOLabModel implements IFFBOLabModel {
  /**
  * Construct a new Model.
  */
  constructor(initialValue?: JSONObject) {
    let data = initialValue || {};
    this._value = data;
  }

  /**
   * emits signal when value is changed
   */
  get valueChanged(): ISignal<FFBOLabModel, JSONObject>{
    return this._valueChanged;
  }

  /**
   * return all names of neurons in the model
   */
  get names(): Array<string>{
    let names = [];
    for (let rid in this._value) {
      if ('name' in (<JSONObject>this._value[rid])) {
        names.push(<string>(<JSONObject>this._value[rid])['name']);
      }
    }
    return names;
  }

  /**
   * return content of model
   */
  get value(): JSONObject{
    return this._value;
  }

  /**
   * set entirely new value for the model
   */
  set value(newValue: JSONObject){
    const oldValue = this._value;
    if (oldValue === newValue) {
      return;
    }

    this._value = {};
    for (let key in newValue){
      this._value[key] = newValue[key];
    }

    let msg = {type:'set',data: this._value};
    this._valueChanged.emit(msg);
  }

  /**
   * newValue: {rid: {name: , highligh: , pinned:}}
   */
  append(rid:string, newData: JSONObject): void {
    if (rid in this._value){
        return;
    }
    // skip if is neuropil - need to have a better solution for this
    if (rid[0] != '#' ){ 
      return;
    }
    (<JSONObject>this._value)[rid] = newData;

    // compose message
    let msg = { type: 'append', data: rid };
    this._valueChanged.emit(msg);
  }

  /**
   * remove
   */
  remove(rid: string) {
    if (!(rid in this._value)) {
      return;
    }
    delete this._value[rid];
    let msg = { type: 'remove', data: rid };
    this._valueChanged.emit(msg);
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
    Signal.clearData(this);
  }
  
  private _value: JSONObject;
  private _valueChanged = new Signal<this, JSONObject>(this);
  private _isDisposed = false;
}