// FBL Master Widget Class
import * as React from 'react';
// import MaterialTable from "material-table";

// import { Icons, IFBLWidget } from '@flybrainlab/fbl-template-widget';
// import { FBLPanel, FBLTracker, FBLWidgetTrackers } from '@flybrainlab/fbl-extension';
import { 
  ReactWidget, 
  // ToolbarButtonComponent,
  // UseSignal,
  // Dialog, showDialog
 } from'@jupyterlab/apputils';

// import { 
//   LabIcon, closeIcon//, fileIcon 
// } from '@jupyterlab/ui-components';
import '../style/index.css';
import testData from './infopanel_test_data.json';
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

/**
* An Info Widget
*/
export class InfoWidget extends ReactWidget {
  constructor() {
    super();
    this.addClass(INFO_CLASS_JLab);
    this.render();
  }

  protected render() {
    return (<InfoWidgetReact.InfoPanelComponent data={testData} />);
  }
};




/**
 * Namespace for all React Components 
 */
namespace InfoWidgetReact {
  export function InfoPanelComponent(props: {data: any}) {
    return (
    <div className={SECTION_CLASS}>
    <>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Summary</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <SummaryTable data={props.data.summary} />
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Connectivity Profile</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <ConnSVG 
          pre={props.data.connectivity.pre.summary} 
          post={props.data.connectivity.pre.summary}
        />
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Presynaptic Partners</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <ConnTable title={"Presynaptic Partners"} data={testData.connectivity.pre.details}/>
      </div>
      <header className={SECTION_HEADER_CLASS}>
        <h2>Postsynaptic Partners</h2>
      </header>
      <div className={CONTAINER_CLASS}>
        <ConnTable title={"Postsynaptic Partners"} data={testData.connectivity.post.details}/>
      </div>
    </>
    </div>
    );
  }
}