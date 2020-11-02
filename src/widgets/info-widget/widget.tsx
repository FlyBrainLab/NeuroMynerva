import * as React from 'react';
import { Signal } from '@lumino/signaling';
import {
  refreshIcon, caretRightIcon, caretDownIcon
} from '@jupyterlab/ui-components';
import { 
  ReactWidget, 
  UseSignal,
  ToolbarButtonComponent
 } from'@jupyterlab/apputils';

import {
  SummaryTable, MorphometryTable, AdditionalInfoTable
} from './summary_table';
import { ConnTable } from './conn_table';
import { ConnSVG } from './conn_svg';
import '../../../style/widgets/info-widget/info.css';
import { SessionDialogComponent } from '../template-widget';
import { Neu3DWidget } from '../neu3d-widget';


/**
 * The class of the extension
 */
const INFO_CLASS_JLab = 'jp-FBL-Info';

/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-FBL-Info-section';

/**
 * The class name added to the Section Header
 */
const SECTION_HEADER_CLASS = 'jp-FBL-Info-sectionHeader';

/**
 * The class name for the button for each section
 */
const SECTION_BTN_HEADER_CLASS = 'jp-FBL-Info-sectionHeader jp-FBL-Info-section-BtnHeader';

/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-FBL-Info-sectionContainer';


/**
 * The class name added to a conn table
 */
const CONNTABLE_CLASS = 'jp-FBL-Info-Conn-Table';

/**
 * An interface for data that is sent to info widget
 */
interface IInfoData {
  connectivity?: {
    pre?: {
      details?: Array<any>;
      summary?: {
        profile?: object | any;
        number?: number | any;
      }
    },
    post?: {
      details?: Array<any>;
      summary?: {
        profile?: object | any;
        number?: number | any;
      }
    }
  },
  summary? :{
    vfb_id?: string;
    data_source?: string;
    transmitters?: string;
    name?: string;
    locality?: boolean;
    arborization_data?: object|any;
    flycircuit_data?: object|any;
    uname?: string;
    class?: string;
    rid?: string;
    totalLength?: string;
    totalSurfaceArea?: string;
    totalVolume?: string;
    maximumEuclideanDistance?: string;
    width?: string;
    height?: string;
    depth?: string;
    numberOfBifurcations?: string;
    maxPathDistance?: string;
    averageDiameter?: string;
  }
}

/**
 * Empty data to be used in case there is no data coming in
 */
const empty_data: IInfoData = {
  connectivity: {
    pre: {details: [], summary: {profile: {}, number: -1}},
    post: {details: [], summary: {profile: {}, number: -1}}
  }, 
  summary: {}
};

/**
 * An Info Widget
 * 
 * This Widget is a singleton in the entire FBL Workspace.
 * 
 * Note: when the InfoWidget is instantiated (or updated),
 * the instance of Neu3DWidget whose data it's rendering is also
 * passed as an argument and cached. This allows for calls to add/remove neurons
 * to the Neu3DWidget 
 */
export class InfoWidget extends ReactWidget {
  constructor(props?: {
    data: IInfoData, 
    inWorkspace: (uname: string) => boolean,
    neu3d: Neu3DWidget
  }) {
    super();
    if (props?.data) {
      this.data = props.data;
    } else{
      this.data = empty_data;
    }
  
    // default to true
    if (props?.inWorkspace){
      this.inWorkspace = props.inWorkspace;
    }else{
      this.inWorkspace = (uname: string)=>false;
    }
    this.neu3d = props?.neu3d;
    this.addClass(INFO_CLASS_JLab);
  }

  onAfterAttach(msg: any){
    super.onAfterAttach(msg);
    let preDiv = document.getElementById("info-connTable-pre");
    let postDiv = document.getElementById("info-connTable-post");

    if (preDiv){
      this.tabConnPre = new ConnTable({
        container: preDiv,
        data: this.data.connectivity.pre.details,
        neu3d: this.neu3d
      });
    }

    if (postDiv) {
      this.tabConnPost = new ConnTable({
        container: postDiv,
        data: this.data.connectivity.post.details,
        neu3d: this.neu3d
      })
    }

    this.dataChanged.connect((sender, {data, inWorkspace, neu3d})=> 
    {
      this.neu3d?.workspaceChanged.disconnect(this.onWorkspaceChanged, this);
      neu3d?.workspaceChanged.connect(this.onWorkspaceChanged, this);

      this.data = data;
      this.neu3d = neu3d;
      this.inWorkspace = inWorkspace;
      let preData = this._preData = this.parseConnData(data.connectivity?.pre || empty_data.connectivity.pre.details, neu3d);
      let postData = this._postData = this.parseConnData(data.connectivity?.post || empty_data.connectivity.post.details, neu3d);
      this.tabConnPre.neu3d = neu3d;
      this.tabConnPost.neu3d = neu3d;
      this.tabConnPre.data = preData;
      this.tabConnPost.data = postData;
      this.tabConnPre.tabulator.setData(preData);
      this.tabConnPost.tabulator.setData(postData);
      if (this.tabConnPre.hasSynMorph(preData)){
        this.tabConnPre.addSynColumn();
      } else {
        this.tabConnPre.removeSynColumn();
      }

      if (this.tabConnPost.hasSynMorph(postData)){
        this.tabConnPost.addSynColumn();
      } else {
        this.tabConnPost.removeSynColumn();
      }
    }, this);

    /**
     * Sync up the display every second
     */
    setInterval(() => {
      if (this._workspaceChanged) {
        this.tabConnPre.tabulator.setData(this._preData);
        this.tabConnPost.tabulator.setData(this._postData);
        if (this.tabConnPre.hasSynMorph(this._preData)){
          this.tabConnPre.addSynColumn();
        } else {
          this.tabConnPre.removeSynColumn();
        }

        if (this.tabConnPost.hasSynMorph(this._postData)){
          this.tabConnPost.addSynColumn();
        } else {
          this.tabConnPost.removeSynColumn();
        }
        this.tabConnPost?.tabulator?.redraw();
        this.tabConnPre?.tabulator?.redraw();
        this._workspaceChanged = false;
      }
    }, 1000);
  }

  /**
   * Whenver workspace changed in neu3d, we set workspacechanged flat to be true.
   * The changes are gonig to be reflecfed in info widget when the info widget is clicked on.
   * 
   * @param sender 
   * @param args 
   */
  onWorkspaceChanged(sender: Neu3DWidget, args: any) {
    if (sender === this.neu3d) {
      this.inWorkspace = sender.isInWorkspace;
      this._workspaceChanged = true;
    }
  }

  /**
   * Update inWorkspace function
   * used by neu3d to change the display status of the neurons
   * the neu3d argument is used to check if the caller neu3d is the one currently being rendered
   * @param inWorkspace 
   * @param neu3d 
   */
  updateInWorkspace(inWorkspace: (rid: string) => boolean, neu3d: Neu3DWidget): void {
    if (neu3d !== this.neu3d) {
      return;
    }
    this.inWorkspace = inWorkspace;
    // redraw

    this.reset();
  }

  /**
   * Parse Connectivity Data
   * @param connData connectivity data
   */
  parseConnData(connData: any, neu3d: Neu3DWidget) {
    let new_data = [];
    for (let item of connData["details"]) {
      let neuron_data = {
        name: item.name ?? item.name ?? item.rid,
        uname: item.uname ?? item.name ?? item.rid,
        syn_uname: item.syn_uname,
        number: parseInt(item.number),
        rid: item.rid,
        syn_rid: item.syn_rid,
        n_rid: item.n_rid,
        s_rid: item.s_rid,
        has_syn_morph: item.has_syn_morph  == 1,
        has_morph: item.has_morph == 1
      };

      new_data.push(neuron_data);
    }
    return new_data;
  }


  /** Reset Info to empty and re-render the table */
  reset(clear = false) {
    this.tabConnPost?.tabulator?.redraw();
    this.tabConnPre?.tabulator?.redraw();
    this.dataChanged.emit({
      data: clear ? empty_data : this.data,
      inWorkspace: this.inWorkspace,
      neu3d: this.neu3d
    })
  }

  /** Render the  ReactJS components */
  protected render() {
    return (
      <div className={SECTION_CLASS}>
        <div className={SECTION_BTN_HEADER_CLASS}>
        <ToolbarButtonComponent
          tooltip="Reset Info Panel"
          icon={refreshIcon}
          onClick={this.reset.bind(this)}
          />
        <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.neu3d) {
              return <SessionDialogComponent widget={val.neu3d}></SessionDialogComponent>
            } else {
              return <></>
            }
          }}
        </UseSignal>
      </div>
      <Components.CollapsibleSection title={'Summary'} children={
          <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.data?.summary){
              return <SummaryTable data={val.data.summary} neu3d={val.neu3d} />  
            } else{
              return <SummaryTable data={empty_data.summary} neu3d={val.neu3d} />
            }}
          }
        </UseSignal>
      }></Components.CollapsibleSection>
      <Components.CollapsibleSection title={'Additional Info'} children={
          <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.data?.summary){
              return <AdditionalInfoTable data={val.data.summary} neu3d={val.neu3d} />  
            } else{
              return <AdditionalInfoTable data={empty_data.summary} neu3d={val.neu3d} />
            }}
          }
        </UseSignal>
      }></Components.CollapsibleSection>
      <Components.CollapsibleSection title={'Morphometry'} children={
          <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.data?.summary){
              return <MorphometryTable data={val.data.summary} neu3d={val.neu3d} />  
            } else{
              return <MorphometryTable data={empty_data.summary} neu3d={val.neu3d} />
            }}
          }
        </UseSignal>
      }></Components.CollapsibleSection>
      <Components.CollapsibleSection title={'Connectivity Profile'} children={
        <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.data?.connectivity) {
              return <ConnSVG
                pre={val.data.connectivity.pre.summary}
                post={val.data.connectivity.post.summary}
              />
            } else {
              return <ConnSVG
                pre={empty_data.connectivity.pre.summary}
                post={empty_data.connectivity.post.summary}
              />
            }
          }}
        </UseSignal>
      }></Components.CollapsibleSection>
      <Components.CollapsibleSection title={'Presynaptic Partners'} children={
        <div className={CONNTABLE_CLASS} id="info-connTable-pre"/>
      }></Components.CollapsibleSection>
      <Components.CollapsibleSection title={'Postsynaptic Partners'} children={
        <div className={CONNTABLE_CLASS} id="info-connTable-post"/>
      }></Components.CollapsibleSection>
    </div>
    );
  }

  // dataConnPre: any;
  // dataConnPost: any;
  tabConnPre: ConnTable;
  tabConnPost: ConnTable;
  private _workspaceChanged = false;
  data: IInfoData; // data to be displayed
  neu3d: Neu3DWidget;  // caller neu3d widget
  private _preData: any;
  private _postData: any;
  dataChanged = new Signal<this, {
    data: any; inWorkspace: (rid: string)=>boolean; neu3d: Neu3DWidget, type?: 'neu3d' | 'data' | 'workspace'
  }>(this);
  inWorkspace: (rid: string)=>boolean;
};


namespace Components {
  export class CollapsibleSection extends React.Component<{
    title: string,
    children: React.Component | any
  }, { visible: boolean }>{

    state: Readonly<{ visible: boolean }> = {
      visible: true
    }
  
    toggleVisibility() {
      this.setState({
        visible: !this.state.visible
      })
    }

    render(): React.ReactNode {
      return (
        <>
          <a onClick={() => this.toggleVisibility()}>
            <header className={SECTION_HEADER_CLASS}>
              <caretRightIcon.react display={(this.state.visible ? 'none':'inline')}></caretRightIcon.react>
              <caretDownIcon.react display={(this.state.visible ? 'inline':'none')}></caretDownIcon.react>
              <h2>{this.props.title}</h2>
            </header>
          </a>
          <div className={CONTAINER_CLASS + (this.state.visible? '': ' hidden')}>
            {this.props.children}
          </div>
        </>
      )
    }
  } 
}