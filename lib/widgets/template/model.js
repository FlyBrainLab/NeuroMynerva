// import { IObservableJSON } from '@jupyterlab/observables';
import { Signal } from '@lumino/signaling';
/**
* FBL Widget Model Class
*/
export class FBLWidgetModel {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f;
        this._isDisposed = false;
        this._dataChanged = new Signal(this);
        this._metadataChanged = new Signal(this);
        this._statesChanged = new Signal(this);
        this.data = (_b = (_a = options) === null || _a === void 0 ? void 0 : _a.data, (_b !== null && _b !== void 0 ? _b : {}));
        this.metadata = (_d = (_c = options) === null || _c === void 0 ? void 0 : _c.metadata, (_d !== null && _d !== void 0 ? _d : {}));
        this.states = (_f = (_e = options) === null || _e === void 0 ? void 0 : _e.states, (_f !== null && _f !== void 0 ? _f : {}));
    }
    /**
    * Whether the model is disposed.
    */
    get isDisposed() {
        return this._isDisposed;
    }
    /**
    * Dipose of the resources used by the model.
    */
    dispose() {
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
