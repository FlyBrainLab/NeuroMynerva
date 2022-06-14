// FBL Master Widget Class
import * as React from 'react';
import {
  ReactWidget,
  ToolbarButtonComponent,
  UseSignal,
  Dialog,
  showDialog
} from '@jupyterlab/apputils';
import { ILabShell, LabShell } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import {
  LabIcon,
  closeIcon, //, fileIcon
  caretRightIcon,
  caretDownIcon
} from '@jupyterlab/ui-components';

import * as Icons from '../../icons';
import { FBLWidget, IFBLWidget } from '../template-widget/index';
import {
  IFBLWidgetTrackers,
  FBLPanel,
  FBLTracker,
  FBLWidgetTrackers
} from '../../index';
import { FFBOProcessorButton } from '../../ffboprocessor';
import '../../../style/master-widget/master.css';
import { SessionManager } from '@jupyterlab/services';
import { Neu3DWidget } from '../neu3d-widget';
import { Neu3DModelTable } from './neuron_table';

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
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-FBL-Master-itemLabel';

/**
 * The class name added to a Dispose button for disposing fbl widget
 */
const DISPOSE_BUTTON_CLASS = 'jp-FBL-Master-itemDispose';

/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-FBL-Master-item';

/**
 * The class name added to the Div element containing the list of neurons
 * for each neu3d instance
 */
const TABLE_CONTAINER_CLASS = 'jp-FBL-Master-Neu3D-Table-Container';

/**
 * The class name added to buttons in header of each collapsible section
 */
const COLLAPSIBLE_SECTION_HEADER = 'jp-FBL-Master-Collapsible-Section-Header';

/**
 * The class name added to buttons in header of each collapsible section
 */
const NEU3D_TABLE = 'jp-FBL-Master-Neu3D-Table';

/**
 * The class name added to buttons in header of each collapsible section
 */
const COLLAPSIBLE_SECTION_HEADER_BUTTONS =
  'jp-FBL-Master-Collapsible-Section-Header-Buttons';

/**
 * An FBL Master Widget
 */
export class MasterWidget extends ReactWidget {
  constructor(
    sessionManager: SessionManager,
    labShell: ILabShell,
    fbltrackers: IFBLWidgetTrackers,
    ffboProcessorSetting: ISettingRegistry.ISettings,
    commands: CommandRegistry
  ) {
    console.debug('Master Widget Created');
    super();
    this.sessionManager = sessionManager;
    this.labShell = labShell;
    this.fbltrackers = fbltrackers;
    this.ffboProcessorSetting = ffboProcessorSetting;
    this.addClass(MASTER_CLASS_JLab);
    this.render();
    this.commands = commands;
  }

  protected render(): JSX.Element {
    return (
      <FBLWidgetReact.FBLWidgetTrackersComponent
        settings={this.ffboProcessorSetting}
        fbltrackers={this.fbltrackers}
        labShell={this.labShell}
        sessionManager={this.sessionManager}
        commands={this.commands}
      />
    );
  }

  /**
   * The Elements associated with the widget.
   */
  private fbltrackers: FBLWidgetTrackers;
  readonly labShell: ILabShell;
  readonly sessionManager: SessionManager;
  readonly commands: CommandRegistry;
  ffboProcessorSetting: ISettingRegistry.ISettings;
}

/**
 * Namespace for all React Components
 */
namespace FBLWidgetReact {
  export function FBLWidgetTrackersComponent(props: {
    fbltrackers: FBLWidgetTrackers;
    settings: ISettingRegistry.ISettings;
    labShell: ILabShell;
    sessionManager: SessionManager;
    commands: CommandRegistry;
  }): JSX.Element {
    const trackers_arr = Object.values(props.fbltrackers.trackers);
    const trackers_names = Object.keys(props.fbltrackers.trackers);

    return (
      <>
        <div className={SECTION_HEADER_CLASS}>
          <FFBOProcessorButton
            settings={props.settings}
            commands={props.commands}
          ></FFBOProcessorButton>
        </div>
        {trackers_arr.map((tracker, i) => (
          <Section
            key={i}
            name={trackers_names[i]}
            tracker={tracker}
            labShell={props.labShell}
            sessionManager={props.sessionManager}
          />
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
    name: string;
    tracker: FBLTracker;
    labShell: ILabShell;
    sessionManager: SessionManager;
  }): JSX.Element {
    function onClose() {
      void showDialog({
        title: `Close All ${props.name}?`,
        buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'CLOSE' })]
      }).then(result => {
        if (result.button.accept) {
          props.tracker.forEach(panel => {
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
            <List
              tracker={props.tracker}
              labShell={props.labShell}
              sessionManager={props.sessionManager}
            />
          </div>
        </>
      </div>
    );
  }

  export function List(props: {
    tracker: FBLTracker;
    labShell: ILabShell;
    sessionManager: SessionManager;
  }): JSX.Element {
    return (
      <UseSignal signal={props.tracker.currentChanged}>
        {() => (
          <ListView
            tracker={props.tracker}
            labShell={props.labShell}
            sessionManager={props.sessionManager}
          />
        )}
      </UseSignal>
    );
  }

  export function ListView(props: {
    tracker: FBLTracker;
    labShell: ILabShell;
    sessionManager: SessionManager;
  }): JSX.Element {
    const panel_arr: Array<FBLPanel> = [];
    props.tracker.forEach(panel => {
      panel_arr.push(panel);
    });
    return (
      <ul className={LIST_CLASS}>
        {panel_arr.map((panel, i) => (
          <Item
            key={i}
            panel={panel}
            labShell={props.labShell}
            sessionManager={props.sessionManager}
          />
        ))}
      </ul>
    );
  }

  /**
   * Renderes a single panel as a list item with some buttons
   * @param props
   */
  class Item extends React.Component<{
    panel: FBLPanel;
    labShell: ILabShell;
    sessionManager: SessionManager;
  }> {
    constructor(props: {
      panel: FBLPanel;
      labShell: ILabShell;
      sessionManager: SessionManager;
    }) {
      super(props);
      this.panel = props.panel;
      this.widget = this.panel.content as FBLWidget;
      this.labShell = props.labShell;
      this.sessionManager = props.sessionManager;
      if (this.widget instanceof Neu3DWidget) {
        this._neuronTableId = `Neu3D-Neuron-Table-${this.widget.id}`;
        this._meshTableId = `Neu3D-Mesh-Table-${this.widget.id}`;
      }
    }

    componentDidMount() {
      if (this.widget instanceof Neu3DWidget) {
        this.neu3dTables = new Neu3DModelTable({
          neuronContainer: this._neuronTableId,
          meshContainer: this._meshTableId,
          neu3dPanel: this.panel as FBLPanel,
          labShell: this.labShell
        });
        this.neu3dTables.neuronTabulator.redraw();
        this.neu3dTables.neuronTabulator.setPage(1);
        this.neu3dTables.meshTabulator.redraw();
        this.neu3dTables.meshTabulator.setPage(1);
      }
    }

    render() {
      const icon: LabIcon = this.widget.icon ?? Icons.fblIcon;
      if (this.widget instanceof Neu3DWidget) {
        return (
          <>
            <CollapsibleSection
              title={
                <>
                  <icon.react tag="span" stylesheet="runningItem" />
                  <span
                    className={ITEM_LABEL_CLASS}
                    title={this.widget.title.caption}
                    onClick={() => this.labShell.activateById(this.panel.id)}
                  >
                    {this.widget.name}
                  </span>
                  <button
                    className={`${DISPOSE_BUTTON_CLASS} jp-mod-styled`}
                    onClick={() => this.panel.dispose()}
                  >
                    CLOSE
                  </button>
                  <UseSignal signal={this.widget.sessionContext.sessionChanged}>
                    {(_, args) => {
                      if (this.widget.sessionContext?.session?.kernel) {
                        return (
                          <ShutdownButton
                            widget={this.widget}
                            sessionManager={this.sessionManager}
                          />
                        );
                      } else {
                        return <></>;
                      }
                    }}
                  </UseSignal>
                </>
              }
              children={
                <>
                  <CollapsibleSection
                    title={
                      <>
                        <span className={ITEM_LABEL_CLASS}>
                          Neurons & Synapses
                        </span>
                        <div
                          className={`${COLLAPSIBLE_SECTION_HEADER_BUTTONS}`}
                        >
                          <ToolbarButtonComponent
                            key={0}
                            icon={Icons.eyeIcon}
                            onClick={() => {
                              this.neu3dTables.showAllNeurons(true);
                            }}
                            tooltip={'Show All Neurons & Synapses'}
                          />
                          <ToolbarButtonComponent
                            key={1}
                            icon={Icons.eyeSlashIcon}
                            onClick={() => {
                              this.neu3dTables.hideAllNeurons(true);
                            }}
                            tooltip={'Hide All Neurons & Synapses'}
                          />
                          <ToolbarButtonComponent
                            key={2}
                            icon={Icons.mapPinIcon}
                            onClick={() => {
                              this.neu3dTables.pinAllNeurons(true);
                            }}
                            tooltip={'Pin All Neurons & Synapses'}
                          />
                          <ToolbarButtonComponent
                            key={3}
                            icon={Icons.mapUpinIcon}
                            onClick={() => {
                              this.neu3dTables.unpinAllNeurons(true);
                            }}
                            tooltip={'UnPin All Neurons & Synapses'}
                          />
                          <ToolbarButtonComponent
                            key={4}
                            icon={Icons.trashIcon}
                            onClick={() => {
                              this.neu3dTables.removeAllNeurons(true);
                            }}
                            tooltip={
                              'Remove All Active Unpinned Neurons & Synapses'
                            }
                          />
                        </div>
                      </>
                    }
                    children={
                      <div
                        className={NEU3D_TABLE}
                        id={this._neuronTableId}
                      ></div>
                    }
                  ></CollapsibleSection>
                  <CollapsibleSection
                    title={
                      <>
                        <span className={ITEM_LABEL_CLASS}>Meshes</span>
                        <div
                          className={`${COLLAPSIBLE_SECTION_HEADER_BUTTONS}`}
                        >
                          <ToolbarButtonComponent
                            key={0}
                            icon={Icons.eyeIcon}
                            onClick={() => {
                              this.neu3dTables.showAllMeshes(true);
                            }}
                            tooltip={'Show All Active Meshes'}
                          />
                          <ToolbarButtonComponent
                            key={1}
                            icon={Icons.eyeSlashIcon}
                            onClick={() => {
                              this.neu3dTables.hideAllMeshes(true);
                            }}
                            tooltip={'Hide All Active  Meshes'}
                          />
                          <ToolbarButtonComponent
                            key={2}
                            icon={Icons.trashIcon}
                            onClick={() => {
                              this.neu3dTables.removeAllMeshes(true);
                            }}
                            tooltip={'Remove All Active Meshes'}
                          />
                        </div>
                      </>
                    }
                    children={
                      <div className={NEU3D_TABLE} id={this._meshTableId}></div>
                    }
                  ></CollapsibleSection>
                </>
              }
            ></CollapsibleSection>
          </>
        );
      } else {
        return (
          <header className={ITEM_CLASS}>
            <icon.react tag="span" stylesheet="runningItem" />
            <span
              className={ITEM_LABEL_CLASS}
              title={this.widget.title.caption}
              onClick={() => this.labShell.activateById(this.panel.id)}
            >
              {this.widget.name}
            </span>
            <button
              className={`${DISPOSE_BUTTON_CLASS} jp-mod-styled`}
              onClick={() => this.panel.dispose()}
            >
              CLOSE
            </button>
            <UseSignal signal={this.widget.sessionContext.sessionChanged}>
              {(_, args) => {
                if (this.widget.sessionContext?.session?.kernel) {
                  return (
                    <ShutdownButton
                      widget={this.widget}
                      sessionManager={this.sessionManager}
                    />
                  );
                } else {
                  return <></>;
                }
              }}
            </UseSignal>
          </header>
        );
      }
    }
    readonly panel: FBLPanel;
    readonly widget: FBLWidget;
    readonly labShell: LabShell;
    readonly sessionManager: SessionManager;
    private _neuronTableId = '';
    private _meshTableId = '';
    neu3dTables: Neu3DModelTable = null;
  }

  export class CollapsibleSection extends React.Component<
    {
      title: React.ReactElement;
      children: React.Component | any;
    },
    { visible: boolean }
  > {
    state: Readonly<{ visible: boolean }> = {
      visible: false
    };

    toggleVisibility(): void {
      this.setState({
        visible: !this.state.visible
      });
    }

    render(): React.ReactNode {
      return (
        <div>
          <header className={`${ITEM_CLASS} ${COLLAPSIBLE_SECTION_HEADER}`}>
            <a onClick={() => this.toggleVisibility()}>
              <caretRightIcon.react
                display={this.state.visible ? 'none' : 'inline'}
              ></caretRightIcon.react>
              <caretDownIcon.react
                display={this.state.visible ? 'inline' : 'none'}
              ></caretDownIcon.react>
            </a>
            {this.props.title}
          </header>
          <div
            className={
              TABLE_CONTAINER_CLASS + (this.state.visible ? '' : ' hidden')
            }
          >
            {this.props.children}
          </div>
        </div>
      );
    }
  }

  export function ShutdownButton(props: {
    widget: IFBLWidget;
    sessionManager: SessionManager;
  }): JSX.Element {
    const { widget } = props;
    const body = (
      <p>This kernel could be used by other widgets at the moment.</p>
    );
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
      </button>
    );
  }
}
