// Manages connectivity to FFBOProcessor and datasets
import * as React from 'react';
import * as ini from 'ini';
import { JSONEditor } from '@json-editor/json-editor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Widget } from '@lumino/widgets';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import '../style/processor.css';
import { ffboProcessorIcon } from './icons';
import { ToolbarButtonComponent } from '@jupyterlab/apputils';

const FFBOPROCESSOR_BUTTON_CLASS = 'jp-fbl-processor-btn';

/**
 * Create Processor Button
 * @param props
 */
export function FFBOProcessorButton(props: { settings: ISettingRegistry.ISettings }): JSX.Element {
  const { settings } = props;
  function onClick() {
    const ffboprocessor = new FFBOProcessor(settings);
    void showDialog({
      title: 'All FFBOProcessor Settings',
      body: ffboprocessor,
      buttons: [Dialog.cancelButton(), Dialog.warnButton({ label: 'Apply Changes' })]
    }).then(result => {
      if (result.button.accept) {
        settings.set('fbl-processors', ffboprocessor.getValue()['fbl-processors'] as any);
      }
      ffboprocessor.editor.destroy();
      ffboprocessor.dispose();
    });
  }
  return (
    <ToolbarButtonComponent
      className={FFBOPROCESSOR_BUTTON_CLASS}
      onClick={onClick}
      icon={ffboProcessorIcon}
      tooltip={'FFBOProcessor Button'}
    />
  );
}

/**
 * FFBOProcessor Widget
 * @param settings
 */
export class FFBOProcessor extends Widget {
  constructor(settings: ISettingRegistry.ISettings) {
    super();
    this.settings = settings; // keep a reference to the settings object
    this.load(settings);
    const element = document.createElement('div');
    this.editor = new JSONEditor(element, {
      schema: this.settings.schema,
      iconlib: 'fontawesome5',
      object_layout: 'normal',
      disable_collapse: true
    });

    this.editor.on('change', () => {
      this._updateDataSetClassList();
    });
    this.editor.on('ready', () => {
      this.editor.setValue({
        'fbl-processors': this.settings.get('fbl-processors').composite as any
      });
      this._updateDataSetClassList();
    });
    this.editor.on('addRow', (editor: any) => {
      if (!editor) {
        const all_processors: Array<any> = (this.editor.editors['root.fbl-processors'] as any).rows;
        editor = all_processors[all_processors.length - 1];
      }
      const buttons = editor.container.getElementsByTagName('button');
      const inputs = editor.container.getElementsByTagName('input');
      const selects = editor.container.getElementsByTagName('select');
      for (const btn of buttons) {
        (btn as HTMLButtonElement).classList.add('jp-mod-styled');
      }
      for (const inp of inputs) {
        (inp as HTMLInputElement).classList.add('jp-mod-styled');
      }
      for (const sel of selects) {
        (sel as HTMLSelectElement).classList.add('jp-mod-styled');
      }
    });

    const table = (this.editor.editors['root.fbl-processors'] as any).panel as HTMLDivElement;
    this.node.appendChild(table);
    this.settings.changed.connect(() => {
      this.load(this.settings); // will exmit changed signal
    });
  }

  private _updateDataSetClassList() {
    (this.editor.getValue()['fbl-processors'] as Array<any>).forEach((row, idx) => {
      const datasetContainerName = `root.fbl-processors.${idx}.SERVER.dataset`;
      const container = this.editor.editors[datasetContainerName].container;
      if (!container.classList.contains('fbl-json-editor-datasets')) {
        container.classList.add('fbl-json-editor-datasets');
      }
    });
  }

  select(processor: string): FFBOProcessor.ISettings | null {
    if (processor in this.processors) {
      return this.processors[processor];
    } else {
      return null;
    }
  }

  load(setting?: ISettingRegistry.ISettings): void {
    setting = setting ?? this.settings;
    this.processors = FFBOProcessor.arrToDict(setting.get('fbl-processors').composite as any);
  }

  getValue(): Record<string, unknown> {
    return this.editor.getValue();
  }

  processors: FFBOProcessor.IProcessors;
  editor: JSONEditor; // should be JSONEditor
  readonly settings: ISettingRegistry.ISettings;
}

export namespace FFBOProcessor {
  export const NO_PROCESSOR = 'No Processor';

  export function arrToDict(ffboProcessors: ISettings[]): IProcessors {
    const settings: IProcessors = {};
    for (const processor of ffboProcessors) {
      settings[processor.NAME] = processor;
    }
    return settings;
  }

  export type IProcessors = { [name: string]: ISettings };

  export interface ISettings {
    NAME: string;
    AUTH: {
      ssl: boolean;
      authentication: boolean;
      cert?: string;
      key?: string;
      'chain-cert'?: string;
      ca_cert_file?: string;
      intermediate_cer_file?: string;
    };
    USER: {
      user: string;
      secret: string;
    };
    SERVER: {
      IP: string;
      realm: string;
      dataset: string[];
    };
    DEBUG: {
      debug: boolean;
    };
    PRESETS: {
      preset: '' | 'adult(flycircuit)' | 'adult(hemibrain)' | 'larva(l1em)' | string;
      neu3dSettings?: {
        resetPosition?: { x: number; y: number; z: number };
        upVector?: { x: number; y: number; z: number };
        cameraTarget?: { x: number; y: number; z: number };
      };
    };
  }

  export function JSON2INI(json: Record<string, unknown> | string): string {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    return ini.encode(json);
  }

  export function INI2JSON(iniString: string): Record<string, unknown> {
    return ini.decode(iniString);
  }
}
