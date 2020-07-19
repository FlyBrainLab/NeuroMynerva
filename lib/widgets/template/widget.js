import * as React from 'react';
import { UUID } from '@lumino/coreutils';
import { PathExt, Time } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';
import { SessionContext, sessionContextDialogs, showDialog } from '@jupyterlab/apputils';
import { Signal } from '@lumino/signaling';
import { Toolbar } from '@jupyterlab/apputils';
import { fblIcon } from '../../icons';
import { FBLWidgetModel } from './model';
import { createSpeciesButton, createSessionDialogButton } from './session_dialog';
const TEMPLATE_COMM_TARGET = 'FBL-Comm';
/**
* An FBL Template Widget
*/
export class FBLWidget extends Widget {
    constructor(options) {
        var _a, _b, _c, _d, _e, _f;
        super();
        this._isDisposed = false;
        this._modelChanged = new Signal(this);
        this._speciesChanged = new Signal(this);
        const { app, basePath, name, model, species, sessionContext, icon, clientId } = options;
        // keep track of number of instances
        const count = Private.count++;
        // specify name
        this.name = name || `Template-${count}`;
        // specify id
        let id = (_a = options.id, (_a !== null && _a !== void 0 ? _a : `${this.name}-${UUID.uuid4()}`));
        // make sure there is no conflic with existing widgets
        let _widgets_iter = app.shell.widgets('main').iter();
        let _w = _widgets_iter.next();
        while (_w) {
            if ((_w.id === id) || (((_b = _w.content) === null || _b === void 0 ? void 0 : _b.id) === id)) {
                id = `${this.name}-${UUID.uuid4()}`;
                break;
            }
            _w = _widgets_iter.next();
        }
        this.id = id;
        // client id for backend
        this.clientId = clientId || `client-${this.id}`;
        // specify path
        const path = (_c = options.path, (_c !== null && _c !== void 0 ? _c : `${basePath || ''}/${this.id}`));
        this.icon = (icon !== null && icon !== void 0 ? icon : fblIcon);
        // initialize model
        this.initModel(model);
        // specify comm target (unique to this widget)
        this._commTarget = `${TEMPLATE_COMM_TARGET}:${this.id}`;
        // create session Context, default to using console.
        this.sessionContext =
            sessionContext ||
                new SessionContext({
                    sessionManager: (_d = options.sessionManager, (_d !== null && _d !== void 0 ? _d : app.serviceManager.sessions)),
                    specsManager: (_e = options.specsManager, (_e !== null && _e !== void 0 ? _e : app.serviceManager.kernelspecs)),
                    path: path,
                    name: this.name,
                    type: 'console',
                    kernelPreference: (_f = options.kernelPreference, (_f !== null && _f !== void 0 ? _f : {
                        shouldStart: true,
                        canStart: true,
                        name: 'python3'
                    })),
                    setBusy: options.setBusy
                });
        // Create Toolbar (to be consumed by MainAreaWidget in `fbl-extension`);
        const toolbar = this.toolbar = new Toolbar();
        toolbar.node.style.height = 'var(--jp-private-toolbar-height)';
        toolbar.node.style.overflowX = 'scroll';
        this.populateToolBar();
        // initialize session
        this.sessionContext.initialize().then(async (value) => {
            var _a;
            // Setup Main Panel
            if (value) {
                await sessionContextDialogs.selectKernel(this.sessionContext);
            }
            if ((_a = this.sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel) {
                // Force it to handle comms
                this.sessionContext.session.kernel.handleComms = true;
            }
            this._connected = new Date();
            await this.initFBLClient();
            // register Comm only when kernel is changed
            this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
            this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
            this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
            // set species after session is avaible, in case the setter needs the session
            this.species = (species !== null && species !== void 0 ? species : 'No Species');
            Private.updateTitle(this, this._connected);
        });
        Private.updateTitle(this, this._connected);
    }
    /**
     * Wrapper around executeRequest that is specific to current client
     * By default the result will be sent back over Comm.
     * @return a promise that resolves to the reply message when done
     */
    executeNAQuery(code) {
        let code_to_send = `
    fbl.client_manager.clients[fbl.widget_manager.widgets['${this.id}'].client_id]['client'].executeNAquery(query='${code}')
    `;
        return this.sessionContext.session.kernel.requestExecute({ code: code_to_send });
    }
    /**
     * Wrapper around executeRequest that is specific to current client
     * By default the result will be sent back over Comm.
     * @return a promise that resolves to the reply message when done
     */
    executeNLPQuery(code) {
        let code_to_send = `
    fbl.client_manager.clients[fbl.widget_manager.widgets['${this.id}'].client_id]['client'].executeNLPquery('${code}')
    `;
        return this.sessionContext.session.kernel.requestExecute({ code: code_to_send });
    }
    // /**
    //  * Request Information about the connected client from kernel
    //  */
    // requestClientInfo() {
    //   let code_to_send = `
    //   fbl.widget_manager.widgets['${this.id}'].client
    //   `
    //   return this.sessionContext.session.kernel.requestExecute({code: code_to_send});
    // }
    /**
     * After
     * @param msg
     */
    onAfterShow(msg) {
        super.onAfterShow(msg);
        this.renderModel();
    }
    /**
     * Should handle render logic of model
     * @param change - changes to a model for incremental rendering
     */
    renderModel(change) {
        // to be implemented by child widgets
        return;
    }
    /**
     * Send model to the front-end
     * @param change
     */
    sendModel(change) {
        var _a, _b, _c, _d, _e, _f;
        this.comm.send({
            data: (_b = (_a = change) === null || _a === void 0 ? void 0 : _a.data, (_b !== null && _b !== void 0 ? _b : this.model.data)),
            metadata: (_d = (_c = change) === null || _c === void 0 ? void 0 : _c.metadata, (_d !== null && _d !== void 0 ? _d : this.model.metadata)),
            states: (_f = (_e = change) === null || _e === void 0 ? void 0 : _e.states, (_f !== null && _f !== void 0 ? _f : this.model.states)),
        });
    }
    /**
     * Initialize model. Overload this method with child's own model class.
     * It is called in the constructor of the widget
     * @param model partial information of the model data
     */
    initModel(model) {
        // create model
        this.model = new FBLWidgetModel(model);
        this.model.dataChanged.connect(this.onDataChanged, this);
        this.model.metadataChanged.connect(this.onMetadataChanged, this);
        this.model.statesChanged.connect(this.onStatesChanged, this);
    }
    /**
     * Handle comm message from kernel
     * To be overload by children
     * @param msg
     */
    onCommMsg(msg) {
        let thisMsg = msg.content.data;
        if (typeof thisMsg === 'undefined') {
            return;
        }
        switch (thisMsg.widget) {
            /** Popup window shown as dialog */
            case "popout": {
                showDialog({
                    title: `FBL Kernel Message`,
                    body: (React.createElement("div", null,
                        React.createElement("p", null,
                            "Widget: $",
                            this.id),
                        React.createElement("br", null),
                        React.createElement("p", null, thisMsg.data)))
                }).then(() => {
                    return Promise.resolve(void 0);
                });
                break;
            }
            default: {
                // no-op
                return;
            }
        }
        // no-op
        return;
    }
    /**
     * Handle comm close msg
     * To be overload by children
     * @param msg
     */
    onCommClose(msg) {
        // no-op
        return;
    }
    /**
     * Handle model.data Change in the widget side. should affect rendering
     * To be overloaded by child
     * @param args
     */
    onDataChanged(sender, args) {
        // no-op
        // overload by child
        return;
    }
    /**
     * Handle model.metadata Change in the widget side. should affect rendering
     * To be overloaded by child
     * @param args
     */
    onMetadataChanged(sender, args) {
        // no-op
        return;
    }
    /**
     * Handle model.states change in the widget side. should affect rendering
     * To be overloaded by child
     * @param args
     */
    onStatesChanged(sender, args) {
        // no-op
        return;
    }
    /**
    * Dispose the current session
    *
    * 1. comm dispose
    * 2. model dispose
    * 3. disconnect signal slots
    */
    dispose() {
        var _a, _b, _c, _d, _e, _f, _g;
        if (this._isDisposed === true) {
            return;
        }
        const code_to_send = `
    try:
      del fbl.widget_manager.widgets['${this.id}']
      if len(fbl.client_manager.clients['${this.clientId}']>1):
          fbl.client_manager.clients['${this.clientId}']['widgets'].remove('${this.id}')
      else:
          del fbl.client_manager.clients['${this.clientId}']
    except:
        pass
    `;
        if ((_b = (_a = this.sessionContext) === null || _a === void 0 ? void 0 : _a.session) === null || _b === void 0 ? void 0 : _b.kernel) {
            (_d = (_c = this.sessionContext) === null || _c === void 0 ? void 0 : _c.session) === null || _d === void 0 ? void 0 : _d.kernel.requestExecute({ code: code_to_send }).done.then(() => {
                var _a;
                (_a = this.comm) === null || _a === void 0 ? void 0 : _a.dispose();
            });
        }
        else {
            (_e = this.comm) === null || _e === void 0 ? void 0 : _e.dispose();
        }
        (_f = this.model) === null || _f === void 0 ? void 0 : _f.dispose();
        (_g = this.sessionContext) === null || _g === void 0 ? void 0 : _g.dispose();
        Signal.disconnectAll(this._modelChanged);
        super.dispose();
        this._isDisposed = true;
    }
    /**
    * A method that handles changing sessionContext
    */
    async onKernelChanged(context, args) {
        var _a;
        const newKernel = args.newValue;
        if (newKernel === null) {
            (_a = this.comm) === null || _a === void 0 ? void 0 : _a.dispose();
            return;
        }
        if (this.sessionContext.session) {
            await this.sessionContext.ready;
            this.initFBLClient();
            this.onPathChanged();
            this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
            this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
            this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
        }
    }
    /**
     * Kernel Status Changed. Register Comm on restart
     * @param sess
     * @param status
     */
    onKernelStatusChanged(sess, status) {
        if (status === 'restarting') {
            this.sessionContext.ready.then(() => {
                this.initFBLClient();
                // re-register callbacks
                this.sessionContext.statusChanged.connect(this.onKernelStatusChanged, this);
                this.sessionContext.kernelChanged.connect(this.onKernelChanged, this);
                this.sessionContext.propertyChanged.connect(this.onPathChanged, this);
            });
        }
    }
    /**
    * A method that handles changing session Context
    */
    onPathChanged(msg) {
        if (this.sessionContext.session) {
            Private.updateTitle(this, this._connected);
        }
    }
    /**
     * Return A signal that indicates model changed
     */
    get modelChanged() {
        return this._modelChanged;
    }
    /**
     * Return A signal that indicates species change
     */
    get speciesChanged() {
        return this._speciesChanged;
    }
    /** Code for initializing fbl in the connected kernel
     * @return code to be executed
     */
    initFBLCode() {
        return `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    fbl.widget_manager.add_widget('${this.id}', '${this.clientId}', '${this.constructor.name}', '${this._commTarget}')
    `;
    }
    /**
     * Code for initializing a client connected to the current widget
     */
    initClientCode() {
        return `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    if '${this.clientId}' not in fbl.client_manager.clients:
        _comm = fbl.MetaComm('${this.clientId}', fbl)
        _client = fbl.Client(FFBOLabcomm = _comm)
        fbl.client_manager.add_client('${this.clientId}', _client, client_widgets=['${this.id}'])
    `;
    }
    initAnyClientCode(clientargs) {
        return `
    if 'fbl' not in globals():
        import flybrainlab as fbl
        fbl.init()
    if '${this.clientId}' not in fbl.client_manager.clients or True: # Fix the situations in which a client is to be generated
        _comm = fbl.MetaComm('${this.clientId}', fbl)
        _client = fbl.Client(FFBOLabcomm = _comm ${clientargs})
        fbl.client_manager.add_client('${this.clientId}', _client, client_widgets=['${this.id}'])
    `;
    }
    /**
    * Initialize FBLClient on associated kernel
    */
    async initFBLClient() {
        var _a;
        if (!((_a = this.sessionContext.session) === null || _a === void 0 ? void 0 : _a.kernel)) {
            return Promise.resolve(void 0); // no kernel
        }
        await this.sessionContext.ready;
        const kernel = this.sessionContext.session.kernel;
        // Force Comm handling
        if (!kernel.handleComms) {
            kernel.handleComms = true;
        }
        // // Query comm by target_name
        // const msg = await kernel.requestCommInfo({ target_name: this._commTarget });
        // const existingComms = (msg.content as any).comms ?? {};
        // const commExists = Object.keys(existingComms).length > 0;
        // // kernel.registerCommTarget
        // console.log('Existing Comms', existingComms, commExists);
        // REMOVE: safeguard to ensure if this comm already exists
        // if (!Object.keys(existingComms).length){
        kernel.registerCommTarget(this._commTarget, (comm, commMsg) => {
            if (commMsg.content.target_name !== this._commTarget) {
                return;
            }
            this.comm = comm;
            comm.onMsg = (msg) => {
                this.onCommMsg(msg);
            };
            comm.onClose = (msg) => {
                this.onCommClose(msg);
            };
        });
        // } else {
        // if commtarget already exists, set this.comm to that comm
        // TODO
        // }
        const code = this.initClientCode() + this.initFBLCode();
        kernel.requestExecute({ code: code }).done.then((reply) => {
            if (reply && reply.content.status === 'error') {
                const traceback = ANSI.stripReplyError(reply.content.traceback);
                const body = (React.createElement("div", null, traceback && (React.createElement("details", { className: "jp-mod-wide" },
                    React.createElement("pre", null, traceback)))));
                showDialog({
                    title: `FBLClient Initialization Registration Failed (${this._commTarget})`,
                    body: body
                }).then(() => {
                    return Promise.resolve('Execution Failed');
                });
            }
            else if (reply && reply.content.status === 'ok') {
                return Promise.resolve(void 0);
            }
        }, (failure) => {
            return Promise.reject(failure);
        });
    }
    /**
     * Populate content of toolbar. Can be overloaded by child.
     * @param toolbar
     */
    populateToolBar() {
        this.toolbar.addItem('spacer', Toolbar.createSpacerItem());
        this.toolbar.addItem('Species Changer', createSpeciesButton(this));
        this.toolbar.addItem('Session Dialog', createSessionDialogButton(this));
        this.toolbar.addItem('restart', Toolbar.createRestartButton(this.sessionContext));
        this.toolbar.addItem('kernelName', Toolbar.createKernelNameItem(this.sessionContext));
        this.toolbar.addItem('kernelStatus', Toolbar.createKernelStatusItem(this.sessionContext));
    }
    /**
     * Set species
     * @param newSpecies new species to be added
     * triggers a species changed callback if species has changed
     */
    set species(newSpecies) {
        if (newSpecies === this._species) {
            return;
        }
        this._speciesChanged.emit(newSpecies);
        this._species = newSpecies;
    }
    /**
     * Returns species
     * Note: setter/getter for species need to be redefined in child class
     * See reference: https://github.com/microsoft/TypeScript/issues/338
    */
    get species() {
        return this._species;
    }
}
;
/**
 * A namespace for private data.
 */
var Private;
(function (Private) {
    /**
     * The counter for new consoles.
     */
    Private.count = 1;
    /**
     * Update the title of a console panel.
     */
    function updateTitle(widget, connected) {
        const sessionContext = widget.sessionContext.session;
        if (sessionContext) {
            let caption = `Session Name: ${sessionContext.name}\n` +
                `Directory: ${PathExt.dirname(sessionContext.path)}\n` +
                `Kernel: ${widget.sessionContext.kernelDisplayName}\n` +
                `Comm: ${widget._commTarget})`;
            if (connected) {
                caption += `\nConnected: ${Time.format(connected.toISOString())}`;
            }
            widget.title.label = `${widget.name}::${sessionContext.name}`;
            widget.title.icon = widget.icon;
            widget.title.caption = caption;
        }
        else {
            widget.title.label = `${widget.name}::No Kernel`;
            widget.title.icon = widget.icon;
            widget.title.caption = 'No Kernel';
        }
    }
    Private.updateTitle = updateTitle;
})(Private || (Private = {}));
var ANSI;
(function (ANSI) {
    function stripReplyError(msg) {
        const characters = /\[-|\[[0-1];[0-9]+m|\[[0]m/g;
        return msg.join('\n').replace(characters, '');
    }
    ANSI.stripReplyError = stripReplyError;
})(ANSI || (ANSI = {}));
