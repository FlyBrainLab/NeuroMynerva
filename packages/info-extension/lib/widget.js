"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const widgets_1 = require("@phosphor/widgets");
const signaling_1 = require("@phosphor/signaling");
const coreutils_1 = require("@phosphor/coreutils");
const coreutils_2 = require("@phosphor/coreutils");
const conn_svg_1 = require("./conn_svg");
const summary_table_1 = require("./summary_table");
const conn_table_1 = require("./conn_table");
require("../style/index.css");
require("../style/ffbo.InfoPanel.css");
const VERBOSE = false;
const DEFAULT_CLASS = "jp-FFBOLabInfo";
const SUMMARY_TABLE_ID = "info-panel-summary-table";
const CONN_SVG_ID = "info-panel-conn";
const CONN_TABLE_ID = "info-panel-conn-table";
/**
 * A NeuroInfo Widget
 *
 * ## Note
 * NeuroInfo Widget is used to display detailed information
 * about neurons and connectivities obtained from NeuroArch *
 */
class NeuroInfoWidget extends widgets_1.Widget {
    /**
     * Construct a new FFBO widget.
     */
    constructor() {
        super();
        this._ready = new coreutils_2.PromiseDelegate();
        this._isDisposed = false;
        this._isConnected = false;
        this._userAction = new signaling_1.Signal(this);
        let HTMLtemplate = Private.createTemplate_IP();
        this.node.innerHTML = HTMLtemplate;
        this.node.tabIndex = -1;
        this.addClass(DEFAULT_CLASS);
        this.id = 'FFBOLab-Info-' + coreutils_1.UUID.uuid4();
        let localPath = "";
        this.title.label = '[Info] ' + localPath;
        this.title.closable = true;
        this.title.dataset = Object.assign({ type: 'ffbo-title' }, this.title.dataset);
        // current info panel object name
        this.name = undefined;
        // instantiate sub panels
        let layout = this.layout = new widgets_1.PanelLayout();
        this.connSVG = new conn_svg_1.ConnSVG();
        this.summaryTable = new summary_table_1.SummaryTable();
        this.connTable = new conn_table_1.ConnTable();
        layout.addWidget(this.summaryTable);
        layout.addWidget(this.connSVG);
        layout.addWidget(this.connTable);
        this._initialize();
    }
    /**
     * A signal that emits user action in info panel to listener
     */
    get outSignal() {
        return this._userAction;
    }
    /**
     * Initialize Routine <DUMMY>
     */
    _initialize() {
        this._ready.resolve(void 0);
    }
    /**
     * Dispose
     */
    dispose() {
        if (this._isDisposed == true) {
            return;
        }
        super.dispose();
        this._isDisposed = true;
        window.JLabApp.commands.notifyCommandChanged('NeuroMynerva:info-open');
        if (this._isDisposed) {
            if (VERBOSE) {
                console.log('[NM Info] disposed');
            }
        }
    }
    /**
     * Responde to `activate` calls on instance
     * @param msg
     */
    onActivateRequest(msg) {
        super.onActivateRequest(msg);
        // this.node.focus();
    }
    /**
     * Connect to signal
     */
    connect(inSignal) {
        if (VERBOSE) {
            console.log('[NM INFO] Connected');
        }
        inSignal.connect(this._handleParentActions, this);
        this._isConnected = true;
    }
    /**
     * Handle input from master through signal
     *
     * @param sender
     * @param value
     */
    _handleParentActions(sender, value) {
        if (value.type == "INFO") {
            if (value.data == "save") {
                // FIXME: what is this for?
                // var SingleNeuronStr = this.INFOList.jsoneditor.getText();
                // this._userAction.emit({action:'execute', content: { code: '_FFBOLABClient.updateBackend(type = "SingleNeuron",data = """' + SingleNeuronStr + '""")' }});
                if (VERBOSE) {
                    console.log("SAVESAVESAVE?", value);
                }
            }
            else {
                this.onMasterMessage(value.data);
            }
        }
        else if (value.type == "session") {
            let localPath = value.data.split(".ipynb")[0];
            this.title.label = '[Info] ' + localPath;
        }
        else if (value.type == "Dispose") {
            if (VERBOSE) {
                console.log("{INFO received dispose}");
            }
            this.dispose();
        }
    }
    /**
     * Handle message from master widget
     * @param msg
     */
    onMasterMessage(msg) {
        // this.oldData = msg.data as JSONObject;
        this.activate();
        this.updateData(msg.data);
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
    * Respond to FFBOLabModel Changed <DUMMY>
    */
    onModelChanged() {
        return;
    }
    /**
     * A promise that resolves when the FFBOLab widget is ready
     */
    get ready() {
        return this._ready.promise;
    }
    /**
     * Update data of info panel
     * @param obj data returned from neuroArch
     */
    updateData(obj) {
        let _data = obj.data;
        let data = _data.data;
        let new_name = ('uname' in data['summary']) ? data['summary']['uname'] : data['summary']['name'];
        new_name = new_name;
        if (this.name === new_name) {
            /** do not update if the object already exists, just show */
            this.show();
            return;
        }
        else {
            this.name = new_name;
            if ('connectivity' in data) { // synapse data does not have connectivity
                this.connSVG.updateData(data['connectivity']);
                this.connTable.updateData(data['connectivity']);
                this.summaryTable.updateData(data['summary']);
                this.show(); //show all
            }
            else {
                this.connSVG.hide();
                this.connTable.hide();
                this.summaryTable.updateData(data['summary']);
                this.summaryTable.show();
            }
        }
        // FIXME: return old data format
        let summaryData = data['summary'];
        let connData = data['connectivity'];
        this.connSVG.updateData(connData);
        this.summaryTable.updateData(summaryData);
        this.connTable.updateData(connData);
        // FIXME: error checking _data
        // delete (<JSONObject>_data.data)['summary'];
        // delete (<any>_data.data)['connectivity']['pre']['summary'];
        // delete (<any>_data.data)['connectivity']['post']['summary'];
        // let key = "";
        // let temp: JSONObject = {};
        // for(key in (<any>_data.data)['connectivity']['pre']['details'].reverse() as JSONObject)
        // {
        //   temp[(<any>_data.data)['connectivity']['pre']['details'][key]['name']] = (<any>_data.data)['connectivity']['pre']['details'][key]['number'];
        // }
        // (<any>_data.data)['connectivity']['pre'] = temp;
        // temp = {};
        // for(key in (<any>_data.data)['connectivity']['post']['details'].reverse() as JSONObject)
        // {
        //   temp[(<any>_data.data)['connectivity']['post']['details'][key]['name']] = (<any>_data.data)['connectivity']['post']['details'][key]['number'];
        // }
        // (<any>_data.data)['connectivity']['post'] = temp;
    }
    /**
     * Handle update requests for the widget.
     */
    onUpdateRequest(msg) {
        super.onUpdateRequest(msg);
    }
    /** FIXME:
     * Check if an object is in the workspace.
     *
     * @param {string} rid -  rid of target object (neuron/synapse)
     * @returns {bool} if object in workspace
    */
    isInWorkspace(rid) {
        return false;
    }
    /** FIXME:
     * Add an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    addByUname(uname) {
        return;
    }
    /** FIXME:
     * Remove an object into the workspace.
     *
     * @param {string} uname -  uname of target object (neuron/synapse)
     */
    removeByUname(uname) {
        return;
    }
    /** FIXME:
     * Get attribute of an object in the workspace.
     *
     * @param {string} rid -  rid of target object
     * @returns {value} return Value as expected by the attribute
     */
    getAttr(rid, attr) {
        return undefined;
    }
}
exports.NeuroInfoWidget = NeuroInfoWidget;
;
var Private;
(function (Private) {
    /**
     * Create HTML template
     *
     * @param {object} obj - synonymous to `this`, refers to instance of ConnTable
     */
    function createTemplate_IP() {
        var template = "";
        template += '<div id="' + SUMMARY_TABLE_ID + '"></div>'; // summary
        template += '<div id="' + CONN_SVG_ID + '"></div>'; // SVG
        template += '<div id="' + CONN_TABLE_ID + '"></div>';
        template += '<div class="slider-bar ui-draggable ui-draggable-handle" draggable="true" id="info_panel_dragger"></div>';
        return template;
    }
    Private.createTemplate_IP = createTemplate_IP;
})(Private || (Private = {}));
//# sourceMappingURL=widget.js.map