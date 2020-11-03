// FBL Master Widget Class
import * as React from 'react';

import { 
  ReactWidget, 
  ToolbarButtonComponent,
  UseSignal,
  Dialog, showDialog
} from '@jupyterlab/apputils';
import { ILabShell } from '@jupyterlab/application';
import {
  ISettingRegistry
} from '@jupyterlab/settingregistry';


import { 
  LabIcon, closeIcon//, fileIcon 
} from '@jupyterlab/ui-components';

import { fblIcon } from '../../icons';
import { IFBLWidget } from '../template-widget/index';
import { IFBLWidgetTrackers, FBLPanel, FBLTracker, FBLWidgetTrackers } from '../../index';
import { FFBOProcessorButton } from '../../ffboprocessor';
import '../../../style/widgets/master-widget/master.css';
import { SessionManager } from '@jupyterlab/services';


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
    sessionManager: SessionManager,
    labShell: ILabShell,
    fbltrackers: IFBLWidgetTrackers,
    ffboProcessorSetting: ISettingRegistry.ISettings
  ) {
    console.log('Master Widget Created');
    super();
    this.sessionManager = sessionManager;
    this.labShell = labShell;
    this.fbltrackers = fbltrackers;
    this.ffboProcessorSetting = ffboProcessorSetting;
    this.addClass(MASTER_CLASS_JLab);
    this.render();
  }

  protected render() {
    return (
      <FBLWidgetReact.FBLWidgetTrackersComponent
        settings={this.ffboProcessorSetting}
        fbltrackers={this.fbltrackers}
        labShell={this.labShell}
        sessionManager={this.sessionManager}
      />);
  }

  /**
  * The Elements associated with the widget.
  */
  private fbltrackers: FBLWidgetTrackers;
  readonly labShell: ILabShell;
  readonly sessionManager: SessionManager;
  ffboProcessorSetting: ISettingRegistry.ISettings
};


/**
 * Namespace for all React Components 
 */
namespace FBLWidgetReact {
  export function FBLWidgetTrackersComponent(props: {
    fbltrackers: FBLWidgetTrackers,
    settings: ISettingRegistry.ISettings,
    labShell: ILabShell,
    sessionManager: SessionManager
  }) {
    const trackers_arr = Object.values(props.fbltrackers.trackers);
    const trackers_names = Object.keys(props.fbltrackers.trackers);
    return (
      <>
        <div className={SECTION_HEADER_CLASS}>
          <FFBOProcessorButton settings={props.settings}></FFBOProcessorButton>
        </div>
        {trackers_arr.map((tracker, i) => (
          <Section key={i} name={trackers_names[i]} tracker={tracker} labShell={props.labShell} sessionManager={props.sessionManager}/>
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
  export function Section(props: {
    name: string; tracker: FBLTracker, labShell: ILabShell, sessionManager: SessionManager
  }) {
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
            <List tracker={props.tracker} labShell={props.labShell} sessionManager={props.sessionManager}/>
          </div>
        </>
      </div>
    );
  }

  function List(props: {
    tracker: FBLTracker, labShell: ILabShell, sessionManager: SessionManager
  }) {
    return (
      <UseSignal signal={props.tracker.currentChanged}>
        {() => <ListView tracker={props.tracker} labShell={props.labShell} sessionManager={props.sessionManager}/>}
      </UseSignal>
    );
  }
  
  function ListView(props: {
    tracker: FBLTracker, labShell: ILabShell, sessionManager: SessionManager
  }) {
    const panel_arr: Array<FBLPanel> = [];
    props.tracker.forEach((panel) => {
      panel_arr.push(panel);
    });
    return (
      <ul className={LIST_CLASS}>
        {panel_arr.map((panel, i)=>(
          <Item key={i} panel={panel} labShell={props.labShell} sessionManager={props.sessionManager}/>
        ))}
      </ul>
    );
  }
  
  /**
   * Renderes a single panel as a list item with some buttons
   * @param props 
   */
  function Item(props: {
    panel: FBLPanel, labShell: ILabShell, sessionManager: SessionManager
  }) {
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
          onClick={() => props.labShell.activateById(panel.id)}
        >
          { widget.name }
        </span>
        <button
          className={`${DISPOSE_BUTTON_CLASS} jp-mod-styled`}
          onClick={() => panel.dispose()}
        >
          CLOSE
        </button>
        <UseSignal signal={widget.sessionContext.sessionChanged}>
          {(_, args) => {
            if (widget.sessionContext?.session?.kernel) {
              return <ShutdownButton widget={widget} sessionManager={props.sessionManager}/>;
            } else {
              return <></>;
            }
          }}
        </UseSignal>
      </li>
    );
  }


  function ShutdownButton(props: {
    widget: IFBLWidget, sessionManager: SessionManager
  }) {
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
          props.sessionManager.shutdown(widget.sessionContext.session.id);
        }
      });
    }
    return (
      <button
        className={`${DISPOSE_BUTTON_CLASS} jp-mod-styled`}
        onClick={onShutdown}
      >
        SHUTDOWN
      </button>);
  }
  
}