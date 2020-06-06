// FBL Master Widget Class
import * as React from 'react';
// import MaterialTable from "material-table";

// import { Icons, IFBLWidget } from '@flybrainlab/fbl-template-widget';
// import { FBLPanel, FBLTracker, FBLWidgetTrackers } from '@flybrainlab/fbl-extension';
import { 
  Signal, ISignal
} from '@lumino/signaling';

import { 
  ReactWidget, 
  UseSignal
  // ToolbarButtonComponent,
  // UseSignal,
  // Dialog, showDialog
 } from'@jupyterlab/apputils';

// import { 
//   LabIcon, closeIcon//, fileIcon 
// } from '@jupyterlab/ui-components';
import '../style/index.css';
import { SummaryTable } from './summary_table';
import { ConnTable } from './conn_table';
import { ConnSVG } from './conn_svg';

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
* An Info Widget
*/
export class InfoWidget extends ReactWidget {
  constructor(data: IInfoData) {
    super();
    if (data) {
      this.data = data;
    } else{
      this.data = {
        connectivity: {
          pre: {details: [], summary: {profile: {}, number: -1}},
          post: {details: [], summary: {profile: {}, number: -1}}
        }, 
        summary: { name: '', uname: '', rid: '', class: ''}
      }
    }
    
    this.addClass(INFO_CLASS_JLab);
    this.render();
  }

  protected render() {
    return (<InfoWidgetReact.InfoPanelComponent info_wdget={this} />);
  }

  get dataChanged(): ISignal<this, any> {
    return this._dataChanged;
  }

  data: IInfoData; // data to be displayed
  _dataChanged = new Signal<this, any>(this);
};




/**
 * Namespace for all React Components 
 */
namespace InfoWidgetReact {
  
  export function InfoPanelComponent(props: {info_wdget: InfoWidget}) {
    return (
    <div className={SECTION_CLASS}>
    <>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Summary</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <SummaryTableComponent info_widget={props.info_wdget} />
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Connectivity Profile</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <ConnSVGComponent info_widget={props.info_wdget} />
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Presynaptic Partners</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <ConnTableComponent pre={true} info_widget={props.info_wdget} />
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Postsynaptic Partners</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <ConnTableComponent pre={false} info_widget={props.info_wdget} />
      </div>
    </>
    </div>
    );
  }

  function SummaryTableComponent(props: {info_widget: InfoWidget}) {
    return (
      <UseSignal signal={props.info_widget.dataChanged}>
        {() => <SummaryTable data={props.info_widget.data} />}
      </UseSignal>
    )
  }

  function ConnSVGComponent(props: {info_widget: InfoWidget}) {
    return (
      <UseSignal signal={props.info_widget.dataChanged}>
        {() => <ConnSVG 
                pre={props.info_widget.data.connectivity.pre.summary}
                post={props.info_widget.data.connectivity.post.summary} />}
      </UseSignal>
    )
  }

  function ConnTableComponent(props: {pre: boolean, info_widget: InfoWidget}) {
    if (props.pre === true) {
      return (
        <UseSignal signal={props.info_widget.dataChanged}>
          {() => <ConnTable title={"Postsynaptic Partners"} data={props.info_widget.data.connectivity.post.details} />}
        </UseSignal>)
    } else {
      return (
        <UseSignal signal={props.info_widget.dataChanged}>
          {() => <ConnTable title={"Postsynaptic Partners"} data={props.info_widget.data.connectivity.post.details} />}
        </UseSignal>)
    }
  }
}