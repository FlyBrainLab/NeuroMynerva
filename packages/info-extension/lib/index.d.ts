import { JupyterLabPlugin } from '@jupyterlab/application';
import { InstanceTracker } from '@jupyterlab/apputils';
import { NeuroInfoWidget } from './widget';
/**
 * Tracker for restoring layout of NeuroInfoWidget
 */
declare const tracker: JupyterLabPlugin<InstanceTracker<NeuroInfoWidget>>;
export default tracker;
