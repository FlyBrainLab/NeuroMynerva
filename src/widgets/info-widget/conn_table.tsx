/**
 * Connectivity table that uses tabulator class to render connectivity data object
 */
import '@fortawesome/fontawesome-free/js/all.js';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css'; //import Tabulator stylesheet
import { Neu3DWidget } from '../neu3d-widget';
import { IDataChangeArgs, Neu3DModel } from '../neu3d-widget/model';

export class ConnTable {
  constructor(props: {
    container: HTMLElement;
    preOrPost: 'pre' | 'post';
    data: IConnDataItem[];
    neu3d: Neu3DWidget;
  }) {
    this.preOrPost = props.preOrPost;
    this.data = props.data;
    this.neu3d = props.neu3d;
    //instantiate Tabulator when element is mounted
    this.tabulator = new Tabulator(props.container, {
      reactiveData: true,
      data: this.data, //link data to table
      columns: this.columns, //define table columns
      tooltips: true,
      pagination: 'local',
      paginationSize: 8,
      // page: 3,
      initialSort: [{ column: 'number', dir: 'desc' }],
      layout: 'fitColumns',
      cellMouseOver: (e: any, cell: any) => {
        const { rid, syn_rid } = cell.getData();
        switch (cell.getColumn().getField()) {
          case 'synapse_in_workspace':
            if (this.neu3d?.isInWorkspace(syn_rid)) {
              this.neu3d.neu3d.highlight(syn_rid);
            }
            break;
          default:
            if (this.neu3d?.isInWorkspace(rid)) {
              this.neu3d.neu3d.highlight(rid);
            }
            break;
        }
      },
      rowMouseOut: (e: any, row: any) => {
        // reset highlight
        this.neu3d.neu3d.highlight();
      }
    });
    if (!this.hasSynMorph(this.data)) {
      this.tabulator.hideColumn('synapse_in_workspace');
    }
    this.neu3d?.model.dataChanged.connect(this.handleDataChanged.bind(this));
  }

  /**
   * Parse Connectivity Data
   * @param connData connectivity data
   */
  private parseConnData(
    connData: IConnData,
    neu3d: Neu3DWidget
  ): IConnDataItem[] {
    const new_data: IConnDataItem[] = [];
    if (connData === undefined || connData === null) {
      return new_data;
    }
    if (!(this.preOrPost in connData)) {
      // no pre or post partners
      return new_data;
    }
    if (!('details' in connData[this.preOrPost])) {
      return new_data;
    }
    for (const item of connData[this.preOrPost]['details']) {
      const neuron_data: IConnDataItem = {
        name: item.name ?? item.name ?? item.rid,
        uname: item.uname ?? item.name ?? item.rid,
        syn_uname: item.syn_uname,
        number: parseInt(item.number),
        rid: item.rid,
        n_rid: item.n_rid,
        neuron_in_workspace: neu3d.isInWorkspace(item.rid),
        syn_rid: item.syn_rid,
        s_rid: item.s_rid,
        synapse_in_workspace: neu3d.isInWorkspace(item.syn_rid),
        has_syn_morph: item.has_syn_morph in [1, true],
        has_morph: item.has_morph in [1, true]
      };
      new_data.push(neuron_data);
    }
    return new_data;
  }

  /**
   * Set Data
   * @param data
   */
  setData(connData: IConnData, neu3d: Neu3DWidget): void {
    this.data = this.parseConnData(connData, neu3d);
    this.tabulator.setData(this.data);
    this.setNeu3D(neu3d);
    if (!this.hasSynMorph(this.data)) {
      this.tabulator.hideColumn('synapse_in_workspace');
    } else {
      this.tabulator.showColumn('synapse_in_workspace');
    }
  }

  /**
   * Set Neu3D's Callback
   * @param neu3d New Neu3DWidget
   */
  setNeu3D(neu3d: Neu3DWidget): void {
    if (neu3d !== this.neu3d) {
      // change dataChanged callback
      this.neu3d?.model?.dataChanged.disconnect(
        this.handleDataChanged.bind(this)
      );
      neu3d?.model?.dataChanged.connect(this.handleDataChanged.bind(this));
      this.neu3d = neu3d;
    }
  }

  /**
   * Handle Neu3D Data Changed
   */
  handleDataChanged(caller: Neu3DModel, change: IDataChangeArgs): void {
    const { event, key, rid } = change as IDataChangeArgs;
    if (!['add', 'remove'].includes(event)) {
      return;
    }
    if (key === 'highlight') {
      return;
    } // skip highlight
    const neuronIdx = this.data.findIndex(
      (row: IConnDataItem) => row.rid === rid
    );
    const synapseIdx = this.data.findIndex(
      (row: IConnDataItem) => row.syn_rid === rid
    );

    switch (event) {
      case 'add':
        if (neuronIdx > -1) {
          this.data[neuronIdx].neuron_in_workspace = true;
        }
        if (synapseIdx > -1) {
          this.data[synapseIdx].synapse_in_workspace = true;
        }
        break;
      case 'remove':
        if (neuronIdx > -1) {
          this.data[neuronIdx].neuron_in_workspace = false;
        }
        if (synapseIdx > -1) {
          this.data[synapseIdx].synapse_in_workspace = false;
        }
        break;
      default:
        break;
    }
  }

  /**
   * Check an array of whether if a connection has morphology data of the synapses
   * @param connData
   */
  hasSynMorph(connData: Array<any>): boolean {
    for (const entry of connData) {
      if (entry.has_syn_morph) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove the synapse colummn if no synapse morphology
   */
  hideSynColumn(): void {
    const column = this.tabulator.getColumn('synapse_in_workspace');
    if (column.isVisible()) {
      column.hide();
    }
  }

  /**
   * Add the synapse colummn if has synapse morphology
   */
  showSynColumn(): void {
    const column = this.tabulator.getColumn('synapse_in_workspace');
    if (!column.isVisible()) {
      column.show();
    }
  }

  /**
   * Schema for all columns.
   */
  readonly columns = [
    {
      title: 'Neuron',
      field: 'neuron_in_workspace',
      hozAlign: 'center',
      headerFilter: false,
      headerSort: true,
      width: 50,
      formatter: 'tickCross',
      cellClick: (e: any, cell: any) => {
        const { n_rid, rid } = cell.getData();
        if (!this.neu3d?.isInWorkspace(rid)) {
          // not in workspace
          this.neu3d?.addByRid(n_rid);
        } else {
          this.neu3d?.removeByRid(n_rid);
        }
      }
    },
    {
      title: 'Synapse',
      field: 'synapse_in_workspace',
      hozAlign: 'center',
      headerSort: true,
      width: 55,
      formatter: 'tickCross',
      cellClick: (e: any, cell: any) => {
        const { s_rid, syn_rid } = cell.getData();
        if (!this.neu3d?.isInWorkspace(syn_rid)) {
          // not in workspace
          this.neu3d?.addByRid(s_rid);
        } else {
          this.neu3d?.removeByRid(s_rid);
        }
      }
    },
    {
      title: 'Name',
      field: 'uname',
      hozAlign: 'center',
      sorter: 'alphanum',
      headerFilter: true,
      headerFilterPlaceholder: 'filter name'
    },
    {
      title: 'Number',
      field: 'number',
      hozAlign: 'center',
      sorter: 'number',
      headerFilter: 'number',
      headerFilterPlaceholder: '>=',
      headerFilterFunc: '>=',
      width: 55
    }
  ];

  data: IConnDataItem[];
  tabulator: any;
  neu3d: Neu3DWidget;
  readonly preOrPost: 'pre' | 'post';
}

/**
 * Element of Data in Tabulator
 */
export interface IConnDataItem {
  name: string;
  uname: string;
  syn_uname: string;
  number: number;
  rid: string; // neuron morphologyData node id
  n_rid: string; // neuron node id
  neuron_in_workspace: boolean;
  syn_rid: string; // synapse morphologyData node id
  s_rid: string; // synapse node id
  synapse_in_workspace: boolean;
  has_syn_morph: boolean;
  has_morph: boolean;
}

/**
 * Conn Data sent by Neu3D Widget
 */
export interface IConnData {
  pre?: {
    details?: Array<any>;
    summary?: {
      profile?: Record<string, unknown> | any;
      number?: number | any;
    };
  };
  post?: {
    details?: Array<any>;
    summary?: {
      profile?: Record<string, unknown> | any;
      number?: number | any;
    };
  };
}

/**
 * Fill Empty Connectivity Data
 */
export const EmptyConnData: IConnData = {
  pre: { details: [], summary: { profile: {}, number: 0 } },
  post: { details: [], summary: { profile: {}, number: 0 } }
};
