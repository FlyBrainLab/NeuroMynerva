import { Widget } from '@phosphor/widgets';
import { Signal, ISignal } from '@phosphor/signaling';
import { UUID } from '@phosphor/coreutils';
import { Message } from '@phosphor/messaging';
import { JSONObject,PromiseDelegate } from '@phosphor/coreutils';

import { FFBOLabModel, IFFBOChildWidget, IFFBOLabWidget } from 'master-extension';

import * as $ from "jquery";

const VERBOSE = false;
const GFX_CLASS = "jp-FFBOLabGFX";

/**
 * A NeuroGFX Widget
 * 
 * ## Note
 * The GFX Widget is implemented indepedently and added as 
 * an iframe for now
 */
export
  class NeuroGFXWidget extends Widget implements IFFBOChildWidget {
  /**
   * Construct a new GFX widget.
   */
  constructor() { 
    super();
    this.node.tabIndex = -1;
    this.addClass(GFX_CLASS);
    
    this.id = 'FFBOLab-GFX-'+UUID.uuid4();
    let localPath = "";
    this.title.label = '[GFX] ' + localPath;
    this.title.closable = true;
    this.title.dataset = {
      type: 'ffbo-title',
      ...this.title.dataset
    };
    
    // add fullscren button
    let fullscreenToggle = document.createElement('button');
    let toggleIcon = document.createElement('i');
    toggleIcon.className = 'fas fa-expand';
    fullscreenToggle.id = 'panel-fullscreen';
    fullscreenToggle.className = 'NM-fullsize-button';
    fullscreenToggle.onclick = (e) => {
      e.preventDefault();
    //   if(this.node.classList.contains('panel-fullscreen')) {
    //     this.node.classList.remove('panel-fullscreen');
    //   }
    //   else {
    //     this.node.classList.add('panel-fullscreen');
    //   }
      window.JLabApp.commands.execute('application:toggle-mode');
    };
    fullscreenToggle.appendChild(toggleIcon);
    this.node.appendChild(fullscreenToggle);
    this._initialize(); 
  }

  /**
   * initialization routine
   * 
   * ## Note
   * 1. creates iframe
   * 2. addes ui block 
   * 3. resolve ready status
   */
  private _initialize() : void {
    this.addClass('neurogfxWidget');
    this._iframe = document.createElement('iframe');
    this._iframe.className = 'neurogfxwidget-iframe';
    this._iframe.id = 'neurogfxwidget-iframe';
    this._iframe.sandbox.add('allow-scripts');
    this._iframe.sandbox.add('allow-same-origin');
    this._iframe.sandbox.add('allow-forms');
    this.node.appendChild(this._iframe);
    this._iframe.src = "https://ffbolab.neurogfx.fruitflybrain.org/";
    this._blocker = document.createElement('div');
    this._blocker.className = "jp-FFBOLabBlock";
    this.node.appendChild(this._blocker);
    $(".jp-FFBOLabBlock").hide();
    window.onmousedown = function(){$(".jp-FFBOLabBlock").show();};
    window.onmouseup = function(){$(".jp-FFBOLabBlock").hide();};
    window.neurogfxWidget = this._iframe;
    this._ready.resolve(void 0);
  }

  /**
   * A signal that emits user action in GFX canvas to listener
   */
  get outSignal(): ISignal<this, object>{
    return null;
  }

  /**
   * focus on widget upon `activate` request
   * @param msg 
   */
  onActivateRequest(msg: Message): void {
    this.node.focus();
  }

  /**
   * Handle input from master through signal
   * @param sender 
   * @param value 
   */
  private _handleParentActions(sender: IFFBOLabWidget, value:JSONObject): void{
    if(value.type == "GFX")
    {
      if (VERBOSE) {console.log("{GFX received}");}
      this.onMasterMessage(value.data);
    }
    else if(value.type == "model") {
      this.onModelChanged((<any>value.data).sender, (<any>value.data).value);
    }
    else if(value.type == "session") {
      let localPath = (<string>value.data).split(".ipynb")[0]
      this.title.label = '[GFX] ' + localPath;
    }
    else if(value.type == "Dispose") {
      if (VERBOSE) {console.log("{GFX received dispose}");}
      this.dispose();
    }
  }

  /**
   * Connect to signal
   * 
   * @param inSignal signal to connect to 
   */
  connect(inSignal: ISignal<IFFBOLabWidget, object>): void {
    if (VERBOSE) { console.log('[NM GFX] Connected');}
    inSignal.connect(this._handleParentActions, this);
    this._isConnected = true;
  }

  /**
   * Dispose the GFX
   */
  dispose(): void {
    if (this._isDisposed == true) {
      return;
    }

    delete (this._iframe);
    super.dispose();
    this._isDisposed = true;
    window.JLabApp.commands.notifyCommandChanged('NeuroMynerva:neurogfx-open');
    window.JLabApp.commands.notifyCommandChanged('NeuroMynerva:toggle-gfx');
    if (this._isDisposed) {
      if (VERBOSE) {console.log('[NM GFX] disposed');}
    }
  }

  /**
 * Handle message comming from message
 * @param msg 
 */
  onMasterMessage(msg: any): void {
    this._iframe.contentWindow.postMessage({ messageType: msg.messageType, data: msg.data }, '*');
  }

  /**
   * Respond to model change
   * 
   * @param sender
   * @param value
   */
  onModelChanged(sender: FFBOLabModel, value: JSONObject): void {
    if (VERBOSE) { console.log("[NM GFX] onModelChanged:",sender,value);}
    this._iframe.contentWindow.postMessage({ messageType: "Data", data: {sender: sender, value: value} }, '*');
    //sender._value[value['data']].name
    return; 
  }

  /**
   * A promise that resolves when the FFBOLab widget is ready
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Dispose resources when widget panel is closed
   * @param msg 
   */
  onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  /**
   * Handle update requests
   * 
   * ## note
   * currently only reattaches iframe to window
   */
  onUpdateRequest(msg: Message): void {
    window.neurogfxWidget = this._iframe;
    super.onUpdateRequest(msg);
    return;
  }

  /**
   * The Elements associated with the widget.
   */
  private _ready = new PromiseDelegate<void>();
  private _iframe: HTMLIFrameElement;
  private _blocker: HTMLDivElement;
  private _isDisposed = false;
  private _isConnected = false;

};
