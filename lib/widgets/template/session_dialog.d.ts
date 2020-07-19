/// <reference types="react" />
import { Widget } from '@lumino/widgets';
import { FBLWidget } from './widget';
/**
* React component for session overview dialog
* This wraps the ToolbarButtonComponent and watches the species
* keyword
*/
export declare function SessionDialogComponent(props: {
    widget: FBLWidget;
}): JSX.Element;
export declare function createSpeciesButton(widget: FBLWidget): Widget;
export declare function createSessionDialogButton(widget: FBLWidget): Widget;
