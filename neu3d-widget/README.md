# Neu3D Widget
## Known issues
- [ ] file upload is done by creating a div with hardcoded class name (from neu3d.js package), this means in multiple instance configuration, all uploaded files will be loaded into the first neu3d instance.
    - [ ] support file upload feature in each `neu3d-widget` with unique `id`
    - [ ] destroy added HTML elements when `neu3d-widget` is disposed
- [ ] the visualization settings for larva and adult are not correct. 