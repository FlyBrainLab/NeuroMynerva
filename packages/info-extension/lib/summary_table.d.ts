import { INeuroInfoSubWidget } from "./widget";
import { Widget } from '@phosphor/widgets';
import { JSONObject } from '@phosphor/coreutils';
/**
 * SummaryTable Information Constructor
 */
export declare class SummaryTable extends Widget implements INeuroInfoSubWidget {
    constructor();
    reset(): void;
    /**
     * SummaryTable Information Update
     *
     */
    updateData(data: JSONObject): void;
    /**
     * Setup Callback for add remove button
     */
    setupCallbacks(): void;
    /**
     * Elements for the widget
     */
    readonly container: HTMLElement;
    private htmlTemplate;
    private colorId;
    tableDOM: HTMLElement;
    tabId: string;
    extraImgId: string;
}
