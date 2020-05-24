# Neu3D Widget

## Build Process
The Widget needs to be built in the following sequence (particularly with npm install of the neu3d-widget)
```bash
cd /path/to/neu3d-extension
npm install
jupyter labextension link .
npm run watch

# in a separate terminal
# if you want changes to neu3d-extension to propagate. 
# rebuilding extension won't take long since it's very small and 
# the watch function has generally been working for me in this case
jupyter lab --watch 

# in a separate terminal
cd /path/to/neu3d-widget
mkdir asset
cd asset
git clone git@github.com:fruitflybrain/neu3d.git
cd ../   # go back to neu3d-widget
npm link ./asset/neu3d # link neu3d for use
npm install # install requirements for neu3d-widget
cd asset/neu3d
npm install
npm run watch # build and watch neu3d

# in a separate terminal
cd /path/to/neu3d-widget
npm run dev
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
