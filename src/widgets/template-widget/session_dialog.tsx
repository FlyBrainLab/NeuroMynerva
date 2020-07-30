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

const TOOLBAR_SERVER_CLASS = 'jp-FBL-Processor';

/**
* A widget that provides a Processor selection.
*/
export class ProcessorSelector extends Widget {
    /**
    * Create a new kernel selector widget.
    */
    constructor(widget: IFBLWidget) {
        const body = document.createElement('div');
        const text = document.createElement('label');
        text.textContent = `Select Processor for: "${widget.id}"`;
        body.appendChild(text);
        
        const selector = document.createElement('select');
        for (const processor of Object.keys(widget.ffboProcessor.processors)){
            const option = document.createElement('option');
            option.text = processor;
            option.value = processor;
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
* A widget show all information regarding a given FBL session
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
                <tr><td><b>Kernel Session</b></td><td> ${widget.sessionContext.name} </td></tr>
                <tr><td><b>Kernel Path</b></td><td> ${PathExt.dirname(widget.sessionContext.path)}</td></tr>
                <tr><td><b>Kernel Name</b></td><td> ${widget.sessionContext.kernelDisplayName}</td></tr>
                <tr><td><b>Comm Target</b></td><td> ${widget._commTarget}</td></tr>
                <tr><td><b>Comm Id</b></td><td> ${widget.comm.commId}</td></tr>
                `
            }
            text = `
            <div class="lm-Widget p-Widget jp-RenderedHTMLCommon jp-RenderedMarkdown jp-MarkdownOutput" data-mime-type="text/markdown">
            <table>
                <tr><td><b>Processor</b></td><td>${widget.processor}</td></tr>
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
* React component for a processor name button.
* This wraps the ToolbarButtonComponent and watches the processor 
* keyword
*/
function ProcessorComponent(
    props: { widget: IFBLWidget }
) {
    const { widget } = props;
    const callback = () => showDialog({
        title: 'Change Processor',
        body: new ProcessorSelector(widget),
        buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({label: 'Change'})
        ]
    }).then(result =>{
        if (result.button.accept){
            widget.processor = result.value;
        }
    });
    
    const signal = widget.processorChanged;
    const processor = widget.processor;
    return (
      <UseSignal signal={signal} initialArgs={processor}>
        {(_, processor) => (
          <ToolbarButtonComponent
            className={TOOLBAR_SERVER_CLASS}
            onClick={callback}
            label={processor}
            tooltip={"Change Processor"}
          />
        )}
      </UseSignal>
    );
}

/**
* React component for session overview dialog
* This wraps the ToolbarButtonComponent and watches the processor 
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
            Dialog.okButton({label: 'OK'})
        ]
    });
    
    return (
        <ToolbarButtonComponent
            className={TOOLBAR_SERVER_CLASS}
            onClick={callback}
            icon={ fblSettingIcon }
            tooltip={'View Session Details'}
        />
    );
}
            
export function createProcessorButton(
    widget: FBLWidget
): Widget {
    const el = ReactWidget.create(
        <ProcessorComponent widget={widget}/>
        );
    el.addClass(TOOLBAR_SERVER_CLASS);
    return el;
}


export function createSessionDialogButton(
    widget: FBLWidget
): Widget {
    const el = ReactWidget.create(
        <SessionDialogComponent widget={widget}/>
        );
    el.addClass(TOOLBAR_SERVER_CLASS);
    return el;
}