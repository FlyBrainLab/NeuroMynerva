import { Widget } from '@phosphor/widgets';
import { JSONObject } from '@phosphor/coreutils';
import { INeuroInfoSubWidget } from "./widget";
/**
* Connectivity SVG inside Info Panel
*/
export declare class ConnSVG extends Widget implements INeuroInfoSubWidget {
    constructor();
    /**
    * Reset SVG plot to default state, remove this.svg object
    */
    reset(): void;
    /**
    * Update SVG
    */
    updateData(data: JSONObject): void;
    readonly container: HTMLElement;
    private htmlTemplate;
    private ctx_pre;
    private ctx_post;
    tabId: string;
    tabTextId: string;
    ctxId_pre: string;
    ctxId_post: string;
}
