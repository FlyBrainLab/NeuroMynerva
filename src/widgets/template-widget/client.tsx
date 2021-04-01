/* Base Client Module for NeuroMynerva
 *
 * This module handles all connection with python kernel side.
 */
import * as React from 'react';
import { ISessionContext, showDialog } from '@jupyterlab/apputils';
import { INotification } from 'jupyterlab_toastify';
import { Signal, ISignal } from '@lumino/signaling';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import { OutputArea, OutputAreaModel } from '@jupyterlab/outputarea';
import {
  RenderMimeRegistry,
  standardRendererFactories as initialFactories
} from '@jupyterlab/rendermime';
import * as PyTemplate from './python_code_templates';
import { FFBOProcessor } from '../../ffboprocessor';
import { IFBLWidget } from './index';
import { IFBLWidgetModel } from './model';

/**
 * Execution Reply for Code Execution
 */
export interface IExecuteResult {
  success: boolean;
  msg?: KernelMessage.IExecuteReplyMsg;
}

/**
 * Interface for FBLClient
 */
export interface IFBLClient {
  readonly widgetId: string;
  readonly clientId: string;
  readonly sessionContext: ISessionContext;
  readonly comm: Kernel.IComm | null;
  isDisposed: boolean;
  isConnected: boolean;
  connectionChanged: ISignal<this, boolean>;

  /**
   * Initialize Client
   *
   * 1. Creates global FBL instance in kernel
   * 2. Creates client instance based on configuration and connects to it
   */
  init(): Promise<boolean>;

  executeCode(
    code: string,
    commandName: string,
    raiseError?: boolean
  ): Promise<IExecuteResult>;

  /**
   * Dispose of the Client and all it's resources
   *
   * Disconnect signals
   */
  dispose(): Promise<void>;

  /**
   * Execute NeuroArch Query on Kernel Side
   */
  executeNAQuery(query: string): Promise<IExecuteResult>;

  /**
   * Execute NeuroNLP Query on Kernel Side
   */
  executeNLPQuery(query: string): Promise<IExecuteResult>;

  checkConnection(): Promise<boolean>;
  setConnection(status: boolean): void;

  /**
   * Send model from widget to kernel
   * @param model Either full or partial of the widget model
   */
  sendModel(model: Partial<IFBLWidgetModel>): void;
}

/**
 * Client associated with FBL widget
 *
 * This class wraps all the interaction with client
 */
export class FBLClient implements IFBLClient {
  constructor(widget: IFBLWidget) {
    this._widget = widget;
  }

  /** Return wrapped widget */
  get widget(): IFBLWidget {
    return this._widget;
  }

  /** proxy property to widget */
  get sessionContext(): ISessionContext {
    return this.widget.sessionContext;
  }

  /** proxy property to widget */
  get widgetId(): string {
    return this.widget.id;
  }

  /** proxy property to widget */
  get clientId(): string {
    return this.widget.clientId;
  }

  /** proxy property to widget */
  get processor(): string {
    return this.widget.processor;
  }

  /** proxy property to widget */
  get ffboProcessors(): FFBOProcessor.IProcessors {
    return this.widget.ffboProcessors;
  }

  /** proxy property to widget */
  get comm(): Kernel.IComm {
    return this.widget.comm;
  }

  /**
   * Initialize FBL Global Singleton and Client
   *
   * 1. If no kernel, no client
   * 2. If already has client, has client
   * 3. If does not have client, initClient and return success or failure of execution
   * @return a promise that resolves to success of the init call
   */
  async init(): Promise<boolean> {
    if (!this.sessionContext.session?.kernel) {
      this._connected = false;
      return Promise.resolve(false);
    }
    if (
      this.processor === FFBOProcessor.NO_PROCESSOR ||
      !(this.processor in this.ffboProcessors)
    ) {
      this.disconnect();
      return Promise.resolve(false);
    }

    await this.sessionContext.ready;
    const fblSuccess = await this.initFBL();
    if (!fblSuccess) {
      this.setConnection(false);
      return Promise.resolve(false);
    }

    const isConnected = await this.checkConnection();
    if (!isConnected) {
      const code = PyTemplate.initClientCode(
        this.processor,
        this.ffboProcessors,
        this.widgetId,
        this.clientId
      );
      const result = await this.executeCode(
        code,
        `Client Initialization for ${this.widget.name}`,
        true
      );
      if (result.success) {
        this.setConnection(true);
        return Promise.resolve(true);
      } else {
        this.setConnection(false);
        return Promise.resolve(false);
      }
    } else {
      return Promise.resolve(true);
    }
  }

  /**
   * Send model to the front-end
   * @param model
   */
  sendModel(model: Partial<IFBLWidgetModel>): void {
    this.comm.send({
      messageType: 'model',
      data: {
        data: model.data,
        metadata: model.metadata,
        states: model.states
      }
    });
  }

  /**
   * Initialize FBL
   *
   * This code does 2 things:
   *   1. import `flybrainlab` into global `fbl` singleton if not found
   *   2. add current widget to the `fbl.widget_manager`
   */
  async initFBL(): Promise<boolean> {
    const code = PyTemplate.initFBLCode(
      this.widgetId,
      this.clientId,
      this.widget.constructor.name,
      this.widget.commTarget
    );
    const res = await this.executeCode(
      code,
      'FBL Global Initialization',
      false
    );
    if (res.success) {
      this.setConnection(true);
      return Promise.resolve(true);
    } else {
      this.setConnection(false);
      return Promise.resolve(false);
    }
  }

  /**
   * A generic wrapper for executing query
   *
   * @param code code string to be sent
   * @param commandName arbitrary name of the command being executed, for
   *  rendering purposes only
   * @param verbose if true, will indicate excution result in toastify
   * @param toastId if specified, results will be updated into this given toast
   * @returns a promise that resolves to true if execution suceeded, false
   *  if no kernel is found, Kernel ExecuteReplyMsg if code executation failed.
   */
  async executeCode(
    code: string,
    commandName: string,
    verbose = false,
    toastId: React.ReactText = undefined
  ): Promise<IExecuteResult> {
    if (!this.sessionContext.session?.kernel) {
      // no kernel
      return { success: false };
    }
    const kernel = this.sessionContext.session.kernel;
    if (!verbose) {
      const res = await kernel.requestExecute({ code: code }).done;
      return {
        success: res.content.status === 'ok',
        msg: res
      };
    } else {
      if (toastId === undefined) {
        toastId = await INotification.inProgress(
          <p> Running {commandName} ...</p>
        );
      }
    }
    const outputArea = new OutputArea({
      model: new OutputAreaModel(),
      rendermime: new RenderMimeRegistry({ initialFactories })
    });
    outputArea.node.style.display = 'block';
    outputArea.future = kernel.requestExecute({ code: code });
    const reply = await outputArea.future.done;
    const success = reply && reply.content.status === 'ok';
    if (success) {
      INotification.update({
        toastId: toastId,
        type: 'success',
        message: `Success: ${commandName}`,
        autoClose: 1000
      });
      outputArea.dispose();
      return { success: true, msg: reply };
    } else {
      INotification.update({
        toastId: toastId,
        type: 'error',
        message: `Failed: ${commandName}`,
        buttons: [
          {
            label: 'Details',
            callback: () =>
              showDialog({ title: `Result ${commandName}`, body: outputArea })
          },
          { label: 'Dismiss', callback: () => outputArea.dispose() }
        ]
      });
    }
    return { success: success, msg: reply };
  }

  /**
   * Disconnect client from backend and remove
   */
  disconnect(): Promise<void> {
    const code_to_send = PyTemplate.disconnectClientCode(
      this.widgetId,
      this.clientId
    );
    this.setConnection(false);
    if (this.sessionContext?.session?.kernel) {
      const kernel = this.sessionContext?.session?.kernel;
      return kernel.requestExecute({ code: code_to_send }).done.then(() => {
        return Promise.resolve(void 0);
      });
    } else {
      return Promise.resolve(void 0);
    }
  }

  /**
   * Dispose client resources and disconnect from kernel
   *
   * @return a promise that is resolved when the client is disposed
   */
  dispose(): Promise<void> {
    if (this.isDisposed) {
      return Promise.resolve(void 0);
    }
    return this.disconnect().then(() => {
      this._isDisposed = true;
    });
  }

  /**
   * Check if client is already disposed
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Wrapper around executeRequest that is specific to current client
   * By default the result will be sent back over Comm.
   * @return a promise that resolves to the reply message when done
   */
  executeNAQuery(query: string): Promise<IExecuteResult> {
    return this.executeCode(
      PyTemplate.NAQueryCode(this.clientId, query),
      'NA Query'
    );
  }

  /**
   * Wrapper around executeRequest that is specific to current client
   * By default the result will be sent back over Comm.
   * @return a promise that resolves to the reply message when done
   */
  executeNLPQuery(query: string): Promise<IExecuteResult> {
    return this.executeCode(
      PyTemplate.NLPQueryCode(this.clientId, query),
      'NLP Query'
    );
  }

  /**
   * A signal that emits the connection status of the client
   */
  get connectionChanged(): ISignal<this, boolean> {
    return this._connectionChanged;
  }

  /**
   * check if is connected
   */
  get isConnected(): boolean {
    return this._connected;
  }

  /**
   * Set connection status of the client
   * @param status new status
   */
  setConnection(status: boolean): void {
    if (status === this.isConnected) {
      return;
    }
    this._connected = status;
    this._connectionChanged.emit(status);
  }

  /**
   * Check if a client is connected in the kernel
   * @return a promise that resolves to whether a client is found or not
   */
  async checkConnection(): Promise<boolean> {
    const code = PyTemplate.checkClientCode(this.widgetId, this.clientId);
    const res = await this.executeCode(
      code,
      `Client Status Check for ${this.widget.name}`,
      false
    );
    if (res.success) {
      this.setConnection(true);
      return Promise.resolve(true);
    } else {
      this.setConnection(false);
      return Promise.resolve(false);
    }
  }

  private _connected = false;
  private _connectionChanged = new Signal<this, boolean>(this);
  private _isDisposed = false;
  private _widget: IFBLWidget;
}
