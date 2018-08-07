"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const $ = require("jquery");
require("jquery-ui");
require("jquery.tabulator");
const signaling_1 = require("@phosphor/signaling");
const widgets_1 = require("@phosphor/widgets");
const TABULATOR_ID = "tabulator";
/**
* A Tabulator based connectivity table widget
*/
class ConnTable extends widgets_1.Widget {
    constructor() {
        super();
        this._addRemoveSignal = new signaling_1.Signal(this);
        let tableDiv = document.createElement('div');
        tableDiv.id = TABULATOR_ID;
        this.node.appendChild(tableDiv);
        this.container = this.node.parentElement;
        this._createTabulator(TABULATOR_ID);
    }
    /**
     * on update request, check if div created successfully
     * @param msg
     */
    onUpdateRequest(msg) {
        let element = document.getElementById(TABULATOR_ID);
        if (element) {
            if (element.childElementCount > 0) {
                // do nothing
            }
            else {
                this._createTabulator(TABULATOR_ID);
            }
        }
        super.onUpdateRequest(msg);
    }
    /**
     * Update Connectivity Data
     * @param connData
     */
    updateData(connData) {
        // update tabulator content
        let div, data;
        data = this._parseTabulatorData(connData);
        // if connectivity information not available, abort
        div = document.getElementById(TABULATOR_ID);
        if (!div.innerHTML) {
            this._createTabulator(TABULATOR_ID, data);
            return;
        }
        $("#" + TABULATOR_ID).tabulator("setData", data);
        $("#" + TABULATOR_ID).tabulator("redraw", true);
    }
    /**
     * A signal that is emited when neuron is to be added/removed
     */
    get addRemoveSignal() {
        return this._addRemoveSignal;
    }
    /**
     * Create Tabulator
     * @param {string} divId  HTMLDivElement container for tabulator
     * @param {any} [data] optional initial data
     */
    _createTabulator(divId, data) {
        // check if div exists in dom
        let tabulatorDiv = document.getElementById(divId);
        if (!tabulatorDiv) {
            console.error("[Info ConnTable] Parent Div does not exist yet.");
            return;
        }
        else {
            tabulatorDiv.innerHTML = "";
        }
        // check if any intial data exists
        if (!data) {
            data = [{}];
        }
        // create table
        $("#" + divId).tabulator({
            layout: "fitColumns",
            pagination: "local",
            paginationSize: 10,
            columns: [
                {
                    title: "In Workspace",
                    field: "inworkspace",
                    align: "center",
                    editor: "select",
                    editorParams: {
                        "true": "True",
                        "false": "False"
                    },
                    headerFilter: true,
                    headerFilterParams: {
                        "true": "True",
                        "false": "False"
                    },
                    formatter: (cell, formatterParams) => {
                        if (cell.getValue() == true) {
                            return "<i class='fa fa-minus-circle' > </i>";
                        }
                        else {
                            return "<i class='fa fa-plus-circle' > </i>";
                        }
                    },
                    cellClick: (e, cell) => {
                        var neuName = cell.getData().name;
                        if (!cell.getValue()) { // not in workspace
                            this._addRemoveSignal.emit({ action: 'addByUname', content: { name: neuName } });
                            return;
                        }
                        else {
                            this._addRemoveSignal.emit({ action: 'removeByUname', content: { name: neuName } });
                            return;
                        }
                    },
                },
                { title: "Name", field: "name", align: "center", headerFilter: true, headerFilterPlaceholder: "filter name" },
                {
                    title: "Direction", field: "direction", align: "center", editor: "select", editorParams: { "pre": "Pre", "post": "Post" }, headerFilter: true, headerFilterParams: { "pre": "Pre", "post": "Post" }
                },
                { title: "Number", field: "number", dir: "desc", align: "center", headerFilter: "number", headerFilterPlaceholder: "at least...", headerFilterFunc: ">=" }
            ]
        });
    }
    /**
     * Parse data for tabulator
     *
     * Reformat data returned from neuroArch into Array of JSON format for tabulator rendering
     * @param data
     */
    _parseTabulatorData(data) {
        let new_data = [];
        for (let dir of ['pre', 'post']) {
            for (let item of data[dir]['details']) {
                let neuron_data = {};
                neuron_data['name'] = item['name'];
                neuron_data['number'] = item['number'];
                neuron_data['direction'] = dir;
                neuron_data['inworkspace'] = null; // this is undefined for now
                new_data.push(neuron_data);
            }
        }
        return new_data;
    }
    /*
    * Reset ConnTable Table
    */
    reset() {
        // purge div and add table
        let tabulatorDiv = document.getElementById(TABULATOR_ID);
        if (!tabulatorDiv) {
            let tableDiv = document.createElement('div');
            tableDiv.id = TABULATOR_ID;
            this.node.appendChild(tableDiv);
        }
        this._createTabulator(TABULATOR_ID);
    }
}
exports.ConnTable = ConnTable;
//# sourceMappingURL=conn_table.js.map