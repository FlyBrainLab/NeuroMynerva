import { FBLWidgetModel } from '../template/index';
import { Signal } from '@lumino/signaling';
/**
* NeuGFX Model class
*/
export class NeuGFXModel extends FBLWidgetModel {
    constructor(options) {
        super(options);
        this._dataChanged = new Signal(this);
        this._metadataChanged = new Signal(this);
        this._statesChanged = new Signal(this);
        this.placeholder = 'place holder';
    }
    get dataChanged() {
        return this._dataChanged;
    }
    get metadataChanged() {
        return this._metadataChanged;
    }
    get statesChanged() {
        return this._statesChanged;
    }
}
