import { Signal } from '@lumino/signaling';
import { FBLWidgetModel } from '../template/index';
/**
* Neu3D Model class
*/
export class Neu3DModel extends FBLWidgetModel {
    constructor(options) {
        super(options);
        this._dataChanged = new Signal(this);
        this._metadataChanged = new Signal(this);
        this._statesChanged = new Signal(this);
    }
    /**
     * Synchronize with real meshDict from the Neu3D instance
     */
    syncWithWidget(meshDict) {
        let oldValue = this.data;
        this.data = Private.loadNeu3DMeshDict(meshDict);
        this._dataChanged.emit({
            event: (oldValue) ? 'change' : 'add',
            source: this.data,
            oldValue: oldValue,
            newValue: this.data
        });
    }
    addMesh(rid, value) {
        let oldValue = this.data[rid];
        this.data[rid] = Private.convertRawMesh(value);
        this._dataChanged.emit({
            event: (oldValue) ? 'change' : 'add',
            source: this.data,
            key: rid,
            oldValue: oldValue,
            newValue: this.data[rid]
        });
    }
    removeMesh(rid) {
        let oldValue = this.data[rid];
        if (oldValue) { // check if mesh exists
            delete this.data[rid];
            this._dataChanged.emit({
                event: 'remove',
                source: this.data,
                key: rid,
                oldValue: oldValue,
                newValue: undefined
            });
        }
    }
    pinMeshes(rids) {
        for (let rid of rids) {
            let oldValue = this.data[rid]['pinned'];
            let newValue = true;
            if (oldValue !== newValue) {
                this.data[rid]['pinned'] = newValue;
                this._dataChanged.emit({
                    event: 'change',
                    source: this.data[rid],
                    key: 'pinned',
                    oldValue: oldValue,
                    newValue: newValue
                });
            }
        }
    }
    unpinMeshes(rids) {
        for (let rid of rids) {
            let oldValue = this.data[rid]['pinned'];
            let newValue = false;
            if (oldValue !== newValue) {
                this.data[rid]['pinned'] = newValue;
                this._dataChanged.emit({
                    event: 'change',
                    source: this.data[rid],
                    key: 'pinned',
                    oldValue: oldValue,
                    newValue: newValue
                });
            }
        }
    }
    hideMeshes(rids) {
        for (let rid of rids) {
            let oldValue = this.data[rid]['visibility'];
            let newValue = false;
            if (oldValue !== newValue) {
                this.data[rid]['visibility'] = newValue;
                this._dataChanged.emit({
                    event: 'change',
                    source: this.data[rid],
                    key: 'visibility',
                    oldValue: oldValue,
                    newValue: false
                });
            }
        }
    }
    showMeshes(rids) {
        for (let rid of rids) {
            let oldValue = this.data[rid]['visibility'];
            let newValue = true;
            if (oldValue !== true) {
                this.data[rid]['visibility'] = newValue;
                this._dataChanged.emit({
                    event: 'change',
                    source: this.data[rid],
                    key: 'visibility',
                    oldValue: oldValue,
                    newValue: newValue
                });
            }
        }
    }
    get dataChanged() {
        return this._dataChanged;
    }
    get metadataChanged() {
        return this._metadataChanged;
    }
    get statesChanged() {
        return this._statesChanged;
    }
}
var Private;
(function (Private) {
    /**
     * Convert Neu3D's raw meshDict object to what we have
     * @param meshDict Neu3D's raw meshDict object
     */
    function loadNeu3DMeshDict(meshDict) {
        let modelMeshDict = {};
        for (let rid of Object.keys(meshDict)) {
            modelMeshDict[rid] = convertRawMesh(meshDict[rid]);
        }
        return modelMeshDict;
    }
    Private.loadNeu3DMeshDict = loadNeu3DMeshDict;
    /**
     * Convert Raw Neu3D Mesh to `IMeshDict`
     */
    function convertRawMesh(mesh) {
        if (mesh.filename) {
            return {
                label: mesh['label'],
                highlight: mesh['highlight'],
                opacity: mesh['opacity'],
                visibility: mesh['visibility'],
                background: mesh['background'],
                // color: mesh['color'],
                pinned: mesh['pinned'],
                filetype: mesh['filetype'],
                filename: mesh['filename']
            };
        }
        else if (mesh.dataStr) {
            return {
                label: mesh['label'],
                highlight: mesh['highlight'],
                opacity: mesh['opacity'],
                visibility: mesh['visibility'],
                background: mesh['background'],
                // color: mesh['color'],
                pinned: mesh['pinned'],
                filetype: mesh['filetype'],
                dataStr: mesh['dataStr']
            };
        }
        else if (['sample', 'parent', 'identifier', 'x', 'y', 'z', 'r'].every(l => { return l in mesh; })) { // raw data
            return {
                label: mesh['label'],
                highlight: mesh['highlight'],
                opacity: mesh['opacity'],
                visibility: mesh['visibility'],
                background: mesh['background'],
                // color: mesh['color'],
                pinned: mesh['pinned'],
                sample: mesh['sample'],
                parent: mesh['parent'],
                identifier: mesh['identifier'],
                x: mesh['x'],
                y: mesh['y'],
                z: mesh['z'],
                r: mesh['r'],
                // object: mesh.object ?? {},
                type: 'morphology_json'
            };
        }
        else {
            return {}; // neither mesh nor swc
        }
    }
    Private.convertRawMesh = convertRawMesh;
})(Private || (Private = {}));
