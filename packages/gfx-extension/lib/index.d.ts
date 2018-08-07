import { JupyterLabPlugin } from '@jupyterlab/application';
import { InstanceTracker } from '@jupyterlab/apputils';
import { NeuroGFXWidget } from './widget';
declare global {
    interface Window {
        neurogfxWidget: any;
    }
}
/**
 * Initialization data for FFBOLab Plugin
 */
declare const tracker: JupyterLabPlugin<InstanceTracker<NeuroGFXWidget>>;
export default tracker;
