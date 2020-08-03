import "@fortawesome/fontawesome-free/js/all.js";
// import { ReactTabulator } from "react-tabulator";
import Tabulator from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css"; //import Tabulator stylesheet
import { Neu3DWidget } from "../neu3d-widget";

export class ConnTable {
  constructor(props: {
    container: any;
    data: any;
    neu3d: any;
  }) {
    this.data = props.data;
    this.neu3d = props.neu3d;
    //instantiate Tabulator when element is mounted
    this.tabulator = new Tabulator(props.container, {
      data: this.data, //link data to table
      columns: this.columns, //define table columns
      tooltips: true,
      pagination: "local",
      paginationSize: 5,
      page: 3,
      initialSort: [{ column: "number", dir: "desc" }],
      layout: "fitColumns",
      rowMouseOver: (e: any, row:any) => {
        const rid = row.getData().rid;
        if (this.neu3d?.isInWorkspace(rid)){
          this.neu3d.neu3d.highlight(rid);
        }
      },
      rowMouseOut: (e: any, row:any) =>{
        // reset highlight
        this.neu3d.neu3d.highlight()
      }
    });

    if (!this.hasSynMorph(this.data)) {
      this.tabulator.deleteColumn("has_syn_morph");
    }
  }

  hasSynMorph(connData: Array<any>) {
    for (let entry of connData) {
      if (entry.has_syn_morph) {
        return true
      }
    }
    return false;
  }

  removeSynColumn(){
    if (this.tabulator.getColumn("has_syn_morph")) {
      this.tabulator.deleteColumn("has_syn_morph");
      this.tabulator.redraw();
    }
  }

  addSynColumn(){
    if (!this.tabulator.getColumn("has_syn_morph")) {
      this.tabulator.addColumn(this.synColumn, true, "uname");
      this.tabulator.redraw();
    }
  }

  readonly synColumn = {
    title: "Synapse",
    field: "has_syn_morph",
    hozAlign: "center",
    sorter: "boolean",
    headerFilter: true,
    headerFilterParams: {
      true: "True",
      false: "False"
    },
    headerFilterPlaceholder: "in workspace",
    width: 70,
    formatter: (cell: any, formatterParams: any) => {
      if (cell.getValue()) {
        if (this.neu3d?.isInWorkspace(cell.getData().syn_rid)) {
          return "<i class='fa fa-minus-circle' > </i>";
        } else {
          return "<i class='fa fa-plus-circle' > </i>";
        }
      }
      return;
    },
    cellClick: (e: any, cell: any) => {
      let { syn_rid } = cell.getData();
      if (!this.neu3d?.isInWorkspace(syn_rid)) {
        // not in workspace
        this.neu3d?.addByRid(syn_rid).then(()=>{
          cell.getRow().reformat();
        })
      } else {
        this.neu3d?.removeByRid(syn_rid).then(()=>{
          cell.getRow().reformat();
        })
      }
    }
  };

  readonly columns = [
    {
      title: "Neuron",
      field: "has_morph",
      hozAlign: "center",
      headerFilter: true,
      headerFilterParams: {
        true: "True",
        false: "False"
      },
      sorter:"boolean",
      headerFilterPlaceholder: "in workspace",
      width: 70,
      formatter: (cell: any, formatterParams: any) => {
        if (cell.getValue()) {
          if (this.neu3d?.isInWorkspace(cell.getData().rid)) {
            return "<i class='fa fa-minus-circle' > </i>";
          } else {
            return "<i class='fa fa-plus-circle' > </i>";
          }
        }
        return;
      },
      cellClick: (e: any, cell: any) => {
        let { rid } = cell.getData();
        if (!this.neu3d?.isInWorkspace(rid)) {
          // not in workspace
          this.neu3d?.addByRid(rid).then(()=>{
            cell.getRow().reformat();
          })
        } else {
          this.neu3d?.removeByRid(rid).then(()=>{
            cell.getRow().reformat();
          })
        }
      }
    },
    this.synColumn,
    {
      title: "Name",
      field: "uname",
      hozAlign: "center",
      sorter:"alphanum",
      headerFilter: true,
      headerFilterPlaceholder: "filter name"
    },
    {
      title: "Number",
      field: "number",
      hozAlign: "center",
      sorter:"number",
      headerFilter: "number",
      headerFilterPlaceholder: "at least...",
      headerFilterFunc: ">=",
      width: 70
    }
  ];

  data: any;
  tabulator: any;
  neu3d: Neu3DWidget;
}
