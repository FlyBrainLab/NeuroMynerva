# Neu3D Widget

## Build Process
```bash
conda create -n fblv2-test python=3.7 nodejs -y
conda activate fblv2-test
npm install -g npm-safe-install
pip install jupyter jupyterlab>=2.1.2
git clone git@github.com:TK-21st/FBL-Wrapper.git
cd FBL-Wrapper
git checkout neu3d
cd neu3d-extension

npm install
# conda activate fblv2-test # make sure right jupyter is used. I had some issue in my ZSH, could be ZSH specific
jupyter labextension link . # the jlab build call here can take quite some time 
# if you want to watch changes to neu3d-extension
# npm run watch
# start a new terminal
# cd /path/to/neu3d-widget
cd ../neu3d-widget
mkdir asset
git clone git@github.com:fruitflybrain/neu3d.git asset/neu3d
nsi asset/neu3d
npm run install:neu3d
npm run dev
# in a new terminal
conda activate fblv2-test
jupyter lab
# if you want to watch changes to neu3d-extension
# jupyter lab --watch
```

**Note**: we are using port 7998 (hardcoded)

## Tasks
- [ ] (**Known issue**) file upload is done by creating a div with hardcoded class name (from neu3d.js package), this means in multiple instance configuration, all uploaded files will be loaded into the first neu3d instance.
    - [ ] support file upload feature in each `neu3d-widget` with unique `id`
    - [ ] destroy added HTML elements when `neu3d-widget` is disposed
- [ ] (**Known issue**) the visualization settings for larva and adult are not correct... not sure why 
- [ ] Support mesh loading
    - [x] expose mesh loading feature (setter for `species` will load the meshes appropriately)
    - [ ] create UI to reflect species and allow changing of species (maybe a button like the change kernel button).
- [ ] UX support for telling user that the neuron is outside of the visible field because of coordinate issue. Maybe add a callback to `neu3d.addJson` which checks for if any added neurons are outside of visible field?
- [x] simplify `dat.GUI` by putting most UIs into the toolbar native to JLab.
- [x] Default setting to `Low` (mostly turning off FXAA and SSAO) to ensure high framerate.

## Design Requirement
Here the design requirement is inspired by the following workflows:

1. Pyhton Entry Point
    1. Spin up a Jupyter `notebook`
    2. Instantiate FBL python package, create a client (`client-1`)
    3. Query neurons (e.g. neurons in mb) from python kernel using `client-1`
    4. Launch Neu3D widget (`neu3d-1`) connected to the `notebook`'s kernel and connected to the `client-1`
    5. Visualize queried neurons in `neu3d-1`
    6. Interact with neurons and see results in info-panel
    7. Repeat step 2-6 with another client `client-2` in the same `notebook`

2. Browser Entry Point
    1. Launch Neu3D
    2. _TODO_

Some additional considerations
1. There should be a way to interrogate the python kernel to see all the instantiated clients and the connected widgets
2. There should be a way to see all FBL sessions running in the JLab, a widget that returns all kernels running fbl and the clients/widgets within
