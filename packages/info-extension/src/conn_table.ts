import * as $ from "jquery";
import "jquery-ui";
import "jquery.tabulator";

import { Signal, ISignal } from '@phosphor/signaling';
import { Widget } from '@phosphor/widgets';
import { Message } from '@phosphor/messaging';
import { INeuroInfoSubWidget, NeuroInfoWidget } from "./widget";

const TABULATOR_ID = "tabulator";

/**
* A Tabulator based connectivity table widget
*/
export class ConnTable extends Widget implements INeuroInfoSubWidget{
  
  constructor(parent: NeuroInfoWidget) {
    super();

    this.parentObj = parent;

    let tableDiv = document.createElement('div');
    tableDiv.id = TABULATOR_ID;
    this.node.appendChild(tableDiv);

    this.container = this.node.parentElement;
    this._createTabulator(TABULATOR_ID);
  }
  
  /**
   * on update request, check if div created successfully
   * @param msg 
   */
  onUpdateRequest(msg:Message){
    let element = document.getElementById(TABULATOR_ID);
    if (element){
      if (element.childElementCount > 0) {
        // do nothing
      }else{
        this._createTabulator(TABULATOR_ID);
      }
    }
    super.onUpdateRequest(msg);
  }

  redraw(): void {
    let div = document.getElementById(TABULATOR_ID);
    if (!div.innerHTML){
      return;
    }
    $("#" + TABULATOR_ID).tabulator("redraw", true);
  }
  /**
   * Update Connectivity Data
   * @param connData 
   */
  updateData(connData:any):void {
    // update tabulator content
    let div, data;
    data = this._parseTabulatorData(connData);
    // if connectivity information not available, abort
    div = document.getElementById(TABULATOR_ID);
    if (!div.innerHTML){
      this._createTabulator(TABULATOR_ID, data);
      return;
    }
    $("#" + TABULATOR_ID).tabulator("setData", data);
    $("#" + TABULATOR_ID).tabulator("redraw", true);
  
  }

  /**
   * A signal that is emited when neuron is to be added/removed
   */
  get addRemoveSignal(): ISignal<this, object> {
    return this._addRemoveSignal;
  }

  /**
   * Create Tabulator 
   * @param {string} divId  HTMLDivElement container for tabulator
   * @param {any} [data] optional initial data
   */
  private _createTabulator(divId: string, data?: any): any {
    // check if div exists in dom
    let tabulatorDiv = document.getElementById(divId);
    if (!tabulatorDiv){
      console.error("[Info ConnTable] Parent Div does not exist yet.");
      return;
    }else{
      tabulatorDiv.innerHTML = "";
    }

    // check if any intial data exists
    if (!data) {
      data = [{}];
    }
    
    // create table
    $("#" + divId).tabulator({
      layout: "fitColumns",
      pagination: "local",
      paginationSize: 10,
      columns: [ //Define Table Columns
        {
          title: "In Workspace",
          field: "inworkspace",
          align: "center",
          // editor: "select",
          // editorParams: {
          //   "true": "True",
          //   "false": "False"
          // },
          headerFilter: true,
          headerFilterParams: {
            "true": "True",
            "false": "False"
          },
          formatter: (cell, formatterParams) => {
            if (this.parentObj.isInWorkspace(cell.getValue()[0]) == true) {
              return "<i class='fa fa-minus-circle' > </i>";
            } else {
              return "<i class='fa fa-plus-circle' > </i>";
            }
          },
          cellClick: (e,cell) => {
            console.log(e,cell);
            // var neuName = <string>cell.getData().name;
            if (!this.parentObj.isInWorkspace(cell.getValue()[0])) { // not in workspace
              this.parentObj._userAction.emit({ action: 'model-add', content: {rid: cell.getValue()[0], data: { name: cell.getValue()[1] }} });

              let code = [
                "res = {}",
                "res['verb'] = 'add'",
                "res['query']= [{'action': {'method': {'query': {'uname': '" + cell.getValue()[1] + "'}}},",
                                "'object': {'class': ['Neuron', 'Synapse']}}]",
                "result = _FFBOLABClient.executeNAquery(res)",
              ].join('\n');
            
              this.parentObj._userAction.emit({ action: 'execute', content: { code: code } });
              // this._addRemoveSignal.emit({ action: 'addByUname', content: { name: neuName }});
              // $("#" + TABULATOR_ID).tabulator("redraw", true);
              return;
            } else {  
              this.parentObj._userAction.emit({ action: 'model-remove', content: {rid: cell.getValue()[0]} });
              let code = [
                "res = {}",
                "res['verb'] = 'remove'",
                "res['query']= [{'action': {'method': {'query': {'uname': '" + cell.getValue()[1] + "'}}},",
                                "'object': {'class': ['Neuron', 'Synapse']}}]",
                "result = _FFBOLABClient.executeNAquery(res)",
              ].join('\n');

              this.parentObj._userAction.emit({ action: 'execute', content: { code: code } });
              // $("#" + TABULATOR_ID).tabulator("redraw", true);
              // this._addRemoveSignal.emit({ action: 'removeByUname', content: { name: neuName}});
              return;
            }
          },
        },
        { title: "Name", field: "name", align: "center", headerFilter: true, headerFilterPlaceholder: "filter name", 
        },
        {
          title: "Direction", field: "direction", align: "center", editor: "select", editorParams: { "pre": "Pre", "post": "Post" }, headerFilter: true, headerFilterParams: { "pre": "Pre", "post": "Post" }
        },
        { title: "Number", field: "number", dir: "desc", align: "center", headerFilter: "number", headerFilterPlaceholder: "at least...", headerFilterFunc: ">=" }        
      ]
    });

  }
  
  /**
   * Parse data for tabulator
   * 
   * Reformat data returned from neuroArch into Array of JSON format for tabulator rendering
   * @param data 
   */
  private _parseTabulatorData(data: any): any {
    let new_data = [];
    for (let dir of ['pre', 'post']) {
      for (let item of data[dir]['details']) {
        let neuron_data = {};
        neuron_data['name'] = item['name'];
        neuron_data['number'] = item['number'];
        neuron_data['direction'] = dir;
        neuron_data['inworkspace'] = [item.rid, item.name]; // this is undefined for now
        new_data.push(neuron_data);
      }
    }
    return new_data;
  }
  
  /*
  * Reset ConnTable Table
  */
  reset() {
    // purge div and add table
    let tabulatorDiv = document.getElementById(TABULATOR_ID);
    if (!tabulatorDiv) {
      let tableDiv = document.createElement('div');
      tableDiv.id = TABULATOR_ID;
      this.node.appendChild(tableDiv);
    }
    this._createTabulator(TABULATOR_ID);
  }

  /**
   * Elements associated with this object
   */
  private parentObj: any;
  readonly container : HTMLElement;
  private _addRemoveSignal = new Signal<this, object>(this);
}