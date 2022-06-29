/* eslint-disable */
import * as React from 'react';
import $ from 'jquery';
import { Signal, ISignal } from '@lumino/signaling';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import {
  ToolbarButton,
  UseSignal,
  ToolbarButtonComponent,
  ReactWidget
} from '@jupyterlab/apputils';
import { LabIcon } from '@jupyterlab/ui-components';
import { NeuGFXModel, INeuGFXModel } from './model';
import { IFBLWidget, FBLWidget } from '../template-widget/index';
import { Icons } from '../../index';
import '../../../style/neugfx-widget/neugfx.css';
import { FFBOProcessor } from '../../ffboprocessor';
import { Widget } from '@lumino/widgets';

const NeuGFX_CLASS_JLab = 'jp-FBL-NeuGFX';
const TOOLBAR_IFRAME_CLASS = 'jp-FBL-NeuGFX-iFrame';

declare global {
  interface Window {
    neurogfxWidget: any;
    neugfx_widget: any;
    jq: any;
  }
}

/**
 * An NeuGFX Widget
 */
export class NeuGFXWidget extends FBLWidget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions, iFrameSrc?: string) {
    super({
      name: options.name || `NeuGFX-${Private.count++}`,
      icon: Icons.neuGFXIcon,
      ...options
    });
    this.addClass(NeuGFX_CLASS_JLab);

    this._neugfxContainer = document.createElement('iframe');
    this._neugfxContainer.className = 'neurogfxwidget-iframe';
    this._neugfxContainer.height = '100%';
    this._neugfxContainer.width = '100%';
    this._neugfxContainer.id = 'neurogfxwidget-iframe';
    this._neugfxContainer.sandbox.add('allow-scripts');
    this._neugfxContainer.sandbox.add('allow-same-origin');
    this._neugfxContainer.sandbox.add('allow-forms');
    this.node.appendChild(this._neugfxContainer);

    this._iFrameSrc =
      iFrameSrc ?? 'https://ffbolab.neurogfx.fruitflybrain.org/';
    this._neugfxContainer.src = this._iFrameSrc;
    this._blocker = document.createElement('div');
    this._blocker.className = 'jp-FFBOLabBlock';
    this.node.appendChild(this._blocker);
    $('.jp-FFBOLabBlock').hide();
    window.neugfx_widget = this;
    window.neurogfxWidget = this._neugfxContainer;
    window.addEventListener('mousedown', () => {
      $('.jp-FFBOLabBlock').show();
    });
    window.addEventListener('mouseup', () => {
      $('.jp-FFBOLabBlock').hide();
    });
    Event.prototype.stopPropagation = function () {};
    const _this = this;
    const event_func = function (event: any) {
      console.debug('[NeuGFX] Input:', event.data);
      if (event.data.messageType == 'text') {
        console.debug('[NeuGFX] message:', event.data.data);
      }
      if (event.data.messageType == 'alert') {
        if (event.data.alertType == 'success') {
          console.debug('[NeuGFX] Error!', event.data.data);
          /*(izi as any).success({
            id: "success",
            message: event.data.data,
            transitionIn: 'bounceInLeft',
            position: 'topLeft',
          });*/
        } else if (event.data.alertType == 'error') {
          console.debug('[NeuGFX] Success!', event.data.data);
          /*(izi as any).error({
            id: "success",
            message: event.data.data,
            transitionIn: 'bounceInLeft',
            position: 'topLeft',
          });*/
        }
      }
      if (event.data.messageType == 'NLPquery') {
        console.debug('NLPquery');
        const code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].executeNLPquery(query="${event.data.query}")
        `;
        _this.sessionContext.session.kernel.requestExecute({
          code: code_to_send
        }).done;
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.executeNLPquery(query="' + event.data.query + '"); _FFBOLabcomm.send(data=_FFBOLABres)' } });
      }
      if (event.data.messageType == 'NLPloadTag') {
        console.debug('loadTag');
        const code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].loadTag("${event.data.tag}")
        `;
        _this.sessionContext.session.kernel.requestExecute({
          code: code_to_send
        }).done;
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.loadTag("' + event.data.tag + '"); _FFBOLabcomm.send(data=_FFBOLABres)' } });
      }
      if (event.data.messageType == 'NLPaddByUname') {
        console.debug('Adding by uname');
        const code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].addByUname([${event.data.uname}])
        `;
        console.debug(code_to_send);
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
        _this.sessionContext.session.kernel.requestExecute({
          code: code_to_send
        }).done;
      }
      if (event.data.messageType == 'NLPremoveByUname') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + '], verb="remove");' } });
        console.debug('Removing by uname');
        const code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].addByUname([${event.data.uname}], verb='remove')
        `;
        console.debug(code_to_send);
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
        _this.sessionContext.session.kernel.requestExecute({
          code: code_to_send
        }).done;
      }
      if (event.data.messageType == 'loadExperimentConfig') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.loadExperimentConfig("""' + event.data.config + '""");' } });
        console.debug('Loading experiment configuration.');
        const code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].loadExperimentConfig("""${event.data.config}""")
        `;
        console.debug(code_to_send);
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
        _this.sessionContext.session.kernel.requestExecute({
          code: code_to_send
        }).done;
      }
      if (event.data.messageType == 'Execute') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: event.data.content } });
        console.debug('Executing code directly.');
        let code_to_send = `
        ${event.data.content}
        `;
        code_to_send = code_to_send.replace(
          '$CLIENT',
          `
        fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client']
        `
        );
        console.debug(code_to_send);
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
        _this.sessionContext.session.kernel.requestExecute({
          code: code_to_send
        }).done;
      }
    };

    window.addEventListener('message', event_func);
  }

  set iFrameSrc(url: string) {
    if (url !== this._iFrameSrc) {
      this._iFrameSrc = url;
      this._neugfxContainer.src = url;
    }
    this._iFrameSrcChanged.emit(url);
    this._modelChanged.emit({ url: this._iFrameSrc });
    return;
  }

  get iFrameSrc(): string {
    return this._iFrameSrc;
  }

  onCommMsg(msg: any) {
    const thisMsg = msg.content.data as any;
    console.debug('GFX received message:', thisMsg);

    if (thisMsg['widget'] === 'GFX') {
      this._neugfxContainer.contentWindow.postMessage(
        {
          messageType: msg.content.data.messageType,
          data: msg.content.data.data
        },
        '*'
      );
    }
  }

  initFBLCode(): string {
    return super.initFBLCode();
  }

  initModel(model: Partial<INeuGFXModel>) {
    // create model
    this.model = new NeuGFXModel(model);
    this.model.dataChanged.connect(this.onDataChanged, this);
    this.model.metadataChanged.connect(this.onMetadataChanged, this);
    this.model.statesChanged.connect(this.onStatesChanged, this);
  }

  populateToolBar(): void {
    super.populateToolBar();
    this.toolbar.addItem(
      'IFrame Src Changer',
      Private.createIFrameSrcButton(this)
    );
  }

  renderModel(change?: any): void {
    return;
  }

  get processor(): string {
    return this._processor;
  }

  set processor(newProcessor: string) {
    if (newProcessor === this._processor) {
      return;
    }
    if (newProcessor === FFBOProcessor.NO_PROCESSOR) {
      this._processorChanged.emit(newProcessor);
      this._processor = newProcessor;
      return;
    }
    if (!(newProcessor in this.ffboProcessors)) {
      return;
    }
    this._processorChanged.emit(newProcessor);
    this._processor = newProcessor;
  }

  get iFrameSrcChanged(): ISignal<this, string> {
    return this._iFrameSrcChanged;
  }

  /**
   * The Elements associated with the widget.
   */
  private _neugfxContainer: HTMLIFrameElement;
  private _blocker: HTMLDivElement;
  private _iFrameSrcChanged = new Signal<this, string>(this);
  private _iFrameSrc: string;
  model: NeuGFXModel;
}

/**
 * A namespace for private data.
 */
namespace Private {
  export let count = 1;

  export function createButton(
    icon: LabIcon.IMaybeResolvable,
    tooltip: string,
    className: string,
    func: () => void
  ): ToolbarButton {
    const btn = new ToolbarButton({
      icon: icon,
      iconclassName: className,
      onClick: func,
      tooltip: tooltip
    } as any);
    return btn;
  }

  // Component for selecting iframe src

  /**
   * A widget that provides a Processor selection.
   */
  export class IFrameSrcSelector extends Widget {
    /**
     * Create a new kernel selector widget.
     */
    constructor(widget: NeuGFXWidget) {
      const body = document.createElement('div');
      const text = document.createElement('label');
      text.textContent = `Select Processor for: "${widget.id}"`;
      body.appendChild(text);

      const inputDiv = document.createElement('input');
      inputDiv.placeholder = widget.iFrameSrc ?? 'NeuGFX IFrame URL...';
      body.appendChild(inputDiv);
      super({ node: body });
    }

    /**
     * Get the value of the kernel selector widget.
     */
    getValue(): string {
      const inputDiv = this.node.querySelector('input') as HTMLInputElement;
      return inputDiv.value as string;
    }
  }

  /**
   * React component for a Iframe Source Button.
   * This wraps the ToolbarButtonComponent and watches the iFrameSrc
   */
  export function IFrameSrcComponent(props: { widget: NeuGFXWidget }) {
    const { widget } = props;
    const callback = () =>
      showDialog({
        title: 'Change iFrame Src',
        body: new IFrameSrcSelector(widget),
        buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'Change' })]
      }).then(result => {
        if (result.button.accept) {
          widget.iFrameSrc = result.value;
        }
      });

    const signal = widget.iFrameSrcChanged;
    const iframeSrc = widget.iFrameSrc;
    return (
      <UseSignal signal={signal} initialArgs={iframeSrc}>
        {(_, processor) => (
          <ToolbarButtonComponent
            className={TOOLBAR_IFRAME_CLASS}
            onClick={callback}
            icon={Icons.webIcon}
            tooltip={'Change IFrame Src'}
          />
        )}
      </UseSignal>
    );
  }

  export function createIFrameSrcButton(widget: NeuGFXWidget): Widget {
    const el = ReactWidget.create(<IFrameSrcComponent widget={widget} />);
    el.addClass(TOOLBAR_IFRAME_CLASS);
    return el;
  }
}
