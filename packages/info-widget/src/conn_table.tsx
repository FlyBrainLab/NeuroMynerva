import * as React from "react";
import "@fortawesome/fontawesome-free/js/all.js";
import { ReactTabulator } from "react-tabulator";

export class ConnTable extends React.Component<{ 
  data: any; 
  workspace: any; 
  addByUname: (uname: string)=>{};
  removeByUname: (uname: string)=>{} 
}> {

  inworkspace(rid: string) {
    return this.workspace.includes(rid) ? true : false;
  }

  parseData(connData: any, workspace: string[]) {
    let new_data = [];
    for (let item of connData["details"]) {
      let neuron_data = {
        name: item["name"],
        number: item["number"],
        rid: item["rid"],
        has_syn_morph: item["has_syn_morph"],
        inworkspace: workspace.includes(item["rid"]) ? true : false
      };

      new_data.push(neuron_data);
    }
    return new_data;
  }

  public render() {
    return (
      <>
        <ReactTabulator
          options={{
            pagination: "local",
            paginationSize: 6,
            page: 3,
            initialSort: [{ column: "number", dir: "desc" }],
            reactiveData: true
          }}
          data={this.parseData(this.props.data, this.props.workspace)}
          columns={this.columns}
          tooltips={true}
          layout={"fitColumns"}
        />
      </>
    );
  }

  readonly columns = [
    {
      title: "+/- Neuron",
      field: "inworkspace",
      hozAlign: "center",
      headerFilter: true,
      headerFilterParams: {
        true: "True",
        false: "False"
      },
      width: 100,
      formatter: (cell: any, formatterParams: any) => {
        if (cell.getValue() === true) {
          return "<i class='fa fa-minus-circle' > </i>";
        } else {
          return "<i class='fa fa-plus-circle' > </i>";
        }
      },
      cellClick: (e: any, cell: any) => {
        let { name, inworkspace} = cell.getData();

        if (!inworkspace) {
          // not in workspace
          this.addByUname(name);
        } else {
          this.removeByUname(name);
        }
      }
    },
    {
      title: "+/- Synapse",
      field: "has_syn_morph",
      hozAlign: "center",
      headerFilter: true,
      headerFilterParams: {
        true: "True",
        false: "False"
      },
      width: 110,
      formatter: (cell: any, formatterParams: any) => {
        if (cell.getValue() === true) {
          return "<i class='fa fa-plus-circle' > </i>";
        }
        return;
      },
      cellClick: (e: any, cell: any) => {
        let { name, inworkspace } = cell.getData();

        if (!inworkspace) {
          // not in workspace
          this.addByUname(name);
        } else {
          this.removeByUname(name);
        }
      }
    },
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
  workspace: any;
  addByUname: (uname: string)=>{};
  removeByUname: (uname: string)=>{};
}
