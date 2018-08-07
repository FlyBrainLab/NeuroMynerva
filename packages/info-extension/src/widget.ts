import { Widget, PanelLayout, Panel } from '@phosphor/widgets';
import { Signal, ISignal } from '@phosphor/signaling';
import { UUID } from '@phosphor/coreutils';
import { Message } from '@phosphor/messaging';
import { PromiseDelegate, JSONObject } from '@phosphor/coreutils';
import { IFFBOChildWidget, IFFBOLabWidget } from 'master-extension/lib';

import { ConnSVG } from './conn_svg';
import { SummaryTable } from './summary_table';
import { ConnTable } from './conn_table';

import '../style/index.css';
import '../style/ffbo.InfoPanel.css';

const VERBOSE = false;

const DEFAULT_CLASS = "jp-FFBOLabInfo";
const SUMMARY_TABLE_ID = "info-panel-summary-table";
const CONN_SVG_ID = "info-panel-conn";
const CONN_TABLE_ID = "info-panel-conn-table";

/**
 * An interface for NeuroInfo sub widgets
 */
export interface INeuroInfoSubWidget {
  /** DOM element for HTML */
  readonly container: HTMLElement;
  
  /** Update data event for widgets */
  updateData(data:any): void;

  /** Update data event for widgets */
  reset(): void;

}


/**
 * A NeuroInfo Widget
 * 
 * ## Note
 * NeuroInfo Widget is used to display detailed information
 * about neurons and connectivities obtained from NeuroArch *
 */
export class NeuroInfoWidget extends Widget implements IFFBOChildWidget {
  /**
   * Construct a new FFBO widget.
   */
  constructor() {
    super();
    let HTMLtemplate = Private.createTemplate_IP();
    this.node.innerHTML = HTMLtemplate;
    
    this.node.tabIndex = -1;    
    this.addClass(DEFAULT_CLASS);
    
    this.id = 'FFBOLab-Info-'+UUID.uuid4();
    
    let localPath = "";
    this.title.label = '[Info] ' + localPath;
    this.title.closable = true;
    
    this.title.dataset = {
      type: 'ffbo-title',
      ...this.title.dataset
    };
    
    // current info panel object name
    this.name = undefined;

    // instantiate sub panels
    let layout = this.layout = new PanelLayout();
    this.connSVG = new ConnSVG();
    this.summaryTable = new SummaryTable();
    this.connTable = new ConnTable();
    layout.addWidget(this.summaryTable);
    layout.addWidget(this.connSVG);
    layout.addWidget(this.connTable);
    
    this._initialize(); 
  }

  /**
   * A signal that emits user action in info panel to listener
   */
  get outSignal(): ISignal<this, object>{
    return this._userAction;
  }

  /**
   * Initialize Routine <DUMMY>
   */
  private _initialize() : void {
    this._ready.resolve(void 0);
  }

  /**
   * Dispose
   */
  dispose(): void {
    if (this._isDisposed == true) {
      return;
    }

    super.dispose();
    this._isDisposed = true;
    window.JLabApp.commands.notifyCommandChanged('NeuroMynerva:info-open');
    if (this._isDisposed) {
      if (VERBOSE) {console.log('[NM Info] disposed');}
    }
  }

  /**
   * Responde to `activate` calls on instance
   * @param msg 
   */
  onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    // this.node.focus();
  }

  /**
   * Connect to signal
   */
  connect(inSignal: ISignal<IFFBOLabWidget, object>): void {
    if (VERBOSE) { console.log('[NM INFO] Connected');}
    inSignal.connect(this._handleParentActions, this);
    this._isConnected = true;
  }

  /**
   * Handle input from master through signal
   * 
   * @param sender 
   * @param value 
   */
  private _handleParentActions(sender: IFFBOLabWidget, value:JSONObject): void{
    if(value.type == "INFO")
    {
      if(value.data == "save")
      {
        // FIXME: what is this for?
        // var SingleNeuronStr = this.INFOList.jsoneditor.getText();
        // this._userAction.emit({action:'execute', content: { code: '_FFBOLABClient.updateBackend(type = "SingleNeuron",data = """' + SingleNeuronStr + '""")' }});
        if (VERBOSE) { console.log("SAVESAVESAVE?",value);}
      }
      else
      {
        this.onMasterMessage(value.data);
      }
    }
    else if(value.type == "session") {
      let localPath = (<string>value.data).split(".ipynb")[0]
      this.title.label = '[Info] ' + localPath;
    }
    else if(value.type == "Dispose") {
      if (VERBOSE) { console.log("{INFO received dispose}");}
      this.dispose();
    }
  }

  /**
   * Handle message from master widget
   * @param msg 
   */
  onMasterMessage(msg:any):void{
    // this.oldData = msg.data as JSONObject;
    this.activate();
    this.updateData(msg.data as JSONObject);
  }

  /**
   * Dispose resources when widget panel is closed
   * @param msg 
   */
  onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }


  /**
  * Respond to FFBOLabModel Changed <DUMMY>
  */
  onModelChanged(): void {
    return; 
  }

  /**
   * A promise that resolves when the FFBOLab widget is ready
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }
  
  /**
   * Update data of info panel
   * @param obj data returned from neuroArch
   */
  updateData(obj: JSONObject): void {
    let _data = obj.data as JSONObject;
    let data = _data.data  as JSONObject;
    
    let new_name = ('uname' in <JSONObject>data['summary']) ? (<JSONObject>data['summary'])['uname'] : (<JSONObject>data['summary'])['name'];
    new_name = <string>new_name;
    if (this.name === new_name) {
      /** do not update if the object already exists, just show */
      this.show();
      return;
    }
    else {
      this.name = new_name;
      if ('connectivity' in data) { // synapse data does not have connectivity
        this.connSVG.updateData(<JSONObject>data['connectivity']);
        this.connTable.updateData(<JSONObject>data['connectivity']);
        this.summaryTable.updateData(<JSONObject>data['summary']);
        this.show(); //show all
      }
      else {
        this.connSVG.hide();
        this.connTable.hide();
        this.summaryTable.updateData(<JSONObject>data['summary']);
        this.summaryTable.show();
      }
    }

    // FIXME: return old data format

    let summaryData = <JSONObject>data['summary'];
    let connData = <JSONObject>data['connectivity'];

    this.connSVG.updateData(connData);
    this.summaryTable.updateData(summaryData);
    this.connTable.updateData(connData);

    // FIXME: error checking _data
    // delete (<JSONObject>_data.data)['summary'];
    // delete (<any>_data.data)['connectivity']['pre']['summary'];
    // delete (<any>_data.data)['connectivity']['post']['summary'];


    // let key = "";
    // let temp: JSONObject = {};
    // for(key in (<any>_data.data)['connectivity']['pre']['details'].reverse() as JSONObject)
    // {
    //   temp[(<any>_data.data)['connectivity']['pre']['details'][key]['name']] = (<any>_data.data)['connectivity']['pre']['details'][key]['number'];

    // }
    // (<any>_data.data)['connectivity']['pre'] = temp;
    // temp = {};
    // for(key in (<any>_data.data)['connectivity']['post']['details'].reverse() as JSONObject)
    // {
    //   temp[(<any>_data.data)['connectivity']['post']['details'][key]['name']] = (<any>_data.data)['connectivity']['post']['details'][key]['number'];

    // }
    // (<any>_data.data)['connectivity']['post'] = temp;
  }
  
  /**
   * Handle update requests for the widget.
   */
  onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
  }



  /** FIXME:
   * Check if an object is in the workspace.
   *
   * @param {string} rid -  rid of target object (neuron/synapse)
   * @returns {bool} if object in workspace
  */
  isInWorkspace(rid: string): boolean {

    return false;
  }
  /** FIXME:
   * Add an object into the workspace.
   *
   * @param {string} uname -  uname of target object (neuron/synapse)
   */
  addByUname(uname: string): any {
    return;
  }
  /** FIXME:
   * Remove an object into the workspace.
   *
   * @param {string} uname -  uname of target object (neuron/synapse)
   */
  removeByUname(uname: string): any {
    return;
  }
  /** FIXME:
   * Get attribute of an object in the workspace.
   *
   * @param {string} rid -  rid of target object
   * @returns {value} return Value as expected by the attribute
   */
  getAttr(rid: string, attr: any): any {
    return undefined;
  }

  /**
   * The Elements associated with the widget.
   */
  private name: string;
  private _ready = new PromiseDelegate<void>();
  private _isDisposed = false;
  private _isConnected = false;
  private _userAction = new Signal<this, object>(this);
  
  readonly connSVG: ConnSVG;
  readonly summaryTable: SummaryTable;
  readonly connTable: ConnTable;
};


namespace Private{
  /**
   * Create HTML template
   *
   * @param {object} obj - synonymous to `this`, refers to instance of ConnTable
   */
  export function createTemplate_IP() {
    var template = "";
    template += '<div id="' + SUMMARY_TABLE_ID + '"></div>';  // summary
    template += '<div id="' + CONN_SVG_ID + '"></div>';  // SVG
    template += '<div id="' + CONN_TABLE_ID + '"></div>';
    template += '<div class="slider-bar ui-draggable ui-draggable-handle" draggable="true" id="info_panel_dragger"></div>';
    return template;
  }
}