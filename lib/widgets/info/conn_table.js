import "@fortawesome/fontawesome-free/js/all.js";
// import { ReactTabulator } from "react-tabulator";
import Tabulator from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css"; //import Tabulator stylesheet
export class ConnTable {
    constructor(props) {
        this.synColumn = {
            title: "+/- Synapse",
            field: "has_syn_morph",
            hozAlign: "center",
            headerFilter: true,
            headerFilterParams: {
                true: "True",
                false: "False"
            },
            headerFilterPlaceholder: "in workspace",
            width: 110,
            formatter: (cell, formatterParams) => {
                var _a;
                if (cell.getValue()) {
                    if ((_a = this.neu3d) === null || _a === void 0 ? void 0 : _a.isInWorkspace(cell.getData().syn_rid)) {
                        return "<i class='fa fa-minus-circle' > </i>";
                    }
                    else {
                        return "<i class='fa fa-plus-circle' > </i>";
                    }
                }
                return;
            },
            cellClick: (e, cell) => {
                var _a, _b, _c;
                let { syn_uname, syn_rid } = cell.getData();
                if (!((_a = this.neu3d) === null || _a === void 0 ? void 0 : _a.isInWorkspace(syn_rid))) {
                    // not in workspace
                    (_b = this.neu3d) === null || _b === void 0 ? void 0 : _b.addByUname(syn_uname).then(() => {
                        cell.getRow().reformat();
                    });
                }
                else {
                    (_c = this.neu3d) === null || _c === void 0 ? void 0 : _c.removeByUname(syn_uname).then(() => {
                        cell.getRow().reformat();
                    });
                }
            }
        };
        this.columns = [
            {
                title: "+/- Neuron",
                field: "has_morph",
                hozAlign: "center",
                headerFilter: true,
                headerFilterParams: {
                    true: "True",
                    false: "False"
                },
                headerFilterPlaceholder: "in workspace",
                width: 100,
                formatter: (cell, formatterParams) => {
                    var _a;
                    if (cell.getValue()) {
                        if ((_a = this.neu3d) === null || _a === void 0 ? void 0 : _a.isInWorkspace(cell.getData().rid)) {
                            return "<i class='fa fa-minus-circle' > </i>";
                        }
                        else {
                            return "<i class='fa fa-plus-circle' > </i>";
                        }
                    }
                    return;
                },
                cellClick: (e, cell) => {
                    var _a, _b, _c;
                    let { uname, rid } = cell.getData();
                    if (!((_a = this.neu3d) === null || _a === void 0 ? void 0 : _a.isInWorkspace(rid))) {
                        // not in workspace
                        (_b = this.neu3d) === null || _b === void 0 ? void 0 : _b.addByUname(uname).then(() => {
                            cell.getRow().reformat();
                        });
                    }
                    else {
                        (_c = this.neu3d) === null || _c === void 0 ? void 0 : _c.removeByUname(uname).then(() => {
                            cell.getRow().reformat();
                        });
                    }
                }
            },
            this.synColumn,
            {
                title: "Name",
                field: "name",
                hozAlign: "center",
                headerFilter: true,
                headerFilterPlaceholder: "filter name"
            },
            {
                title: "Number",
                field: "number",
                hozAlign: "center",
                headerFilter: "number",
                headerFilterPlaceholder: "at least...",
                headerFilterFunc: ">=",
                width: 100
            }
        ];
        this.data = props.data;
        this.neu3d = props.neu3d;
        //instantiate Tabulator when element is mounted
        this.tabulator = new Tabulator(props.container, {
            data: this.data,
            columns: this.columns,
            tooltips: true,
            pagination: "local",
            paginationSize: 6,
            page: 3,
            initialSort: [{ column: "number", dir: "desc" }],
            layout: "fitColumns",
            rowMouseOver: (e, row) => {
                var _a;
                const rid = row.getData().rid;
                if ((_a = this.neu3d) === null || _a === void 0 ? void 0 : _a.isInWorkspace(rid)) {
                    this.neu3d.neu3d.highlight(rid);
                }
            },
            rowMouseOut: (e, row) => {
                // reset highlight
                this.neu3d.neu3d.highlight();
            }
        });
        if (!this.hasSynMorph(this.data)) {
            this.tabulator.deleteColumn("has_syn_morph");
        }
    }
    hasSynMorph(connData) {
        for (let entry of connData) {
            if (entry.has_syn_morph) {
                return true;
            }
        }
        return false;
    }
    removeSynColumn() {
        if (this.tabulator.getColumn("has_syn_morph")) {
            this.tabulator.deleteColumn("has_syn_morph");
            this.tabulator.redraw();
        }
    }
    addSynColumn() {
        if (!this.tabulator.getColumn("has_syn_morph")) {
            this.tabulator.addColumn(this.synColumn, true, "name");
            this.tabulator.redraw();
        }
    }
}
