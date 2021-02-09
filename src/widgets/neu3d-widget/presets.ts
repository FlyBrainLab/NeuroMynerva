import { AdultMesh } from './adult_mesh';
import { LarvaMesh } from './larva_mesh';
import { HemibrainMesh } from './hemibrain_mesh';

export type PRESETS_NAMES =
  | 'larva(l1em)'
  | 'adult(flycircuit)'
  | 'adult(hemibrain)'
  | 'default'
  | 'disconnected';
type PresetEntry = {
  searchPlaceholder: string;
  neu3dSettings: {
    resetPosition?: { x: number; y: number; z: number };
    upVector?: { x: number; y: number; z: number };
    cameraTarget?: { x: number; y: number; z: number };
  };
  meshes?: any;
  hints: Array<{ query: string; effect: string }>;
};

export const PRESETS: { [name in PRESETS_NAMES]: PresetEntry } = {
  'larva(l1em)': {
    searchPlaceholder: 'Write Query. (Example: Show OSNs)',
    neu3dSettings: {
      resetPosition: {
        x: 42.057169835814626,
        y: 18.465885594337543,
        z: -509.65272951348953
      },
      upVector: {
        x: 0.0022681554337180836,
        y: -0.9592325957384876,
        z: 0.2826087096034669
      },
      cameraTarget: {
        x: 42.11358557008077,
        y: 74.90946190543991,
        z: 58.654427921234685
      }
    },
    meshes: LarvaMesh,
    hints: [
      {
        query: 'show $MBON$',
        effect: 'search for any neuron whose name contains text "MBON"'
      },
      {
        query: 'add /r(.*)OSN-(.*)/r',
        effect:
          'add to the current workspace any neuron whose name matches the regular expression.'
      },
      {
        query: 'show $5813014882$',
        effect:
          'show a single neuron corresponding to the Hemibrain BodyID 5813014882.'
      },
      {
        query: 'show /:referenceId:[5813014882, 912147912, 880875861]',
        effect: 'show all neurons with the listed Hemibrain BodyId.'
      },
      {
        query: 'show neurons in right MB',
        effect: 'show all neurons that have arborizations in MB.'
      },
      {
        query:
          'add postsynaptic gabaergic $MBON$ neurons with at least 10 synapses',
        effect:
          'add all GABAergic MBON neurons that are postsynaptic to the neurons in the current workspace and that have a connection with more than 10 synapses.'
      }
    ]
  },
  'adult(flycircuit)': {
    searchPlaceholder: 'Write Query. (Example: Show neurons in EB)',
    neu3dSettings: {
      resetPosition: { x: 0, y: 0, z: 1800 },
      upVector: { x: 0, y: 1, z: 0 }
    },
    meshes: AdultMesh,
    hints: [
      {
        query: 'show $MBON$',
        effect: 'search for any neuron whose name contains text "MBON"'
      },
      {
        query: 'add /r(.*)DA1_(.*)_R_1/r',
        effect:
          'add to the current workspace any neuron whose name matches the regular expression.'
      },
      {
        query: 'show neurons in EB',
        effect: 'show all neurons that have arborizations in EB.'
      },
      {
        query: 'add postsynaptic $PEG$ neurons with at least 10 synapses',
        effect:
          'add all PEG neurons that are postsynaptic to the neurons in the current workspace and that have a connection with more than 10 synapses.'
      }
    ]
  },
  'adult(hemibrain)': {
    searchPlaceholder: 'Write Query. (Example: Show APL)',
    neu3dSettings: {
      resetPosition: {
        x: -0.41758013880199485,
        y: 151.63625728674563,
        z: -50.50723330508691
      },
      upVector: {
        x: -0.0020307520395871814,
        y: -0.500303768173525,
        z: -0.8658475706482184
      },
      cameraTarget: {
        x: 17.593074756823892,
        y: 22.60567192152306,
        z: 21.838699853616273
      }
    },
    meshes: HemibrainMesh,
    hints: [
      {
        query: 'show $MBON$',
        effect: 'search for any neuron whose name contains text "MBON"'
      },
      {
        query: 'add /r(.*)DA1_(.*)_R_1/r',
        effect:
          'add to the current workspace any neuron whose name matches the regular expression.'
      },
      {
        query: 'show $5813014882$',
        effect:
          'show a single neuron corresponding to the Hemibrain BodyID 5813014882.'
      },
      {
        query: 'show /:referenceId:[5813014882, 912147912, 880875861]',
        effect: 'show all neurons with the listed Hemibrain BodyId.'
      },
      {
        query: 'show neurons in right MB',
        effect: 'show all neurons that have arborizations in MB.'
      },
      {
        query: 'add postsynaptic $PEG$ neurons with at least 10 synapses',
        effect:
          'add all PEG neurons that are postsynaptic to the neurons in the current workspace and that have a connection with more than 10 synapses.'
      },
      {
        query: 'show neurons that have dendrites in EB and axons in PB',
        effect:
          'show neurons that have input site from EB and has output sites in PB.'
      }
    ]
  },
  default: {
    searchPlaceholder: 'Write Query.',
    neu3dSettings: {
      resetPosition: { x: 0, y: 0, z: 0 },
      upVector: { x: 0, y: 1, z: 0 },
      cameraTarget: { x: 0, y: 0, z: 0 }
    },
    hints: [
      {
        query: 'show $MBON$',
        effect: 'search for any neuron whose name contains text "MBON"'
      },
      {
        query: 'add /r(.*)DA1_(.*)_R_1/r',
        effect:
          'add to the current workspace any neuron whose name matches the regular expression.'
      },
      {
        query: 'show neurons in EB',
        effect: 'show all neurons that have arborizations in EB.'
      },
      {
        query: 'add postsynaptic $PEG$ neurons with at least 10 synapses',
        effect:
          'add all PEG neurons that are postsynaptic to the neurons in the current workspace and that have a connection with more than 10 synapses.'
      }
    ]
  },
  disconnected: {
    searchPlaceholder: 'Not Connected to Processor.',
    hints: [
      {
        query: 'show $MBON$',
        effect: 'search for any neuron whose name contains text "MBON"'
      },
      {
        query: 'add /r(.*)DA1_(.*)_R_1/r',
        effect:
          'add to the current workspace any neuron whose name matches the regular expression.'
      },
      {
        query: 'show neurons in EB',
        effect: 'show all neurons that have arborizations in EB.'
      },
      {
        query: 'add postsynaptic $PEG$ neurons with at least 10 synapses',
        effect:
          'add all PEG neurons that are postsynaptic to the neurons in the current workspace and that have a connection with more than 10 synapses.'
      }
    ],
    neu3dSettings: {
      resetPosition: { x: 0, y: 0, z: 0 },
      upVector: { x: 0, y: 1, z: 0 },
      cameraTarget: { x: 0, y: 0, z: 0 }
    }
  }
};
