import * as React from 'react';
import{
    Dialog, UseSignal, 
    ReactWidget, showDialog
} from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';

import {
    Widget
} from '@lumino/widgets';
import { 
    Toolbar, ToolbarButtonComponent 
} from '@jupyterlab/apputils';
import {
    IFBLWidget, FBLWidget
} from './widget';
import { 
    fblSettingIcon
} from '../../icons';

const TOOLBAR_SPECIES_CLASS = 'jp-FBL-Species';

/**
* A widget that provides a species selection.
*/
class SpeciesSelector extends Widget {
    /**
    * Create a new kernel selector widget.
    */
    constructor(widget: IFBLWidget) {
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
        for (const species of species_list){
            const option = document.createElement('option');
            option.text = species;
            option.value = species;
            selector.appendChild(option);
        }
        body.appendChild(selector);
        super({node: body});
    }
    
    /**
    * Get the value of the kernel selector widget.
    */
    getValue(): string {
        const selector = this.node.querySelector('select') as HTMLSelectElement;
        return selector.value as string;
    }
}

/**
* A widget that provides a species selection.
*/
class SessionDialog extends Widget {
    /**
    * Create a new kernel selector widget.
    */
    constructor(widget: FBLWidget) {
        const body = document.createElement('div');
        const desc = document.createElement('div');
        let text = '';
        if (widget.sessionContext){
            let sessionDesc = ''
            if (widget.sessionContext.session) {
                sessionDesc = `
                <tr><td>Kernel Session</td><td> ${widget.sessionContext.name} </td></tr>
                <tr><td>Kernel Path</td><td> ${PathExt.dirname(widget.sessionContext.path)}</td></tr>
                <tr><td>Kernel Name</td><td> ${widget.sessionContext.kernelDisplayName}</td></tr>
                <tr><td>Comm Target</td><td> ${widget._commTarget}</td></tr>
                <tr><td>Comm Id</td><td> ${widget.comm.commId}</td></tr>
                `
            }
            text = `
            <div class="lm-Widget p-Widget jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput" data-mime-type="text/markdown">
            <table>
                <tr><td>Species</td><td>${widget.species}</td></tr>
                ${sessionDesc}
            </table>
            </div>
            `;
        } else {
            text = 'Widget not connected to kernel.'
        }
        desc.innerHTML = text;
        body.appendChild(desc);
        super({node: body});
    }
    widget: FBLWidget;
    toolbar: Toolbar;
}



/**
* React component for a species name button.
* This wraps the ToolbarButtonComponent and watches the species 
* keyword
*/
function SpeciesComponent(
    props: { widget: IFBLWidget }
) {
    const { widget } = props;
    const callback = () => showDialog({
        title: 'Change Species',
        body: new SpeciesSelector(widget),
        buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({label: 'Change'})
        ]
    }).then(result =>{
        if (result.button.accept){
            widget.species = result.value;
        }
    });
    
    const signal = widget.speciesChanged;
    const species = widget.species;
    return (
        <UseSignal signal={signal} initialArgs={species}>
        {(_, species) => (
            <ToolbarButtonComponent
            className={TOOLBAR_SPECIES_CLASS}
            onClick={callback}
            label={species}
            tooltip={'Change Species'}
            />
        )}
        </UseSignal>
    );
}

/**
* React component for session overview dialog
* This wraps the ToolbarButtonComponent and watches the species 
* keyword
*/
export function SessionDialogComponent(
    props: { widget: FBLWidget }
) {
    const { widget } = props;
    const callback = () => showDialog({
        title: widget.name,
        body: new SessionDialog(widget),
        buttons: [
            Dialog.okButton({label: 'Ok'})
        ]
    });
    
    return (
        <ToolbarButtonComponent
            className={TOOLBAR_SPECIES_CLASS}
            onClick={callback}
            icon={ fblSettingIcon }
            tooltip={'View Session Details'}
        />
    );
}
            
export function createSpeciesButton(
    widget: FBLWidget
): Widget {
    const el = ReactWidget.create(
        <SpeciesComponent widget={widget}/>
        );
    el.addClass(TOOLBAR_SPECIES_CLASS);
    return el;
}


export function createSessionDialogButton(
    widget: FBLWidget
): Widget {
    const el = ReactWidget.create(
        <SessionDialogComponent widget={widget}/>
        );
    el.addClass(TOOLBAR_SPECIES_CLASS);
    return el;
}