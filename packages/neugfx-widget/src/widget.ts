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
    neugfx_widget: any;
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
    window.neugfx_widget = this;
    window.neurogfxWidget = this._neugfxContainer;
    window.addEventListener("mousedown", function(){$(".jp-FFBOLabBlock").show(); });
    window.addEventListener("mouseup", function(){$(".jp-FFBOLabBlock").hide(); });
    Event.prototype.stopPropagation = function(){  };
    var _this = this;
    let event_func = function(event: any) {
      // console.log(event.data);
      console.log("[NeuGFX] Input:", event.data);
      if (event.data.messageType == 'text') {
        console.log("[NeuGFX] message:", event.data.data);
      }
      if (event.data.messageType == 'alert') {
        if (event.data.alertType == 'success') {
          console.log('[NeuGFX] Error!', event.data.data);
          /*(izi as any).success({
            id: "success",
            message: event.data.data,
            transitionIn: 'bounceInLeft',
            position: 'topLeft',
          });*/
        }
        else if (event.data.alertType == 'error') {
          console.log('[NeuGFX] Success!', event.data.data);
          /*(izi as any).error({
            id: "success",
            message: event.data.data,
            transitionIn: 'bounceInLeft',
            position: 'topLeft',
          });*/
        }
      }
      if (event.data.messageType == 'NLPquery') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.executeNLPquery(query="' + event.data.query + '"); _FFBOLabcomm.send(data=_FFBOLABres)' } });
      }
      if (event.data.messageType == 'NLPloadTag') {
        console.log('loadTag');
        _this.sessionContext.session.kernel.requestExecute({code: "fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].executeNAquery(query='${code}')"}).done;
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.loadTag("' + event.data.tag + '"); _FFBOLabcomm.send(data=_FFBOLABres)' } });
      }
      if (event.data.messageType == 'NLPaddByUname') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
      }
      if (event.data.messageType == 'NLPremoveByUname') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + '], verb="remove");' } });
      }
      if (event.data.messageType == 'loadExperimentConfig') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.loadExperimentConfig("""' + event.data.config + '""");' } });
      }
      if (event.data.messageType == 'Execute') {
        // neu3dwidget._userAction.emit({ action: 'execute', content: { code: event.data.content } });
      }
    };

    window.addEventListener('message', event_func);
    
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

  get species(): string{
    return this._species;
  }
  
  set species(new_species: string) {
    if (new_species === this._species) {
      return;
    }
    this._species = new_species;
    this._speciesChanged.emit(this._species);
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
