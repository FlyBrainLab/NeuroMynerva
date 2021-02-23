import * as React from 'react';
import { Signal, ISignal } from '@lumino/signaling';
import {
  refreshIcon,
  caretRightIcon,
  caretDownIcon
} from '@jupyterlab/ui-components';
import {
  ReactWidget,
  UseSignal,
  ToolbarButtonComponent,
  showDialog,
  Dialog
} from '@jupyterlab/apputils';

import {
  SummaryTable,
  MorphometryTable,
  AdditionalInfoTable
} from './summary_table';
import { ConnTable, EmptyConnData, IConnData } from './conn_table';
import { ConnSVG } from './conn_svg';
import '../../../style/info-widget/info.css';
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
const SECTION_BTN_HEADER_CLASS =
  'jp-FBL-Info-sectionHeader jp-FBL-Info-section-BtnHeader';

/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-FBL-Info-sectionContainer';

/**
 * The class name added to a conn table
 */
const CONNTABLE_CLASS = 'jp-FBL-Info-Conn-Table';

/**
 * The class name added to a conn table toolbar for add/remove all neurons
 */
const CONNTABLE_TOOLBAR = 'jp-FBL-Info-Conn-Table-Toolbar';
/**
 * An interface for data that is sent to info widget
 */
interface IInfoData {
  connectivity?: IConnData;
  summary?: {
    vfb_id?: string;
    data_source?: string;
    transmitters?: string;
    name?: string;
    locality?: boolean;
    arborization_data?: Record<string, unknown> | any;
    flycircuit_data?: Record<string, unknown> | any;
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
  };
}

/**
 * Empty data to be used in case there is no data coming in
 */
const empty_data: IInfoData = {
  connectivity: EmptyConnData,
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
  constructor(props?: { data: IInfoData; neu3d: Neu3DWidget }) {
    super();
    if (props?.data) {
      this.data = props.data;
    } else {
      this.data = empty_data;
    }

    // default to true
    this.neu3d = props?.neu3d;
    this.addClass(INFO_CLASS_JLab);
  }

  onAfterAttach(msg: any): void {
    super.onAfterAttach(msg);
    const preDiv = document.getElementById('info-connTable-pre');
    const postDiv = document.getElementById('info-connTable-post');

    if (preDiv) {
      this.tabConnPre = new ConnTable({
        container: preDiv,
        preOrPost: 'pre',
        data: this.data.connectivity.pre.details,
        neu3d: this.neu3d
      });
    }

    if (postDiv) {
      this.tabConnPost = new ConnTable({
        container: postDiv,
        preOrPost: 'post',
        data: this.data.connectivity.post.details,
        neu3d: this.neu3d
      });
    }

    this.dataChanged.connect((sender, { data, neu3d }) => {
      this.neu3d = neu3d;
      this.data = data;
      this.tabConnPost.setData(data?.connectivity ?? EmptyConnData, neu3d);
      this.tabConnPre.setData(data?.connectivity ?? EmptyConnData, neu3d);
    }, this);
  }

  /**
   * Set Data of Info Widget from Neu3D WIdget
   * @param neu3d
   * @param data
   */
  setData(neu3d: Neu3DWidget, data: IInfoData): void {
    this._dataChanged.emit({ data: data, neu3d: neu3d });
  }

  /** Reset Info to empty and re-render the table */
  reset(clear = false): void {
    this.tabConnPost?.tabulator?.redraw(true);
    this.tabConnPre?.tabulator?.redraw(true);
    this._dataChanged.emit({
      data: clear ? empty_data : this.data,
      neu3d: this.neu3d
    });
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
              neu3d: undefined
            }}
          >
            {(_, val) => {
              if (val.neu3d) {
                return (
                  <SessionDialogComponent
                    widget={val.neu3d}
                  ></SessionDialogComponent>
                );
              } else {
                return <></>;
              }
            }}
          </UseSignal>
        </div>
        <Components.CollapsibleSection
          title={'Summary'}
          children={
            <UseSignal
              signal={this.dataChanged}
              initialArgs={{
                data: this.data,
                neu3d: undefined
              }}
            >
              {(_, val) => {
                if (val.data?.summary) {
                  return (
                    <SummaryTable data={val.data.summary} neu3d={val.neu3d} />
                  );
                } else {
                  return (
                    <SummaryTable data={empty_data.summary} neu3d={val.neu3d} />
                  );
                }
              }}
            </UseSignal>
          }
        ></Components.CollapsibleSection>
        <Components.CollapsibleSection
          title={'Additional Info'}
          children={
            <UseSignal
              signal={this.dataChanged}
              initialArgs={{
                data: this.data,
                neu3d: undefined
              }}
            >
              {(_, val) => {
                if (val.data?.summary) {
                  return (
                    <AdditionalInfoTable
                      data={val.data.summary}
                      neu3d={val.neu3d}
                    />
                  );
                } else {
                  return (
                    <AdditionalInfoTable
                      data={empty_data.summary}
                      neu3d={val.neu3d}
                    />
                  );
                }
              }}
            </UseSignal>
          }
        ></Components.CollapsibleSection>
        <Components.CollapsibleSection
          title={'Morphometry'}
          children={
            <UseSignal
              signal={this.dataChanged}
              initialArgs={{
                data: this.data,
                neu3d: undefined
              }}
            >
              {(_, val) => {
                if (val.data?.summary) {
                  return (
                    <MorphometryTable
                      data={val.data.summary}
                      neu3d={val.neu3d}
                    />
                  );
                } else {
                  return (
                    <MorphometryTable
                      data={empty_data.summary}
                      neu3d={val.neu3d}
                    />
                  );
                }
              }}
            </UseSignal>
          }
        ></Components.CollapsibleSection>
        <Components.CollapsibleSection
          title={'Connectivity Profile'}
          children={
            <UseSignal
              signal={this.dataChanged}
              initialArgs={{
                data: this.data,
                neu3d: undefined
              }}
            >
              {(_, val) => {
                if (val.data?.connectivity) {
                  return (
                    <ConnSVG
                      pre={val.data.connectivity.pre.summary}
                      post={val.data.connectivity.post.summary}
                    />
                  );
                } else {
                  return (
                    <ConnSVG
                      pre={empty_data.connectivity.pre.summary}
                      post={empty_data.connectivity.post.summary}
                    />
                  );
                }
              }}
            </UseSignal>
          }
        ></Components.CollapsibleSection>
        <Components.CollapsibleSection
          title={'Presynaptic Partners'}
          children={
            <>
              <UseSignal
                signal={this.dataChanged}
                initialArgs={{
                  data: this.data,
                  neu3d: undefined
                }}
              >
                {(_, val) => {
                  if (val.data?.connectivity) {
                    return (
                      <Components.ConnTableToolbar
                        side={'pre'}
                        connData={val.data.connectivity.pre}
                        neu3d={val.neu3d}
                        tabConn={this.tabConnPre}
                      />
                    );
                  } else {
                    return (
                      <Components.ConnTableToolbar
                        side={'pre'}
                        connData={empty_data.connectivity.pre}
                        neu3d={val.neu3d}
                        tabConn={this.tabConnPre}
                      />
                    );
                  }
                }}
              </UseSignal>
              <div className={CONNTABLE_CLASS} id="info-connTable-pre" />
            </>
          }
        ></Components.CollapsibleSection>
        <Components.CollapsibleSection
          title={'Postsynaptic Partners'}
          children={
            <>
              <UseSignal
                signal={this.dataChanged}
                initialArgs={{
                  data: this.data,
                  neu3d: undefined
                }}
              >
                {(_, val) => {
                  if (val.data?.connectivity) {
                    return (
                      <Components.ConnTableToolbar
                        side={'post'}
                        connData={val.data.connectivity.post}
                        neu3d={val.neu3d}
                        tabConn={this.tabConnPost}
                      />
                    );
                  } else {
                    return (
                      <Components.ConnTableToolbar
                        side={'post'}
                        connData={empty_data.connectivity.post}
                        neu3d={val.neu3d}
                        tabConn={this.tabConnPost}
                      />
                    );
                  }
                }}
              </UseSignal>
              <div className={CONNTABLE_CLASS} id="info-connTable-post" />
            </>
          }
        ></Components.CollapsibleSection>
      </div>
    );
  }

  /**
   * Signal emmited when data rendered in Info Widget in changed
   */
  get dataChanged(): ISignal<this, { data: IInfoData; neu3d: Neu3DWidget }> {
    return this._dataChanged;
  }

  tabConnPre: ConnTable;
  tabConnPost: ConnTable;
  data: IInfoData; // data to be displayed
  neu3d: Neu3DWidget; // caller neu3d widget
  private _dataChanged = new Signal<
    this,
    { data: IInfoData; neu3d: Neu3DWidget }
  >(this);
}

namespace Components {
  export class CollapsibleSection extends React.Component<
    {
      title: string;
      children: React.Component | any;
    },
    { visible: boolean }
  > {
    state: Readonly<{ visible: boolean }> = {
      visible: true
    };

    toggleVisibility(): void {
      this.setState({
        visible: !this.state.visible
      });
    }

    render(): React.ReactNode {
      return (
        <>
          <a onClick={() => this.toggleVisibility()}>
            <header className={SECTION_HEADER_CLASS}>
              <caretRightIcon.react
                display={this.state.visible ? 'none' : 'inline'}
              ></caretRightIcon.react>
              <caretDownIcon.react
                display={this.state.visible ? 'inline' : 'none'}
              ></caretDownIcon.react>
              <h2>{this.props.title}</h2>
            </header>
          </a>
          <div
            className={CONTAINER_CLASS + (this.state.visible ? '' : ' hidden')}
          >
            {this.props.children}
          </div>
        </>
      );
    }
  }

  export class ConnTableToolbar extends React.Component<{
    side: 'pre' | 'post';
    connData: any;
    neu3d: Neu3DWidget;
    tabConn: ConnTable;
  }> {
    get hasSyn(): boolean {
      if (!this.props.connData?.details) {
        return false;
      }
      return this.hasSynMorph(this.props.connData.details);
    }

    get hasNeu(): boolean {
      if (!this.props.connData?.details) {
        return false;
      }
      return this.props.connData.details.length > 0;
    }

    get numNeu(): number {
      if (this.props.connData?.details) {
        return this.props.connData?.details.length;
      }
      return 0;
    }

    get numSyn(): number {
      let count = 0;
      if (this.props.connData?.details) {
        for (const entry of this.props.connData.details) {
          if (entry.has_syn_morph) {
            count += 1;
          }
        }
      }
      return count;
    }

    getActiveMorpho(
      fields: string | string[] = 'rid'
    ): Array<{ [field: string]: string }> {
      if (!Array.isArray(fields)) {
        fields = [fields];
      }
      const tmp: Array<string[]> = this.props.tabConn.tabulator
        .getData('active')
        .map((r: any) => (fields as string[]).map(f => r[f]));
      const activeNeuronRids: Array<{ [field: string]: string }> = [];
      for (const ids of tmp) {
        const active: { [field: string]: string } = {};
        for (const idx in fields) {
          active[fields[idx]] = ids[idx];
        }
        activeNeuronRids.push(active);
      }
      return activeNeuronRids;
    }

    hasSynMorph(connDataDetails: Array<any>): boolean {
      for (const entry of connDataDetails) {
        if (entry.has_syn_morph) {
          return true;
        }
      }
      return false;
    }

    /**
     * Return React Component of the Neuron information to be added
     */
    private _neuronNumberTemplate(
      pre_post: 'pre' | 'post',
      add_remove: 'add' | 'remove',
      total: number,
      active: number,
      inWorkspace: number,
      change: number
    ): any {
      return (
        <>
          <div
            className={
              'jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput'
            }
            data-mime-type={'text/markdown'}
          >
            <table>
              <tbody>
                <tr>
                  <th>Type</th>
                  <th>Number</th>
                </tr>
                <tr>
                  <td>
                    Total {pre_post === 'pre' ? 'Presynaptic' : 'PostSynaptic'}{' '}
                    Partners
                  </td>
                  <td>{total}</td>
                </tr>
                <tr>
                  <td>Active in Connectivity Table</td>
                  <td>{active}</td>
                </tr>
                <tr>
                  <td>Currently in Workspace</td>
                  <td>{inWorkspace}</td>
                </tr>
                <tr>
                  <td>To be {add_remove === 'add' ? 'Added' : 'Removed'}</td>
                  <td>
                    <b>{change}</b>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      );
    }

    addAllNeurons(): void {
      if (!this.hasNeu) {
        return;
      }
      const filtered_ids = this.getActiveMorpho(['rid', 'n_rid']);
      const inworkspace_ids = [...filtered_ids].filter(ids =>
        this.props.neu3d.isInWorkspace(ids.rid)
      );
      const change_ids = [...filtered_ids].filter(
        ids => !inworkspace_ids.includes(ids)
      );

      showDialog({
        title: 'Add all filtered neurons to Neu3D widget?',
        body: this._neuronNumberTemplate(
          this.props.side,
          'add',
          this.numNeu,
          filtered_ids.length,
          inworkspace_ids.length,
          change_ids.length
        ),
        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'ADD' })]
      }).then(result => {
        if (result.button.accept) {
          this.props.neu3d.addByRid(change_ids.map(ids => ids.n_rid));
        }
      });
    }

    removeAllNeurons(): void {
      if (!this.hasNeu) {
        return;
      }
      const filtered_ids = this.getActiveMorpho(['rid', 'n_rid']);
      const inworkspace_ids = [...filtered_ids].filter(ids =>
        this.props.neu3d.isInWorkspace(ids.rid)
      );
      const change_ids = [...filtered_ids].filter(ids =>
        inworkspace_ids.includes(ids)
      );

      showDialog({
        title: 'Remove all filtered neurons from Neu3D widget?',
        body: this._neuronNumberTemplate(
          this.props.side,
          'remove',
          this.numNeu,
          filtered_ids.length,
          inworkspace_ids.length,
          change_ids.length
        ),
        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'REMOVE' })]
      }).then(result => {
        if (result.button.accept) {
          this.props.neu3d.removeByRid(change_ids.map(ids => ids.n_rid));
        }
      });
    }

    addAllSynapses(): void {
      if (!this.hasSyn) {
        return;
      }
      const filtered_ids = this.getActiveMorpho(['syn_rid', 's_rid']);
      const inworkspace_ids = [...filtered_ids].filter(ids =>
        this.props.neu3d.isInWorkspace(ids.syn_rid)
      );
      const change_ids = [...filtered_ids].filter(
        ids => !inworkspace_ids.includes(ids)
      );

      showDialog({
        title: 'Add all filtered synapse morphologies to Neu3D widget?',
        body: this._neuronNumberTemplate(
          this.props.side,
          'add',
          this.numNeu,
          filtered_ids.length,
          inworkspace_ids.length,
          change_ids.length
        ),
        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'ADD' })]
      }).then(result => {
        if (result.button.accept) {
          this.props.neu3d.addByRid(change_ids.map(ids => ids.s_rid));
        }
      });
    }

    removeAllSynapses(): void {
      if (!this.hasSyn) {
        return;
      }
      const filtered_ids = this.getActiveMorpho(['syn_rid', 's_rid']);
      const inworkspace_ids = [...filtered_ids].filter(ids =>
        this.props.neu3d.isInWorkspace(ids.syn_rid)
      );
      const change_ids = [...filtered_ids].filter(ids =>
        inworkspace_ids.includes(ids)
      );

      showDialog({
        title: 'Remove all filtered synapse morphologies from Neu3D widget?',
        body: this._neuronNumberTemplate(
          this.props.side,
          'add',
          this.numNeu,
          filtered_ids.length,
          inworkspace_ids.length,
          change_ids.length
        ),
        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'REMOVE' })]
      }).then(result => {
        if (result.button.accept) {
          this.props.neu3d.removeByRid(change_ids.map(ids => ids.s_rid));
        }
      });
    }

    render(): React.ReactNode {
      return (
        <>
          <div
            className={`jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput ${CONNTABLE_TOOLBAR}`}
            data-mime-type={'text/markdown'}
          >
            <table>
              <tbody>
                <tr>
                  <td>{this.numNeu} Neurons</td>
                  <td>
                    <a
                      onClick={() => this.addAllNeurons()}
                      style={{ display: this.hasNeu ? 'inline' : 'none' }}
                    >
                      <i className={'fa fa-plus-circle'}></i>
                    </a>
                    <a
                      onClick={() => this.removeAllNeurons()}
                      style={{ display: this.hasNeu ? 'inline' : 'none' }}
                    >
                      <i className={'fa fa-minus-circle'}></i>
                    </a>
                  </td>
                  {/* <button onClick={()=>this.removeAllNeurons()}>-</button> */}
                  <td>{this.numSyn} have Synapse Morphologies</td>
                  <td>
                    <a
                      onClick={() => this.addAllSynapses()}
                      style={{ display: this.hasSyn ? 'inline' : 'none' }}
                    >
                      <i className={'fa fa-plus-circle'}></i>
                    </a>
                    <a
                      onClick={() => this.removeAllSynapses()}
                      style={{ display: this.hasSyn ? 'inline' : 'none' }}
                    >
                      <i className={'fa fa-minus-circle'}></i>
                    </a>
                  </td>
                  {/* <button onClick={()=>this.addAllSynapses()}>+</button>
                  <button onClick={()=>this.removeAllSynapses()}>-</button> */}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      );
    }
  }
}
