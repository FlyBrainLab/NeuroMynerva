import { Widget } from '@phosphor/widgets';
import { ISignal } from '@phosphor/signaling';
import { Message } from '@phosphor/messaging';
import { JSONObject } from '@phosphor/coreutils';
import { FFBOLabModel, IFFBOChildWidget, IFFBOLabWidget } from 'master-extension';
/**
 * A NeuroGFX Widget
 *
 * ## Note
 * The GFX Widget is implemented indepedently and added as
 * an iframe for now
 */
export declare class NeuroGFXWidget extends Widget implements IFFBOChildWidget {
    /**
     * Construct a new GFX widget.
     */
    constructor();
    /**
     * initialization routine
     *
     * ## Note
     * 1. creates iframe
     * 2. addes ui block
     * 3. resolve ready status
     */
    private _initialize;
    /**
     * A signal that emits user action in GFX canvas to listener
     */
    readonly outSignal: ISignal<this, object>;
    /**
     * focus on widget upon `activate` request
     * @param msg
     */
    onActivateRequest(msg: Message): void;
    /**
     * Handle input from master through signal
     * @param sender
     * @param value
     */
    private _handleParentActions;
    /**
     * Connect to signal
     *
     * @param inSignal signal to connect to
     */
    connect(inSignal: ISignal<IFFBOLabWidget, object>): void;
    /**
     * Dispose the GFX
     */
    dispose(): void;
    /**
   * Handle message comming from message
   * @param msg
   */
    onMasterMessage(msg: any): void;
    /**
     * Respond to model change
     *
     * @param sender
     * @param value
     */
    onModelChanged(sender: FFBOLabModel, value: JSONObject): void;
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
     * Handle update requests
     *
     * ## note
     * currently only reattaches iframe to window
     */
    onUpdateRequest(msg: Message): void;
    /**
     * The Elements associated with the widget.
     */
    private _ready;
    private _iframe;
    private _blocker;
    private _isDisposed;
    private _isConnected;
}
