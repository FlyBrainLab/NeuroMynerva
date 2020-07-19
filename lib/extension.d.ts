import { JupyterFrontEnd, JupyterFrontEndPlugin } from '@jupyterlab/application';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Token } from '@lumino/coreutils';
import { MainAreaWidget, WidgetTracker, IWidgetTracker, ISessionContext } from '@jupyterlab/apputils';
import { Kernel, Session } from '@jupyterlab/services';
import { LabIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { IFBLWidget } from './widgets/template/index';
import '../style/index.css';
declare global {
    interface Window {
        fbltrackers: any;
        app: any;
        master: any;
        info: any;
    }
}
export declare type FBLPanel = MainAreaWidget<IFBLWidget>;
export declare type IFBLTracker = IWidgetTracker<FBLPanel>;
export declare type FBLTracker = WidgetTracker<FBLPanel>;
export interface IFBLWidgetTrackers {
    add(name: string, tracker: FBLTracker): void;
    trackers: {
        [name: string]: FBLTracker;
    };
    sessionsDict: {
        [sessionPath: string]: FBLPanel[];
    };
    sessions: Session.ISessionConnection[];
}
/**
 * The FBL Widget Tracker Token
 */
export declare const IFBLWidgetTrackers: Token<IFBLWidgetTrackers>;
/**
 * Class for maintaining a list of FBLWidgetTrackers
 */
export declare class FBLWidgetTrackers implements IFBLWidgetTrackers {
    constructor(trackers?: {
        [name: string]: FBLTracker;
    });
    /**
     * Add a fbl widget tracker
     * @param tracker
     */
    add(name: string, tracker: FBLTracker): void;
    /**
     * Return alternate view of the trackers, keyed by session
     */
    get sessionsDict(): {
        [sessionPath: string]: FBLPanel[];
    };
    /**
     * Return a array of unique sessions
     */
    get sessions(): Session.ISessionConnection[];
    trackers: {
        [name: string]: FBLTracker;
    };
}
/**
 * Initialization data for the neu3d-extension extension.
 */
declare const extension: JupyterFrontEndPlugin<IFBLWidgetTrackers>;
export declare namespace FBL {
    /**
     * A widget that provides a species selection.
     */
    class SpeciesSelector extends Widget {
        /**
         * Create a new kernel selector widget.
         */
        constructor();
        /**
         * Get the value of the kernel selector widget.
         */
        getValue(): string;
    }
    /**
     * Check if a given widget has a running session
     * @param args
     */
    function hasRunningSession(widget: MainAreaWidget<IFBLWidget>): boolean;
    /**
     * Check if Kernel is FBL compatible
     * 1. Check if kernel handles comm
     * 2. Checks if contains Comm matches the comms target template
     * 3. Return the first Comm targetName if found
     * @param kernel - kernel to be changed
     */
    function isFBLKernel(kernel: Kernel.IKernelConnection): Promise<string | null>;
    function createFBLWidget(options: {
        app: JupyterFrontEnd;
        Module: any;
        icon: LabIcon;
        moduleArgs: any;
        tracker: WidgetTracker<MainAreaWidget<IFBLWidget>>;
        species?: string;
        info?: Widget;
        sessionContext?: ISessionContext;
        add_widget_options?: DocumentRegistry.IOpenOptions;
    }): Promise<MainAreaWidget<IFBLWidget>>;
    function createConsole(app: JupyterFrontEnd, panel: MainAreaWidget<IFBLWidget>, args: any): void;
    const testAttr: string;
}
export default extension;
