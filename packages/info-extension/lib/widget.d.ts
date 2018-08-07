import { Widget } from '@phosphor/widgets';
import { ISignal } from '@phosphor/signaling';
import { Message } from '@phosphor/messaging';
import { JSONObject } from '@phosphor/coreutils';
import { IFFBOChildWidget, IFFBOLabWidget } from 'master-extension/lib';
import { ConnSVG } from './conn_svg';
import { SummaryTable } from './summary_table';
import { ConnTable } from './conn_table';
import '../style/index.css';
import '../style/ffbo.InfoPanel.css';
/**
 * An interface for NeuroInfo sub widgets
 */
export interface INeuroInfoSubWidget {
    /** DOM element for HTML */
    readonly container: HTMLElement;
    /** Update data event for widgets */
    updateData(data: any): void;
    /** Update data event for widgets */
    reset(): void;
}
/**
 * A NeuroInfo Widget
 *
 * ## Note
 * NeuroInfo Widget is used to display detailed information
 * about neurons and connectivities obtained from NeuroArch *
 */
export declare class NeuroInfoWidget extends Widget implements IFFBOChildWidget {
    /**
     * Construct a new FFBO widget.
     */
    constructor();
    /**
     * A signal that emits user action in info panel to listener
     */
    readonly outSignal: ISignal<this, object>;
    /**
     * Initialize Routine <DUMMY>
     */
    private _initialize;
    /**
     * Dispose
     */
    dispose(): void;
    /**
     * Responde to `activate` calls on instance
     * @param msg
     */
    onActivateRequest(msg: Message): void;
    /**
     * Connect to signal
     */
    connect(inSignal: ISignal<IFFBOLabWidget, object>): void;
    /**
     * Handle input from master through signal
     *
     * @param sender
     * @param value
     */
    private _handleParentActions;
    /**
     * Handle message from master widget
     * @param msg
     */
    onMasterMessage(msg: any): void;
    /**
     * Dispose resources when widget panel is closed
     * @param msg
     */
    onCloseRequest(msg: Message): void;
    /**
    * Respond to FFBOLabModel Changed <DUMMY>
    */
    onModelChanged(): void;
    /**
     * A promise that resolves when the FFBOLab widget is ready
     */
    readonly ready: Promise<void>;
    /**
     * Update data of info panel
     * @param obj data returned from neuroArch
     */
    updateData(obj: JSONObject): void;
    /**
     * Handle update requests for the widget.
     */
    onUpdateRequest(msg: Message): void;
    /** FIXME:
     * Check if an object is in the workspace.
     *
     * @param {string} rid -  rid of target object (neuron/synapse)
     * @returns {bool} if object in workspace
    */
    isInWorkspace(rid: string): boolean;
    /** FIXME:
     * Add an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    addByUname(uname: string): any;
    /** FIXME:
     * Remove an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    removeByUname(uname: string): any;
    /** FIXME:
     * Get attribute of an object in the workspace.
     *
     * @param {string} rid -  rid of target object
     * @returns {value} return Value as expected by the attribute
     */
    getAttr(rid: string, attr: any): any;
    /**
     * The Elements associated with the widget.
     */
    private name;
    private _ready;
    private _isDisposed;
    private _isConnected;
    private _userAction;
    readonly connSVG: ConnSVG;
    readonly summaryTable: SummaryTable;
    readonly connTable: ConnTable;
}
