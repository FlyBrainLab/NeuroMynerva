import { JupyterLabPlugin } from '@jupyterlab/application';
import { InstanceTracker } from '@jupyterlab/apputils';
import { Neu3DWidget } from './widget';
/**
 * Initialization data for FFBOLab Plugin
 */
declare const tracker: JupyterLabPlugin<InstanceTracker<Neu3DWidget>>;
export default tracker;
