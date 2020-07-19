// FBL Master Widget Class
import * as React from 'react';
import { ReactWidget, ToolbarButtonComponent, UseSignal, Dialog, showDialog } from '@jupyterlab/apputils';
import { closeIcon //, fileIcon 
 } from '@jupyterlab/ui-components';
import { fblIcon } from '../../icons';
import '../../../style/widgets/master/master.css';
const MASTER_CLASS_JLab = 'jp-FBL-Master';
/**
 * The class name added to the running terminal sessions section.
 */
const SECTION_CLASS = 'jp-FBL-section';
/**
 * The class name added to the running sessions section header.
 */
const SECTION_HEADER_CLASS = 'jp-FBL-Master-sectionHeader';
/**
 * The class name added to a section container.
 */
const CONTAINER_CLASS = 'jp-FBL-Master-sectionContainer';
/**
 * The class name added to the running kernel sessions section list.
 */
const LIST_CLASS = 'jp-FBL-Master-sectionList';
/**
 * The class name added to the running sessions items.
 */
const ITEM_CLASS = 'jp-FBL-Master-item';
/**
 * The class name added to a running session item label.
 */
const ITEM_LABEL_CLASS = 'jp-FBL-Master-itemLabel';
// /**
//  * The class name added to a running session item shutdown button.
//  */
// const SHUTDOWN_BUTTON_CLASS = 'jp-RunningSessions-itemShutdown';
/**
 * The class name added to a Dispose button for disposing fbl widget
 */
const DISPOSE_BUTTON_CLASS = 'jp-FBL-Master-itemDispose';
/**
* An FBL Master Widget
*/
export class MasterWidget extends ReactWidget {
    constructor(fbltrackers) {
        console.log('Master Widget Created');
        super();
        this.fbltrackers = fbltrackers;
        this.addClass(MASTER_CLASS_JLab);
        this.render();
    }
    render() {
        return (React.createElement(FBLWidgetReact.FBLWidgetTrackersComponent, { fbltrackers: this.fbltrackers }));
    }
}
;
/**
 * Namespace for all React Components
 */
var FBLWidgetReact;
(function (FBLWidgetReact) {
    function FBLWidgetTrackersComponent(props) {
        const trackers_arr = Object.values(props.fbltrackers.trackers);
        const trackers_names = Object.keys(props.fbltrackers.trackers);
        return (React.createElement(React.Fragment, null, trackers_arr.map((tracker, i) => (React.createElement(Section, { key: i, name: trackers_names[i], tracker: tracker })))));
    }
    FBLWidgetReact.FBLWidgetTrackersComponent = FBLWidgetTrackersComponent;
    /**
     * The Section component contains the shared look and feel for an interactive
     * list of kernels and sessions.
     *
     * It is specialized for each based on its props.
     */
    function Section(props) {
        function onClose() {
            void showDialog({
                title: `Close All ${props.name}?`,
                buttons: [
                    Dialog.cancelButton(),
                    Dialog.warnButton({ label: 'CLOSE' })
                ]
            }).then(result => {
                if (result.button.accept) {
                    props.tracker.forEach((panel) => {
                        panel.content.dispose();
                        panel.dispose();
                    });
                }
            });
        }
        return (React.createElement("div", { className: SECTION_CLASS },
            React.createElement(React.Fragment, null,
                React.createElement("header", { className: SECTION_HEADER_CLASS },
                    React.createElement("h2", null,
                        props.name,
                        " Widgets"),
                    React.createElement(ToolbarButtonComponent, { icon: closeIcon, onClick: onClose, tooltip: `Close All ${props.name} Widgets...` })),
                React.createElement("div", { className: CONTAINER_CLASS },
                    React.createElement(List, { tracker: props.tracker })))));
    }
    FBLWidgetReact.Section = Section;
    function List(props) {
        return (React.createElement(UseSignal, { signal: props.tracker.currentChanged }, () => React.createElement(ListView, { tracker: props.tracker })));
    }
    function ListView(props) {
        const panel_arr = [];
        props.tracker.forEach((panel) => {
            panel_arr.push(panel);
        });
        return (React.createElement("ul", { className: LIST_CLASS }, panel_arr.map((panel, i) => (React.createElement(Item, { key: i, panel: panel })))));
    }
    /**
     * Renderes a single panel as a list item with some buttons
     * @param props
     */
    function Item(props) {
        const { panel } = props;
        const widget = panel.content;
        const icon = fblIcon;
        // if (widget.icon?.react){
        //   icon = widget.icon;
        // }
        return (React.createElement("li", { className: ITEM_CLASS },
            React.createElement(icon.react, { tag: "span", stylesheet: "runningItem" }),
            React.createElement("span", { className: ITEM_LABEL_CLASS, title: widget.title.caption, onClick: () => panel.show() }, widget.name),
            React.createElement("button", { className: `${DISPOSE_BUTTON_CLASS} jp-mod-styled`, onClick: () => panel.dispose() }, "CLOSE"),
            React.createElement(ShutdownButton, { widget: widget })));
    }
    function ShutdownButton(props) {
        var _a, _b;
        const { widget } = props;
        const body = React.createElement("p", null, "This kernel could be used by other widgets at the moment.");
        function onShutdown() {
            void showDialog({
                title: 'Shut Down Kernel?',
                body: body,
                buttons: [
                    Dialog.cancelButton(),
                    Dialog.warnButton({ label: 'SHUT DOWN' })
                ]
            }).then(result => {
                if (result.button.accept) {
                    widget.sessionContext.shutdown();
                    widget.sessionContext.dispose();
                }
            });
        }
        if ((_b = (_a = widget) === null || _a === void 0 ? void 0 : _a.sessionContext) === null || _b === void 0 ? void 0 : _b.session) {
            return (React.createElement("button", { className: `${DISPOSE_BUTTON_CLASS} jp-mod-styled`, onClick: onShutdown }, "SHUTDOWN"));
        }
        else {
            return React.createElement(React.Fragment, null);
        }
    }
})(FBLWidgetReact || (FBLWidgetReact = {}));
