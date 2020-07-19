# FlyBrainLab Extension

## Development
```bash
conda create -n fblv2 python=3.7 nodejs scipy pandas cookiecutter git yarn -c conda-forge -y
conda activate fblv2
pip install jupyter jupyterlab==2.1.5
pip install txaio twisted autobahn crochet service_identity autobahn-sync matplotlib h5py seaborn fastcluster networkx jupyter
# If on Windows, execute the following:
pip install pypiwin32

git clone --branch build-mono https://github.com/TK-21st/FBL-Wrapper.git
git clone https://github.com/FlyBrainLab/Neuroballad.git
git clone https://github.com/FlyBrainLab/FBLClient.git
cd ./Neuroballad
python setup.py develop
cd ../FBLClient
python setup.py develop
cd ../FBL-Wrapper
jlpm
jlpm run build
jupyter labextension link .

# startup
jupyter lab --watch
```