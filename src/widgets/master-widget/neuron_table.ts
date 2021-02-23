// Neuron Table that renders the metadata of a given neuron
// in a table format
import * as _ from 'lodash';
import '@fortawesome/fontawesome-free/js/all.js';
import Tabulator from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css'; //import Tabulator stylesheet
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
    meshContainer: string;
    neu3dPanel: FBLPanel;
    labShell: ILabShell;
  }) {
    this.neu3d = props.neu3dPanel.content as Neu3DWidget;
    this.panel = props.neu3dPanel;
    const { neurons, meshes } = this.parseData(this.neu3d);
    this.labShell = props.labShell;
    this.neurons = neurons;
    this.meshes = meshes;
    this.neuronTabulator = new Tabulator(`#${props.neuronContainer}`, {
      reactiveData: true, //enable reactive data
      data: this.neurons, //link data to table
      columns: this.neuronColumns, //define table columns
      tooltips: true,
      pagination: 'local',
      paginationSize: 15,
      initialSort: [{ column: 'label', dir: 'desc' }],
      layout: 'fitColumns',
      cellMouseOver: (e: any, cell: any) => {
        const { rid } = cell.getData();
        if (this.neu3d?.isInWorkspace(rid)) {
          this.neu3d.neu3d.highlight(rid, true);
        }
      },
      rowMouseOut: (e: any, row: any) => {
        // reset highlight
        this.neu3d.neu3d.highlight();
      },
      cellClick: (e: any, cell: any) => {
        this.labShell.activateById(this.panel.id);
      }
    });

    this.meshTabulator = new Tabulator(`#${props.meshContainer}`, {
      reactiveData: true, //enable reactive data
      data: this.meshes, //link data to table
      columns: this.neuropilColumns, //define table columns
      tooltips: true,
      pagination: 'local',
      paginationSize: 15,
      initialSort: [{ column: 'label', dir: 'desc' }],
      layout: 'fitColumns',
      cellMouseOver: (e: any, cell: any) => {
        const { rid } = cell.getData();
        if (this.neu3d?.isInWorkspace(rid)) {
          this.neu3d.neu3d.highlight(rid, true);
        }
      },
      rowMouseOut: (e: any, row: any) => {
        // reset highlight
        this.neu3d.neu3d.highlight();
      },
      cellClick: (e: any, cell: any) => {
        this.labShell.activateById(this.panel.id);
      }
    });

    // debounce redraw commands
    this.delayedRedrawNeuron = _.debounce(() => {
      this.neuronTabulator.redraw();
      this.neuronTabulator.setPage(this.neuronTabulator.getPage());
      this.neuronTabulator.restoreRedraw();
    }, 1000);

    // debounce redraw commands
    this.delayedRedrawMesh = _.debounce(() => {
      this.meshTabulator.redraw();
      this.meshTabulator.setPage(this.meshTabulator.getPage());
      this.meshTabulator.restoreRedraw();
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
      const neuropilIdx = this.meshes.findIndex(row => row.rid === rid);
      let background = false;
      switch (event) {
        case 'add':
          background = source[rid]?.background || source.background;
          if (neuronIdx === -1 && neuropilIdx === -1) {
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
          break;
        case 'remove':
          if (neuronIdx > -1) {
            this.neurons.splice(neuronIdx, 1);
            this.neuronTabulator.blockRedraw();
            this.delayedRedrawNeuron();
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
              if (neuropilIdx > -1) {
                this.meshes[neuropilIdx].visibility = newValue;
              }
              break;
            case 'pinned':
              if (neuronIdx > -1) {
                this.neurons[neuronIdx].pinned = newValue;
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
   * Remove all unpinned neurons & synapses
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
   * Hide all meshes
   * @param active if true, only hide active neurons in the tabulator
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
   * Show all meshes
   * @param active if true, only show active neurons in the tabulator
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
   * Parse data from neu3d widget
   * @param neu3d
   */
  parseData(neu3d: Neu3DWidget): { neurons: Array<any>; meshes: Array<any> } {
    const neurons: Array<any> = [];
    const meshes: Array<any> = [];
    for (const row of Object.entries(neu3d.model.data)) {
      const rid = row[0];
      const mesh = row[1] as IMeshDictItem;
      const { label, visibility, pinned, background, uname } = mesh;
      if (background) {
        meshes.push({
          rid: rid,
          orid: mesh.orid ?? rid,
          class: mesh.class ?? 'Neuropil',
          uname: uname,
          label: label ?? rid,
          visibility: visibility,
          background: background ?? true
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
          background: background ?? false
        });
      }
    }
    return { neurons: neurons, meshes: meshes };
  }

  /**
   * Schema for all columns.
   */
  readonly neuronColumns = [
    {
      title: 'Name',
      field: 'label',
      hozAlign: 'center',
      sorter: 'alphanum',
      headerFilter: true,
      headerFilterPlaceholder: 'filter name'
    },
    {
      title: 'Class',
      field: 'class',
      hozAlign: 'center',
      sorter: 'alphanum',
      headerFilter: true,
      width: 55,
      headerFilterPlaceholder: 'filter class'
    },
    {
      title: 'Vis',
      field: 'visibility',
      hozAlign: 'center',
      headerFilter: false,
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
      hozAlign: 'center',
      headerFilter: false,
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
      hozAlign: 'center',
      headerFilter: false,
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
      hozAlign: 'center',
      headerFilter: false,
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
  readonly neuropilColumns = [
    {
      title: 'Name',
      field: 'label',
      hozAlign: 'center',
      sorter: 'alphanum',
      headerFilter: true,
      headerFilterPlaceholder: 'filter name'
    },
    {
      title: 'Class',
      field: 'class',
      hozAlign: 'center',
      sorter: 'alphanum',
      headerFilter: true,
      width: 65,
      headerFilterPlaceholder: 'filter class'
    },
    {
      title: 'Remove',
      hozAlign: 'center',
      headerFilter: false,
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
      hozAlign: 'center',
      headerFilter: false,
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
  meshTabulator: any;
  readonly neu3d: Neu3DWidget;
  readonly panel: FBLPanel;
  neurons: Array<any>;
  meshes: Array<any>;
  readonly labShell: ILabShell;
  readonly delayedRedrawNeuron: any;
  readonly delayedRedrawMesh: any;
}
