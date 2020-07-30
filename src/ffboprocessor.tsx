// Manages connectivity to FFBOProcessor and datasets
import * as React from 'react';
import * as ini from 'ini';
import { JSONEditor } from '@json-editor/json-editor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Widget }from '@lumino/widgets';
import { Dialog, showDialog }from '@jupyterlab/apputils';
import { Signal, ISignal } from '@lumino/signaling';

const FFBOPROCESSOR_BUTTON_CLASS = 'jp-fbl-processor-btn';

/**
 * Create Processor Button
 * @param props 
 */
export function FFBOProcessorButton(props:{ffboprocessor: FFBOProcessor}) {
    const { ffboprocessor } = props;
    function onClick() {
        void showDialog({
            title: 'All FFBOProcessor Settings',
            body: ffboprocessor,
            buttons: [
                Dialog.cancelButton(),
                Dialog.warnButton({label: 'Apply Changes'})
            ]
        }).then(result => {
            if (result.button.accept){
                ffboprocessor.settings.set('fbl-processor', ffboprocessor.getValue()['fbl-processors'] as any);
            }
        })
    }
    return (
        <button
            className={`${FFBOPROCESSOR_BUTTON_CLASS} jp-mod-styled`}
            onClick={onClick}
        >
            FFBOProcessors Settings
        </button>
    );
}

/**
 * FFBOProcessor Widget
 * @param settings
 */
export class FFBOProcessor extends Widget {
    constructor(settings: ISettingRegistry.ISettings){
        super();
        this.settings = settings; // keep a reference to the settings object
        this.load(settings);
        let element = document.createElement('div');
        this.editor = new JSONEditor(element, {
            schema: this.settings.schema,
            iconlib: "fontawesome5",
            object_layout: "grid"
        });

        this.node.appendChild(element);
        this.settings.changed.connect(() => {
            this.load(this.settings); // will exmit changed signal
        });
    }

    select(processor: string): FFBOProcessor.ISettings | null {
        if (processor in this.processors){
            return this.processors[processor];
        } else{
            return null;
        }
    }

    load(setting?: ISettingRegistry.ISettings): void {
        setting = setting ?? this.settings;
        let processors = FFBOProcessor.arrToDict(setting.get('fbl-processors').composite as any);
        if (processors !== this.processors){
            this.processors = processors;
            this._settingsChanged.emit(this);
        }
    }

    get settingsChanged(): ISignal<this, FFBOProcessor> {
        return this._settingsChanged;
    }

    getValue(){
        return this.editor.getValue();
    }

    processors: FFBOProcessor.IProcessors;
    editor: JSONEditor; // should be JSONEditor
    private _settingsChanged = new Signal<this, FFBOProcessor>(this);
    readonly settings: ISettingRegistry.ISettings
}


export namespace FFBOProcessor {
    export function arrToDict(ffboProcessors: ISettings[]): IProcessors {
        let settings: IProcessors = {};
        for (let processor of ffboProcessors) {
            settings[processor.name] = processor;
        }
        return settings;
    }
    
    export type IProcessors = { [name: string]: ISettings };
    
    export interface ISettings {
        name: string;
        AUTH: {
            ssl: boolean,
            authentication: boolean,
            cert?: string,
            key?: string,
            'chain-cert'?: string,
            ca_cert_file?: string,
            intermediate_cer_file?: string
        };
        USER: {
            user: string,
            secret: string,
        };
        SERVER: {
            ip: string,
            realm: string,
            dataset: string[]
        };
        DEBUG: {
            debug: boolean
        };
    }
    
    export function JSON2INI(json: object | string): string {
        if (typeof(json) === 'string'){
            json = JSON.parse(json);
        }
        return ini.encode(json);
    }
    
    export function INI2JSON(iniString: string): object {
        return ini.decode(iniString);
    }
}