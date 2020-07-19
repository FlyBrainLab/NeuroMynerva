/// <reference types="react" />
import { Signal } from '@lumino/signaling';
import { ReactWidget } from '@jupyterlab/apputils';
import { ConnTable } from './conn_table';
import '../../../style/widgets/info/info.css';
interface IInfoData {
    connectivity?: {
        pre?: {
            details?: Array<any>;
            summary?: {
                profile?: object | any;
                number?: number | any;
            };
        };
        post?: {
            details?: Array<any>;
            summary?: {
                profile?: object | any;
                number?: number | any;
            };
        };
    };
    summary?: {
        vfb_id?: string;
        data_source?: string;
        transmitters?: string;
        name?: string;
        locality?: boolean;
        arborization_data?: object | any;
        flycircuit_data?: object | any;
        uname?: string;
        class?: string;
        rid?: string;
        totalLength?: string;
        totalSurfaceArea?: string;
        totalVolume?: string;
        maximumEuclideanDistance?: string;
        width?: string;
        height?: string;
        depth?: string;
        numberOfBifurcations?: string;
        maxPathDistance?: string;
        averageDiameter?: string;
    };
}
/**
* An Info Widget
*/
export declare class InfoWidget extends ReactWidget {
    constructor(props?: {
        data: IInfoData;
        inWorkspace: (uname: string) => boolean;
        neu3d: any;
    });
    onAfterAttach(msg: any): void;
    /**
     * Parse Connectivity Data
     * @param connData connectivity data
     */
    parseConnData(connData: any, neu3d: any): {
        name: any;
        uname: any;
        number: any;
        rid: any;
        syn_uname: any;
        s_rid: any;
        syn_rid: any;
        has_syn_morph: any;
        has_morph: any;
    }[];
    /** Reset Info to empty */
    reset(): void;
    /** Render */
    protected render(): JSX.Element;
    tabConnPre: ConnTable;
    tabConnPost: ConnTable;
    data: IInfoData;
    neu3d: any;
    dataChanged: Signal<this, {
        data: any;
        inWorkspace: any;
        neu3d: any;
    }>;
    inWorkspace: (rid: string) => boolean;
}
export {};
