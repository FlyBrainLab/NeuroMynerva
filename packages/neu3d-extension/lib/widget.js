"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Neu3D = require("neu3d");
const signaling_1 = require("@phosphor/signaling");
const adult_mesh_1 = require("./adult_mesh");
const widgets_1 = require("@phosphor/widgets");
const coreutils_1 = require("@phosphor/coreutils");
const coreutils_2 = require("@phosphor/coreutils");
const izi = require("izitoast");
const NEU3D_CLASS = "jp-FFBOLabNLP";
const NEU3D_ID = 'vis-3d';
/**
 * A neu3D Widget
 *
 * ## Note
 * This widget depends on another package called Neu3D which is a
 * Morphology visualization tool also developed by Bionet Columbia.
 */
class Neu3DWidget extends widgets_1.Widget {
    /**
     * Construct a new neu3D widget.
     */
    constructor() {
        super();
        /**
         * The Elements associated with the widget.
         */
        this._ready = new coreutils_2.PromiseDelegate();
        this._isDisposed = false;
        this._isConnected = false;
        this._isInitialized = false;
        this._userAction = new signaling_1.Signal(this);
        this.node.tabIndex = -1;
        this.addClass(NEU3D_CLASS);
        this.id = 'FFBOLab-Neu3D-' + coreutils_1.UUID.uuid4();
        let localPath = "";
        this.title.label = '[Neu3D] ' + localPath;
        this.title.closable = true;
        this.title.dataset = Object.assign({ type: 'ffbo-title' }, this.title.dataset);
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
            this.neu3D.onWindowResize();
        };
        fullscreenToggle.appendChild(toggleIcon);
        this.node.appendChild(fullscreenToggle);
        // let neu3Ddiv = document.createElement('div');
        // neu3Ddiv.id = NEU3D_ID;
        // neu3Ddiv.style.width = "100%";
        // neu3Ddiv.style.height = "100%";
        // this.node.appendChild(neu3Ddiv);
        let neu3dwidget = this;
        window.addEventListener('message', function (event) {
            // console.log(event.data);
            if (event.data.messageType == 'text') {
                console.log("[NM Neu3D] message:", event.data.data);
            }
            if (event.data.messageType == 'alert') {
                if (event.data.alertType == 'success')
                    izi.success({
                        id: "success",
                        message: event.data.data,
                        transitionIn: 'bounceInLeft',
                        position: 'topLeft',
                    });
                else if (event.data.alertType == 'error')
                    izi.error({
                        id: "success",
                        message: event.data.data,
                        transitionIn: 'bounceInLeft',
                        position: 'topLeft',
                    });
            }
            if (event.data.messageType == 'NLPquery') {
                neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.executeNLPquery(query="' + event.data.query + '"); _FFBOLabcomm.send(data=_FFBOLABres)' } });
            }
            if (event.data.messageType == 'NLPtag') {
                neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.loadTag("' + event.data.tag + '"); _FFBOLabcomm.send(data=_FFBOLABres)' } });
            }
        });
        // load widget only when window is ready
        this._isInitialized = this._initialize();
    }
    /**
     * Check if DOM element is correctly added
     */
    _domCheckAndAdd() {
        let neu3Ddiv = document.getElementById(NEU3D_ID);
        if (!neu3Ddiv) {
            neu3Ddiv = document.createElement('div');
            neu3Ddiv.id = NEU3D_ID;
            neu3Ddiv.style.width = "100%";
            neu3Ddiv.style.height = "100%";
            this.node.appendChild(neu3Ddiv);
        }
        return neu3Ddiv;
    }
    /**
     *  Initialize Neu3D widget if DOM is available
     */
    _initialize() {
        let neu3Ddiv = this._domCheckAndAdd();
        if (this.node.clientHeight <= 0 || this.node.clientWidth <= 0) {
            console.warn("[NM Neu3D] Container not visible, aborting");
            return false;
        }
        this.neu3D = new Neu3D(neu3Ddiv, undefined, { "globalCenter": { 'x': 0, 'y': -250, 'z': 0 } }, false);
        // setup callbacks to expose canvas events to widget
        this._setupCallbacks();
        // add initial mesh, default to adult mesh
        this.neu3D.addJson({
            ffbo_json: adult_mesh_1.neu3DAdultJSON,
            showAfterLoadAll: true
        });
        // bind canvas resize event to parent div
        this.onResize = (msg) => {
            this.neu3D.onWindowResize();
            super.onResize(msg);
        };
        this._ready.resolve(void 0);
        return true;
    }
    /**
     * setter for adding json to mesh area
     *
     * @param {JSONObject | object} json
     */
    set content(json) {
        if (!this._isInitialized) {
            this._isInitialized = this._initialize();
        }
        this.neu3D.addJson(json);
    }
    /**
     * Connect to signal
     */
    connect(inSignal) {
        // console.log('[NEU3D] Connected');
        inSignal.connect(this._handleParentActions, this);
        this._isConnected = true;
    }
    /**
     * setup callbacks for neu3D
     *
     * ## Note
     * Some Neu3D user interactions are not implemented yet.
     */
    _setupCallbacks() {
        this.neu3D.on('click', (data) => {
            this._userAction.emit({ action: 'execute', content: { code: '_FFBOLABClient.getInfo("' + data.value + '")' } });
        });
        // this.neu3D.on('pinned', (id: string) => {
        //   this._userAction.emit({ action: 'pinned', content: id });
        // });
        this.neu3D.on('add', (data) => {
            let _addedneuron = data;
            let _rid = _addedneuron.prop;
            let _value = _addedneuron.value;
            let _data = { name: _value.name };
            this._userAction.emit({ action: 'model-add', content: { rid: _rid, data: _data } });
        });
        this.neu3D.on('remove', (data) => {
            let _rid = data.prop;
            this._userAction.emit({ action: 'model-remove', content: { rid: _rid } });
        });
        // this.neu3D.on('visibility', function(data:any) {console.log( 'visibility' , data);});
        // this.neu3D.on('num', function(data:any) {console.log( 'num' , data);});
        // this.neu3D.on('highlight', function(data:any) {console.log( 'highlight' , data);});
    }
    /**
     * Handle message comming from message
     * @param msg
     */
    onMasterMessage(msg) {
        if ("info" in (msg.data)) {
            if ("success" in (msg.data).info)
                izi.success({
                    id: "success",
                    message: (msg.data).info.success,
                    transitionIn: 'bounceInLeft',
                    position: 'bottomRight',
                });
            else if ("error" in (msg.data).info)
                izi.error({
                    id: "success",
                    message: (msg.data).info.success,
                    transitionIn: 'bounceInLeft',
                    position: 'bottomRight',
                });
        }
        else {
            switch (msg.messageType) {
                case "Message": {
                    izi.success({
                        id: "success",
                        message: (msg.data).info.success,
                        transitionIn: 'bounceInLeft',
                        position: 'bottomRight',
                    });
                    break;
                }
                case "Data": {
                    let rawData = msg.data.data;
                    if (Object.keys(rawData)[0][0] == '#') { // check if returned contain rids for neuron morphology data
                        let neu3Ddata = { ffbo_json: rawData, type: 'morphology_json' };
                        this.content = neu3Ddata;
                    }
                    break;
                }
                default: {
                    this._receiveCommand(msg.data);
                    break;
                }
            }
        }
    }
    /**
     * A signal that emits user action in neu3D canvas to listener
     */
    get outSignal() {
        return this._userAction;
    }
    /**
     * Handle input from master through signal
     * @param sender
     * @param value
     */
    _handleParentActions(sender, value) {
        if (value.type == "NLP") {
            //console.log("{NLP received}");
            this.onMasterMessage(value.data);
        }
        else if (value.type == "session") {
            let localPath = value.data.split(".ipynb")[0];
            this.title.label = '[Neu3D] ' + localPath;
        }
        else if (value.type == "Dispose") {
            // console.log("{NLP received dispose}");
            this.dispose();
        }
    }
    /**
     * Dispose all resources
     */
    dispose() {
        if (this._isDisposed == true) {
            return;
        }
        this.neu3D.reset(true);
        delete (this.neu3D);
        super.dispose();
        this._isDisposed = true;
        window.JLabApp.commands.notifyCommandChanged('NeuroMynerva:neu3d-open');
        if (this._isDisposed) {
            console.log('[FFBOLab Neu3D] disposed');
        }
    }
    _handleMessages(event) {
        // console.log(event.data.data);
        if (event.data.messageType == 'text') {
            console.log("[NM Neu3D] message:", event.data.data);
        }
        if (event.data.messageType == 'Data') {
            this.neu3D.addJson({ ffbo_json: event.data.data.data, type: 'morphology_json' });
        }
        if (event.data.messageType == 'Command') {
            this._receiveCommand(event.data.data);
        }
    }
    _receiveCommand(message) {
        if (!('commands' in message))
            return;
        if ('reset' in message['commands']) {
            this.neu3D.reset();
            delete message.commands.reset;
        }
        for (var cmd in message["commands"])
            this.neu3D.execCommand({ "commands": [cmd], "neurons": message["commands"][cmd][0], "args": message['commands'][cmd][1] });
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
    // /**
    //  * Respond to FFBOLabModel Changed
    //  * <TODO>:  this method should handle actions in master widget neuron list like highlight
    //  */
    // onModelChanged(sender: FFBOLabModel, value: JSONObject): void {
    //   return;
    // }
    /**
     * Handle update requests for the widget.
     */
    onUpdateRequest(msg) {
        if (!this._isInitialized) {
            this._isInitialized = this._initialize();
        }
        let displayVal = getComputedStyle(this.node, null).getPropertyValue('display');
        if (displayVal != 'none') {
            this.neu3D.onWindowResize();
            super.onUpdateRequest(msg);
        }
    }
    /**
     * Responde to `activate` calls on instance
     * @param msg
     */
    onActivateRequest(msg) {
        this.node.focus();
        let displayVal = getComputedStyle(this.node, null).getPropertyValue('display');
        // console.log(displayVal);
        if (displayVal != 'none') {
            this.neu3D.onWindowResize();
            super.onUpdateRequest(msg);
            //console.log(msg);
        }
        // else {
        //   console.log('display none found!');
        // }
    }
}
exports.Neu3DWidget = Neu3DWidget;
;
//# sourceMappingURL=widget.js.map