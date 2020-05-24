import flybrainlab as fbl
from ipykernel.comm import Comm
from collections import OrderedDict

if '_FFBOLabcomm' not in globals():
    _FFBOLabcomm = Comm(target_name='${this._commTarget}')
if _FFBOLabcomm.target_name != '${this._commTarget}':
    _FFBOLabcomm = Comm(target_name='${this._commTarget}')
_FFBOLabcomm.send(data="FFBOLab comm established")
_FFBOLabcomm.send(data="Generating FFBOLab Client...")

_FBLAdult = fbl.ffbolabClient(FFBOLabcomm = _FFBOLabcomm)
_FFBOLABClient = _FBLAdult
nm = []
nm.append(_FBLAdult)
_FBLLarva = fbl.Client(FFBOLabcomm = _FFBOLabcomm, legacy = True, url = u'wss://neuronlp.fruitflybrain.org:9020/ws')
nm.append(_FBLLarva)
nm_client = 0

if '_FBLWidgets' not in globals():
    _FBLWidgets = OrderedDict()
if '${FBL_CLASS_Python}' not in _FBLWidgets:
    _FBLWidgets['${FBL_CLASS_Python}'] = OrderedDict()
_FBLWidgets['${FBL_CLASS_Python}']['${this.id}'] = {'id': ${this.id}, 'comm':_FFBOLabcomm}