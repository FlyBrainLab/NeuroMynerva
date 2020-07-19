import * as React from 'react';
import { Dialog, UseSignal, ReactWidget, showDialog } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';
import { listingsInfoIcon } from '@jupyterlab/ui-components';
import { ToolbarButtonComponent } from '@jupyterlab/apputils';
const TOOLBAR_SPECIES_CLASS = 'jp-FBL-Species';
/**
* A widget that provides a species selection.
*/
class SpeciesSelector extends Widget {
    /**
    * Create a new kernel selector widget.
    */
    constructor(widget) {
        const species_list = [
            'adult Drosophila melanogaster (FlyCircuit)',
            'adult Drosophila melanogaster (Hemibrain)',
            'larval Drosophila melanogaster',
            'No Species'
        ];
        const body = document.createElement('div');
        const text = document.createElement('label');
        text.textContent = `Select species for: "${widget.id}"`;
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
/**
* A widget that provides a species selection.
*/
class SessionDialog extends Widget {
    /**
    * Create a new kernel selector widget.
    */
    constructor(widget) {
        const body = document.createElement('div');
        const desc = document.createElement('div');
        let text = '';
        if (widget.sessionContext) {
            let sessionDesc = '';
            if (widget.sessionContext.session) {
                sessionDesc = `
                <tr><td>Kernel Session</td><td> ${widget.sessionContext.name} </td></tr>
                <tr><td>Kernel Path</td><td> ${PathExt.dirname(widget.sessionContext.path)}</td></tr>
                <tr><td>Kernel Name</td><td> ${widget.sessionContext.kernelDisplayName}</td></tr>
                <tr><td>Comm Target</td><td> ${widget._commTarget}</td></tr>
                <tr><td>Comm Id</td><td> ${widget.comm.commId}</td></tr>
                `;
            }
            text = `
            <div class="lm-Widget p-Widget jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput" data-mime-type="text/markdown">
            <table>
                <tr><td>Species</td><td>${widget.species}</td></tr>
                ${sessionDesc}
            </table>
            </div>
            `;
        }
        else {
            text = 'Widget not connected to kernel.';
        }
        desc.innerHTML = text;
        body.appendChild(desc);
        super({ node: body });
    }
}
/**
* React component for a species name button.
* This wraps the ToolbarButtonComponent and watches the species
* keyword
*/
function SpeciesComponent(props) {
    const { widget } = props;
    const callback = () => showDialog({
        title: 'Change Species',
        body: new SpeciesSelector(widget),
        buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({ label: 'Change' })
        ]
    }).then(result => {
        if (result.button.accept) {
            widget.species = result.value;
        }
    });
    const signal = widget.speciesChanged;
    const species = widget.species;
    return (React.createElement(UseSignal, { signal: signal, initialArgs: species }, (_, species) => (React.createElement(ToolbarButtonComponent, { className: TOOLBAR_SPECIES_CLASS, onClick: callback, label: species, tooltip: 'Change Species' }))));
}
/**
* React component for session overview dialog
* This wraps the ToolbarButtonComponent and watches the species
* keyword
*/
export function SessionDialogComponent(props) {
    var _a;
    const { widget } = props;
    const callback = () => showDialog({
        title: widget.name,
        body: new SessionDialog(widget),
        buttons: [
            Dialog.okButton({ label: 'Ok' })
        ]
    });
    return (React.createElement(ToolbarButtonComponent, { className: TOOLBAR_SPECIES_CLASS, onClick: callback, icon: (_a = widget.icon, (_a !== null && _a !== void 0 ? _a : listingsInfoIcon)), tooltip: 'View Session Details' }));
}
export function createSpeciesButton(widget) {
    const el = ReactWidget.create(React.createElement(SpeciesComponent, { widget: widget }));
    el.addClass(TOOLBAR_SPECIES_CLASS);
    return el;
}
export function createSessionDialogButton(widget) {
    const el = ReactWidget.create(React.createElement(SessionDialogComponent, { widget: widget }));
    el.addClass(TOOLBAR_SPECIES_CLASS);
    return el;
}
