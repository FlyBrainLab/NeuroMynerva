// Manages connectivity to FFBOProcessor and datasets
import * as React from 'react';
import * as ini from 'ini';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { SplitPanel, Widget, PanelLayout }from '@lumino/widgets';
import { Dialog, showDialog, ReactWidget, UseSignal }from '@jupyterlab/apputils';
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
                let currentSettings = ffboprocessor.settings.get('fbl-processor').composite as any as FFBOProcessor.ISettings[];
                const changedName = Object.keys(result.value)[0];
                currentSettings.forEach((setting, i) => {
                    if (setting.name === changedName ){
                        currentSettings[i] = result.value[changedName];
                    }
                });
                ffboprocessor.settings.set('fbl-processor', currentSettings as any);
            }
        })
    }
    return (
        <button
            className={`${FFBOPROCESSOR_BUTTON_CLASS} jp-mod-styled`}
            onClick={onClick}
        >
            View Settings
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
        const layout = new PanelLayout();
        const panel = new SplitPanel({
            orientation: "horizontal",
            renderer: SplitPanel.defaultRenderer,
            spacing: 1,
        });
        const list = this._list = new ProcessorList(this);
        const details = (this._details = new ProcessorDetail(list));

        layout.addWidget(panel);
        panel.addWidget(list);
        panel.addWidget(details);

        this.settings.changed.connect(() => {
            this.load(this.settings); // will exmit changed signal
        });
        this.layout = layout;
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
        let name = this._list.getValue();
        let val = this._details.getValue();
        let res: {[name: string]: FFBOProcessor.ISettings} = {}
        res[name] = val;
        return res;
    }
    processors: FFBOProcessor.IProcessors;
    private _settingsChanged = new Signal<this, FFBOProcessor>(this);
    readonly settings: ISettingRegistry.ISettings
    private _list: ProcessorList;
    private _details: ProcessorDetail;
}

class ProcessorList extends ReactWidget {
    constructor(
        processor:FFBOProcessor
    ) {
        super();
        this.processor = processor;
    }

    protected render() {
        return (
            <div>
                <ProcessorListComponent processor={this.processor}></ProcessorListComponent>
                <button onClick={()=>{
                    let val = this.getValue();
                    if (val !== this._previousValue){
                        this._previousValue = val;
                        this._selectedChanged.emit(this.processor.processors[val])
                    }
                }}>VIEW SETTINGS</button>
            </div>
        );
    }

    getValue(): string {
        const selector = this.node.querySelector('select') as HTMLSelectElement;
        return selector.value as string;
    }

    get selectedChanged(): ISignal<this, FFBOProcessor.ISettings> {
        return this._selectedChanged;
    }

    processor: FFBOProcessor;
    settings: ISettingRegistry.ISettings;
    private _previousValue: string = '';
    private _selectedChanged = new Signal<this, FFBOProcessor.ISettings>(this);
}

function ProcessorListComponent(props:{
    processor: FFBOProcessor
}){
    return (
        <UseSignal signal={props.processor.settingsChanged} initialArgs={props.processor}>
            {(sender:FFBOProcessor, p:FFBOProcessor)=>{
                let processors = FFBOProcessor.arrToDict(p.settings.get('fbl-processors').composite as any);
                let options: any[] = [];
                Object.keys(processors).forEach((name, i)=>{
                    options.push(
                        <option key={i} value={name}></option>
                    );
                })
                return (
                    <div>
                        <label>Select Processor for FlyBrainLab Workspace</label>
                        <select>
                            {options}
                        </select>
                    </div>
                )
            }}
        </UseSignal>
    )
}

/**
 * Form Editor for Individial Processor Settings
 */
class ProcessorDetail extends ReactWidget {
    constructor(list: ProcessorList) {
        const body = document.createElement("div");
        super({ node: body });
        this.list = list;
    }

    protected render() {
        return (
            <UseSignal signal={this.list.selectedChanged}>
                {(sender:any, processor:FFBOProcessor.ISettings)=>{
                    this.processor = processor;
                    return (
                        <>
                          <div>
                              <div>
                                  <div>SERVER</div>
                                  <div>ip</div><div>{processor.SERVER.ip}</div>
                                  <div>realm</div><div>{processor.SERVER.realm}</div>
                                  <div>dataset</div><div>{processor.SERVER.dataset}</div>
                              </div>
                              <div>
                                  <div>USER</div>
                                  <div>user</div><div>{processor.USER.user}</div>
                                  <div>secret</div><div>{processor.USER.secret}</div>
                              </div>
                              <div>
                                  <div>AUTH</div>
                                  <div>ssl</div><div>{processor.AUTH.ssl}</div>
                                  <div>authentication</div><div>{processor.AUTH.authentication}</div>
                                  <div>cert</div><div>{processor.AUTH.cert}</div>
                                  <div>key</div><div>{processor.AUTH.key}</div>
                                  <div>chain-cert</div><div>{processor.AUTH['chain-cert']}</div>
                                  <div>ca_cert_file</div><div>{processor.AUTH.ca_cert_file}</div>
                                  <div>intermediate_cer_file</div><div>{processor.AUTH.intermediate_cer_file}</div>
                              </div>
                              <div>
                                  <div>DEBUG</div>
                                  <div>debug</div><div>{processor.DEBUG.debug}</div>
                              </div>
                              </div>
                        </>
                      );
                }}
            </UseSignal>
        )
    }

    getValue(): FFBOProcessor.ISettings {
        return this.processor; // DEBUG
    }

    processor: FFBOProcessor.ISettings;
    readonly list: ProcessorList;
}


export namespace FFBOProcessor {
    export function arrToDict(ffboProcessor: ISettings[]): IProcessors {
        let settings: IProcessors = {};
        for (let processor of ffboProcessor) {
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