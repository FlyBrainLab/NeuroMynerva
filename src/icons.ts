import { LabIcon } from '@jupyterlab/ui-components';
import ffboLogoStr from '../style/icons/ffbo_logo.svg';
import fblSettingIconStr from '../style/icons/fbl_setting_icon.svg';
import infoIconStr from '../style/icons/neuinfo_icon.svg';
import neu3DIconStr from '../style/icons/neu3d_icon.svg';
import neuGFXIconStr from '../style/icons/neugfx_icon.svg';
import masterIconStr from '../style/icons/master_icon.svg';
import ffboProcessorIconStr from '../style/icons/ffboprocessor_icon.svg';

import chartAreaStr from '../style/icons/chart-area.svg';
import codeStr from '../style/icons/code.svg';
import listAltStr from '../style/icons/list-alt.svg';
import playCircleStr from '../style/icons/play-circle.svg';
import saveStr from '../style/icons/save.svg';
import shareAltSquareStr from '../style/icons/share-alt-square.svg';
import shareAltStr from '../style/icons/share-alt.svg';
import uploadStr from '../style/icons/upload.svg';

import zoomToFitStr from '../style/icons/zoom-to-fit.svg';
import trashStr from '../style/icons/trash.svg';
import eyeStr from '../style/icons/eye.svg';
import eyeSlashStr from '../style/icons/eye-slash.svg';
import syncStr from '../style/icons/sync.svg';
import cameraStr from '../style/icons/camera.svg';
import mapUpinStr from '../style/icons/map-unpin.svg';
import mapPinStr from '../style/icons/map-pin.svg';
import webStr from '../style/icons/web.svg';
import syncToConsoleStr from '../style/icons/sync_to_console.svg';

// svgstr is the raw contents of an icon's svg file
export const fblIcon = new LabIcon({
  name: 'fbl:fbl',
  svgstr: ffboLogoStr // TODO: change to use fbl icon
});
export const neu3DIcon = new LabIcon({
  name: 'fbl:neu3d',
  svgstr: neu3DIconStr
});
export const neuGFXIcon = new LabIcon({
  name: 'fbl:neugfx',
  svgstr: neuGFXIconStr
});
export const neuInfoIcon = new LabIcon({
  name: 'fbl:neuinfo',
  svgstr: infoIconStr
});
export const masterIcon = new LabIcon({
  name: 'fbl:master',
  svgstr: masterIconStr
});
export const ffboProcessorIcon = new LabIcon({
  name: 'fbl:processor',
  svgstr: ffboProcessorIconStr
});
export const syncConsoleIcon = new LabIcon({
  name: 'fbl:sync-console',
  svgstr: syncToConsoleStr
});

// export const workspaceIcon = new LabIcon({
//   name: 'fbl:workspace',
//   svgstr: workspaceIconStr
// });
export const webIcon = new LabIcon({
  name: 'fbl:web',
  svgstr: webStr // TODO: change to use fbl icon
});

export const fblSettingIcon = new LabIcon({
  name: 'fbl:setting',
  svgstr: fblSettingIconStr
});

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
export const zoomToFitIcon = new LabIcon({
  name: 'fbl:zoom-to-fit',
  svgstr: zoomToFitStr
});
export const trashIcon = new LabIcon({
  name: 'fbl:trash',
  svgstr: trashStr
});
export const eyeIcon = new LabIcon({
  name: 'fbl:eye',
  svgstr: eyeStr
});
export const eyeSlashIcon = new LabIcon({
  name: 'fbl:eye-slash',
  svgstr: eyeSlashStr
});

export const uploadIcon = new LabIcon({
  name: 'fbl:upload',
  svgstr: uploadStr
});

export const syncIcon = new LabIcon({
  name: 'fbl:sync',
  svgstr: syncStr
});

export const cameraIcon = new LabIcon({
  name: 'fbl:camera',
  svgstr: cameraStr
});

export const mapUpinIcon = new LabIcon({
  name: 'fbl:map-unpin',
  svgstr: mapUpinStr
});

export const mapPinIcon = new LabIcon({
  name: 'fbl:map-pin',
  svgstr: mapPinStr
});
