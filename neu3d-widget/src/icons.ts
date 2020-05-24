import { LabIcon } from '@jupyterlab/ui-components';
import chartAreaStr from '../style/icons/chart-area.svg';
import codeStr from '../style/icons/code.svg';
import listAltStr from '../style/icons/list-alt.svg';
import playCircleStr from '../style/icons/play-circle.svg';
import saveStr from '../style/icons/save.svg';
import shareAltSquareStr from '../style/icons/share-alt-square.svg';
import shareAltStr from '../style/icons/share-alt.svg';
import uploadStr from '../style/icons/upload.svg';

// svgstr is the raw contents of an icon's svg file
export const chartAreaIcon = new LabIcon({
    name: 'fbl:chart-area',
    svgstr: chartAreaStr
});
export const codeIcon = new LabIcon({
    name: 'fbl:code',
    svgstr: codeStr
});
export const listAltIcon = new LabIcon({
    name: 'fbl:list-all',
    svgstr: listAltStr
});
export const playCircleIcon = new LabIcon({
    name: 'fbl:play-circle',
    svgstr: playCircleStr
});
export const saveIcon = new LabIcon({
    name: 'fbl:save',
    svgstr: saveStr
});
export const shareAltSquareIcon = new LabIcon({
    name: 'fbl:share-alt-square',
    svgstr: shareAltSquareStr
});
export const shareAltIcon = new LabIcon({
    name: 'fbl:share-alt',
    svgstr: shareAltStr
});
export const uploadIcon = new LabIcon({
    name: 'fbl:upload',
    svgstr: uploadStr
});
