import { JupyterFrontEnd } from '@jupyterlab/application';
import { Kernel, Session, KernelMessage } from '@jupyterlab/services';
import { IDisposable } from '@lumino/disposable';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { Signal, ISignal } from '@lumino/signaling';
import { Toolbar } from '@jupyterlab/apputils';
import { LabIcon } from '@jupyterlab/ui-components';
import { FBLWidgetModel, IFBLWidgetModel } from './model';
export interface IFBLWidget extends Widget {
    /**
     * The sessionContext keeps track of the current running session
     * associated with the widget.
     */
    sessionContext: ISessionContext;
    /**
     * A string indicating whether it's adult or larva.
     * Has special setter that the neu3d visualization setting and rendered meshes
     */
    species: string;
    /**
     * Dispose current widget
     */
    dispose(): void;
    /**
     * All neurons current rendered in the workspace.
     */
    model: any;
    /**
     * Name of Widget
     */
    name: string;
    /**
     * Signal that emits new species name when changed
     */
    speciesChanged: ISignal<IFBLWidget, string>;
    /**
     * Signal that emits model change
     */
    modelChanged: ISignal<IFBLWidget, object>;
    /**
     * Icon associated with the widget
     */
    icon?: LabIcon;
    /**
     * Toolbar to be added to the MainAreaWidget
     *
     * TODO: This is currently defined here due to an issue with using
     *   MainAreaWidget class directly
     */
    toolbar?: Toolbar<Widget>;
    clientId?: string;
}
/**
* An FBL Template Widget
*/
export declare class FBLWidget extends Widget implements IFBLWidget {
    constructor(options: FBLWidget.IOptions);
    /**
     * Wrapper around executeRequest that is specific to current client
     * By default the result will be sent back over Comm.
     * @return a promise that resolves to the reply message when done
     */
    executeNAQuery(code: string): Kernel.IShellFuture<KernelMessage.IExecuteRequestMsg, KernelMessage.IExecuteReplyMsg>;
    /**
     * Wrapper around executeRequest that is specific to current client
     * By default the result will be sent back over Comm.
     * @return a promise that resolves to the reply message when done
     */
    executeNLPQuery(code: string): Kernel.IShellFuture<KernelMessage.IExecuteRequestMsg, KernelMessage.IExecuteReplyMsg>;
    /**
     * After
     * @param msg
     */
    onAfterShow(msg: Message): void;
    /**
     * Should handle render logic of model
     * @param change - changes to a model for incremental rendering
     */
    renderModel(change?: any): void;
    /**
     * Send model to the front-end
     * @param change
     */
    sendModel(change?: Partial<IFBLWidgetModel>): void;
    /**
     * Initialize model. Overload this method with child's own model class.
     * It is called in the constructor of the widget
     * @param model partial information of the model data
     */
    initModel(model: Partial<IFBLWidgetModel>): void;
    /**
     * Handle comm message from kernel
     * To be overload by children
     * @param msg
     */
    onCommMsg(msg: KernelMessage.ICommMsgMsg): void;
    /**
     * Handle comm close msg
     * To be overload by children
     * @param msg
     */
    onCommClose(msg: KernelMessage.ICommCloseMsg): void;
    /**
     * Handle model.data Change in the widget side. should affect rendering
     * To be overloaded by child
     * @param args
     */
    onDataChanged(sender: IFBLWidgetModel, args: any): void;
    /**
     * Handle model.metadata Change in the widget side. should affect rendering
     * To be overloaded by child
     * @param args
     */
    onMetadataChanged(sender: IFBLWidgetModel, args: any): void;
    /**
     * Handle model.states change in the widget side. should affect rendering
     * To be overloaded by child
     * @param args
     */
    onStatesChanged(sender: IFBLWidgetModel, args: any): void;
    /**
    * Dispose the current session
    *
    * 1. comm dispose
    * 2. model dispose
    * 3. disconnect signal slots
    */
    dispose(): void;
    /**
    * A method that handles changing sessionContext
    */
    onKernelChanged(context: ISessionContext, args: Session.ISessionConnection.IKernelChangedArgs): Promise<void>;
    /**
     * Kernel Status Changed. Register Comm on restart
     * @param sess
     * @param status
     */
    onKernelStatusChanged(sess: ISessionContext, status: Kernel.Status): void;
    /**
    * A method that handles changing session Context
    */
    onPathChanged(msg?: any): void;
    /**
     * Return A signal that indicates model changed
     */
    get modelChanged(): ISignal<this, object>;
    /**
     * Return A signal that indicates species change
     */
    get speciesChanged(): ISignal<this, string>;
    /** Code for initializing fbl in the connected kernel
     * @return code to be executed
     */
    initFBLCode(): string;
    /**
     * Code for initializing a client connected to the current widget
     */
    initClientCode(): string;
    initAnyClientCode(clientargs?: any): string;
    /**
    * Initialize FBLClient on associated kernel
    */
    initFBLClient(): Promise<void>;
    /**
     * Populate content of toolbar. Can be overloaded by child.
     * @param toolbar
     */
    populateToolBar(): void;
    /**
     * Set species
     * @param newSpecies new species to be added
     * triggers a species changed callback if species has changed
     */
    set species(newSpecies: string);
    /**
     * Returns species
     * Note: setter/getter for species need to be redefined in child class
     * See reference: https://github.com/microsoft/TypeScript/issues/338
    */
    get species(): string;
    /**
    * The Elements associated with the widget.
    */
    protected _connected: Date;
    protected _isDisposed: boolean;
    protected _modelChanged: Signal<this, object>;
    protected _speciesChanged: Signal<this, string>;
    toolbar: Toolbar<Widget>;
    _commTarget: string;
    comm: Kernel.IComm;
    readonly name: string;
    protected _species: any;
    clientId: string;
    innerContainer: HTMLDivElement;
    sessionContext: ISessionContext;
    model: FBLWidgetModel;
    icon: LabIcon;
}
/**
 * A namespace for FBL Widget statics.
 */
export declare namespace FBLWidget {
    /**
     * The initialization options for a FBL Widget
     */
    interface IOptions extends SessionContext.IOptions {
        /**
         * The service manager used by the panel.
         */
        app: JupyterFrontEnd;
        /**
         * Species
         */
        species?: string;
        /**
         * The path of an existing widget.
         */
        path?: string;
        /**
         * The base path for a new widget.
         */
        basePath?: string;
        /**
         * The name of the widget.
         */
        name?: string;
        /**
         * An existing session context to use (with existing kernel).
         */
        sessionContext?: ISessionContext;
        /**
         * Function to call when setting busy
         */
        setBusy?: () => IDisposable;
        /**
         * Existing model to be loaded into widget
         */
        model?: IFBLWidgetModel;
        /**
         * Icon associated with this widget, default to fblIcon
         */
        icon?: LabIcon;
        /**
         * Optionally Specify Widget Id
         */
        id?: string;
        /**
         * Id
        */
        clientId?: string;
    }
}
