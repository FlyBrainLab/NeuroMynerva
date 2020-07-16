// FBL Master Widget Class
import * as React from 'react';
// import MaterialTable from "material-table";

// import { Icons, IFBLWidget } from '@flybrainlab/fbl-template-widget';
// import { FBLPanel, FBLTracker, FBLWidgetTrackers } from '@flybrainlab/fbl-extension';
import { 
  Signal
} from '@lumino/signaling';

import { 
  ReactWidget, 
  UseSignal,
  // UseSignal,
  // Dialog, showDialog
 } from'@jupyterlab/apputils';


import '../style/index.css';
import { SummaryTable } from './summary_table';
import { ConnTable } from './conn_table';
import { ConnSVG } from './conn_svg';

import { SessionDialogComponent } from '@flybrainlab/fbl-template-widget';


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
      <div className={SECTION_HEADER_CLASS}>
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
      </div>
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
              return <SummaryTable data={val.data.summary} />  
            } else{
              return <SummaryTable data={empty_data.summary} />
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
              return  <ConnTable
                data={val.data.connectivity.pre}
                inWorkspace={val.inWorkspace}
                addByUname={uname => {
                  val.neu3d?.addByUname(uname);
                }}
                removeByUname={uname => {
                  val.neu3d?.removeByUname(uname);
                }}
              />
            } else{
              return <ConnTable
                data={empty_data.connectivity.pre}
                inWorkspace={this.inWorkspace}
                addByUname={uname => {
                  val.neu3d?.addByUname(uname);
                }}
                removeByUname={uname => {
                  val.neu3d?.removeByUname(uname);
                }}
              />
            }
          }}
        </UseSignal>
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Postsynaptic Partners</h2>
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
              return  <ConnTable
                data={val.data.connectivity.post}
                inWorkspace={val.inWorkspace}
                addByUname={uname => {
                  val.neu3d?.addByUname(uname);
                }}
                removeByUname={uname => {
                  val.neu3d?.removeByUname(uname);
                }}
              />
            } else{
              return <ConnTable
                data={empty_data.connectivity.post}
                inWorkspace={this.inWorkspace}
                addByUname={uname => {
                  val.neu3d?.addByUname(uname);
                }}
                removeByUname={uname => {
                  val.neu3d?.removeByUname(uname);
                }}
              />
            }
          }}
        </UseSignal>
      </div>
    </div>
    );
  }

  data: IInfoData; // data to be displayed
  neu3d: any;  // caller neu3d widget
  dataChanged = new Signal< this, { data: any; inWorkspace: (uname: string) => boolean; neu3d: any }>(this);
  inWorkspace: (uname: string)=>boolean;
};


