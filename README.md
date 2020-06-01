# FlyBrainLab Extension

## Build Process
**Note**: we are using ports to serve JS resources
- Master-Widget: 7996
- NeuGFX-Widget: 7997
- Neu3D-Widget: 7998
- NeuAny-Widget: 7999

```bash
conda create -n fblv2-test python=3.7 nodejs -y
conda activate fblv2-test
git clone --branch lerna git@github.com:TK-21st/FBL-Wrapper.git
git clone git@github.com:fruitflybrain/neu3d.git packages/neu3d
pip install jupyter jupyterlab>=2.1.2
cd FBL-Wrapper
jlpm
jlpm run link
jlpm run build
jlpm run link:lab
jlpm run dev

# in another terminal
conda activate fblv2-test
jupyter lab
```