import Neu3D = require('neu3d');
import { ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
import { Message } from '@phosphor/messaging';
import { JSONObject } from '@phosphor/coreutils';
import { IFFBOChildWidget, IFFBOLabWidget } from 'master-extension/';
/**
 * A neu3D Widget
 *
 * ## Note
 * This widget depends on another package called Neu3D which is a
 * Morphology visualization tool also developed by Bionet Columbia.
 */
export declare class Neu3DWidget extends Widget implements IFFBOChildWidget {
    /**
     * Construct a new neu3D widget.
     */
    constructor();
    /**
     * Check if DOM element is correctly added
     */
    private _domCheckAndAdd;
    /**
     *  Initialize Neu3D widget if DOM is available
     */
    private _initialize;
    /**
     * setter for adding json to mesh area
     *
     * @param {JSONObject | object} json
     */
    content: JSONObject | object;
    /**
     * Connect to signal
     */
    connect(inSignal: ISignal<IFFBOLabWidget, object>): void;
    /**
     * setup callbacks for neu3D
     *
     * ## Note
     * Some Neu3D user interactions are not implemented yet.
     */
    _setupCallbacks(): void;
    /**
     * Handle message comming from message
     * @param msg
     */
    onMasterMessage(msg: any): void;
    /**
     * A signal that emits user action in neu3D canvas to listener
     */
    readonly outSignal: ISignal<this, object>;
    /**
     * Handle input from master through signal
     * @param sender
     * @param value
     */
    private _handleParentActions;
    /**
     * Dispose all resources
     */
    dispose(): void;
    _handleMessages(event: any): void;
    _receiveCommand(message: any): void;
    /**
     * A promise that resolves when the FFBOLab widget is ready
     */
    readonly ready: Promise<void>;
    /**
     * Dispose resources when widget panel is closed
     * @param msg
     */
    onCloseRequest(msg: Message): void;
    /**
     * Handle update requests for the widget.
     */
    onUpdateRequest(msg: Message): void;
    /**
     * Responde to `activate` calls on instance
     * @param msg
     */
    onActivateRequest(msg: Message): void;
    /**
     * The Elements associated with the widget.
     */
    private _ready;
    private _isDisposed;
    private _isConnected;
    private _isInitialized;
    neu3D: Neu3D;
    private _userAction;
}
