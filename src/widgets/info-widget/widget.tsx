// FBL Master Widget Class
import * as React from 'react';
import { 
  Signal
} from '@lumino/signaling';

import { 
  ReactWidget, 
  UseSignal,
 } from'@jupyterlab/apputils';

import { SummaryTable } from './summary_table';
import { ConnTable } from './conn_table';
import { ConnSVG } from './conn_svg';
import '../../../style/widgets/info-widget/info.css';

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
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-FBL-Master-sectionContainer';

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
*/
export class InfoWidget extends ReactWidget {
  constructor(props?: {
    data: IInfoData, 
    inWorkspace: (uname: string) => boolean,
    neu3d: any
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
      let preData = this.parseConnData(data.connectivity?.pre || empty_data.connectivity.pre.details, neu3d);
      let postData = this.parseConnData(data.connectivity?.post || empty_data.connectivity.post.details, neu3d);
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

  }
  
  /**
   * Parse Connectivity Data
   * @param connData connectivity data
   */
  parseConnData(connData: any, neu3d: any) {
    let new_data = [];
    for (let item of connData["details"]) {
      let neuron_data = {
        name: item["name"] ?? item['name'] ?? item['rid'],
        uname: item["uname"] ?? item["name"] ?? item['rid'],
        number: item["number"],
        rid: item["rid"],
        syn_uname: item.syn_uname,
        s_rid: item.s_rid,
        syn_rid: item.syn_rid,
        has_syn_morph: item["has_syn_morph"],
        has_morph: item["has_morph"]
      };

      new_data.push(neuron_data);
    }
    return new_data;
  }


  /** Reset Info to empty */
  reset() {
    this.dataChanged.emit({
      data: empty_data,
      inWorkspace: this.inWorkspace,
      neu3d: this.neu3d
    })
  }

  /** Render */
  protected render() {
    return (
      <div className={SECTION_CLASS}>
      {/* <div className={SECTION_HEADER_CLASS}>
        <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.neu3d){
              return <SessionDialogComponent widget={val.neu3d}></SessionDialogComponent>
            } else {
              return <></>
            }
          }}
        </UseSignal>
      </div> */}
      <header className={SECTION_HEADER_CLASS}>
        <h2>Summary</h2>
      </header>
      <div className={CONTAINER_CLASS}>
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
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Connectivity Profile</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.data?.connectivity){
              return <ConnSVG
                      pre={val.data.connectivity.pre.summary}
                      post={val.data.connectivity.post.summary}
                    />
            } else{
              return <ConnSVG
                pre={empty_data.connectivity.pre.summary}
                post={empty_data.connectivity.post.summary}
              />
            }
          }}
        </UseSignal>
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Presynaptic Partners</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <div id="info-connTable-pre"/>
        {/* <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.data?.connectivity){
              return  <ConnTable
                data={val.data.connectivity.pre}
                inWorkspace={val.inWorkspace}
                addByRid={(rid: string) => {
                  val.neu3d?.addByRid(rid);
                }}
                removeByRid={(rid: string) => {
                  val.neu3d?.removeByRid(rid);
                }}
              />
            } else{
              return <ConnTable
                data={empty_data.connectivity.pre}
                inWorkspace={this.inWorkspace}
                addByRid={(rid: string) => {
                  val.neu3d?.addByRid(rid);
                }}
                removeByRid={(rid: string) => {
                  val.neu3d?.removeByRid(rid);
                }}
              />
            }
          }}
        </UseSignal> */}
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Postsynaptic Partners</h2>
      </header>
      <div className={CONTAINER_CLASS}>
      <div id="info-connTable-post"/>
        {/* <UseSignal
          signal={this.dataChanged}
          initialArgs={{
            data: this.data,
            inWorkspace: this.inWorkspace,
            neu3d: undefined
          }}
        >
          {(_, val) => {
            if (val.data?.connectivity){
              return  <ConnTable
                data={val.data.connectivity.post}
                inWorkspace={val.inWorkspace}
                addByRid={(rid: string) => {
                  val.neu3d?.addByRid(rid);
                }}
                removeByRid={(rid: string) => {
                  val.neu3d?.removeByRid(rid);
                }}
              />
            } else{
              return <ConnTable
                data={empty_data.connectivity.post}
                inWorkspace={this.inWorkspace}
                addByRid={(rid: string) => {
                  val.neu3d?.addByRid(rid);
                }}
                removeByRid={(rid: string) => {
                  val.neu3d?.removeByRid(rid);
                }}
              />
            }
          }}
        </UseSignal> */}
      </div>
    </div>
    );
  }

  // dataConnPre: any;
  // dataConnPost: any;
  tabConnPre: ConnTable;
  tabConnPost: ConnTable;
  data: IInfoData; // data to be displayed
  neu3d: any;  // caller neu3d widget
  dataChanged = new Signal< this, { data: any; inWorkspace: any; neu3d: any }>(this);
  inWorkspace: (rid: string)=>boolean;
};


