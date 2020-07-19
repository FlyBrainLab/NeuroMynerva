import $ from 'jquery';
import { ToolbarButton } from '@jupyterlab/apputils';
import { NeuGFXModel } from './model';
import { FBLWidget } from '../template/index';
import { Icons } from '../../index';
import '../../../style/widgets/neugfx/neugfx.css';
const NeuGFX_CLASS_JLab = "jp-FBL-NeuGFX";
/**
* An NeuGFX Widget
*/
export class NeuGFXWidget extends FBLWidget {
    constructor(options) {
        super(Object.assign({ name: options.name || `NeuGFX-${Private.count++}`, icon: Icons.neuGFXIcon }, options));
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
        this._neugfxContainer.src = "https://ffbolab.neurogfx.fruitflybrain.org/";
        this._blocker = document.createElement('div');
        this._blocker.className = "jp-FFBOLabBlock";
        this.node.appendChild(this._blocker);
        $(".jp-FFBOLabBlock").hide();
        window.neugfx_widget = this;
        window.neurogfxWidget = this._neugfxContainer;
        window.addEventListener("mousedown", function () { $(".jp-FFBOLabBlock").show(); });
        window.addEventListener("mouseup", function () { $(".jp-FFBOLabBlock").hide(); });
        Event.prototype.stopPropagation = function () { };
        var _this = this;
        let event_func = function (event) {
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
                let code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].loadTag(query="${event.data.tag}")
        `;
                _this.sessionContext.session.kernel.requestExecute({ code: code_to_send }).done;
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.loadTag("' + event.data.tag + '"); _FFBOLabcomm.send(data=_FFBOLABres)' } });
            }
            if (event.data.messageType == 'NLPaddByUname') {
                console.log('Adding by uname');
                let code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].addByUname([${event.data.uname}])
        `;
                console.log(code_to_send);
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
                _this.sessionContext.session.kernel.requestExecute({ code: code_to_send }).done;
            }
            if (event.data.messageType == 'NLPremoveByUname') {
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + '], verb="remove");' } });
                console.log('Removing by uname');
                let code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].addByUname([${event.data.uname}], verb='remove')
        `;
                console.log(code_to_send);
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
                _this.sessionContext.session.kernel.requestExecute({ code: code_to_send }).done;
            }
            if (event.data.messageType == 'loadExperimentConfig') {
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.loadExperimentConfig("""' + event.data.config + '""");' } });
                console.log('Loading experiment configuration.');
                let code_to_send = `
        _fblres = fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client'].loadExperimentConfig("""${event.data.config}""")
        `;
                console.log(code_to_send);
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
                _this.sessionContext.session.kernel.requestExecute({ code: code_to_send }).done;
            }
            if (event.data.messageType == 'Execute') {
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: event.data.content } });
                console.log('Executing code directly.');
                let code_to_send = `
        ${event.data.content}
        `;
                code_to_send = code_to_send.replace('$CLIENT', `
        fbl.client_manager.clients[fbl.widget_manager.widgets['${_this.id}'].client_id]['client']
        `);
                console.log(code_to_send);
                // neu3dwidget._userAction.emit({ action: 'execute', content: { code: '_FFBOLABres = _FFBOLABClient.addByUname([' + event.data.uname + ']);' } });
                _this.sessionContext.session.kernel.requestExecute({ code: code_to_send }).done;
            }
        };
        window.addEventListener('message', event_func);
    }
    onCommMsg(msg) {
        console.log(msg);
        this._neugfxContainer.contentWindow.postMessage({ messageType: msg.messageType, data: msg.data }, '*');
    }
    initFBLCode() {
        return super.initFBLCode();
    }
    initModel(model) {
        // create model
        this.model = new NeuGFXModel(model);
        this.model.dataChanged.connect(this.onDataChanged, this);
        this.model.metadataChanged.connect(this.onMetadataChanged, this);
        this.model.statesChanged.connect(this.onStatesChanged, this);
    }
    renderModel(change) {
        return;
    }
    get species() {
        return this._species;
    }
    set species(new_species) {
        if (new_species === this._species) {
            return;
        }
        this._species = new_species;
        this._speciesChanged.emit(this._species);
    }
}
;
/**
 * A namespace for private data.
 */
var Private;
(function (Private) {
    Private.count = 1;
    function createButton(icon, tooltip, className, func) {
        let btn = new ToolbarButton({
            icon: icon,
            iconclassName: className,
            onClick: func,
            tooltip: tooltip
        });
        return btn;
    }
    Private.createButton = createButton;
})(Private || (Private = {}));
