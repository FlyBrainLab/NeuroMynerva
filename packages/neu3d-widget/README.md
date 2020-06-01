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