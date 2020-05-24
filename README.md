# FBL Wrapper Widget
This repository contains a wrapper widget which supports both integrated and independent utilities of FBL Widgets.

## Design Requirements
The design requirements are inspired by the following workflows:

1. Python Entry Point:
    1. Spin up a Jupyter `notebook`.
    2. Instantiate FBL python package, create a client (`client-1`).
    3. Launch Neu3D widget (`neu3d-1`) connected to the `notebook`'s kernel and connected to the `client-1`
    4. Query neurons (e.g. neurons in mb) from python kernel using `client-1`.
    5. Queried neurons are automatically visualized in `neu3d-1`.
    6. Interact with neurons and see results in info-panel.
    7. Repeat step 2-6 with another client `client-2` in the same `notebook`.

2. Browser Entry Point:
    1. Launch Neu3D.
    2. Clicking on a neuron fires a GetInfo event in Python kernel (executes `nm[i].GetInfo(id)`). TODO: A description of FBLClient-related callbacks.
    3. Double clicking a neuron (i) pins a neuron in Neu3D, (ii) fires a PinNeuron event in Python kernel (executes `nm[i].PinNeuron(id)`).
    4. All other functionality in Neu3D is similarly reflected.

Some additional considerations:
1. There should be a way to interrogate the python kernel to see all the instantiated clients and the connected widgets.
2. There should be a way to see all FBL sessions running in the JLab, a widget that returns all kernels running fbl and the clients/widgets within.

### FBL-Wrapper-Extension
- [x] Extension Added to Launcher with custom logo
- [ ] Restorer should be able to re-open previously closed widget on window refresh
    - [ ] need to implement a command to `open` widget with given `path` instead of creating new ones

### FBL-Wrapper Widget
- [x] Create `sessionContext` and `comm` on instantiation
- [x] Support ability to open a console to interact with the python kernel that is referenced by the `sessionContext` (right click).
- [ ] Check if a python kernel is FBL compatible from the `Widget`
- [ ] Support capability to change kernel to connect to another running kernel
    - [ ] If the other kernel is not FBL compatible
        - [ ] notify user that code will be injected 
        - [ ] inject code to create all necessary python objects only when necessary
    - [ ] If the other kernel is FBL compatible

### `FBL Compatible` Python Kernels
Here we introduce the concept of FBL compatible kernels.

The old behavior was as follows:
```python
from ipykernel.comm import Comm
_FFBOLabcomm = Comm(target_name='${this._commId}')
_FFBOLabcomm.send(data='FFBOLab comm established')
_FFBOLabcomm.send(data='Generating FFBOLab Client...')
import flybrainlab as fbl
_FBLAdult = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)
_FFBOLABClient = _FBLAdult
nm = []
nm.append(_FBLAdult)
_FBLLarva = fbl.Client(FFBOLabcomm = _FFBOLabcomm, legacy = True, url = u'wss://neuronlp.fruitflybrain.org:9020/ws')
nm.append(_FBLLarva)
nm_client = 0
```

The proposed new behavior is as follows: (_TODO_)
```python
import flybrainlab as fbl
from ipykernel.comm import Comm
from collections import OrderedDict

if not hasattr(fbl, 'session'):
    fbl.session # TODO
if '${FBL_CLASS_Python}' not in _FBLWidgets:
    _FBLWidgets['${FBL_CLASS_Python}'] = OrderedDict()
_FBLWidgets['${FBL_CLASS_Python}']['${this.id}'] = {'id': '${this.id}', 'comm':_FFBOLabcomm}

if '_FFBOLabcomm' not in globals():
    _FFBOLabcomm = Comm(target_name='${this._commTarget}')
if _FFBOLabcomm.target_name != '${this._commTarget}':
    _FFBOLabcomm = Comm(target_name='${this._commTarget}')
_FFBOLabcomm.send(data="FFBOLab comm established")
_FFBOLabcomm.send(data="Generating FFBOLab Client...")
if '_FBLAdult' not in globals():
    _FBLAdult = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)

nm = []
nm.append(_FBLAdult)
_FBLLarva = fbl.Client(FFBOLabcomm = _FFBOLabcomm, legacy = True, url = u'wss://neuronlp.fruitflybrain.org:9020/ws')
nm.append(_FBLLarva)
nm_client = 0
```
