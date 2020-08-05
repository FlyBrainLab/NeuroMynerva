// Manages connectivity to FFBOProcessor and datasets
import * as React from 'react';
import * as ini from 'ini';
import { JSONEditor } from '@json-editor/json-editor';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { Widget }from '@lumino/widgets';
import { Dialog, showDialog } from '@jupyterlab/apputils';
import '../style/processor.css';
import { ffboProcessorIcon } from './icons';
import { ToolbarButtonComponent } from '@jupyterlab/apputils';

const FFBOPROCESSOR_BUTTON_CLASS = 'jp-fbl-processor-btn';

/**
 * Create Processor Button
 * @param props 
 */
export function FFBOProcessorButton( props:{settings: ISettingRegistry.ISettings}) {
    const { settings } = props;
    function onClick() {
        let ffboprocessor = new FFBOProcessor(settings);
        void showDialog({
            title: 'All FFBOProcessor Settings',
            body: ffboprocessor,
            buttons: [
                Dialog.cancelButton(),
                Dialog.warnButton({label: 'Apply Changes'})
            ]
        }).then(result => {
            if (result.button.accept){
                settings.set('fbl-processors', ffboprocessor.getValue()['fbl-processors'] as any);
            }
            ffboprocessor.editor.destroy();
            ffboprocessor.dispose();
        })
    }
    return (
        <ToolbarButtonComponent
            className={FFBOPROCESSOR_BUTTON_CLASS}
            onClick={onClick}
            icon={ffboProcessorIcon}
            tooltip={"FFBOProcessor Button"}
        />
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
            object_layout: "normal",
            disable_collapse: true
        });
        
        this.editor.on('change', () => {
            this._updateDataSetClassList();
        })
        this.editor.on('ready', () => {
            this.editor.setValue({ 'fbl-processors': this.settings.get('fbl-processors').composite as any });
            this._updateDataSetClassList();
        })
        this.editor.on('addRow', (editor: any) => {
            let buttons = editor.container.getElementsByTagName('button');
            let inputs = editor.container.getElementsByTagName('input');
            for (let btn of buttons) {   
                (btn as HTMLButtonElement).classList.add('jp-mod-styled');
            }
            for (let inp of inputs) {
                (inp as HTMLInputElement).classList.add('jp-mod-styled');
            }
        });
        
        let table = this.editor.editors['root.fbl-processors'].container.getElementsByClassName("je-indented-panel")[0] as HTMLDivElement;
        this.node.appendChild(table);
        this.settings.changed.connect(() => {
            this.load(this.settings); // will exmit changed signal
        });
    }

    private _updateDataSetClassList() {
        (this.editor.getValue()['fbl-processors'] as Array<any>).forEach((row, idx) => {
            let datasetContainerName = `root.fbl-processors.${idx}.SERVER.dataset`;
            let container = this.editor.editors[datasetContainerName].container;
            if (!container.classList.contains('fbl-json-editor-datasets')) {
                container.classList.add('fbl-json-editor-datasets');
            }
        })
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
        this.processors = FFBOProcessor.arrToDict(setting.get('fbl-processors').composite as any);
    }


    getValue(){
        return this.editor.getValue();
    }


    processors: FFBOProcessor.IProcessors;
    editor: JSONEditor; // should be JSONEditor
    readonly settings: ISettingRegistry.ISettings
}


export namespace FFBOProcessor {
    export const NO_PROCESSOR = "No Processor";
    
    export function arrToDict(ffboProcessors: ISettings[]): IProcessors {
        let settings: IProcessors = {};
        for (let processor of ffboProcessors) {
            settings[processor.NAME] = processor;
        }
        return settings;
    }
    
    export type IProcessors = { [name: string]: ISettings };
    
    export interface ISettings {
        NAME: string;
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
            IP: string,
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