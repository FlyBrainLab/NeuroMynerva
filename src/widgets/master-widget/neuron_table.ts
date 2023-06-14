// Neuron Table that renders the metadata of a given neuron
// in a table format
import * as _ from 'lodash';
import '@fortawesome/fontawesome-free/js/all.js';
import {
  TabulatorFull as Tabulator,
  ColumnDefinition,
  ColumnDefinitionAlign,
  Editor
} from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css'; //import Tabulator stylesheet
import { numberFilter, combinedFilter } from '../../filter';
import { Neu3DWidget } from '../neu3d-widget';
import { IDataChangeArgs, IMeshDictItem } from '../neu3d-widget/model';
import '../../../style/master-widget/master.css';
import { ILabShell } from '@jupyterlab/application';
import { FBLPanel } from '../../extension';

/**
 * Renderes a single Neu3D panel as a list item with buttons and dropdown
 * @param props
 */
export class Neu3DModelTable {
  constructor(props: {
    neuronContainer: string;
    synapseContainer: string;
    meshContainer: string;
    neu3dPanel: FBLPanel;
    labShell: ILabShell;
  }) {
    this.neu3d = props.neu3dPanel.content as Neu3DWidget;
    this.panel = props.neu3dPanel;
    const { neurons, synapses, meshes } = this.parseData(this.neu3d);
    this.labShell = props.labShell;
    this.neurons = neurons;
    this.synapses = synapses;
    this.meshes = meshes;
    this.neuronTabulator = new Tabulator(`#${props.neuronContainer}`, {
      reactiveData: true, //enable reactive data
      data: this.neurons, //link data to table
      columns: this.neuronColumns, //define table columns
      maxHeight: '250px',
      //pagination: 'local',
      //paginationSize: 15,
      headerSortClickElement: 'icon',
      initialSort: [{ column: 'label', dir: 'desc' }],
      layout: 'fitColumns',
      cellClick: (e: any, cell: any) => {
        this.labShell.activateById(this.panel.id);
      }
    });
    this.neuronTabulator.on('tableBuilt', () => {
      this.neuronTabulator.initialized = true;
    });
    this.neuronTabulator.on('cellMouseOver', (e: any, cell: any) => {
      const { rid } = cell.getData();
      if (this.neu3d?.isInWorkspace(rid)) {
        this.neu3d.neu3d.highlight(rid, true);
      }
    });

    this.neuronTabulator.on('rowMouseOut', (e: any, row: any) => {
      // reset highlight
      this.neu3d.neu3d.highlight();
    });
    this.neuronTabulator.on('cellClick', (e: any, cell: any) => {
      this.labShell.activateById(this.panel.id);
    });

    this.synapseTabulator = new Tabulator(`#${props.synapseContainer}`, {
      reactiveData: true, //enable reactive data
      data: this.synapses, //link data to table
      columns: this.synapseColumns, //define table columns
      maxHeight: '250px',
      //pagination: 'local',
      //paginationSize: 15,
      headerSortClickElement: 'icon',
      initialSort: [{ column: 'N', dir: 'desc' }],
      layout: 'fitColumns'
    });
    this.synapseTabulator.on('tableBuilt', () => {
      this.synapseTabulator.initialized = true;
    });

    this.synapseTabulator.on('cellMouseOver', (e: any, cell: any) => {
      const { rid } = cell.getData();
      if (this.neu3d?.isInWorkspace(rid)) {
        this.neu3d.neu3d.highlight(rid, true);
      }
    });
    this.synapseTabulator.on('rowMouseOut', (e: any, row: any) => {
      // reset highlight
      this.neu3d.neu3d.highlight();
    });
    this.synapseTabulator.on('cellClick', (e: any, cell: any) => {
      this.labShell.activateById(this.panel.id);
    });

    this.meshTabulator = new Tabulator(`#${props.meshContainer}`, {
      reactiveData: true, //enable reactive data
      data: this.meshes, //link data to table
      columns: this.neuropilColumns, //define table columns
      maxHeight: '250px',
      //pagination: 'local',
      //paginationSize: 15,
      headerSortClickElement: 'icon',
      initialSort: [{ column: 'label', dir: 'desc' }],
      layout: 'fitColumns'
    });

    this.meshTabulator.on('cellMouseOver', (e: any, cell: any) => {
      const { rid } = cell.getData();
      if (this.neu3d?.isInWorkspace(rid)) {
        this.neu3d.neu3d.highlight(rid, true);
      }
    });
    this.meshTabulator.on('rowMouseOut', (e: any, row: any) => {
      // reset highlight
      this.neu3d.neu3d.highlight();
    });
    this.meshTabulator.on('cellClick', (e: any, cell: any) => {
      this.labShell.activateById(this.panel.id);
    });

    this.meshTabulator.on('tableBuilt', () => {
      this.meshTabulator.initialized = true;
    });

    // debounce redraw commands
    this.delayedRedrawNeuron = _.debounce(() => {
      if (this.neuronTabulator.initialized) {
        this.neuronTabulator.redraw();
        //this.neuronTabulator.setPage(this.neuronTabulator.getPage());
        this.neuronTabulator.restoreRedraw();
      } else {
        this.neuronTabulator.on('tableBuilt', () => {
          this.neuronTabulator.redraw();
          //this.neuronTabulator.setPage(this.neuronTabulator.getPage());
          this.neuronTabulator.restoreRedraw();
        });
      }
    }, 1000);

    // debounce redraw commands
    this.delayedRedrawSynapse = _.debounce(() => {
      if (this.synapseTabulator.initialized) {
        this.synapseTabulator.redraw();
        this.synapseTabulator.restoreRedraw();
      } else {
        this.synapseTabulator.on('tableBuilt', () => {
          this.synapseTabulator.redraw();
          //this.synapseTabulator.setPage(this.synapseTabulator.getPage());
          this.synapseTabulator.restoreRedraw();
        });
      }
    }, 1000);

    // debounce redraw commands
    this.delayedRedrawMesh = _.debounce(() => {
      if (this.meshTabulator.initialized) {
        this.meshTabulator.redraw();
        this.meshTabulator.restoreRedraw();
      } else {
        this.meshTabulator.on('tableBuilt', () => {
          this.meshTabulator.redraw();
          //this.meshTabulator.setPage(this.meshTabulator.getPage());
          this.meshTabulator.restoreRedraw();
        });
      }
    }, 1000);

    this.neu3d.model.dataChanged.connect((caller, change) => {
      const { event, newValue, key, rid, source } = change as IDataChangeArgs;
      if (!['add', 'change', 'remove'].includes(event)) {
        return;
      }
      if (key === 'highlight') {
        return;
      } // skip highlight
      const neuronIdx = this.neurons.findIndex(row => row.rid === rid);
      const synapseIdx = this.synapses.findIndex(row => row.rid === rid);
      const neuropilIdx = this.meshes.findIndex(row => row.rid === rid);
      let background = false;
      switch (event) {
        case 'add':
          background = source[rid]?.background || source.background;
          if (neuronIdx === -1 && synapseIdx === -1 && neuropilIdx === -1) {
            if (background) {
              this.meshes.push({
                rid: rid,
                orid: source[rid].orid,
                class: source[rid].class ?? 'Neuropil',
                uname: source[rid].uname,
                label: source[rid].label ?? rid,
                visibility: source[rid].visibility ?? true,
                background: true
              });
              this.meshTabulator.blockRedraw();
              this.delayedRedrawMesh();
            } else {
              if (source[rid].class === 'Synapse') {
                this.synapses.push({
                  rid: rid,
                  orid: source[rid].orid,
                  class: source[rid].class ?? 'Synapse',
                  uname: source[rid].uname,
                  label: source[rid].label ?? rid,
                  presynaptic: source[rid].uname.split('--')[0],
                  postsynaptic: source[rid].uname.split('--')[1],
                  N: source[rid].N,
                  visibility: source[rid].visibility ?? true,
                  pinned: source[rid].pinned ?? false,
                  background: false
                });
                this.synapseTabulator.blockRedraw();
                this.delayedRedrawSynapse();
              } else {
                this.neurons.push({
                  rid: rid,
                  orid: source[rid].orid,
                  class: source[rid].class ?? 'Neuron',
                  uname: source[rid].uname,
                  label: source[rid].label ?? rid,
                  visibility: source[rid].visibility ?? true,
                  pinned: source[rid].pinned ?? false,
                  background: false
                });
                this.neuronTabulator.blockRedraw();
                this.delayedRedrawNeuron();
              }
            }
          }
          break;
        case 'remove':
          if (neuronIdx > -1) {
            this.neurons.splice(neuronIdx, 1);
            this.neuronTabulator.blockRedraw();
            this.delayedRedrawNeuron();
          }
          if (synapseIdx > -1) {
            this.synapses.splice(synapseIdx, 1);
            this.synapseTabulator.blockRedraw();
            this.delayedRedrawSynapse();
          }
          if (neuropilIdx > -1) {
            this.meshes.splice(neuropilIdx, 1);
            this.meshTabulator.blockRedraw();
            this.delayedRedrawMesh();
          }
          break;
        case 'change':
          switch (key) {
            case 'visibility':
              if (neuronIdx > -1) {
                this.neurons[neuronIdx].visibility = newValue;
              }
              if (synapseIdx > -1) {
                this.synapses[synapseIdx].visibility = newValue;
              }
              if (neuropilIdx > -1) {
                this.meshes[neuropilIdx].visibility = newValue;
              }
              break;
            case 'pinned':
              if (neuronIdx > -1) {
                this.neurons[neuronIdx].pinned = newValue;
              }
              if (synapseIdx > -1) {
                this.synapses[synapseIdx].pinned = newValue;
              }

              break;
            default:
              return;
          }
          break;
        default:
          break;
      }
    });
  }

  /**
   * Remove all unpinned neurons
   * @param active if true, only remove active neurons in the tabulator
   */
  removeAllNeurons(active = true): void {
    const orids: string[] = this.neuronTabulator
      .getData(active ? 'active' : '')
      .filter((r: any) => !r.pinned)
      .map((r: any) => r.orid);
    this.neu3d.removeByRid(orids);
  }

  /**
   * Remove all unpinned synapses
   * @param active if true, only remove active neurons in the tabulator
   */
  removeAllSynapses(active = true): void {
    const orids: string[] = this.synapseTabulator
      .getData(active ? 'active' : '')
      .filter((r: any) => !r.pinned)
      .map((r: any) => r.orid);
    this.neu3d.removeByRid(orids);
  }

  /**
   * Remove all meshes
   * @param active if true, only remove active neurons in the tabulator
   */
  removeAllMeshes(active = true): void {
    const orids: string[] = this.meshTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.orid);
    this.neu3d.removeByRid(orids);
  }

  /**
   * Hide all neurons
   * @param active if true, only hide active neurons in the tabulator
   */
  hideAllNeurons(active = true): void {
    const rids: string[] = this.neuronTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.hide(rids);
  }

  /**
   * Hide all synapses
   * @param active if true, only hide active synapses in the tabulator
   */
  hideAllSynapses(active = true): void {
    const rids: string[] = this.synapseTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.hide(rids);
  }

  /**
   * Hide all meshes
   * @param active if true, only hide active meshes in the tabulator
   */
  hideAllMeshes(active = true): void {
    const rids: string[] = this.meshTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.hide(rids);
  }

  /**
   * Show all neurons
   * @param active if true, only show active neurons in the tabulator
   */
  showAllNeurons(active = true): void {
    const rids: string[] = this.neuronTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.show(rids);
  }

  /**
   * Show all synapses
   * @param active if true, only show active synapses in the tabulator
   */
  showAllSynapses(active = true): void {
    const rids: string[] = this.synapseTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.show(rids);
  }

  /**
   * Show all meshes
   * @param active if true, only show active meshes in the tabulator
   */
  showAllMeshes(active = true): void {
    const rids: string[] = this.meshTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.show(rids);
  }

  /**
   * Pin all neurons
   * @param active if true, only pin active neurons in the tabulator
   */
  pinAllNeurons(active = true): void {
    const rids: string[] = this.neuronTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.pin(rids);
  }

  /**
   * Pin all synapses
   * @param active if true, only pin active synapses in the tabulator
   */
  pinAllSynapses(active = true): void {
    const rids: string[] = this.synapseTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.pin(rids);
  }

  /**
   * UnPin all neurons
   * @param active if true, only unpin active neurons in the tabulator
   */
  unpinAllNeurons(active = true): void {
    const rids: string[] = this.neuronTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.unpin(rids);
  }

  /**
   * UnPin all synapses
   * @param active if true, only unpin active synapses in the tabulator
   */
  unpinAllSynapses(active = true): void {
    const rids: string[] = this.synapseTabulator
      .getData(active ? 'active' : '')
      .map((r: any) => r.rid);
    this.neu3d.neu3d.unpin(rids);
  }

  /**
   * Parse data from neu3d widget
   * @param neu3d
   */
  parseData(neu3d: Neu3DWidget): {
    neurons: Array<any>;
    synapses: Array<any>;
    meshes: Array<any>;
  } {
    const neurons: Array<any> = [];
    const synapses: Array<any> = [];
    const meshes: Array<any> = [];
    for (const row of Object.entries(neu3d.model.data)) {
      const rid = row[0];
      const mesh = row[1] as IMeshDictItem;
      const { label, visibility, pinned, background, uname, N } = mesh;
      if (background) {
        meshes.push({
          rid: rid,
          orid: mesh.orid ?? rid,
          class: mesh.class ?? 'Neuropil',
          uname: uname,
          label: label ?? rid,
          visibility: visibility,
          background: background ?? true,
          N: N ?? 0
        });
      } else {
        if (mesh.class === 'Synapse') {
          synapses.push({
            rid: rid,
            orid: mesh.orid ?? rid,
            class: mesh.class ?? 'Synapse',
            uname: uname,
            label: label ?? rid,
            N: N ?? 0,
            presynaptic: uname.split('--')[0],
            postsynaptic: uname.split('--')[1],
            visibility: visibility,
            pinned: pinned,
            background: background ?? false
          });
        } else {
          neurons.push({
            rid: rid,
            orid: mesh.orid ?? rid,
            class: mesh.class ?? 'Neuron',
            uname: uname,
            label: label ?? rid,
            visibility: visibility,
            pinned: pinned,
            background: background ?? false,
            N: N ?? 0
          });
        }
      }
    }
    return { neurons: neurons, synapses: synapses, meshes: meshes };
  }

  /**
   * Schema for all columns.
   */
  readonly neuronColumns: ColumnDefinition[] = [
    {
      title: 'Name',
      field: 'label',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'The unique name of each neuron',
      sorter: 'alphanum',
      tooltip: true,
      minWidth: 80,
      headerFilter: true as Editor,
      headerFilterPlaceholder: 'filter name',
      headerFilterFunc: combinedFilter,
      frozen: true
    },
    {
      title: 'Class',
      field: 'class',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'The type of morphology. Either Neuron or NeuronFragment',
      tooltip: true,
      sorter: 'alphanum',
      headerFilter: true as Editor,
      width: 55,
      headerFilterPlaceholder: 'filter class'
    },
    {
      title: 'Vis',
      field: 'visibility',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Visibility',
      headerFilter: undefined,
      headerSort: true,
      sorter: 'boolean',
      width: 32,
      formatter: 'tickCross',
      cellClick: (e: any, cell: any) => {
        const { rid } = cell.getData();
        this.neu3d.neu3d.toggleVis(rid);
      }
    },
    {
      title: 'Pin',
      field: 'pinned',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Pin',
      headerFilter: undefined,
      headerSort: true,
      sorter: 'boolean',
      width: 32,
      formatter: 'tickCross',
      cellClick: (e: any, cell: any) => {
        const { rid } = cell.getData();
        this.neu3d.neu3d.togglePin(rid);
      }
    },
    {
      title: 'Remove',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Remove from workspace',
      headerFilter: undefined,
      headerSort: false,
      width: 32,
      formatter: (cell: any, formatterParams: any) => {
        return "<i class='fa fa-trash' > </i>";
      },
      cellClick: (e: any, cell: any) => {
        this.neu3d.removeByRid(cell.getData().orid);
      }
    },
    {
      title: 'Info',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Get more detailed info of the neuron',
      headerFilter: undefined,
      headerSort: false,
      width: 32,
      formatter: (cell: any, formatterParams: any) => {
        return "<i class='fa fa-info-circle' > </i>";
      },
      cellClick: (e: any, cell: any) => {
        this.neu3d.executeInfoQuery(cell.getData().rid).done.then(() => {
          this.labShell.activateById(this.neu3d.info.id);
        });
      }
    }
  ];

  /**
   * Schema for all columns.
   */
  readonly synapseColumns: ColumnDefinition[] = [
    {
      title: 'Presynaptic',
      field: 'presynaptic',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'The unique name of the presynaptic item.',
      tooltip: true,
      sorter: 'alphanum',
      minWidth: 80,
      headerFilter: true as Editor,
      headerFilterPlaceholder: 'filter name',
      headerFilterFunc: combinedFilter
      //frozen: true
    },
    {
      title: 'Postsynaptic',
      field: 'postsynaptic',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'The unique name of the postsynaptic item.',
      tooltip: true,
      minWidth: 80,
      sorter: 'alphanum',
      headerFilter: true as Editor,
      headerFilterPlaceholder: 'filter name',
      headerFilterFunc: combinedFilter
      //frozen: true
    },
    {
      title: 'Number',
      field: 'N',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip:
        'The number of synapses between presynaptic and postsynaptic item.',
      tooltip: true,
      sorter: 'number',
      width: 60,
      headerFilter: true as Editor,
      headerFilterPlaceholder: '>= N',
      headerFilterFunc: numberFilter
      //frozen: true
    },
    {
      title: 'Vis',
      field: 'visibility',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Visibility',
      headerFilter: undefined,
      headerSort: true,
      width: 32,
      formatter: 'tickCross',
      cellClick: (e: any, cell: any) => {
        const { rid } = cell.getData();
        this.neu3d.neu3d.toggleVis(rid);
      }
    },
    {
      title: 'Pin',
      field: 'pinned',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Pin',
      headerFilter: undefined,
      headerSort: true,
      width: 32,
      formatter: 'tickCross',
      cellClick: (e: any, cell: any) => {
        const { rid } = cell.getData();
        this.neu3d.neu3d.togglePin(rid);
      }
    },
    {
      title: 'Remove',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Remove from workspace',
      headerFilter: undefined,
      headerSort: false,
      width: 32,
      formatter: (cell: any, formatterParams: any) => {
        return "<i class='fa fa-trash' > </i>";
      },
      cellClick: (e: any, cell: any) => {
        this.neu3d.removeByRid(cell.getData().orid);
      }
    },
    {
      title: 'Info',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Get detailed info about the item',
      headerFilter: undefined,
      headerSort: false,
      width: 32,
      formatter: (cell: any, formatterParams: any) => {
        return "<i class='fa fa-info-circle' > </i>";
      },
      cellClick: (e: any, cell: any) => {
        this.neu3d.executeInfoQuery(cell.getData().rid).done.then(() => {
          this.labShell.activateById(this.neu3d.info.id);
        });
      }
    }
  ];

  /**
   * Schema for all columns.
   */
  readonly neuropilColumns: ColumnDefinition[] = [
    {
      title: 'Name',
      field: 'label',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'The name of the region',
      tooltip: true,
      sorter: 'alphanum',
      headerFilter: true as Editor,
      headerFilterPlaceholder: 'filter name',
      headerFilterFunc: combinedFilter
    },
    {
      title: 'Class',
      field: 'class',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'The type of region, Neuropil, Subregion or Subsystem',
      tooltip: true,
      sorter: 'alphanum',
      headerFilter: true as Editor,
      width: 55,
      headerFilterPlaceholder: 'filter class'
    },
    {
      title: 'Remove',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Remove from workspace',
      headerFilter: undefined,
      headerSort: false,
      width: 32,
      formatter: (cell: any, formatterParams: any) => {
        return "<i class='fa fa-trash' > </i>";
      },
      cellClick: (e: any, cell: any) => {
        this.neu3d.removeByRid(cell.getData().orid);
      }
    },
    {
      title: 'Vis',
      field: 'visibility',
      hozAlign: 'center' as ColumnDefinitionAlign,
      headerTooltip: 'Visibility',
      headerFilter: undefined,
      headerSort: true,
      width: 32,
      formatter: 'tickCross',
      cellClick: (e: any, cell: any) => {
        const { rid } = cell.getData();
        this.neu3d.neu3d.toggleVis(rid);
      }
    }
  ];

  neuronTabulator: any;
  synapseTabulator: any;
  meshTabulator: any;
  readonly neu3d: Neu3DWidget;
  readonly panel: FBLPanel;
  neurons: Array<any>;
  synapses: Array<any>;
  meshes: Array<any>;
  readonly labShell: ILabShell;
  readonly delayedRedrawNeuron: any;
  readonly delayedRedrawSynapse: any;
  readonly delayedRedrawMesh: any;
}
