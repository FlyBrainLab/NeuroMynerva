import * as React from 'react';
import {
  Dialog,
  UseSignal,
  ReactWidget,
  showDialog
} from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';

import { Widget } from '@lumino/widgets';
import { ToolbarButtonComponent } from '@jupyterlab/apputils';
import { IFBLWidget, FBLWidget } from './widget';
import { fblSettingIcon } from '../../icons';
import { FFBOProcessor } from '../../ffboprocessor';

const TOOLBAR_SERVER_CLASS = 'jp-FBL-Processor';

/**
 * A widget that provides a Processor selection.
 */
export class ProcessorSelector extends Widget {
  /**
   * Create a new kernel selector widget.
   */
  constructor(widget: IFBLWidget) {
    const body = document.createElement('div');
    const text = document.createElement('label');
    text.textContent = `Select Processor for: "${widget.id}"`;
    body.appendChild(text);

    const selector = document.createElement('select');
    for (const processor of Object.keys(widget.ffboProcessors)) {
      const option = document.createElement('option');
      option.text = processor;
      option.value = processor;
      selector.appendChild(option);
    }
    body.appendChild(selector);
    super({ node: body });
  }

  /**
   * Get the value of the kernel selector widget.
   */
  getValue(): string {
    const selector = this.node.querySelector('select') as HTMLSelectElement;
    return selector.value as string;
  }
}

/**
 * A widget show all information regarding a given FBL session
 */
class SessionDialog extends ReactWidget {
  /**
   * Create a new kernel selector widget.
   */
  constructor(widget: FBLWidget) {
    super();
    this.widget = widget;
  }

  protected render() {
    const kernelInfo = [];
    const processorInfo = [];
    const commInfo = [];
    if (this.widget.sessionContext.session) {
      kernelInfo.push(
        <tr key={'kernel-0'}>
          <td>
            <b>Kernel Path</b>
          </td>
          <td> {PathExt.dirname(this.widget.sessionContext.path)}</td>
        </tr>
      );
      kernelInfo.push(
        <tr key={'kernel-1'}>
          <td>
            <b>Kernel Name</b>
          </td>
          <td> {this.widget.sessionContext.kernelDisplayName}</td>
        </tr>
      );
    }
    if (
      this.widget.processor &&
      this.widget.processor !== FFBOProcessor.NO_PROCESSOR
    ) {
      const processor = this.widget.ffboProcessors[this.widget.processor];
      processorInfo.push(
        <tr key={'processor-1'}>
          <td>
            <b>IP</b>
          </td>
          <td> {processor.SERVER.IP} </td>
        </tr>
      );
      processorInfo.push(
        <tr key={'processor-2'}>
          <td>
            <b>User</b>
          </td>
          <td> {processor.USER.user} </td>
        </tr>
      );
      processorInfo.push(
        <tr key={'processor-3'}>
          <td>
            <b>Secret</b>
          </td>
          <td> {processor.USER.secret} </td>
        </tr>
      );
      processorInfo.push(
        <tr key={'processor-4'}>
          <td>
            <b>Dataset</b>
          </td>
          <td> {processor.SERVER.dataset[0]} </td>
        </tr>
      );
    }
    if (this.widget.comm) {
      commInfo.push(
        <tr key={'comm-0'}>
          <td>
            <b>Comm Id</b>
          </td>
          <td> {this.widget.comm.commId ?? 'Comm Not Established'}</td>
        </tr>
      );
    }

    return (
      <div className="lm-Widget p-Widget">
        <div
          className="jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput"
          data-mime-type="text/markdown"
        >
          <table>
            <tbody>
              <tr key={'kernel'}>
                <td>
                  <b>Kernel</b>
                </td>
                <td>{this.widget.sessionContext?.name ?? 'No Kernel'}</td>
              </tr>
              {kernelInfo}
              <tr key={'processor'}>
                <td>
                  <b>Processor</b>
                </td>
                <td>{this.widget.processor}</td>
              </tr>
              {processorInfo}
              <tr key={'comm'}>
                <td>
                  <b>Comm Target</b>
                </td>
                <td>{this.widget._commTarget}</td>
              </tr>
              {commInfo}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  widget: FBLWidget;
}

/**
 * React component for a processor name button.
 * This wraps the ToolbarButtonComponent and watches the processor
 * keyword
 */
function ProcessorComponent(props: { widget: IFBLWidget }) {
  const { widget } = props;
  const callback = () =>
    showDialog({
      title: 'Change Processor',
      body: new ProcessorSelector(widget),
      buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'Change' })]
    }).then(result => {
      if (result.button.accept) {
        widget.processor = result.value;
      }
    });

  const signal = widget.processorChanged;
  const processor = widget.processor;
  return (
    <UseSignal signal={signal} initialArgs={processor}>
      {(_, processor) => (
        <ToolbarButtonComponent
          className={TOOLBAR_SERVER_CLASS}
          onClick={callback}
          label={processor}
          tooltip={'Change Processor'}
        />
      )}
    </UseSignal>
  );
}

/**
 * React component for session overview dialog
 * This wraps the ToolbarButtonComponent and watches the processor
 * keyword
 */
export function SessionDialogComponent(props: {
  widget: FBLWidget;
}): JSX.Element {
  const { widget } = props;
  const callback = () =>
    showDialog({
      title: widget.name,
      body: new SessionDialog(widget),
      buttons: [Dialog.okButton({ label: 'OK' })]
    });

  return (
    <ToolbarButtonComponent
      className={TOOLBAR_SERVER_CLASS}
      onClick={callback}
      icon={fblSettingIcon}
      tooltip={'View Session Details'}
    />
  );
}

export function createProcessorButton(widget: FBLWidget): Widget {
  const el = ReactWidget.create(<ProcessorComponent widget={widget} />);
  el.addClass(TOOLBAR_SERVER_CLASS);
  return el;
}

export function createSessionDialogButton(widget: FBLWidget): Widget {
  const el = ReactWidget.create(<SessionDialogComponent widget={widget} />);
  el.addClass(TOOLBAR_SERVER_CLASS);
  return el;
}
