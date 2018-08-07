"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const widgets_1 = require("@phosphor/widgets");
const coreutils_1 = require("@phosphor/coreutils");
const coreutils_2 = require("@phosphor/coreutils");
const $ = require("jquery");
const VERBOSE = false;
const GFX_CLASS = "jp-FFBOLabGFX";
/**
 * A NeuroGFX Widget
 *
 * ## Note
 * The GFX Widget is implemented indepedently and added as
 * an iframe for now
 */
class NeuroGFXWidget extends widgets_1.Widget {
    /**
     * Construct a new GFX widget.
     */
    constructor() {
        super();
        /**
         * The Elements associated with the widget.
         */
        this._ready = new coreutils_2.PromiseDelegate();
        this._isDisposed = false;
        this._isConnected = false;
        this.node.tabIndex = -1;
        this.addClass(GFX_CLASS);
        this.id = 'FFBOLab-GFX-' + coreutils_1.UUID.uuid4();
        let localPath = "";
        this.title.label = '[GFX] ' + localPath;
        this.title.closable = true;
        this.title.dataset = Object.assign({ type: 'ffbo-title' }, this.title.dataset);
        // add fullscren button
        let fullscreenToggle = document.createElement('button');
        let toggleIcon = document.createElement('i');
        toggleIcon.className = 'fas fa-expand';
        fullscreenToggle.id = 'panel-fullscreen';
        fullscreenToggle.className = 'NM-fullsize-button';
        fullscreenToggle.onclick = (e) => {
            e.preventDefault();
            if (this.node.classList.contains('panel-fullscreen')) {
                this.node.classList.remove('panel-fullscreen');
            }
            else {
                this.node.classList.add('panel-fullscreen');
            }
        };
        fullscreenToggle.appendChild(toggleIcon);
        this.node.appendChild(fullscreenToggle);
        this._initialize();
    }
    /**
     * initialization routine
     *
     * ## Note
     * 1. creates iframe
     * 2. addes ui block
     * 3. resolve ready status
     */
    _initialize() {
        this.addClass('neurogfxWidget');
        this._iframe = document.createElement('iframe');
        this._iframe.className = 'neurogfxwidget-iframe';
        this._iframe.id = 'neurogfxwidget-iframe';
        this._iframe.sandbox.add('allow-scripts');
        this._iframe.sandbox.add('allow-same-origin');
        this._iframe.sandbox.add('allow-forms');
        this.node.appendChild(this._iframe);
        this._iframe.src = "https://ffbolab.neurogfx.fruitflybrain.org/";
        this._blocker = document.createElement('div');
        this._blocker.className = "jp-FFBOLabBlock";
        this.node.appendChild(this._blocker);
        $(".jp-FFBOLabBlock").hide();
        window.onmousedown = function () { $(".jp-FFBOLabBlock").show(); };
        window.onmouseup = function () { $(".jp-FFBOLabBlock").hide(); };
        window.neurogfxWidget = this._iframe;
        this._ready.resolve(void 0);
    }
    /**
     * A signal that emits user action in GFX canvas to listener
     */
    get outSignal() {
        return null;
    }
    /**
     * focus on widget upon `activate` request
     * @param msg
     */
    onActivateRequest(msg) {
        this.node.focus();
    }
    /**
     * Handle input from master through signal
     * @param sender
     * @param value
     */
    _handleParentActions(sender, value) {
        if (value.type == "GFX") {
            if (VERBOSE) {
                console.log("{GFX received}");
            }
            this.onMasterMessage(value.data);
        }
        else if (value.type == "model") {
            this.onModelChanged(value.data.sender, value.data.value);
        }
        else if (value.type == "session") {
            let localPath = value.data.split(".ipynb")[0];
            this.title.label = '[GFX] ' + localPath;
        }
        else if (value.type == "Dispose") {
            if (VERBOSE) {
                console.log("{GFX received dispose}");
            }
            this.dispose();
        }
    }
    /**
     * Connect to signal
     *
     * @param inSignal signal to connect to
     */
    connect(inSignal) {
        if (VERBOSE) {
            console.log('[NM GFX] Connected');
        }
        inSignal.connect(this._handleParentActions, this);
        this._isConnected = true;
    }
    /**
     * Dispose the GFX
     */
    dispose() {
        if (this._isDisposed == true) {
            return;
        }
        delete (this._iframe);
        super.dispose();
        this._isDisposed = true;
        window.JLabApp.commands.notifyCommandChanged('NeuroMynerva:neurogfx-open');
        if (this._isDisposed) {
            if (VERBOSE) {
                console.log('[NM GFX] disposed');
            }
        }
    }
    /**
   * Handle message comming from message
   * @param msg
   */
    onMasterMessage(msg) {
        this._iframe.contentWindow.postMessage({ messageType: msg.messageType, data: msg.data }, '*');
    }
    /**
     * Respond to model change
     *
     * @param sender
     * @param value
     */
    onModelChanged(sender, value) {
        if (VERBOSE) {
            console.log("[NM GFX] onModelChanged:", sender, value);
        }
        this._iframe.contentWindow.postMessage({ messageType: "Data", data: { sender: sender, value: value } }, '*');
        //sender._value[value['data']].name
        return;
    }
    /**
     * A promise that resolves when the FFBOLab widget is ready
     */
    get ready() {
        return this._ready.promise;
    }
    /**
     * Dispose resources when widget panel is closed
     * @param msg
     */
    onCloseRequest(msg) {
        super.onCloseRequest(msg);
        this.dispose();
    }
    /**
     * Handle update requests
     *
     * ## note
     * currently only reattaches iframe to window
     */
    onUpdateRequest(msg) {
        window.neurogfxWidget = this._iframe;
        super.onUpdateRequest(msg);
        return;
    }
}
exports.NeuroGFXWidget = NeuroGFXWidget;
;
//# sourceMappingURL=widget.js.map