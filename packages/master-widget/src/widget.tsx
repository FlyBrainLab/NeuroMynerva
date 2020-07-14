// FBL Master Widget Class
import * as React from 'react';
import { Icons, IFBLWidget } from '@flybrainlab/fbl-template-widget';
// import { IFBLWidgetTrackers, FBLPanel, FBLTracker, FBLWidgetTrackers } from '@flybrainlab/fbl-extension';
import { 
  ReactWidget, 
  ToolbarButtonComponent,
  UseSignal,
  Dialog, showDialog
} from'@jupyterlab/apputils';

import {
  MainAreaWidget, 
  IWidgetTracker,
} from '@jupyterlab/apputils';

import{
  Session
} from '@jupyterlab/services';

import { 
  LabIcon, closeIcon//, fileIcon 
} from '@jupyterlab/ui-components';

import '../style/index.css';

const MASTER_CLASS_JLab = 'jp-FBL-Master';
// const TOOLBAR_SPECIES_CLASS = "jp-Master-Species";

/**
 * The class name added to a running widget header.
 */
// const HEADER_CLASS = 'jp-RunningSessions-header';

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

// /**
//  * The class name added to a running session item shutdown button.
//  */
// const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';

/**
 * The class name added to a Dispose button for disposing fbl widget
 */
const DISPOSE_BUTTON_CLASS = 'jp-FBL-Master-itemDispose';


export type FBLPanel = MainAreaWidget<IFBLWidget>;
export type FBLTracker = IWidgetTracker<FBLPanel>;

export interface IFBLWidgetTrackers {
  add(name: string, tracker: FBLTracker): void;
  trackers:  {[name: string]: FBLTracker};
  sessionsDict: {[sessionPath: string]: FBLPanel[] };
  sessions: Session.ISessionConnection[];
}

/**
 * Class for maintaining a list of FBLWidgetTrackers
 */
export class FBLWidgetTrackers implements IFBLWidgetTrackers {
  constructor(trackers?: {[name: string]: FBLTracker}){
    if (trackers){
      this.trackers = trackers;
    }else{
      this.trackers = {};
    }
  }
  /**
   * Add a fbl widget tracker
   * @param tracker
   */
  add(name: string, tracker: FBLTracker): void {
    if (!(name in this.trackers)){
      this.trackers[name] = tracker;
    }
  }

  /** 
   * Return alternate view of the trackers, keyed by session
   */
  get sessionsDict(): {[sessionPath: string]: FBLPanel[] } {
    let sessionsDict: {[sessionPath: string]: FBLPanel[] } = {};
    for (const t of Object.values(this.trackers)){
      t.forEach((panel)=>{
        const widget = panel.content;
        if (widget.sessionContext?.session){
          if (!widget.sessionContext.isDisposed){
            if (!(widget.sessionContext.session.path in sessionsDict)) {
              sessionsDict[widget.sessionContext.session.path] = new Array<FBLPanel>();
            }
            sessionsDict[widget.sessionContext.session.path].push(panel);
          }
        }
      });
    }
    return sessionsDict;
  }

  /** 
   * Return a array of unique sessions
   */
  get sessions(): Session.ISessionConnection[] {
    const sessions: Session.ISessionConnection[] = [];
    for (const t of Object.values(this.trackers)){
      t.forEach((panel)=>{
        const widget = panel.content;
        if (widget.sessionContext?.session){
          if (!widget.sessionContext.isDisposed){
            sessions.push(widget.sessionContext.session);
          }
        }
      })
    }
    return Array.from(new Set(sessions));
  }

  trackers: {[name: string]: FBLTracker};
}

/**
* An FBL Master Widget
*/
export class MasterWidget extends ReactWidget {
  constructor(
    fbltrackers: IFBLWidgetTrackers
  ) {
    console.log('Master Widget Created');
    super();
    this.fbltrackers = fbltrackers;
    this.addClass(MASTER_CLASS_JLab);
    this.render();
  }

  protected render() {
    return (<FBLWidgetReact.FBLWidgetTrackersComponent fbltrackers={this.fbltrackers}/>);
  }

  /**
  * The Elements associated with the widget.
  */
  private fbltrackers: FBLWidgetTrackers;
};




/**
 * Namespace for all React Components 
 */
namespace FBLWidgetReact {
  export function FBLWidgetTrackersComponent(props: {
    fbltrackers: FBLWidgetTrackers;
  }) {
    const trackers_arr = Object.values(props.fbltrackers.trackers);
    const trackers_names = Object.keys(props.fbltrackers.trackers);
    return (
      <>
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
    const icon: LabIcon = Icons.fblIcon;
    
    // if (widget.icon?.react){
    //   icon = widget.icon;
    // }

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