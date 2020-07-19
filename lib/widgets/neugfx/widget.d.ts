import { NeuGFXModel, INeuGFXModel } from './model';
import { IFBLWidget, FBLWidget } from '../template/index';
import '../../../style/widgets/neugfx/neugfx.css';
declare global {
    interface Window {
        neurogfxWidget: any;
        neugfx_widget: any;
        jq: any;
    }
}
/**
* An NeuGFX Widget
*/
export declare class NeuGFXWidget extends FBLWidget implements IFBLWidget {
    constructor(options: FBLWidget.IOptions);
    onCommMsg(msg: any): void;
    initFBLCode(): string;
    initModel(model: Partial<INeuGFXModel>): void;
    renderModel(change?: any): void;
    get species(): string;
    set species(new_species: string);
    /**
    * The Elements associated with the widget.
    */
    private _neugfxContainer;
    private _blocker;
    model: NeuGFXModel;
}
