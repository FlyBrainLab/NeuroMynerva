import { Widget } from '@phosphor/widgets';
import { Message } from '@phosphor/messaging';
import { JSONObject, JSONValue } from '@phosphor/coreutils';
import { ISignal } from '@phosphor/signaling';
import JSONEditor = require('jsoneditor');
import '../style/ffbo.InfoPanel.css';
export interface UpdateObject {
    [key: string]: InnerUpdateObject;
}
export interface InnerUpdateObject {
    [key: string]: UpdateObject | JSONValue | string;
}
/**
* InfoPanel
* @constuctor
* @param {string} div_id - id for div element in which the connectivity table is held
* @param {dict} [nameConfig={}] - configuration of children divs. The 3 children divs in ConnTable are `['connSVGId','connTableId','summaryTableId']`
*/
export declare class InfoPanel {
    name: JSONValue;
    summaryTableId: string;
    connSVGId: string;
    constructor(container: HTMLElement, nameConfig?: JSONObject);
    /**
     * Reset to detaul HTML
     */
    reset(): void;
    /**
     * Check if an object is in the workspace.
     *
     * @param {string} rid -  rid of target object (neuron/synapse)
     * @returns {bool} if object in workspace
     */
    isInWorkspace(rid: string): boolean;
    /**
     * Add an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    addByUname(uname: string): any;
    /**
     * Remove an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    removeByUname(uname: string): any;
    /**
     * Get attribute of an object in the workspace.
     *
     * @param {string} rid -  rid of target object
     * @returns {value} return Value as expected by the attribute
     */
    getAttr(rid: string, attr: any): any;
    /**
    * Update Info Panel
    *
    * @param {obj} neuData - neuron Data
    * @param {obj} synData - synapse Data
    */
    update(data: JSONObject): void;
    /**
     * show infopanel
     */
    show(): void;
    /**
     * hide infopanel
     */
    hide(): void;
    /**
     * resize infopanel
     */
    resize(): void;
    private summaryTable;
    private connSVG;
    private htmlTemplate;
    private dom;
}
/**
 * SummaryTable Information Constructor
 * @constructor
 * @param {string} container -  div in which to create SummaryTable
 * @param {obj} parentObj -  parentObject
 * @param {dict} [nameConfig={}] - configuration of children divs. The 3 children divs in ConnTable are `['colorId','extraImgId']`
 */
export declare class SummaryTable {
    private divId;
    private parentObj;
    private htmlTemplate;
    private dom;
    private colorId;
    tableDOM: HTMLElement;
    tabId: string;
    extraImgId: string;
    constructor(container: HTMLElement, parentObj: InfoPanel, nameConfig?: JSONObject);
    reset(): void;
    /**
     * SummaryTable Information show
     */
    show(): void;
    /**
     * SummaryTable Information hide
     */
    hide(): void;
    resize(): void;
    /**
     * SummaryTable Information Update
     *
     */
    update(data: JSONObject): void;
    /**
     * Setup Callback for add remove button
     */
    setupCallbacks(): void;
}
/**
 * Connectivity SVG inside Info Panel
 * @constructor
 * @param {string} div_id - id for div element in which the connectivity table is held
 * @param {obj} parentObj - parent object (infopanel)
 * @param {dict} [nameConfig={}] - configuration of children divs. The 3 children divs in ConnTable are `['tabId','tabTextId','svgId']`.
 *    `tabId`: holder for table showing information over each rectangle in svg on hover/click,
 *    `tabTextId`: the `<td>` element in tabId div where the text is being held
 *    `svgId`: div for where the svg will be rendered
 */
export declare class ConnSVG {
    private htmlTemplate;
    private dom;
    private ctx_pre;
    private ctx_post;
    tabId: string;
    tabTextId: string;
    ctxId_pre: string;
    ctxId_post: string;
    constructor(div_id: HTMLElement, parentObj: InfoPanel, nameConfig?: JSONObject);
    /**
     * Reset SVG plot to default state, remove this.svg object
     */
    reset(): void;
    /**
     * Hide SVG table and plot
     */
    hide(): void;
    /**
     * Show SVG table and plot
     */
    show(): void;
    /**
     * Update SVG
     */
    update(data: JSONObject): void;
    /**
     * Resize Synaptic Profile plot
     */
    resize(): void;
}
/**
 * A NeuroInfo Widget
 *
 * @param {FFBOLabModel} model
 * @param {string} [className]
 */
export declare class InfoPanelWidget extends Widget {
    /**
     * Construct a new FFBO widget.
     */
    constructor(className?: string | null);
    readonly valueChanged: ISignal<this, string>;
    /**
     * Instantiate Child Widgets on Master Widget's `context.ready`
     */
    private _initialize;
    /**
     * Dispose the current
     */
    /**
     * A promise that resolves when the FFBOLab widget is ready
     */
    readonly ready: Promise<void>;
    /**
     * The Elements associated with the widget.
     */
    private _ready;
    private _valueChanged;
    readonly editor: InfoPanel;
    readonly jsoneditor: JSONEditor;
    /**
     * Handle update requests for the widget.
     */
    onUpdateRequest(msg: Message): void;
}
