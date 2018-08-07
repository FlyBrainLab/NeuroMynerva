"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const application_1 = require("@jupyterlab/application");
const apputils_1 = require("@jupyterlab/apputils");
const widget_1 = require("./widget");
const coreutils_1 = require("@phosphor/coreutils");
const VERBOSE = false;
/**
 * Initialization data for FFBOLab Plugin
 */
const tracker = {
    activate,
    id: '@jupyterlab-neuro-mynerva/neu3d:plugin',
    autoStart: true,
    requires: [apputils_1.ICommandPalette, application_1.ILayoutRestorer]
};
exports.default = tracker;
/**
 * The command IDs used by the notebook plugin.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.open = 'NeuroMynerva:neu3d-open';
})(CommandIDs || (CommandIDs = {}));
/**
 * Activate the Neu3D widget extension.
 */
function activate(app, palette, restorer) {
    if (VERBOSE) {
        console.log('[NM Neu3d] NeuroMynerva (neu3d) extension activated!');
    }
    const namespace = 'NeuroMynerva-neu3d';
    let tracker = new apputils_1.InstanceTracker({ namespace });
    const { commands, shell } = app;
    let widget;
    // Add an application command
    commands.addCommand(CommandIDs.open, {
        label: 'Create Neu3D',
        execute: () => {
            if (VERBOSE) {
                console.log('[NM NEU3D] OPEN call');
            }
            if (!widget || widget.isDisposed) {
                // Create a new widget if one does not exist
                widget = new widget_1.Neu3DWidget();
                widget.update();
            }
            if (!tracker.has(widget)) {
                // Track the state of the widget for later restoration
                tracker.add(widget);
            }
            if (!widget.isAttached) {
                // Attach the widget to the main work area if it's not there
                shell.addToMainArea(widget, { mode: 'split-bottom' });
            }
            else {
                // Refresh widget
                widget.update();
            }
            // Activate the widget
            widget.activate();
            commands.notifyCommandChanged(CommandIDs.open);
            return widget;
        },
        isEnabled: () => {
            let keys = Array.from(restorer._widgets.keys());
            let nonexist = true;
            keys.forEach(function (value) {
                if (value.startsWith(namespace)) {
                    nonexist = false;
                }
            });
            return nonexist;
        }
    });
    // Populate Command Palette
    populatePalette(palette);
    // Track and restore the widget state
    restorer.restore(tracker, {
        command: CommandIDs.open,
        args: () => coreutils_1.JSONExt.emptyObject,
        name: () => namespace
    });
    return tracker;
}
;
/**
 * Populate the application's command palette
 */
function populatePalette(palette) {
    let category = 'NeuroMynerva Operations';
    [
        CommandIDs.open,
    ].forEach(command => { palette.addItem({ command, category }); });
}
//# sourceMappingURL=index.js.map