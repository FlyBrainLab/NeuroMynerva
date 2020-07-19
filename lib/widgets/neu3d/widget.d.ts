import { Neu3D } from 'neu3d';
import { Message } from '@lumino/messaging';
import { ISignal } from '@lumino/signaling';
import { Neu3DModel, INeu3DModel } from './model';
import { IFBLWidget, FBLWidget } from '../template/index';
import '../../../style/widgets/neu3d/neu3d.css';
declare global {
    interface Window {
        neu3d_widget: any;
        active_neu3d_widget: any;
    }
}
/**
* An Neu3D Widget
*/
export declare class Neu3DWidget extends FBLWidget implements IFBLWidget {
    constructor(options: Neu3D.IOptions);
    initFBLCode(): string;
    initModel(model: Partial<INeu3DModel>): void;
    /**
     * Render objects stored within model
     *
     * Currently used for state restoration on reload
     * Currently re-rendering the whole scene regardless
     *
     * TODO: Handle incremental rendering for model change
     *
     * @param change
     */
    renderModel(change?: any): void;
    onDataChanged(change: any): void;
    onStatesChanged(change: any): void;
    onMetadataChanged(change: any): void;
    get workspaceChanged(): ISignal<this, any>;
    /**
     * Handle Command CommMsg
     * @param message
     */
    _receiveCommand(message: any): void;
    /**
     * Handle Messages for Comm or Info
     * @param msg
     */
    onCommMsg(msg: any): void;
    /**
     * Check if an object is in the workspace.
     *
     * @param rid -  rid of target object (neuron/synapse)
     * @returns  if object in workspace
    */
    isInWorkspace(rid: string): boolean;
    /**
     * Fires a query
     */
    querySender(): string;
    /**
     * Fires an NLP query
     */
    NLPquerySender(): string;
    /**
     * Method passed to info panel to ensure stateful data
     *
     * Addresses
     * @param command
     */
    infoCommandWrapper(command: any): void;
    /**
     * Add an object into the workspace.
     *
     * @param uname -  uname of target object (neuron/synapse)
     */
    addByUname(uname: string): Promise<any>;
    /**
     * Remove an object into the workspace.
     *
     * @param uname -  uname of target object (neuron/synapse)
     */
    removeByUname(uname: string): Promise<any>;
    /**
     * Add an object into the workspace.
     *
     * @param rid -  rid of target object (neuron/synapse)
     */
    addByRid(rid: string): Promise<any>;
    /**
     * Remove an object from the workspace.
     *
     * @param rid -  rid of target object (neuron/synapse)
     */
    removeByRid(rid: string): Promise<any>;
    /**
     * Send an NLP query.
     *
     * @param query -  query to send(text)
     */
    executeNLPquery(query: string): Promise<any>;
    /**
     * Get Info of a given neuron
     * @return a promise that resolves to the reply message when done
     */
    executeInfoQuery(uname: string): any;
    /**
     * Instantiate Neu3D and add to DOM after widget attached to DOM
     * */
    onAfterAttach(msg: Message): void;
    /**
     * Instantiate neu3d and setup callback hooks after widget is shown
     * @param msg
     */
    onAfterShow(msg: Message): void;
    /**
     * Propagate resize event to neu3d
     * @param msg
     */
    onResize(msg: any): void;
    /**
     * Returns species
     */
    get species(): string;
    get neu3DReady(): Promise<void>;
    /**
     * Set species
     * @param newSpecies new species to be added
     *    - If sepcies is `adult` or `larva`, this will display mesh and change metadata settings
     */
    set species(newSpecies: string);
    populateToolBar(): void;
    /**
    * The Elements associated with the widget.
    */
    neu3d: Neu3D;
    readonly _adultMesh: Object;
    readonly _larvaMesh: Object;
    readonly _hemibrainMesh: Object;
    private _neu3DReady;
    private _neu3dContainer;
    private _neu3dSearchbar;
    private _blockingDiv;
    private _workspaceChanged;
    model: Neu3DModel;
    info: any;
}
declare namespace Neu3D {
    interface IOptions extends FBLWidget.IOptions {
        info?: any;
    }
}
export {};
