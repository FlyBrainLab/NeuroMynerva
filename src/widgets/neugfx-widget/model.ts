import { FBLWidgetModel, IFBLWidgetModel } from '../template-widget/index';
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
export class NeuGFXModel extends FBLWidgetModel implements INeuGFXModel {
  constructor(options?: Partial<INeuGFXModel>) {
    super(options);
    this.placeholder = 'place holder';
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

  _dataChanged = new Signal<this, any>(this);
  _metadataChanged = new Signal<this, any>(this);
  _statesChanged = new Signal<this, any>(this);
  placeholder: string;
  data: Record<string, unknown> | any;
  metadata: Record<string, unknown> | any;
  states: Record<string, unknown> | any;
}
