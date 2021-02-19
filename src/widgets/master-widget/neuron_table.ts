// Neuron Table that renders the metadata of a given neuron
// in a table format
import * as _ from 'lodash';
import "@fortawesome/fontawesome-free/js/all.js";
import Tabulator from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css"; //import Tabulator stylesheet
import { Neu3DWidget } from '../neu3d-widget';
import { IDataChangeArgs, IMeshDictItem } from '../neu3d-widget/model';
import '../../../style/master-widget/master.css';
import { ILabShell } from '@jupyterlab/application';

/**
 * Renderes a single Neu3D panel as a list item with buttons and dropdown
 * @param props
 */
export class Neu3DModelTable {
  constructor(props: {
    neuronContainer: string,
    neuropilContainer: string,
    neu3d: Neu3DWidget,
    labShell: ILabShell
  }) {
    this.neu3d = props.neu3d;
    let { neurons, neuropils } = this.parseData(this.neu3d);
    this.labShell = props.labShell;
    this.neurons = neurons;
    this.neuropils = neuropils;
    this.neuronTabulator = new Tabulator(`#${props.neuronContainer}`, {
      reactiveData:true, //enable reactive data
      data: this.neurons, //link data to table
      columns: this.neuronColumns, //define table columns
      tooltips: true,
      pagination: "local",
      paginationSize: 15,
      initialSort: [{ column: "label", dir: "desc" }],
      layout: "fitColumns",
      cellMouseOver: (e: any, cell:any) => {
        const { rid } = cell.getData();
        if (this.neu3d?.isInWorkspace(rid)){
          this.neu3d.neu3d.highlight(rid, true);
        }
      },
      rowMouseOut: (e: any, row:any) =>{
        // reset highlight
        this.neu3d.neu3d.highlight()
      }
    });

    this.neuropilTabulator = new Tabulator(`#${props.neuropilContainer}`, {
      reactiveData:true, //enable reactive data
      data: this.neuropils, //link data to table
      columns: this.neuropilColumns, //define table columns
      tooltips: true,
      pagination: "local",
      paginationSize: 15,
      initialSort: [{ column: "label", dir: "desc" }],
      layout: "fitColumns",
      cellMouseOver: (e: any, cell:any) => {
        const { rid } = cell.getData();
        if (this.neu3d?.isInWorkspace(rid)){
          this.neu3d.neu3d.highlight(rid, true);
        }
      },
      rowMouseOut: (e: any, row:any) =>{
        // reset highlight
        this.neu3d.neu3d.highlight()
      }
    });

    // debounce redraw commands
    this.delayedRedrawNeuron = _.debounce(()=>{
      this.neuronTabulator.redraw();
      this.neuronTabulator.setPage(this.neuronTabulator.getPage());
      this.neuronTabulator.restoreRedraw();
    }, 1000);

    // debounce redraw commands
    this.delayedRedrawNeuropil = _.debounce(()=>{
      this.neuropilTabulator.redraw();
      this.neuropilTabulator.setPage(this.neuropilTabulator.getPage());
      this.neuropilTabulator.restoreRedraw();
    }, 1000);

    this.neu3d.model.dataChanged.connect((caller, change) => {
      const { event, newValue, key, rid, source } = change as IDataChangeArgs;
      if (!(['add', 'change', 'remove'].includes(event))) { return; }
      if (key === 'highlight') { return; }  // skip highlight
      let neuronIdx = this.neurons.findIndex(row=> row.rid === rid);
      let neuropilIdx = this.neuropils.findIndex(row=> row.rid === rid);

      switch (event) {
        case 'add':
          let background: boolean = source[rid]?.background || source.background;
          if ((neuronIdx === -1) && (neuropilIdx === -1)){
            if (background){
              this.neuropils.push({
                rid: rid,
                uname: source[rid].uname,
                label: source[rid].label ?? rid,
                visibility: source[rid].visibility ?? true,
                background: true
              });
              this.neuropilTabulator.blockRedraw();
              this.delayedRedrawNeuropil();
            } else{
              this.neurons.push({
                rid: rid,
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
          if (neuronIdx > -1){
            this.neurons.splice(neuronIdx, 1);
            this.neuronTabulator.blockRedraw();
            this.delayedRedrawNeuron();
          }
          if (neuropilIdx > -1){
            this.neuropils.splice(neuropilIdx, 1);
            this.neuropilTabulator.blockRedraw();
            this.delayedRedrawNeuropil();
          }
          break;
        case 'change':
          switch (key) {
            case 'visibility':
              if (neuronIdx > -1){
                this.neurons[neuronIdx].visibility = newValue;
              }
              if (neuropilIdx > -1){
                this.neuropils[neuropilIdx].visibility = newValue;
              }
              break;
            case 'pinned':
              if (neuronIdx > -1){
                this.neurons[neuronIdx].pinned = newValue;
              }
              break;
            default:
              return
          }
          break;
        default:
          break;
      }
    })
  }

  /**
   * Remove all neurons
   * @param active if true, only remove active neurons in the tabulator
   */
  removeAllNeurons(active?: boolean) {
    let unames: string[] = this.neuronTabulator.getData(active ? 'active': '').map((r: any) => r.uname);
    this.neu3d.removeByUname(unames);
  }

  /**
   * Remove all neuropils
   * @param active if true, only remove active neurons in the tabulator
   */
  removeAllNeuropils(active?: boolean) {
    let unames: string[] = this.neuropilTabulator.getData(active ? 'active': '').map((r: any) => r.uname);
    // this.neu3d.removeByUname(unames);
    this.neu3d.neu3d.remove(unames as any);
  }

  /**
   * Parse data from neu3d widget
   * @param neu3d
   */
  parseData(neu3d: Neu3DWidget): {'neurons': Array<any>, 'neuropils': Array<any>} {
    let neurons: Array<any> = [];
    let neuropils: Array<any> = [];
    for (let row of Object.entries(neu3d.model.data)) {
      const rid = row[0];
      const { label, visibility, pinned, background, uname } = row[1] as IMeshDictItem;
      if (background){
        neuropils.push({
          rid: rid,
          uname: uname,
          label: label ?? rid,
          visibility: visibility,
          background: background ?? true
        });
      }else{
        neurons.push({
          rid: rid,
          uname: uname,
          label: label ?? rid,
          visibility: visibility,
          pinned: pinned,
          background: background ?? false
        });
      }
    }
    return { 'neurons':neurons, 'neuropils':neuropils};
  }

  /**
   * Schema for all columns.
   */
  readonly neuronColumns = [
    {
      title: "Name",
      field: "label",
      hozAlign: "center",
      sorter:"alphanum",
      headerFilter: true,
      headerFilterPlaceholder: "filter name"
    },
    {
      title: "Vis",
      field: "visibility",
      hozAlign: "center",
      headerFilter: false,
      headerSort: true,
      width: 40,
      formatter: "tickCross",
      cellClick: (e: any, cell: any) => {
        let { rid } = cell.getData();
        this.neu3d.neu3d.toggleVis(rid);
      }
    },
    {
      title: "Pin",
      field: "pinned",
      hozAlign: "center",
      headerFilter: false,
      headerSort: true,
      width: 40,
      formatter: "tickCross",
      cellClick: (e: any, cell: any) => {
        let { rid } = cell.getData();
        this.neu3d.neu3d.togglePin(rid);
      }
    },
    {
      title: "Remove",
      hozAlign: "center",
      headerFilter: false,
      headerSort:false,
      width: 40,
      formatter: (cell: any, formatterParams: any) => {
        return "<i class='fa fa-trash' > </i>";
      },
      cellClick: (e: any, cell: any) => {
        this.neu3d.removeByUname(cell.getData().uname)
      }
    },
    {
      title: "Info",
      hozAlign: "center",
      headerFilter: false,
      headerSort:false,
      width: 40,
      formatter: (cell: any, formatterParams: any) => {
        return "<i class='fa fa-info-circle' > </i>";
      },
      cellClick: (e: any, cell: any) => {
        this.neu3d.client.executeInfoQuery(cell.getData().rid).then(()=>{
          this.labShell.activateById(this.neu3d.info.id);
        })
      }
    }
  ];

  /**
   * Schema for all columns.
   */
  readonly neuropilColumns = [
    {
      title: "Name",
      field: "label",
      hozAlign: "center",
      sorter:"alphanum",
      headerFilter: true,
      headerFilterPlaceholder: "filter name"
    },
    {
      title: "Vis",
      field: "visibility",
      hozAlign: "center",
      headerFilter: false,
      headerSort: true,
      width: 40,
      formatter: "tickCross",
      cellClick: (e: any, cell: any) => {
        let { rid } = cell.getData();
        this.neu3d.neu3d.toggleVis(rid);
      }
    }
  ];

  neuronTabulator: any;
  neuropilTabulator: any;
  neu3d: Neu3DWidget;
  neurons: Array<any>;
  neuropils: Array<any>;
  readonly labShell: ILabShell;
  readonly delayedRedrawNeuron: any;
  readonly delayedRedrawNeuropil: any;
}