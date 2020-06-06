import * as React from "react";
import MaterialTable, { Column } from "material-table";
import { tableIcons } from "./table_icons";

import '../style/table.css'

interface Data {
  vfb_id?: string;
  name?: string;
  locality?: boolean;
  inferred?: boolean;
  has_syn_morph?: boolean | number;
  number?: number;
  uname?: string;
  rid?: string;
  class?: string;
  has_morph?: boolean | number;
}

const columns: Array<Column<Data>> = [
  {
    field: "name",
    title: "Name"
  },
  {
    field: "number",
    title: "# Synapse",
    defaultSort: "desc",
    cellStyle: {maxWidth: "40px"}
  }
];

const settings = {
  filtering: true,
  showTitle: false,
  search: false,
  toolbar: false,
  headerStyle: {
    fontSize: "0.5rem",
    padding: "2px"
  },
  cellStyle: {
    fontSize: "0.5rem",
    padding: "2px"
  },
  customFilterAndSearch: (term: any, rowData: Data) =>
    rowData.number ? term <= rowData.number : false,

};


export function ConnTable(props: { title: string, data: Data[] }) {
  return (
    <MaterialTable
      title={props.title}
      columns={columns}
      data={props.data}
      icons={tableIcons}
      options={settings}
      actions={[
        rowData => {
          return rowData.has_morph
            ? {
                icon: tableIcons.Add as any,
                disabled: rowData.has_morph ? false: true,
                tooltip: "Add Neuron",
                onClick: () => {
                  //
                }
              }
            : {
                icon: tableIcons.Add as any,
                disabled: true,
                onClick: () => {
                  /* anythink */
                }
              };
        },
        rowData => {
          return rowData.has_syn_morph
            ? {
                icon: tableIcons.Add as any,
                disabled: rowData.has_syn_morph ? false: true,
                tooltip: "Add Synapse",
                onClick: () => {
                  /* anythink */
                }
              }
            : {
                icon: tableIcons.Add as any,
                disabled: true,
                onClick: () => {
                  /* anythink */
                }
              };
        }
      ]}
    />
  );
}