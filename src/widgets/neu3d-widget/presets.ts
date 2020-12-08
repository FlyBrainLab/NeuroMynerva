import { AdultMesh } from './adult_mesh';
import { LarvaMesh } from './larva_mesh';
import { HemibrainMesh } from './hemibrain_mesh';

export var PRESETS = {
  'larva(l1em)': {
    'searchPlaceholder': "Write Query. (Example: Show OSNs)",
    'neu3dSettings': {
      'resetPosition': { x: 42.057169835814626, y: 18.465885594337543, z: -509.65272951348953 },
      'upVector' : {x: 0.0022681554337180836, y: -0.9592325957384876, z: 0.2826087096034669},
      'cameraTarget': { x: 42.11358557008077, y: 74.90946190543991, z: 58.654427921234685 },
    },
    'meshes': LarvaMesh,
  },
  'adult(flycircuit)': {
    'searchPlaceholder': "Write Query. (Example: Show neurons in EB)",
    'neu3dSettings': {
      'resetPosition': {x: 0, y: 0, z: 1800},
      'upVector' : {x: 0., y: 1., z: 0.}
    },
    'meshes': AdultMesh,
  },
  'adult(hemibrain)': {
    'searchPlaceholder': "Write Query. (Example: Show APL)",
    'neu3dSettings': {
      'resetPosition': {x: -0.41758013880199485, y: 151.63625728674563, z: -50.50723330508691},
      'upVector': {x: -0.0020307520395871814, y: -0.500303768173525, z: -0.8658475706482184},
      'cameraTarget' : {x: 17.593074756823892, y: 22.60567192152306, z: 21.838699853616273},
    },
    'meshes': HemibrainMesh,
  },
  'default': {
    'searchPlaceholder': "Write Query."
  },
  'disconnected': {
    'searchPlaceholder': "Not Connected to Processor.",
  }
}