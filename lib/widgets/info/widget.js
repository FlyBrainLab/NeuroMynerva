// FBL Master Widget Class
import * as React from 'react';
import { Signal } from '@lumino/signaling';
import { ReactWidget, UseSignal, } from '@jupyterlab/apputils';
import { SummaryTable } from './summary_table';
import { ConnTable } from './conn_table';
import { ConnSVG } from './conn_svg';
import '../../../style/widgets/info/info.css';
const INFO_CLASS_JLab = 'jp-FBL-Info';
/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-FBL-Info-section';
/**
 * The class name added to the Section Header
 */
const SECTION_HEADER_CLASS = 'jp-FBL-Info-sectionHeader';
/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-FBL-Master-sectionContainer';
/**
 * Empty data to be used in case there is no data coming in
 */
const empty_data = {
    connectivity: {
        pre: { details: [], summary: { profile: {}, number: -1 } },
        post: { details: [], summary: { profile: {}, number: -1 } }
    },
    summary: {}
};
/**
* An Info Widget
*/
export class InfoWidget extends ReactWidget {
    constructor(props) {
        var _a, _b, _c;
        super();
        this.dataChanged = new Signal(this);
        if ((_a = props) === null || _a === void 0 ? void 0 : _a.data) {
            this.data = props.data;
        }
        else {
            this.data = empty_data;
        }
        // default to true
        if ((_b = props) === null || _b === void 0 ? void 0 : _b.inWorkspace) {
            this.inWorkspace = props.inWorkspace;
        }
        else {
            this.inWorkspace = (uname) => false;
        }
        this.neu3d = (_c = props) === null || _c === void 0 ? void 0 : _c.neu3d;
        this.addClass(INFO_CLASS_JLab);
    }
    onAfterAttach(msg) {
        super.onAfterAttach(msg);
        let preDiv = document.getElementById("info-connTable-pre");
        let postDiv = document.getElementById("info-connTable-post");
        if (preDiv) {
            this.tabConnPre = new ConnTable({
                container: preDiv,
                data: this.data.connectivity.pre.details,
                neu3d: this.neu3d
            });
        }
        if (postDiv) {
            this.tabConnPost = new ConnTable({
                container: postDiv,
                data: this.data.connectivity.post.details,
                neu3d: this.neu3d
            });
        }
        this.dataChanged.connect((sender, { data, inWorkspace, neu3d }) => {
            var _a, _b;
            let preData = this.parseConnData(((_a = data.connectivity) === null || _a === void 0 ? void 0 : _a.pre) || empty_data.connectivity.pre.details, neu3d);
            let postData = this.parseConnData(((_b = data.connectivity) === null || _b === void 0 ? void 0 : _b.post) || empty_data.connectivity.post.details, neu3d);
            this.tabConnPre.neu3d = neu3d;
            this.tabConnPost.neu3d = neu3d;
            this.tabConnPre.data = preData;
            this.tabConnPost.data = postData;
            this.tabConnPre.tabulator.setData(preData);
            this.tabConnPost.tabulator.setData(postData);
            if (this.tabConnPre.hasSynMorph(preData)) {
                this.tabConnPre.addSynColumn();
            }
            else {
                this.tabConnPre.removeSynColumn();
            }
            if (this.tabConnPost.hasSynMorph(postData)) {
                this.tabConnPost.addSynColumn();
            }
            else {
                this.tabConnPost.removeSynColumn();
            }
        }, this);
    }
    /**
     * Parse Connectivity Data
     * @param connData connectivity data
     */
    parseConnData(connData, neu3d) {
        var _a, _b, _c, _d;
        let new_data = [];
        for (let item of connData["details"]) {
            let neuron_data = {
                name: (_b = (_a = item["name"], (_a !== null && _a !== void 0 ? _a : item['name'])), (_b !== null && _b !== void 0 ? _b : item['rid'])),
                uname: (_d = (_c = item["uname"], (_c !== null && _c !== void 0 ? _c : item["name"])), (_d !== null && _d !== void 0 ? _d : item['rid'])),
                number: item["number"],
                rid: item["rid"],
                syn_uname: item.syn_uname,
                s_rid: item.s_rid,
                syn_rid: item.syn_rid,
                has_syn_morph: item["has_syn_morph"],
                has_morph: item["has_morph"]
            };
            new_data.push(neuron_data);
        }
        return new_data;
    }
    /** Reset Info to empty */
    reset() {
        this.dataChanged.emit({
            data: empty_data,
            inWorkspace: this.inWorkspace,
            neu3d: this.neu3d
        });
    }
    /** Render */
    render() {
        return (React.createElement("div", { className: SECTION_CLASS },
            React.createElement("header", { className: SECTION_HEADER_CLASS },
                React.createElement("h2", null, "Summary")),
            React.createElement("div", { className: CONTAINER_CLASS },
                React.createElement(UseSignal, { signal: this.dataChanged, initialArgs: {
                        data: this.data,
                        inWorkspace: this.inWorkspace,
                        neu3d: undefined
                    } }, (_, val) => {
                    var _a;
                    if ((_a = val.data) === null || _a === void 0 ? void 0 : _a.summary) {
                        return React.createElement(SummaryTable, { data: val.data.summary, neu3d: val.neu3d });
                    }
                    else {
                        return React.createElement(SummaryTable, { data: empty_data.summary, neu3d: val.neu3d });
                    }
                })),
            React.createElement("header", { className: SECTION_HEADER_CLASS },
                React.createElement("h2", null, "Connectivity Profile")),
            React.createElement("div", { className: CONTAINER_CLASS },
                React.createElement(UseSignal, { signal: this.dataChanged, initialArgs: {
                        data: this.data,
                        inWorkspace: this.inWorkspace,
                        neu3d: undefined
                    } }, (_, val) => {
                    var _a;
                    if ((_a = val.data) === null || _a === void 0 ? void 0 : _a.connectivity) {
                        return React.createElement(ConnSVG, { pre: val.data.connectivity.pre.summary, post: val.data.connectivity.post.summary });
                    }
                    else {
                        return React.createElement(ConnSVG, { pre: empty_data.connectivity.pre.summary, post: empty_data.connectivity.post.summary });
                    }
                })),
            React.createElement("header", { className: SECTION_HEADER_CLASS },
                React.createElement("h2", null, "Presynaptic Partners")),
            React.createElement("div", { className: CONTAINER_CLASS },
                React.createElement("div", { id: "info-connTable-pre" })),
            React.createElement("header", { className: SECTION_HEADER_CLASS },
                React.createElement("h2", null, "Postsynaptic Partners")),
            React.createElement("div", { className: CONTAINER_CLASS },
                React.createElement("div", { id: "info-connTable-post" }))));
    }
}
;
