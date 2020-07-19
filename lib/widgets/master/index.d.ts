/// <reference types="react" />
import { ReactWidget } from '@jupyterlab/apputils';
import { IFBLWidgetTrackers } from '../../index';
import '../../../style/widgets/master/master.css';
/**
* An FBL Master Widget
*/
export declare class MasterWidget extends ReactWidget {
    constructor(fbltrackers: IFBLWidgetTrackers);
    protected render(): JSX.Element;
    /**
    * The Elements associated with the widget.
    */
    private fbltrackers;
}
