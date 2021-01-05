// FBL Master Widget Class
import * as React from 'react';
import * as _ from 'lodash';
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
  LabIcon, closeIcon,//, fileIcon 
  caretRightIcon,
  caretDownIcon
} from '@jupyterlab/ui-components';

import { fblIcon } from '../../icons';
import { IFBLWidget } from '../template-widget/index';
import { IFBLWidgetTrackers, FBLPanel, FBLTracker, FBLWidgetTrackers, Icons } from '../../index';
import { FFBOProcessorButton } from '../../ffboprocessor';
import '../../../style/master-widget/master.css';
import { SessionManager } from '@jupyterlab/services';
import { Neu3DWidget } from '../neu3d-widget';
import { IDataChangeArgs, IMeshDictItem } from '../neu3d-widget/model';


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
 * The class name added to the Div element containing the list of neurons
 * for each neu3d instance
 */
const TABLE_CONTAINER_CLASS = 'jp-FBL-Master-Neu3D-Table-Container';

/**
 * The class name added to buttons that show/hide pin/unpin neurons
 */
const MORPH_ACTION_BUTTON = 'jp-FBL-Master-Neu3D-Table-Button';

/**
 * The class name added to each row for a given morphology
 */
const MORPH_ROW = 'jp-FBL-Master-Neu3D-Table-Row';

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

    if (widget instanceof  Neu3DWidget) {
      return (
        <Neu3DComponents.Item panel={panel} labShell={props.labShell} sessionManager={props.sessionManager}></Neu3DComponents.Item>
      )
    } else {
      return (
        <li className={ITEM_CLASS}>
          <icon.react tag="span" stylesheet="runningItem" />
          <span
            className={ITEM_LABEL_CLASS}
            title={widget.title.caption}
            onClick={() => props.labShell.activateById(panel.id)}
          >
            {widget.name}
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
                return <ShutdownButton widget={widget} sessionManager={props.sessionManager} />;
              } else {
                return <></>;
              }
            }}
          </UseSignal>
        </li>
      );
    }
  }

  export function ShutdownButton(props: {
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

namespace Neu3DComponents {
  /**
   * Renderes a single Neu3D panel as a list item with buttons and dropdown
   * @param props 
   */
  export class Item extends React.Component<{
    panel: FBLPanel, labShell: ILabShell, sessionManager: SessionManager
  }, {
    rows: { [rid: string]: Partial<IMeshDictItem> }
    }> {  
    delayedSetState: _.DebouncedFunc<(rows: any)=>any>;
      
    constructor(props: { panel: FBLPanel, labShell: ILabShell, sessionManager: SessionManager }) {
      super(props);
      let rows: {[rid:string]: Partial<IMeshDictItem>} = {};
      const neu3d = this.props.panel.content as Neu3DWidget;
      for (let row of Object.entries(neu3d.model.data)) {
        const rid = row[0];
        const { label, visibility, pinned } = row[1] as IMeshDictItem;
        rows[rid] = {
          label: label ?? rid,
          visibility: visibility,
          pinned: pinned
        }
      }
      this.state = {
        rows: rows
      };

      this.delayedSetState = _.debounce(rows => this.setState({ rows: rows }), 500);

      neu3d.model.dataChanged.connect((caller, change) => {
        const { event, newValue, key, rid, source } = change as IDataChangeArgs;
        if (!(['add', 'change', 'remove'].includes(event))) { return; }
        if (key === 'highlight') { return; }  // skip highlight
        let rows = this.state.rows;
        switch (event) {
          case 'add':
            if (!(rid in rows)) {
              rows[rid] = {
                label: source[rid].label ?? rid,
                visibility: source[rid].visibility,
                pinned: source[rid].pinned
              }
              this.delayedSetState(rows);
            }
            break;
          case 'remove':
            if (rid in rows) {
              delete rows[rid];
              this.delayedSetState(rows);
            }
            break;
          case 'change':
            switch (key) {
              case 'visibility':
                if (rid in rows){
                  rows[rid].visibility = newValue;
                  this.delayedSetState(rows);
                }
                break;
              case 'pinned':
                if (rid in rows){
                  rows[rid].pinned = newValue;
                  this.delayedSetState(rows);
                }
                break;
              default:
                return
            }
            break;
          default:
            break;
        }
      })
    }

    componentWillUnmount() {
      this.delayedSetState.cancel();
    }

    render() { 
      const { panel, labShell } = this.props;
      const neu3d = panel.content as Neu3DWidget;
      const showPanel = () => {
        labShell.activateById(panel.id);
      }
      let icon: LabIcon = fblIcon;  
      if (neu3d.icon?.react) {
        icon = neu3d.icon;
      }
    
      const toggleVis = (rid: string) => { neu3d.neu3d.toggleVis(rid);}
      const togglePin = (rid: string) => { neu3d.neu3d.togglePin(rid); }
      const onHover = (rid: string) => { neu3d.neu3d.highlight(rid); }
      const showInfo = (rid: string) => { neu3d.executeInfoQuery(rid);}
      const onLeave = () => { neu3d.neu3d.highlight(); }
      const onClick = () => { showPanel(); }

      let neuronRows = Object.entries(this.state.rows).map((row: [string, Partial<IMeshDictItem>], idx: number) => (
        <tr className={MORPH_ROW} key={row[0]} onMouseOver={() => { onHover(row[0]) }} onMouseLeave={onLeave} onClick={onClick}>
          <td>{row[1].label}</td>
          <td className={"Neuron-Table-Buttons"}>
            <div key={0} className={`${MORPH_ACTION_BUTTON} ${row[1].visibility ? 'hidden': ''}`} > <ToolbarButtonComponent icon={Icons.eyeIcon} onClick={() => { toggleVis(row[0]);}} tooltip={"Show"}></ToolbarButtonComponent></div>
            <div key={1} className={`${MORPH_ACTION_BUTTON} ${row[1].visibility ? '': 'hidden'}`} > <ToolbarButtonComponent icon={Icons.eyeSlashIcon} onClick={() => { toggleVis(row[0]);}} tooltip={"Hide"}></ToolbarButtonComponent></div>
            <div key={2} className={`${MORPH_ACTION_BUTTON} ${row[1].pinned ? 'hidden': ''}`} > <ToolbarButtonComponent icon={Icons.mapPinIcon} onClick={() => { togglePin(row[0]);}} tooltip={"Pin"}></ToolbarButtonComponent></div>
            <div key={3} className={`${MORPH_ACTION_BUTTON} ${row[1].pinned ? '': 'hidden'}`} > <ToolbarButtonComponent icon={Icons.mapUpinIcon} onClick={() => { togglePin(row[0]);}} tooltip={"Unpin"}></ToolbarButtonComponent></div>
            <div key={4} className={`${MORPH_ACTION_BUTTON}`} > <ToolbarButtonComponent icon={Icons.neuInfoIcon} onClick={() => { showInfo(row[0]);}} tooltip={"Get Info"}></ToolbarButtonComponent></div>
          </td>
        </tr>
      ));

      let neuronTable = (
        <table data-neu3d-id={neu3d.id} className={"neuron-list-table"}>
          <tbody>
            {neuronRows}
          </tbody>
        </table>
      );
      return (
        <CollapsibleSection
          title={
            <>
              <li className={ITEM_CLASS}>
                <icon.react tag="span" stylesheet="runningItem" />
                <span
                  className={ITEM_LABEL_CLASS}
                  title={neu3d.title.caption}
                  onClick={showPanel}
                >
                  {neu3d.name}
                </span>
                <button
                  className={`${DISPOSE_BUTTON_CLASS} jp-mod-styled`}
                  onClick={() => panel.dispose()}
                >
                  CLOSE
                </button>
                <UseSignal signal={neu3d.sessionContext.sessionChanged}>
                  {(_, args) => {
                    if (neu3d.sessionContext?.session?.kernel) {
                      return <FBLWidgetReact.ShutdownButton widget={neu3d} sessionManager={this.props.sessionManager} />;
                    } else {
                      return <></>;
                    }
                  }}
                </UseSignal>
              </li>
            </>
          }
          children={
            <div className={"jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput"}
              data-mime-type={"text/markdown"}
            >
              {neuronTable}
            </div>
          }
        ></CollapsibleSection>
      );
    }
  }

  // function MorphRow(props: {
  //   neu3d: Neu3DWidget, name: string, rid: string,
  //   visibility: Boolean, pinned: Boolean,
  //   showPanel: Function
  // }) {
  //   let toggleVis = () => {
  //     props.neu3d.neu3d.toggleVis(props.rid);
  //   }
  //   let togglePin = () => {
  //     props.neu3d.neu3d.togglePin(props.rid);
  //   }
  //   let Buttons = [ // TODO: add Pin Icon
  //     <div key={0} className={`${MORPH_ACTION_BUTTON} ${props.visibility ? 'hidden': ''}`} data-btn-rid={props.rid} data-vis={false}> <ToolbarButtonComponent icon={Icons.eyeIcon} onClick={toggleVis} tooltip={"Show"}></ToolbarButtonComponent></div>,
  //     <div key={1} className={`${MORPH_ACTION_BUTTON} ${props.visibility ? '': 'hidden'}`} data-btn-rid={props.rid} data-vis={true}> <ToolbarButtonComponent icon={Icons.eyeSlashIcon} onClick={toggleVis} tooltip={"Hide"}></ToolbarButtonComponent></div>,
  //     <div key={2} className={`${MORPH_ACTION_BUTTON} ${props.pinned ? 'hidden': ''}`} data-btn-rid={props.rid} data-pin={false}> <ToolbarButtonComponent icon={Icons.mapPinIcon} onClick={togglePin} tooltip={"Pin"}></ToolbarButtonComponent></div>,
  //     <div key={3} className={`${MORPH_ACTION_BUTTON} ${props.pinned ? '': 'hidden'}`} data-btn-rid={props.rid} data-pin={true}> <ToolbarButtonComponent icon={Icons.mapUpinIcon} onClick={togglePin} tooltip={"Unpin"}></ToolbarButtonComponent></div>
  //   ];

  //   let onHover = () => {
  //     props.neu3d.neu3d.highlight(props.rid);
  //   }
  //   let onLeave = () => {
  //     props.neu3d.neu3d.highlight();
  //   }
  //   let onClick = () => {
  //     props.showPanel();
  //   }

  //   return (
  //     <tr className={MORPH_ROW} data-rid={props.rid} key={props.rid} onMouseOver={onHover} onMouseLeave={onLeave} onClick={onClick}>
  //       <td>{props.name}</td>
  //       <td className={"Neuron-Table-Buttons"}>{Buttons}</td>
  //     </tr>
  //   )
  // }

  // function MorphRow(props: {
  //   neu3d: Neu3DWidget, name: string, rid: string,
  //   visibility: Boolean, pinned: Boolean,
  //   showPanel: Function
  // }) {
  //   let toggleVis = () => {
  //     props.neu3d.neu3d.toggleVis(props.rid);
  //   }
  //   let togglePin = () => {
  //     props.neu3d.neu3d.togglePin(props.rid);
  //   }
  //   let onHover = () => {
  //     props.neu3d.neu3d.highlight(props.rid);
  //   }
  //   let onLeave = () => {
  //     props.neu3d.neu3d.highlight();
  //   }
  //   let onClick = () => {
  //     props.showPanel();
  //   }
  //   let Buttons = [ // TODO: add Pin Icon
  //     <div key={0} className={`${MORPH_ACTION_BUTTON} ${props.visibility ? 'hidden': ''}`} data-btn-rid={props.rid} data-vis={false}> <ToolbarButtonComponent icon={Icons.eyeIcon} onClick={toggleVis} tooltip={"Show"}></ToolbarButtonComponent></div>,
  //     <div key={1} className={`${MORPH_ACTION_BUTTON} ${props.visibility ? '': 'hidden'}`} data-btn-rid={props.rid} data-vis={true}> <ToolbarButtonComponent icon={Icons.eyeSlashIcon} onClick={toggleVis} tooltip={"Hide"}></ToolbarButtonComponent></div>,
  //     <div key={2} className={`${MORPH_ACTION_BUTTON} ${props.pinned ? 'hidden': ''}`} data-btn-rid={props.rid} data-pin={false}> <ToolbarButtonComponent icon={Icons.mapPinIcon} onClick={togglePin} tooltip={"Pin"}></ToolbarButtonComponent></div>,
  //     <div key={3} className={`${MORPH_ACTION_BUTTON} ${props.pinned ? '': 'hidden'}`} data-btn-rid={props.rid} data-pin={true}> <ToolbarButtonComponent icon={Icons.mapUpinIcon} onClick={togglePin} tooltip={"Unpin"}></ToolbarButtonComponent></div>
  //   ];

    

  //   return (
  //     <tr className={MORPH_ROW} data-rid={props.rid} key={props.rid} onMouseOver={onHover} onMouseLeave={onLeave} onClick={onClick}>
  //       <td>{props.name}</td>
  //       <td className={"Neuron-Table-Buttons"}>{Buttons}</td>
  //     </tr>
  //   )
  // }

  /**
   * Generic Collapsible Section Wrapper
   */
  export class CollapsibleSection extends React.Component<{
    title: React.ReactElement,
    children: React.Component | any
  }, { visible: boolean }>{

    state: Readonly<{ visible: boolean }> = {
      visible: false
    }
  
    toggleVisibility() {
      this.setState({
        visible: !this.state.visible
      })
    }

    render(): React.ReactNode {
      return (
        <>
          <header className={ITEM_CLASS}>
            <a onClick={() => this.toggleVisibility()}>
              <caretRightIcon.react display={(this.state.visible ? 'none':'inline')}></caretRightIcon.react>
              <caretDownIcon.react display={(this.state.visible ? 'inline':'none')}></caretDownIcon.react>
            </a>
            {this.props.title}
          </header>
          <div className={TABLE_CONTAINER_CLASS + (this.state.visible? '': ' hidden')}>
            {this.props.children}
          </div>
        </>
      )
    }
  }
}