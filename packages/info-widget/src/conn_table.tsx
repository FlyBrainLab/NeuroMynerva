import "@fortawesome/fontawesome-free/js/all.js";
// import { ReactTabulator } from "react-tabulator";
import Tabulator from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css"; //import Tabulator stylesheet

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
      paginationSize: 6,
      page: 3,
      initialSort: [{ column: "number", dir: "desc" }],
      layout: "fitColumns"
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
    }
  }

  addSynColumn(){
    if (!this.tabulator.getColumn("has_syn_morph")) {
      this.tabulator.addColumn(this.synColumn, true, "name");
    }
  }

  readonly synColumn = {
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
    formatter: (cell: any, formatterParams: any) => {
      if (cell.getValue()) {
        if (this.neu3d?.isInWorkspace(cell.getData().s_rid)) {
          return "<i class='fa fa-minus-circle' > </i>";
        } else {
          return "<i class='fa fa-plus-circle' > </i>";
        }
      }
      return;
    },
    cellClick: (e: any, cell: any) => {
      let { syn_uname, s_rid } = cell.getData();

      if (!this.neu3d?.isInWorkspace(s_rid)) {
        // not in workspace
        this.neu3d?.addByUname(syn_uname).then(()=>{
          cell.getRow().reformat();
        })
      } else {
        this.neu3d?.removeByUname(syn_uname).then(()=>{
          cell.getRow().reformat();
        })
      }
    }
  };

  readonly columns = [
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
        let { uname, rid } = cell.getData();
        if (!this.neu3d?.isInWorkspace(rid)) {
          // not in workspace
          console.log('addbyRid', rid, uname)
          this.neu3d?.addByUname(uname).then(()=>{
            cell.getRow().reformat();
          })
        } else {
          console.log('removebyRid', rid, uname)
          this.neu3d?.removeByUname(uname).then(()=>{
            cell.getRow().reformat();
          })
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

  data: any;
  tabulator: any;
  neu3d: any;
}
