# NeuroMynerva

NeuroMynerva integrates the Fruit Fly Brain Observatory (FFBO) Project with JupyterLab, providing CAD capabilities and a neuroscientific data exploration platform.

## NOTE
as of 08/03/2018, NeuroMynerva has been updated to use Jupyterlab v0.33.3 API. Please run 
```
pip install --upgrade jupyterlab
```
and rebuild NeuroMynerva. 

## NeuroMynerva Quick Installation

Current version of NeuroMynerva has been tested on MacOS and Windows.

Start by opening a terminal and going to the parent folder of the repository where this README.md file resides. Then, follow the following instructions:

### Instructions for Unix and Windows

You can just paste the following to your terminal.

```bash
conda create -n neuromynerva python=3.6 nodejs jupyterlab cookiecutter git -c conda-forge -y
activate neuromynerva
pip install txaio twisted autobahn crochet service_identity autobahn-sync matplotlib h5py networkx pypiwin32
cd ./FFBOLab/ffbolabNeuroballad
python setup.py develop
cd ../flybrainlab
python setup.py develop
cd ../../neuro-mynerva
yarn install
npm run build
npm run build && npm run link
cd packages/
jupyter lab
```

### Running JupyterLab with NeuroMynerva

After the installation is complete, you can execute JupyterLab with NeuroMynerva functionalities by running

```bash
jupyter lab
```

## Launching NeuroMynerva

NeuroMynerva can be launched either through the Commands Palette menu or the Launcher tab.

#### Commands

Open the _Commands_ section of the JupyterLab sidebar and click the __NeuroMynerva OPERATIONS__ section. Then, select the `Create New Workspace` command.

#### Launcher

In the launcher page click the `FFBOLab` panel (located in the _FFBO_ section).
