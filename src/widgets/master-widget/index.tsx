// FBL Master Widget Class
import * as React from 'react';

import { 
  ReactWidget, 
  ToolbarButtonComponent,
  UseSignal,
  Dialog, showDialog
} from'@jupyterlab/apputils';


import { 
  LabIcon, closeIcon//, fileIcon 
} from '@jupyterlab/ui-components';

import { fblIcon } from '../../icons';
import { IFBLWidget } from '../template-widget/index';
import { IFBLWidgetTrackers, FBLPanel, FBLTracker, FBLWidgetTrackers } from '../../index';
import { FFBOProcessor, FFBOProcessorButton } from '../../ffboprocessor';
import '../../../style/widgets/master-widget/master.css';


const MASTER_CLASS_JLab = 'jp-FBL-Master';

/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-FBL-section';

/**
 * The class name added to the running sessions section header.
 */
const SECTION_HEADER_CLASS = 'jp-FBL-Master-sectionHeader';

/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-FBL-Master-sectionContainer';

/**
 * The class name added to the running kernel sessions section list.
 */
const LIST_CLASS = 'jp-FBL-Master-sectionList';

/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-FBL-Master-item';

/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-FBL-Master-itemLabel';


/**
 * The class name added to a Dispose button for disposing fbl widget
 */
const DISPOSE_BUTTON_CLASS = 'jp-FBL-Master-itemDispose';

/**
* An FBL Master Widget
*/
export class MasterWidget extends ReactWidget {
  constructor(
    fbltrackers: IFBLWidgetTrackers,
    ffboProcessors: FFBOProcessor
  ) {
    console.log('Master Widget Created');
    super();
    this.fbltrackers = fbltrackers;
    this.ffboProcessors = ffboProcessors;
    this.addClass(MASTER_CLASS_JLab);
    this.render();
  }

  protected render() {
    return (<FBLWidgetReact.FBLWidgetTrackersComponent ffboProcessors={this.ffboProcessors} fbltrackers={this.fbltrackers}/>);
  }

  /**
  * The Elements associated with the widget.
  */
  private fbltrackers: FBLWidgetTrackers;
  ffboProcessors: FFBOProcessor
};


/**
 * Namespace for all React Components 
 */
namespace FBLWidgetReact {
  export function FBLWidgetTrackersComponent(props: {
    fbltrackers: FBLWidgetTrackers;
    ffboProcessors: FFBOProcessor;
  }) {
    const trackers_arr = Object.values(props.fbltrackers.trackers);
    const trackers_names = Object.keys(props.fbltrackers.trackers);
    return (
      <>
        <FFBOProcessorButton ffboprocessor={props.ffboProcessors}></FFBOProcessorButton>
        {trackers_arr.map((tracker, i) => (
          <Section key={i} name={trackers_names[i]} tracker={tracker}/>
        ))}
      </>
    );
  }

  /**
   * The Section component contains the shared look and feel for an interactive
   * list of kernels and sessions.
   *
   * It is specialized for each based on its props.
   */
  export function Section(props: {name: string; tracker: FBLTracker}) {
    function onClose() {
      void showDialog({
        title: `Close All ${props.name}?`,
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({ label: 'CLOSE' })
        ]
      }).then(result => {
        if (result.button.accept) {
          props.tracker.forEach((panel)=>{
            panel.content.dispose();
            panel.dispose();
          });
        }
      });
    }

    return (
      <div className={SECTION_CLASS}>
        <>
          <header className={SECTION_HEADER_CLASS}>
            <h2>{props.name} Widgets</h2>
            <ToolbarButtonComponent
              icon={closeIcon}
              onClick={onClose}
              tooltip={`Close All ${props.name} Widgets...`}
            />
          </header>
          <div className={CONTAINER_CLASS}>
            <List tracker={props.tracker} />
          </div>
        </>
      </div>
    );
  }

  function List(props: { tracker: FBLTracker}) {
    return (
      <UseSignal signal={props.tracker.currentChanged}>
        {() => <ListView tracker={props.tracker}/>}
      </UseSignal>
    );
  }
  
  function ListView(props: { tracker: FBLTracker }) {
    const panel_arr: Array<FBLPanel> = [];
    props.tracker.forEach((panel) => {
      panel_arr.push(panel);
    });
    return (
      <ul className={LIST_CLASS}>
        {panel_arr.map((panel, i)=>(
          <Item key={i} panel={panel}/>
        ))}
      </ul>
    );
  }
  
  /**
   * Renderes a single panel as a list item with some buttons
   * @param props 
   */
  function Item(props: { panel: FBLPanel }) {
    const {panel} = props;
    const widget = panel.content;
    let icon: LabIcon = fblIcon;
    
    if (widget.icon?.react){
      icon = widget.icon;
    }

    return (
      <li className={ITEM_CLASS}>
        <icon.react tag="span" stylesheet="runningItem" />
        <span
          className={ITEM_LABEL_CLASS}
          title={widget.title.caption}
          onClick={() => panel.show()}
        >
          { widget.name }
        </span>
        <button
          className={`${DISPOSE_BUTTON_CLASS} jp-mod-styled`}
          onClick={() => panel.dispose()}
        >
          CLOSE
        </button>
        <ShutdownButton widget={widget} />
      </li>
    );
  }


  function ShutdownButton(props: {widget: IFBLWidget}){
    const { widget } = props;
    const body = <p>This kernel could be used by other widgets at the moment.</p>;
    function onShutdown() {
      void showDialog({
        title: 'Shut Down Kernel?',
        body: body,
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({ label: 'SHUT DOWN' })
        ]
      }).then(result => {
        if (result.button.accept) {
          widget.sessionContext.shutdown();
          widget.sessionContext.dispose();
        }
      });
    }

    if (widget?.sessionContext?.session){
      return (
      <button
        className={`${DISPOSE_BUTTON_CLASS} jp-mod-styled`}
        onClick={onShutdown}
      >
        SHUTDOWN
      </button>);
    } else{
      return <></>
    }
  }
}