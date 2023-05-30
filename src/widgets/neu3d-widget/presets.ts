export type PRESETS_NAMES =
  | 'larva(l1em)'
  | 'adult(flycircuit)'
  | 'adult(hemibrain)'
  | 'adult(medulla)'
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
  hints: Array<{ query: string; effect: string; examples: Array<string> }>;
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
    hints: [
      {
        query: 'show cell-type neurons',
        effect: 'Shows the neurons of the cell type.',
        examples: ['"show broad local neurons", or simply "show broad LN".']
      },
      {
        query: 'show $string$ neurons',
        effect: 'Shows neurons with a name that contains the string.',
        examples: [
          '"show $MBON$ neurons", or simply "show $MBON$", will query any neuron whose name contain the string *MBON*'
        ]
      },
      {
        query: 'show /rstring/r neurons',
        effect:
          'Show neurons whose name matches the regular expressing string (This requires some knowledge of how the neurons are named in each dataset).',
        examples: [
          '"show /rM(.*)d1(.*)/r neurons", or simply "show /rM(.*)d1(.*)/r" will show neurons whose name starts with M and has d1.'
        ]
      },
      {
        query:
          'show neurons in|that innervate|that arborize in neuropil/subregion',
        effect:
          'Shows neurons that has output or input in a neuropil or a subregion of a neuropil.',
        examples: [
          '"show neurons in left antennal lobe", or using abbreviations "show neurons in left AL"',
          '"show neurons that innervate right al and right mb". Note that this is different from "show neurons that innervate right al or right mb"'
        ]
      },
      {
        query: 'show local neurons in neuropil',
        effect:
          ' Shows the neurons that has only inputs and outputs within the neuropil (note that due to lack of data in some datasets, some neurons are only traced in one neuropil and thus are classified local neuron by default).',
        examples: ['"show local neurons in antennal lobe"']
      },
      {
        query:
          'show neurons with|that have inputs|outputs in neuropil/subregion',
        effect:
          'More specific then the previous query on the inputs or outputs.',
        examples: [
          '"show neurons with inputs in left AL"',
          '"show neurons with inputs in right antennal lobe and outputs in right mushroom body", or equivalently "show neurons projecting from right antennal lobe to right mushroom body"',
          '"show neurons that connect right AL and right MB". Includes both the neurons that has inputs in AL and outputs in MB, and those has inputs in MB and outputs in AL.'
        ]
      },
      {
        query: 'show neurons presynaptic|postsynaptic to',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons defined after the word to.',
        examples: [
          '"show neurons presynaptic to broad local neurons in right antennal lobe"',
          '"show $DAN$ presynaptic to $MBON-d1$ in right MB"'
        ]
      },
      {
        query: 'show presynaptic|postsynaptic neurons',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons already in workspace.',
        examples: [
          '"show presynaptic neurons"',
          '"show postsynaptic neurons with at least 10 synapses"'
        ]
      },
      {
        query: 'show neurotransmitter neurons',
        effect: 'Shows the neurons that express the neurotramsitter.',
        examples: [
          '"show GABAergic neurons in AL"',
          '"show cholinergic presynaptic neurons"',
          '"show glutamatergic local neurons in AL"'
        ]
      },
      {
        query: 'show /:referenceId:[4414184, 10673895]',
        effect:
          'Shows the neurons whose referenceId in the original dataset is in the list. It can be used similar to $ \\$ and regular expression and combined with other types of criteria.',
        examples: ['"show /:referenceId:[4414184, 10673895]"']
      },
      {
        query: 'color red',
        effect: 'Colors the neurons/synapses added in the most recent query.',
        examples: [
          '"show A neurons", then "add B neurons", then "color red" will color B neurons red. "color A neurons 0000FF" will then color A neurons blue.'
        ]
      }
    ]
  },
  'adult(medulla)': {
    searchPlaceholder: 'Write Query. (Example: Show Mi1)',
    neu3dSettings: {
      resetPosition: {
        x: 212.0,
        y: 337.0,
        z: 35.5
      },
      upVector: {
        x: 0.0504,
        y: -0.004173,
        z: -0.99852
      },
      cameraTarget: {
        x: 17.593,
        y: 22.606,
        z: 21.8387
      }
    },
    hints: [
      {
        query: 'show cell-type neurons',
        effect: 'Shows the neurons of the cell type.',
        examples: ['"show Mi1 neurons", or simply "show mi1".']
      },
      {
        query: 'show $string$ neurons',
        effect: 'Shows neurons with a name that contains the string.',
        examples: [
          '"show $T4a$ neurons", or simply "show $T4a$", will query any neuron whose name contain the string *T4a*'
        ]
      },
      {
        query: 'show /rstring/r neurons',
        effect:
          'Show neurons whose name matches the regular expressing string (This requires some knowledge of how the neurons are named in each dataset).',
        examples: [
          '"show /rTm2-[A-C]/r neurons", or simply "show /rTm2-[A-C]/r" will show the Tm2 neurons in the A, B, C columns'
        ]
      },
      {
        query:
          'show neurons with|that have inputs|outputs in neuropil/subregion',
        effect:
          'More specific then the previous query on the inputs or outputs.',
        examples: ['"show neurons in column A with outputs in m10"']
      },
      {
        query: 'show neurons presynaptic|postsynaptic to',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons defined after the word to.',
        examples: [
          '"show neurons presynaptic to $T4a-fb-home$"',
          '"show Pm2 postsynaptic to Mi1 with at least 5 synapses"'
        ]
      },
      {
        query: 'show presynaptic|postsynaptic neurons',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons already in workspace.',
        examples: [
          '"show presynaptic neurons,"',
          '"show postsynaptic neurons with at least 10 synapses"',
          '"show postynaptic Dm1"'
        ]
      },
      {
        query: 'show neurotransmitter neurons',
        effect: 'Shows the neurons that express the neurotramsitter',
        examples: [
          '"show GABAergic neurons"',
          '"show cholinergic presynaptic neurons"'
        ]
      },
      {
        query: 'show /:referenceId:[30465, 7892]',
        effect:
          'Shows the neurons whose referenceId in the original dataset is in the list. It can be used similar to "$string$" syntax and regular expression syntax "/rstring/r" described above, and they can be combined with other types of criteria.',
        examples: ['"show /:referenceId:[30465, 7892]"']
      },
      {
        query: 'color red',
        effect: 'Colors the neurons/synapses added in the most recent query.',
        examples: [
          '"show A neurons", then "add B neurons", then "color red" will color B neurons red. "color A neurons 0000FF" will then color A neurons blue.'
        ]
      }
    ]
  },
  'adult(flycircuit)': {
    searchPlaceholder: 'Write Query. (Example: Show neurons in EB)',
    neu3dSettings: {
      resetPosition: { x: 0, y: 0, z: 1800 },
      upVector: { x: 0, y: 1, z: 0 }
    },
    hints: [
      {
        query: 'show $string$ neurons',
        effect: 'Shows neurons with a name that contains the string.',
        examples: [
          '"show $E0585$ neurons", or simply "show $E0585$", will query any neuron whose name contain the string *E0585*.'
        ]
      },
      {
        query: 'show /rstring/r neurons',
        effect:
          'Show neurons whose name matches the regular expressing string (This requires some knowledge of how the neurons are named in each dataset).',
        examples: [
          '"show /r(.*)TH-F-[1-2](.*)2/r neurons", or simply "show /r(.*)TH-F-[1-2](.*)2/r" will show dopaminergic neurons (TH gene) with the FlyCircuit ID number starting with 1 or 2 and end with 2'
        ]
      },
      {
        query:
          'show neurons in|that innervate|that arborize in neuropil/subregion',
        effect:
          'Shows neurons that has output or input in a neuropil or a subregion of a neuropil.',
        examples: [
          '"show neurons in ellipsoid body", or using abbreviations "show neurons in EB"',
          '"show neurons that innervate right al and right mb". Note that this is different from "show neurons that innervate right al or right mb".'
        ]
      },
      {
        query:
          'show neurons with|that have inputs|outputs in neuropil/subregion',
        effect:
          'More specific then the previous query on the inputs or outputs.',
        examples: ['"show local neurons in ellipsoid body"']
      },
      {
        query: 'show local neurons in neuropil',
        effect:
          'Shows the neurons that has only inputs and outputs within the neuropil (note that due to lack of data in some datasets, some neurons are only traced in one neuropil and thus are classified local neuron by default).',
        examples: [
          '"show neurons with inputs in OPTU"',
          '"show neurons with inputs in right antennal lobe and outputs in right lateral horn", or equivalently "show neurons projecting from right antennal lobe to right lateral horn,"',
          '"show neurons that connect right AL and right MB". Includes both the neurons that has inputs in AL and outputs in MB, and those has inputs in MB and outputs in AL.'
        ]
      },
      {
        query: 'show neurons presynaptic|postsynaptic to',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons defined after the word to.',
        examples: [
          '"show neurons presynaptic to $TH-F-700014$ in right medulla"',
          '"show $Cha$ presynaptic to $TH-F-700014$"'
        ]
      },
      {
        query: 'show presynaptic|postsynaptic neurons',
        effect:
          ' Shows the neurons that are presynaptic or postsynaptic to the neurons already in workspace.',
        examples: [
          '"show presynaptic neurons"',
          '"show postsynaptic neurons with at least 10 synapses."'
        ]
      },
      {
        query: 'show neurotransmitter neurons',
        effect: 'Shows the neurons that express a specified neurotramsitter.',
        examples: [
          '"show GABAergic neurons in EB"',
          '"show cholinergic presynaptic neurons"',
          '"show glutamatergic local neurons in AL"'
        ]
      },
      {
        query: 'show /:referenceId:[VGlut-F-000001, Cha-F-100201]',
        effect:
          'Shows the neurons whose referenceId in the original dataset is in the list. It can be used similar to "$string$" syntax and regular expression syntax "/rstring/r" described above, and they can be combined with other types of criteria.',
        examples: ['"show /:referenceId:[VGlut-F-000001, Cha-F-100201]"']
      },
      {
        query: 'color red',
        effect: 'Colors the neurons/synapses added in the most recent query.',
        examples: [
          '"show A neurons", then "add B neurons", then "color red" will color B neurons red. "color A neurons 0000FF" will then color A neurons blue.'
        ]
      }
    ]
  },
  'adult(hemibrain)': {
    searchPlaceholder: 'Write Query. (Example: Show APL)',
    neu3dSettings: {
      resetPosition: { x: 191.128, y: 1917.794, z: -281.683 },
      upVector: { x: -0.00203, y: -0.5, z: -0.8658 },
      cameraTarget: { x: 137.984, y: 179.674, z: 172.154 }
    },
    hints: [
      {
        query: 'show cell-type neurons',
        effect: 'Shows the neurons of the cell type.',
        examples: ['"show PEG neurons", or simply "show peg"']
      },
      {
        query: 'show $string$ neurons',
        effect: 'Shows neurons with a name that contains the string.',
        examples: [
          '"show $PEG$ neurons", or simply "show $PEG$", will query any neuron whose name contain the string *PEG*.'
        ]
      },
      {
        query: 'show /rstring/r neurons',
        effect:
          'Show neurons whose name matches the regular expressing string (This requires some knowledge of how the neurons are named in each dataset).',
        examples: [
          '"show /r(.*)PEG(.*)R1(.*)/r neurons", or simply "show /r(.*)PEG(.*)R1(.*)/r" will show the PEG neurons that innervate PB glomerulus R1.'
        ]
      },
      {
        query:
          'show neurons in|that innervate|that arborize in neuropil/subregion',
        effect:
          'Shows neurons that has output or input in a neuropil or a subregion of a neuropil.',
        examples: [
          '"show neurons in ellipsoid body", or using abbreviations "show neurons in EB"',
          '"show PEG neurons that arborize in PB glomerulus r9"',
          '"show neurons that innervate right al and right mb". Note that this is different from "show neurons that innervate right al or right mb".'
        ]
      },
      {
        query: 'show local neurons in neuropil',
        effect:
          'Shows the neurons that has only inputs and outputs within the neuropil (note that due to lack of data in some datasets, some neurons are only traced in one neuropil and thus are classified local neuron by default).',
        examples: ['"show local neurons in ellipsoid body"']
      },
      {
        query:
          'show neurons with|that have inputs|outputs in neuropil/subregion',
        effect:
          'More specific then the previous query on the inputs or outputs.',
        examples: [
          '"show neurons with inputs in AME"',
          '"show ER3w neurons that have outputs in EB"',
          '"show neurons with inputs in right antennal lobe and outputs in right lateral horn", or equivalently "show neurons projecting from right antennal lobe to right lateral horn"',
          '"show neurons that connect right AL and right MB". Includes both the neurons that has inputs in AL and outputs in MB, and those has inputs in MB and outputs in AL.'
        ]
      },
      {
        query: 'show neurons presynaptic|postsynaptic to',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons defined after the word to.',
        examples: [
          '"show neurons presynaptic to TuBu05"',
          '"show $aMe$ presynaptic to KCs that innervate alpha\'1 compartment"',
          '"show DAN postsynaptic to MBONs with at least 30 synapses"'
        ]
      },
      {
        query: 'show presynaptic|postsynaptic neurons',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons already in workspace.',
        examples: [
          '"show presynaptic neurons"',
          '"show postsynaptic neurons with at least 10 synapses"',
          '"show postynaptic MBON that innervate gamma lobe with at least 5 synapses". This searches for MBONs that satisfy: 1) postsyantpic to the neurons in the workspace with at least 5 synapses and 2) innervate gamma lobe of the mushroom body.'
        ]
      },
      {
        query: 'show /:referenceId:[5813014882, 912147912, 880875861]',
        effect:
          'Shows the neurons whose referenceId in the original dataset is in the list. It can be used similar to $ \\$ and regular expression and combined with other types of criteria.',
        examples: ['"show /:referenceId:[5813014882, 912147912, 880875861]"']
      },
      {
        query: 'color red',
        effect: 'Colors the neurons/synapses added in the most recent query.',
        examples: [
          '"show A neurons", then "add B neurons", then "color red" will color B neurons red. "color A neurons 0000FF" will then color A neurons blue.'
        ]
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
        query: 'show cell-type neurons',
        effect: 'Shows the neurons of the cell type.',
        examples: ['"show PEG neurons", or simply "show peg"']
      },
      {
        query: 'show $string$ neurons',
        effect: 'Shows neurons with a name that contains the string.',
        examples: [
          '"show $PEG$ neurons", or simply "show $PEG$", will query any neuron whose name contain the string *PEG*.'
        ]
      },
      {
        query: 'show /rstring/r neurons',
        effect:
          'Show neurons whose name matches the regular expressing string (This requires some knowledge of how the neurons are named in each dataset).',
        examples: [
          '"show /r(.*)PEG(.*)R1(.*)/r neurons", or simply "show /r(.*)PEG(.*)R1(.*)/r" will show the PEG neurons that innervate PB glomerulus R1.'
        ]
      },
      {
        query:
          'show neurons in|that innervate|that arborize in neuropil/subregion',
        effect:
          'Shows neurons that has output or input in a neuropil or a subregion of a neuropil.',
        examples: [
          '"show neurons in ellipsoid body", or using abbreviations "show neurons in EB"',
          '"show PEG neurons that arborize in PB glomerulus r9"',
          '"show neurons that innervate right al and right mb". Note that this is different from "show neurons that innervate right al or right mb".'
        ]
      },
      {
        query: 'show local neurons in neuropil',
        effect:
          'Shows the neurons that has only inputs and outputs within the neuropil (note that due to lack of data in some datasets, some neurons are only traced in one neuropil and thus are classified local neuron by default).',
        examples: ['"show local neurons in ellipsoid body"']
      },
      {
        query:
          'show neurons with|that have inputs|outputs in neuropil/subregion',
        effect:
          'More specific then the previous query on the inputs or outputs.',
        examples: [
          '"show neurons with inputs in AME"',
          '"show ER3w neurons that have outputs in EB"',
          '"show neurons with inputs in right antennal lobe and outputs in right lateral horn", or equivalently "show neurons projecting from right antennal lobe to right lateral horn"',
          '"show neurons that connect right AL and right MB". Includes both the neurons that has inputs in AL and outputs in MB, and those has inputs in MB and outputs in AL.'
        ]
      },
      {
        query: 'show neurons presynaptic|postsynaptic to',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons defined after the word to.',
        examples: [
          '"show neurons presynaptic to TuBu05"',
          '"show $aMe$ presynaptic to KCs that innervate alpha\'1 compartment"',
          '"show DAN postsynaptic to MBONs with at least 30 synapses"'
        ]
      },
      {
        query: 'show presynaptic|postsynaptic neurons',
        effect:
          'Shows the neurons that are presynaptic or postsynaptic to the neurons already in workspace.',
        examples: [
          '"show presynaptic neurons"',
          '"show postsynaptic neurons with at least 10 synapses"',
          '"show postynaptic MBON that innervate gamma lobe with at least 5 synapses". This searches for MBONs that satisfy: 1) postsyantpic to the neurons in the workspace with at least 5 synapses and 2) innervate gamma lobe of the mushroom body.'
        ]
      },
      {
        query: 'show /:referenceId:[5813014882, 912147912, 880875861]',
        effect:
          'Shows the neurons whose referenceId in the original dataset is in the list. It can be used similar to $ \\$ and regular expression and combined with other types of criteria.',
        examples: ['"show /:referenceId:[5813014882, 912147912, 880875861]"']
      },
      {
        query: 'color red',
        effect: 'Colors the neurons/synapses added in the most recent query.',
        examples: [
          '"show A neurons", then "add B neurons", then "color red" will color B neurons red. "color A neurons 0000FF" will then color A neurons blue.'
        ]
      }
    ]
  },
  disconnected: {
    searchPlaceholder: 'Not Connected to Processor.',
    hints: [
      {
        query: 'show $MBON$',
        effect: 'search for any neuron whose name contains text "MBON"',
        examples: []
      },
      {
        query: 'add /r(.*)DA1_(.*)_R_1/r',
        effect:
          'add to the current workspace any neuron whose name matches the regular expression.',
        examples: []
      },
      {
        query: 'show neurons in EB',
        effect: 'show all neurons that have arborizations in EB.',
        examples: []
      },
      {
        query: 'add postsynaptic $PEG$ neurons with at least 10 synapses',
        effect:
          'add all PEG neurons that are postsynaptic to the neurons in the current workspace and that have a connection with more than 10 synapses.',
        examples: []
      }
    ],
    neu3dSettings: {
      resetPosition: { x: 0, y: 0, z: 0 },
      upVector: { x: 0, y: 1, z: 0 },
      cameraTarget: { x: 0, y: 0, z: 0 }
    }
  }
};
