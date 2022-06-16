// Manages connectivity to FFBOProcessor and datasets
import * as React from 'react';
import * as ini from 'ini';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { CommandRegistry } from '@lumino/commands';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import '../style/processor.css';
import { ffboProcessorIcon } from './icons';
import { ToolbarButtonComponent } from '@jupyterlab/apputils';

const FFBOPROCESSOR_BUTTON_CLASS = 'jp-fbl-processor-btn';

/**
 * Create Processor Button
 * @param props
 */
export function FFBOProcessorButton(props: {
  settings: ISettingRegistry.ISettings;
  commands: CommandRegistry;
}): JSX.Element {
  function onClick() {
    void showDialog({
      title: 'FFBOProcessor Settings',
      body: (
        <div>
          To view FFBO Processor settings, open Advanced Settings Editor and
          search for <b> FlyBrainLab </b>.
        </div>
      ),
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({ label: 'Open Settings Menu' })
      ]
    }).then(result => {
      if (result.button.accept) {
        props.commands.execute('settingeditor:open');
      }
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
      preset:
        | ''
        | 'adult(flycircuit)'
        | 'adult(hemibrain)'
        | 'larva(l1em)'
        | string;
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
