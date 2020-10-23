// Connectivity table that uses tabulator class to render connectivity data object
import "@fortawesome/fontawesome-free/js/all.js";
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
      cellMouseOver: (e: any, cell:any) => {
        const { rid, syn_rid } = cell.getData();
        switch (cell.getColumn().getField()) {
          case 'has_syn_morph':
            if (this.neu3d?.isInWorkspace(syn_rid)){
              this.neu3d.neu3d.highlight(syn_rid);
            }
            break;
          default:
            if (this.neu3d?.isInWorkspace(rid)){
              this.neu3d.neu3d.highlight(rid);
            }
            // let highlight_rids = []
            // if (this.neu3d?.isInWorkspace(rid)) {
            //   highlight_rids.push(rid);
            // }
            // if (this.neu3d?.isInWorkspace(syn_rid)) {
            //   highlight_rids.push(syn_rid);
            // }
            // if (highlight_rids.length > 0) {
            //   this.neu3d.neu3d.highlight(highlight_rids);  
            // }
            break;
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

  /**
   * Check an array of whether if a connection has morphology data of the synapses
   * @param connData 
   */
  hasSynMorph(connData: Array<any>) {
    for (let entry of connData) {
      if (entry.has_syn_morph) {
        return true
      }
    }
    return false;
  }

  /**
   * Remove the synapse colummn if no synapse morphology
   */
  removeSynColumn(){
    if (this.tabulator.getColumn("has_syn_morph")) {
      this.tabulator.deleteColumn("has_syn_morph");
      this.tabulator.redraw();
    }
  }

  /**
   * Add the synapse colummn if has synapse morphology
   */
  addSynColumn(){
    if (!this.tabulator.getColumn("has_syn_morph")) {
      this.tabulator.addColumn(this.synColumn, true, "uname");
      this.tabulator.redraw();
    }
  }

  /**
   * Schema for the synapse column
   */
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
      // let { syn_uname, syn_rid } = cell.getData();
      //   if (!this.neu3d?.isInWorkspace(syn_rid)) { // not in workspace
      //     this.neu3d?.addByUname(syn_uname).then(()=>{
      //       cell.getRow().reformat();
      //     })
      //   } else {
      //     this.neu3d?.removeByUname(syn_uname).then(()=>{
      //       cell.getRow().reformat();
      //     })
      //   }
      let { s_rid, syn_rid } = cell.getData();
      if (!this.neu3d?.isInWorkspace(syn_rid)) { // not in workspace
        this.neu3d?.addByRid(s_rid).then(()=>{
          cell.getRow().reformat();
        })
      } else {
        this.neu3d?.removeByRid(s_rid).then(()=>{
          cell.getRow().reformat();
        })
      }
    }
  };

  /**
   * Schema for all columns.
   */
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
        // let { uname, rid } = cell.getData();
        // if (!this.neu3d?.isInWorkspace(rid)) { // not in workspace
        //   this.neu3d?.addByUname(uname).then(()=>{
        //     cell.getRow().reformat();
        //   })
        // } else {
        //   this.neu3d?.removeByUname(uname).then(()=>{
        //     cell.getRow().reformat();
        //   })
        // }
        let { n_rid, rid } = cell.getData();
        if (!this.neu3d?.isInWorkspace(rid)) { // not in workspace
          this.neu3d?.addByRid(n_rid).then(()=>{
            cell.getRow().reformat();
          })
        } else {
          this.neu3d?.removeByRid(n_rid).then(()=>{
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
