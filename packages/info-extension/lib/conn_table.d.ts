import "jquery-ui";
import "jquery.tabulator";
import { ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
import { Message } from '@phosphor/messaging';
import { INeuroInfoSubWidget } from "./widget";
/**
* A Tabulator based connectivity table widget
*/
export declare class ConnTable extends Widget implements INeuroInfoSubWidget {
    constructor();
    /**
     * on update request, check if div created successfully
     * @param msg
     */
    onUpdateRequest(msg: Message): void;
    /**
     * Update Connectivity Data
     * @param connData
     */
    updateData(connData: any): void;
    /**
     * A signal that is emited when neuron is to be added/removed
     */
    readonly addRemoveSignal: ISignal<this, object>;
    /**
     * Create Tabulator
     * @param {string} divId  HTMLDivElement container for tabulator
     * @param {any} [data] optional initial data
     */
    private _createTabulator;
    /**
     * Parse data for tabulator
     *
     * Reformat data returned from neuroArch into Array of JSON format for tabulator rendering
     * @param data
     */
    private _parseTabulatorData;
    reset(): void;
    /**
     * Elements associated with this object
     */
    readonly container: HTMLElement;
    private _addRemoveSignal;
}
