import * as React from "react";
import "@fortawesome/fontawesome-free/js/all.js";
import { ReactTabulator } from "react-tabulator";
import "tabulator-tables/dist/css/tabulator.min.css"; //import Tabulator stylesheet

export class ConnTable extends React.Component<{
  data: any;
  inWorkspace: (rid: string) => boolean;
  addByUname: (uname: string) => void;
  removeByUname: (uname: string) => void;
}> {
  parseData(connData: any) {
    let new_data = [];
    for (let item of connData["details"]) {
      let neuron_data = {
        name: item["name"],
        uname: item["uname"] ?? item["name"],
        number: item["number"],
        rid: item["rid"],
        has_syn_morph: item["has_syn_morph"],
        has_morph: item["has_morph"]
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
            initialSort: [{ column: "number", dir: "desc" }]
          }}
          data={this.parseData(this.props.data)}
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
      field: "has_morph",
      hozAlign: "center",
      headerFilter: true,
      headerFilterParams: {
        true: "True",
        false: "False"
      },
      headerFilterPlaceholder: "in workspace",
      // width: 100,
      formatter: (cell: any, formatterParams: any) => {
        if (cell.getValue() == true) { // 1 or true
          if (this.props.inWorkspace(cell.getData().rid)) {
            return "<i class='fa fa-minus-circle' > </i>";
          } else {
            return "<i class='fa fa-plus-circle' > </i>";
          }
        }
        return;
      },
      cellClick: (e: any, cell: any) => {
        let { rid, uname } = cell.getData();
        if (!this.props.inWorkspace(rid)) {
          // not in workspace
          this.props.addByUname(uname);
        } else {
          this.props.removeByUname(uname);
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
      headerFilterPlaceholder: "in workspace",
      // maxWidth: 110,
      formatter: (cell: any, formatterParams: any) => {
        if (cell.getValue() == true) {
          return "<i class='fa fa-plus-circle' > </i>";
        }
        return;
      },
      cellClick: (e: any, cell: any) => {
        let { uname, rid } = cell.getData();

        if (!this.props.inWorkspace(rid)) {
          // not in workspace
          this.props.addByUname(uname);
        } else {
          this.props.removeByUname(uname);
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
      // width: 100
    }
  ];
}
