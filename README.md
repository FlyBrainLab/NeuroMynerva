**[Get Start](#get-started)** |
**[Installation](#installation)** |
**[Getting help](#getting-help)** 

# NeuroMynerva _v2_ - [FlyBrainLab](http://fbl.fruitflybrain.org/)'s JupyterLab Extension
NeuroMynerva V2 is currently in _alpha_, most main user-facing features have been implemented but we expect bug fixes and additional features to be incorporated in the near future. If you want to report a bug, please see [Getting Help](#getting-help). To follow the latest developments on this project, follow the Fruit Fly Brain Observatory(FFBO) [Twitter](https://twitter.com/flybrainobs) where we post weekly updates.

![image](https://github.com/FlyBrainLab/NeuroMynerva/raw/v2alpha/img/neuromynerva_ui.png)

## Get Started
NeuroMynerva V2 is yet to be hosted on [NPM](https://www.npmjs.com/). 
For the time being, please follow installation instruction detailed in [Development](#development) section.

### Tutorials

A set of tutorials are hosted at our [Tutorials](https://github.com/FlyBrainLab/Tutorials). We suggest starting with osn_ephys_tutorial at this stage as it contains pictures showing the steps that need to be taken to get started with the frontend.

### Key Components
NeuroMynerva front-end currently includes 4 key components:
1. `Neu3D-Widget`: A neuron/synapse morphology visualization toolkit that supports 3D rendering of neuron skeletons and meshes.
2. `Info-Widget`: A side panel widget that shows detailed neuron information (metadata, pre-/post- synaptic partners, etc.). Content updated by clicking on individual neurons in `Neu3D-Widget`.
3. `NeuGFX-Widget`: A circuit visualization widget.
4. `Master-Widget`: A side panel widget that keeps track of all currently running NeuroMynerva widgets.

## Installation
### Prerequisites
NeuroMynerva has the following requirements:

- Python Version 3.6+
- Jupyter: Developed on `JupyterLab 2.1.5`
- Public packages (see `requirements.txt`)
- Inhouse packages: 
    * [Neuroballad](https://github.com/FlyBrainLab/Neuroballad.git)
    * [FBLClient](https://github.com/FlyBrainLab/FBLClient.git)

### Installation Script
We use [Anaconda](https://www.anaconda.com/) to manage development environment, you can use the following script to setup the development environment. 
```bash
# create conda environment and install python dependencies
conda create -n fblv2 python=3.7 nodejs scipy pandas cookiecutter git yarn -c conda-forge -y
conda activate fblv2
pip install jupyter jupyterlab==2.1.5
pip install txaio twisted autobahn crochet service_identity autobahn-sync matplotlib h5py seaborn fastcluster networkx msgpack
# If on Windows, execute the following:
pip install pypiwin32

# install inhouse packages and NeuroMynerva
git clone https://github.com/FlyBrainLab/NeuroMynerva.git
git clone https://github.com/FlyBrainLab/Neuroballad.git
git clone https://github.com/FlyBrainLab/FBLClient.git
cd ./Neuroballad
python setup.py develop
cd ../FBLClient
python setup.py develop
cd ../NeuroMynerva
jlpm
jlpm run build

# if in installation mode
jupyter labextension install .
jupyter lab build
jupyter lab

# if in development mode
jupyter labextension link .
jupyter lab --watch
```

## Changes from V1
V2 of NeuroMynerva is a complete overhaul of V1, which was developed when JupyterLab was still in beta phase (v0.33). A few key differences are highlighted below:

1. All widgets (Neu3D, NeuGFX) under V2 can be instantiated and used independently, without needing to spawn an entire FBL Workspace.
2. All widgets in V2 are now able to communication with the FFBO server backend independently, whereas in V1 all communications to/from the sever backend are routed through the `Master-Extension`.
3. `Master-Extension` in V1 has been removed since no single point of communication with the server backend is required in V2. Instead, a new `Master-Widget` has been introduced as a side panel that shows all currently running NeuroMynerva widgets.
4. `Neu3D-Widget` under V2 can be used for data visualization with or without python kernel support. It now supports visualization of local neuron skeleton or neuropil mesh files (in `swc` or `obj` formats).



### Work in Progress Changes
Work in progress changes are tracked in the [V2 Milestone](https://github.com/FlyBrainLab/NeuroMynerva/milestone/1), some key features being worked on are as follows:

1. Kernel entry point: users currently can instantiated widgets by interacting with the JupyterLab Launch Menu or the Command Palette, which executes code in the front-end to spawn widgets. We are working on supporting spawning and control widgets from within the kernel (in Notebook or Console).
2. Improved CAD capabilities with NeuGFX. NeuGFX is currently designed around interactions with a collection of hand-made circuit diagrams. More general support for circuit manipulation and visualization is being worked on.


## Getting Help
The best way to get help right now is to [submit an issue](https://github.com/FlyBrainLab/NeuroMynerva/issues);
