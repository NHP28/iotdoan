# Face detector

`face_detection_yunet_2023mar.onnx` is the existing YuNet model copied from
`IOT/IOT/face_detection_yunet_2023mar.onnx` in this workspace.

- SHA-256: `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4`
- Upstream: https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet
- License: MIT; see `LICENSE.yunet`.

Ship this directory together with `api.py` and `face_detection.py`. YuNet localizes
faces; dlib still generates the same 128-dimensional identity vectors as before.
