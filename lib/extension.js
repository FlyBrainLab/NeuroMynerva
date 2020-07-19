import { ILayoutRestorer } from '@jupyterlab/application';
import { ILauncher } from '@jupyterlab/launcher';
import { Token } from '@lumino/coreutils';
import { ICommandPalette, MainAreaWidget, WidgetTracker, showDialog, Dialog } from '@jupyterlab/apputils';
import { listingsInfoIcon } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';
import { fblIcon, neu3DIcon, neuGFXIcon } from './icons';
import { MasterWidget } from './widgets/master/index';
import { InfoWidget } from './widgets/info/index';
import { NeuGFXWidget } from './widgets/neugfx/index';
import { Neu3DWidget } from './widgets/neu3d/index';
import '../style/index.css';
const NEU3D_CLASS_NAME = '.jp-FBL-Neu3D';
const NEUGFX_CLASS_NAME = '.jp-FBL-NeuGFX';
const NEU3DICON = neu3DIcon;
const NEUGFXICON = neuGFXIcon;
/* tslint:disable */
/**
 * The FBL Widget Tracker Token
 */
export const IFBLWidgetTrackers = new Token('@flybrainlab/fbl-extension:IFBLWidgetTrackers');
/* tslint:enable */
/**
 * Class for maintaining a list of FBLWidgetTrackers
 */
export class FBLWidgetTrackers {
    constructor(trackers) {
        if (trackers) {
            this.trackers = trackers;
        }
        else {
            this.trackers = {};
        }
    }
    /**
     * Add a fbl widget tracker
     * @param tracker
     */
    add(name, tracker) {
        if (!(name in this.trackers)) {
            this.trackers[name] = tracker;
        }
    }
    /**
     * Return alternate view of the trackers, keyed by session
     */
    get sessionsDict() {
        let sessionsDict = {};
        for (const t of Object.values(this.trackers)) {
            t.forEach((panel) => {
                var _a;
                const widget = panel.content;
                if ((_a = widget.sessionContext) === null || _a === void 0 ? void 0 : _a.session) {
                    if (!widget.sessionContext.isDisposed) {
                        if (!(widget.sessionContext.session.path in sessionsDict)) {
                            sessionsDict[widget.sessionContext.session.path] = new Array();
                        }
                        sessionsDict[widget.sessionContext.session.path].push(panel);
                    }
                }
            });
        }
        return sessionsDict;
    }
    /**
     * Return a array of unique sessions
     */
    get sessions() {
        const sessions = [];
        for (const t of Object.values(this.trackers)) {
            t.forEach((panel) => {
                var _a;
                const widget = panel.content;
                if ((_a = widget.sessionContext) === null || _a === void 0 ? void 0 : _a.session) {
                    if (!widget.sessionContext.isDisposed) {
                        sessions.push(widget.sessionContext.session);
                    }
                }
            });
        }
        return Array.from(new Set(sessions));
    }
}
/**
 * The command IDs used by the console plugin.
 */
var CommandIDs;
(function (CommandIDs) {
    CommandIDs.Neu3DCreate = 'fbl-neu3d:create';
    CommandIDs.Neu3DOpen = 'fbl-neu3d:open';
    CommandIDs.Neu3DCreateConsole = 'fbl-neu3d:create-console';
    CommandIDs.NeuGFXCreate = 'fbl-neugfx:create';
    CommandIDs.NeuGFXOpen = 'fbl-neugfx:open';
    CommandIDs.NeuGFXCreateConsole = 'fbl-neugfx:create-console';
    CommandIDs.CreateWorkspace = 'fbl-workspace:create';
})(CommandIDs || (CommandIDs = {}));
/**
 * Initialization data for the neu3d-extension extension.
 */
const extension = {
    id: '@flybrainlab/fbl-extension',
    autoStart: true,
    requires: [ICommandPalette, ILauncher, ILayoutRestorer],
    provides: IFBLWidgetTrackers,
    activate: activateFBL
};
/**
 * Activate the FBL widget extension.
 */
async function activateFBL(app, palette, launcher, restorer) {
    console.log("FBL Extension Activated");
    const fblWidgetTrackers = new FBLWidgetTrackers({
        "Neu3D": new WidgetTracker({ namespace: 'fbl-neu3d' }),
        "NeuGFX": new WidgetTracker({ namespace: 'fbl-neugfx' })
    });
    // Handle state restoration.
    restorer.restore(fblWidgetTrackers.trackers.Neu3D, {
        command: CommandIDs.Neu3DOpen,
        args: widget => {
            var _a, _b, _c;
            const { path, name } = widget.content.sessionContext;
            return {
                model: {
                    data: (_a = widget.content.model) === null || _a === void 0 ? void 0 : _a.data,
                    metadata: (_b = widget.content.model) === null || _b === void 0 ? void 0 : _b.metadata,
                    states: (_c = widget.content.model) === null || _c === void 0 ? void 0 : _c.states
                },
                clientId: widget.content.clientId,
                id: widget.content.id,
                species: widget.content.species,
                path: path,
                name: name
            };
        },
        name: widget => widget.content.sessionContext.name,
        when: app.serviceManager.ready
    });
    restorer.restore(fblWidgetTrackers.trackers.NeuGFX, {
        command: CommandIDs.NeuGFXOpen,
        args: widget => {
            var _a, _b, _c;
            const { path, name } = widget.content.sessionContext;
            return {
                model: {
                    data: (_a = widget.content.model) === null || _a === void 0 ? void 0 : _a.data,
                    metadata: (_b = widget.content.model) === null || _b === void 0 ? void 0 : _b.metadata,
                    states: (_c = widget.content.model) === null || _c === void 0 ? void 0 : _c.states
                },
                clientId: widget.content.clientId,
                id: widget.content.id,
                species: widget.content.species,
                path: path,
                name: name
            };
        },
        name: widget => widget.content.sessionContext.name,
        when: app.serviceManager.ready
    });
    window.app = app;
    window.fbltrackers = fblWidgetTrackers;
    let masterWidget = undefined;
    let infoWidget = undefined;
    masterWidget = new MasterWidget(fblWidgetTrackers);
    masterWidget.id = 'FBL-Master';
    masterWidget.title.caption = 'FBL Widgets and Running Sessions';
    masterWidget.title.icon = fblIcon;
    // add to last
    if (restorer) {
        restorer.add(masterWidget, 'FBL-Master');
    }
    app.shell.add(masterWidget, 'left', { rank: 1000 });
    window.master = masterWidget;
    // add info panel
    infoWidget = new InfoWidget();
    infoWidget.id = 'FBL-Info';
    infoWidget.title.caption = 'Information about neurons and synapses';
    infoWidget.title.icon = listingsInfoIcon;
    // add to last
    if (restorer) {
        restorer.add(infoWidget, 'FBL-Info');
    }
    app.shell.add(infoWidget, 'left', { rank: 2000 });
    window.info = infoWidget;
    // Get the current widget and activate unless the args specify otherwise.
    function getCurrent(args) {
        let widget = undefined;
        switch (args['widget']) {
            case 'neu3d':
                widget = fblWidgetTrackers.trackers.Neu3D.currentWidget;
                break;
            case 'neugfx':
                widget = fblWidgetTrackers.trackers.NeuGFX.currentWidget;
                break;
            default: // not understood
                console.warn(`Cannot getCurrent widget of type ${args['widget']}.`);
                return widget;
        }
        const activate = args['activate'] !== false;
        if (activate && widget) {
            app.shell.activateById(widget.id);
        }
        return widget;
    }
    app.commands.addCommand(CommandIDs.Neu3DCreate, {
        label: 'Create Neu3D Instance',
        icon: NEU3DICON,
        execute: async (args) => {
            var _a;
            await FBL.createFBLWidget({
                app: app,
                Module: Neu3DWidget,
                icon: NEU3DICON,
                moduleArgs: args,
                tracker: fblWidgetTrackers.trackers.Neu3D,
                info: infoWidget,
                species: (_a = args.species, (_a !== null && _a !== void 0 ? _a : 'No species'))
            });
        }
    });
    app.commands.addCommand(CommandIDs.Neu3DOpen, {
        label: 'Open Neu3D Instance',
        icon: NEU3DICON,
        execute: async (args) => {
            var _a;
            await FBL.createFBLWidget({
                app: app,
                Module: Neu3DWidget,
                icon: NEU3DICON,
                moduleArgs: args,
                tracker: fblWidgetTrackers.trackers.Neu3D,
                info: infoWidget,
                species: (_a = args.species, (_a !== null && _a !== void 0 ? _a : 'No species'))
            });
        }
    });
    app.commands.addCommand(CommandIDs.NeuGFXCreate, {
        label: 'Create NeuGFX Instance',
        icon: NEUGFXICON,
        execute: async (args) => {
            var _a;
            await FBL.createFBLWidget({
                app: app,
                Module: NeuGFXWidget,
                icon: NEUGFXICON,
                moduleArgs: args,
                tracker: fblWidgetTrackers.trackers.NeuGFX,
                species: (_a = args.species, (_a !== null && _a !== void 0 ? _a : 'No species'))
            });
        }
    });
    app.commands.addCommand(CommandIDs.Neu3DCreateConsole, {
        label: 'Create Console for Neu3D Widget',
        icon: NEU3DICON,
        execute: args => {
            const current = getCurrent(Object.assign(Object.assign({}, args), { widget: 'neu3d', activate: false }));
            if (!current) {
                return;
            }
            FBL.createConsole(app, current, args);
        },
        isEnabled: () => {
            const current = getCurrent({ widget: 'neu3d', activate: false });
            return FBL.hasRunningSession(current);
        }
    });
    app.commands.addCommand(CommandIDs.NeuGFXCreateConsole, {
        label: 'Create Console for NeuGFX Widget',
        icon: NEUGFXICON,
        execute: args => {
            const current = getCurrent(Object.assign(Object.assign({}, args), { widget: 'neugfx', activate: false }));
            if (!current) {
                return;
            }
            FBL.createConsole(app, current, args);
        },
        isEnabled: () => {
            const current = getCurrent({ widget: 'neu3d', activate: false });
            return FBL.hasRunningSession(current);
        }
    });
    // workspace
    app.commands.addCommand(CommandIDs.CreateWorkspace, {
        label: 'Create FBL Workspace',
        icon: fblIcon,
        execute: async (args) => {
            let species = 'No species';
            let abort = false;
            await showDialog({
                title: 'Change Species',
                body: new FBL.SpeciesSelector(),
                buttons: [
                    Dialog.cancelButton(),
                    Dialog.warnButton({ label: 'No Species' }),
                    Dialog.okButton({ label: 'Select' })
                ]
            }).then(result => {
                if (result.button.accept) {
                    if (result.button.displayType === 'warn') {
                        species = 'No Species';
                    }
                    else {
                        species = result.value;
                    }
                }
                else {
                    abort = true;
                }
            });
            if (abort) { // cancel triggers abort
                return;
            }
            let notebook_panel = await app.commands.execute('notebook:create-new', { kernelName: 'python3' });
            // 2. create neu3d
            let neu3d_panel = await FBL.createFBLWidget({
                app: app,
                Module: Neu3DWidget,
                icon: NEU3DICON,
                moduleArgs: args,
                tracker: fblWidgetTrackers.trackers.Neu3D,
                species: species,
                info: infoWidget,
                sessionContext: notebook_panel.sessionContext,
                add_widget_options: { ref: notebook_panel.id, mode: 'split-left' }
            });
            // 2. create neugfx with the same client id
            await FBL.createFBLWidget({
                app: app,
                Module: NeuGFXWidget,
                icon: NEUGFXICON,
                moduleArgs: Object.assign({ clientId: neu3d_panel.content.clientId }, args),
                tracker: fblWidgetTrackers.trackers.NeuGFX,
                species: species,
                sessionContext: notebook_panel.sessionContext,
                add_widget_options: { ref: neu3d_panel.id, mode: 'split-bottom' }
            });
        }
    });
    // Add the widget to launcher
    if (launcher) {
        launcher.add({
            command: CommandIDs.CreateWorkspace,
            category: 'FlyBrainLab',
            rank: 0
        });
        launcher.add({
            command: CommandIDs.Neu3DCreate,
            category: 'FlyBrainLab',
            rank: 0
        });
        launcher.add({
            command: CommandIDs.NeuGFXCreate,
            category: 'FlyBrainLab',
            rank: 0
        });
    }
    /**
     * Add the create-console to context Menu
     * The browser will look class `selecttor` to see if the command should be enabled
     * These classnames should be the classnames of the individual FBL Widgets
     */
    app.contextMenu.addItem({
        command: CommandIDs.Neu3DCreateConsole,
        selector: NEU3D_CLASS_NAME,
        rank: Infinity
    });
    app.contextMenu.addItem({
        command: CommandIDs.NeuGFXCreateConsole,
        selector: NEUGFX_CLASS_NAME,
        rank: Infinity
    });
    // Add the command to the palette.
    [
        CommandIDs.Neu3DCreate,
        CommandIDs.Neu3DCreateConsole,
        CommandIDs.NeuGFXCreate,
        CommandIDs.NeuGFXCreateConsole
    ].forEach(command => {
        palette.addItem({ command, category: 'FlyBrainLab' });
    });
    return Promise.resolve(fblWidgetTrackers);
}
export var FBL;
(function (FBL) {
    /**
     * A widget that provides a species selection.
     */
    class SpeciesSelector extends Widget {
        /**
         * Create a new kernel selector widget.
         */
        constructor() {
            const species_list = [
                'adult Drosophila melanogaster (FlyCircuit)',
                'adult Drosophila melanogaster (Hemibrain)',
                'larval Drosophila melanogaster'
            ];
            const body = document.createElement('div');
            const text = document.createElement('label');
            text.textContent = `Select species for FBL Workspace`;
            body.appendChild(text);
            const selector = document.createElement('select');
            for (const species of species_list) {
                const option = document.createElement('option');
                option.text = species;
                option.value = species;
                selector.appendChild(option);
            }
            body.appendChild(selector);
            super({ node: body });
        }
        /**
         * Get the value of the kernel selector widget.
         */
        getValue() {
            const selector = this.node.querySelector('select');
            return selector.value;
        }
    }
    FBL.SpeciesSelector = SpeciesSelector;
    /**
     * Check if a given widget has a running session
     * @param args
     */
    function hasRunningSession(widget) {
        if (!widget) {
            return false;
        }
        try {
            if (widget.content.sessionContext.isReady) {
                if (widget.content.sessionContext.session) { // check if has kenrel
                    return true;
                }
            }
            return false;
        }
        catch (error) {
            // in case content or sessionContext or isReady not found
            return false;
        }
    }
    FBL.hasRunningSession = hasRunningSession;
    /**
     * Check if Kernel is FBL compatible
     * 1. Check if kernel handles comm
     * 2. Checks if contains Comm matches the comms target template
     * 3. Return the first Comm targetName if found
     * @param kernel - kernel to be changed
     */
    async function isFBLKernel(kernel) {
        var _a;
        let targetCandidates = new Array();
        // interrogate kernel as Kernel class
        let msg = await kernel.requestCommInfo({});
        if (!kernel.handleComms) {
            // force kernel to handleComms
            kernel.handleComms = true;
        }
        if (msg.content && ((_a = msg.content) === null || _a === void 0 ? void 0 : _a.status) == 'ok') {
            for (let c of Object.values(msg.content.comms)) {
                if (c.target_name.includes('FBL')) {
                    targetCandidates.push(c.target_name);
                }
                ;
            }
        }
        else {
            return Promise.resolve(null);
        }
        if (targetCandidates.length == 0) {
            return Promise.resolve(null);
        }
        // take only unique target values
        targetCandidates = [...new Set(targetCandidates)];
        return Promise.resolve(targetCandidates[0]);
    }
    FBL.isFBLKernel = isFBLKernel;
    async function createFBLWidget(options) {
        var _a, _b;
        let widget;
        const { app, Module, icon, moduleArgs, tracker, species, info, add_widget_options } = options;
        let sessionContext = options.sessionContext || ((_b = (_a = tracker.currentWidget) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.sessionContext);
        if (sessionContext === undefined) {
            moduleArgs['kernelPreference'] = {
                shouldStart: false,
                canStart: true,
                name: 'No Kernel'
            };
        }
        if (info) {
            widget = new Module(Object.assign({ app: app, icon: icon, info: info, sessionContext: sessionContext, species: species }, moduleArgs));
        }
        else {
            widget = new Module(Object.assign({ app: app, icon: icon, sessionContext: sessionContext, species: species }, moduleArgs));
        }
        let panel = new MainAreaWidget({ content: widget, toolbar: widget.toolbar });
        if (!tracker.has(panel)) {
            await tracker.add(panel);
        }
        widget.sessionContext.propertyChanged.connect(() => {
            void tracker.save(panel);
        });
        widget.modelChanged.connect(() => {
            void tracker.save(panel);
        });
        // Attach the widget to the main work area if it's not there
        app.shell.add(panel, 'main', add_widget_options);
        widget.update();
        panel.update();
        // Activate the widget
        app.shell.activateById(panel.id);
        return panel;
    }
    FBL.createFBLWidget = createFBLWidget;
    function createConsole(app, panel, args) {
        var _a;
        app.commands.execute('console:create', {
            path: panel.content.sessionContext.path,
            ref: panel.id,
            insertMode: (_a = args['insertMode'], (_a !== null && _a !== void 0 ? _a : 'split-right')),
            activate: args['activate']
        });
    }
    FBL.createConsole = createConsole;
    FBL.testAttr = 'test';
})(FBL || (FBL = {}));
export default extension;
