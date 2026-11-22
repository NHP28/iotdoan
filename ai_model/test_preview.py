"""Quality/pose regression tests. Synthetic landmarks test the guidance, not liveness."""
import base64
import io
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from fastapi import HTTPException
from PIL import Image

import api


def picture(brightness=None):
    gray = np.full((480, 640), brightness, dtype=np.uint8) if brightness is not None else (
        ((np.indices((480, 640)).sum(axis=0) // 8) % 2) * 60 + 98).astype(np.uint8)
    image = Image.fromarray(np.repeat(gray[:, :, None], 3, axis=2))
    output = io.BytesIO()
    image.save(output, format='JPEG')
    return 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode()


class PreviewTests(unittest.TestCase):
    def inspect(self, pose='front', yaw=0, brightness=None, locations=None, tilt=0):
        landmarks = {'left_eye': [(270, 210)] * 6, 'right_eye': [(370, 210 + tilt)] * 6,
                     'nose_bridge': [(320 + yaw * 100, 260)] * 4}
        with patch.object(api, 'detect_faces', return_value=locations if locations is not None else [(120, 440, 360, 200)]), \
             patch.object(api.face_recognition, 'face_landmarks', return_value=[landmarks]), \
             patch.object(api.face_recognition, 'face_encodings', return_value=[np.zeros(128)]):
            return api.preview(api.PreviewRequest(image=picture(brightness), pose=pose))

    def test_actual_detector_rejects_blank_frame(self):
        result = api.preview(api.PreviewRequest(image=picture(128)))
        self.assertEqual(result['code'], 'no_face')
        self.assertFalse(result['acceptable'])

    def test_preview_does_not_compute_identity_vectors(self):
        with patch.object(api.face_recognition, 'face_encodings', side_effect=AssertionError('Slow identity computation in preview')):
            # inspect() stubs only the localization/landmark input for this assertion.
            with patch.object(api, 'detect_faces', return_value=[(120, 440, 360, 200)]), \
                 patch.object(api.face_recognition, 'face_landmarks', return_value=[{
                     'left_eye': [(270, 210)] * 6, 'right_eye': [(370, 210)] * 6,
                     'nose_bridge': [(320, 260)] * 4}]):
                self.assertTrue(api.preview(api.PreviewRequest(image=picture()))['acceptable'])

    def test_existing_fixture_missed_by_hog_still_encodes(self):
        fixture = Path(__file__).resolve().parents[1] / 'IOT/IOT/test_images/binh_thuong/img_35515.jpg'
        if not fixture.is_file():
            self.skipTest('Optional local IoT dataset is not present')
        with Image.open(fixture) as source:
            source = source.convert('RGB')
            scale = min(1, 640 / source.width)
            source = source.resize((round(source.width * scale), round(source.height * scale)))
            pixels = np.asarray(source)
            self.assertEqual(len(api.face_recognition.face_locations(pixels)), 0, 'Fixture reproduces the old detection miss')
            self.assertEqual(len(api.detect_faces(pixels)), 1)
            output = io.BytesIO()
            source.save(output, format='JPEG', quality=90)
        image = 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode()
        embedding, avatar = api.encode(image)
        self.assertEqual(len(embedding), 128)
        self.assertTrue(np.isfinite(embedding).all())
        self.assertTrue(avatar.startswith('data:image/jpeg;base64,'))

    def test_existing_dlib_vectors_remain_compatible(self):
        fixture = Path(__file__).resolve().parents[1] / 'IOT/IOT/test_images/binh_thuong/j0199.png'
        if not fixture.is_file():
            self.skipTest('Optional local IoT dataset is not present')
        with Image.open(fixture) as source:
            source = source.convert('RGB')
            source.thumbnail((640, 640))
            pixels = np.asarray(source)
        old_locations = api.face_recognition.face_locations(pixels)
        new_locations = api.detect_faces(pixels)
        self.assertEqual(len(old_locations), 1)
        self.assertEqual(len(new_locations), 1)
        old_vector = api.face_recognition.face_encodings(pixels, old_locations)[0]
        new_vector = api.face_recognition.face_encodings(pixels, new_locations)[0]
        self.assertLess(float(np.linalg.norm(old_vector - new_vector)), api.THRESHOLD)

    def test_valid_poses_and_no_biometric_vectors_in_response(self):
        for pose, yaw in [('front', 0), ('left', .22), ('right', -.22)]:
            with self.subTest(pose=pose):
                result = self.inspect(pose=pose, yaw=yaw)
                self.assertTrue(result['acceptable'])
                self.assertEqual(result['code'], 'ready')
                self.assertEqual(result['pose'], pose)
                self.assertEqual(result['face_count'], 1)
                self.assertNotIn('embedding', result)
                self.assertNotIn('avatar', result)

    def test_pose_direction_must_match_instruction(self):
        self.assertEqual(self.inspect(pose='left', yaw=-.22)['code'], 'adjust_pose')
        self.assertEqual(self.inspect(pose='right', yaw=.22)['code'], 'adjust_pose')
        self.assertEqual(self.inspect(pose='front', yaw=.22)['code'], 'adjust_pose')
        self.assertEqual(self.inspect(pose='left', yaw=.8)['code'], 'adjust_pose')

    def test_quality_guidance(self):
        cases = [
            ({'locations': []}, 'no_face'),
            ({'locations': [(120, 440, 360, 200)] * 2}, 'multiple_faces'),
            ({'locations': [(160, 355, 240, 285)]}, 'too_far'),
            ({'locations': [(10, 570, 470, 70)]}, 'too_close'),
            ({'locations': [(120, 240, 360, 0)]}, 'off_center'),
            ({'brightness': 25}, 'too_dark'),
            ({'brightness': 240}, 'too_bright'),
            ({'brightness': 128}, 'blurry'),
            ({'tilt': 50}, 'tilted'),
        ]
        for args, code in cases:
            with self.subTest(code=code):
                result = self.inspect(**args)
                self.assertFalse(result['acceptable'])
                self.assertEqual(result['code'], code)

    def test_bad_image_is_a_validation_error(self):
        with self.assertRaises(HTTPException) as error:
            api.preview(api.PreviewRequest(image='data:image/jpeg;base64,invalid'))
        self.assertEqual(error.exception.status_code, 400)


if __name__ == '__main__':
    unittest.main()
