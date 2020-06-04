import $ from 'jquery';
import { IFBLWidget, FBLWidget } from '@flybrainlab/fbl-template-widget';
import { ToolbarButton } from '@jupyterlab/apputils';
import { Icons } from '@flybrainlab/fbl-template-widget';
import { LabIcon } from '@jupyterlab/ui-components';
import '../style/index.css';
import { NeuGFXModel, INeuGFXModel } from './model';

const NeuGFX_CLASS_JLab = "jp-FBL-NeuGFX";

declare global {
  interface Window {
    neurogfxWidget: any;
    jq: any;
  }
}




/**
* An NeuGFX Widget
*/
export class NeuGFXWidget extends FBLWidget implements IFBLWidget {
  constructor(options: FBLWidget.IOptions) {
    super({
      name:options.name || `NeuGFX-${Private.count++}`, 
      icon: Icons.neuGFXIcon,
      ...options});
    this.addClass(NeuGFX_CLASS_JLab);
    

    this._neugfxContainer = document.createElement('iframe');
    this._neugfxContainer.className = 'neurogfxwidget-iframe';
    this._neugfxContainer.height = '100%'
    this._neugfxContainer.width = '100%'
    this._neugfxContainer.id = 'neurogfxwidget-iframe';
    this._neugfxContainer.sandbox.add('allow-scripts');
    this._neugfxContainer.sandbox.add('allow-same-origin');
    this._neugfxContainer.sandbox.add('allow-forms');
    this.node.appendChild(this._neugfxContainer);
    this._neugfxContainer.src = "https://ffbolab.neurogfx.fruitflybrain.org/";
    this._blocker = document.createElement('div');
    this._blocker.className = "jp-FFBOLabBlock";
    this.node.appendChild(this._blocker);
    $(".jp-FFBOLabBlock").hide();
    window.neurogfxWidget = this._neugfxContainer;
    window.addEventListener("mousedown", function(){$(".jp-FFBOLabBlock").show(); });
    window.addEventListener("mouseup", function(){$(".jp-FFBOLabBlock").hide(); });
    Event.prototype.stopPropagation = function(){  };
  }

  onCommMsg(msg: any) {
    this._neugfxContainer.contentWindow.postMessage({ messageType: msg.messageType, data: msg.data }, '*');
  }

  initFBLCode(): string {
    return super.initFBLCode();
  }

  initModel(model: Partial<INeuGFXModel>){
    // create model
    this.model = new NeuGFXModel(model);
    this.model.dataChanged.connect(this.onDataChanged, this);
    this.model.metadataChanged.connect(this.onMetadataChanged, this);
    this.model.statesChanged.connect(this.onStatesChanged, this);
  }

  renderModel(change?: any): void {
    return;
  }

  /**
  * The Elements associated with the widget.
  */
  private _neugfxContainer: HTMLIFrameElement;
  private _blocker: HTMLDivElement;
  model: NeuGFXModel;
};


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
    let btn = new ToolbarButton({
      icon: icon,
      iconclassName: className,
      onClick: func,
      tooltip: tooltip
    } as any);
    return btn;
  }
}
