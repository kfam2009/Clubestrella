import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from agent import load_config
from continuous_video import ContinuousVideo, validate_rtsp


class VideoTests(unittest.TestCase):
    def test_only_rtsp_sources_are_accepted(self):
        self.assertEqual(validate_rtsp('rtsp://127.0.0.1/live'),'rtsp://127.0.0.1/live')
        for source in ('exec:calc','file:///private','https://example.com','rtsp://','rtsp://host/live\r\nsecret',None):
            with self.assertRaises(ValueError): validate_rtsp(source)

    def test_local_test_does_not_require_cloud_credentials(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'config.json'
            self.assertEqual(load_config(path,local_only=True)['cloud_url'],'')
            path.write_text(json.dumps({'obs_host':'192.0.2.1'}))
            with self.assertRaises(ValueError):load_config(path,local_only=True)

    def test_public_state_does_not_include_camera_credentials(self):
        video=ContinuousVideo(SimpleNamespace(game_rtsp='rtsp://user:private@localhost/live'),None,Path(__file__).parent)
        video.auth='private-auth'
        state=json.dumps(video.snapshot())
        self.assertNotIn('private',state)
        self.assertNotIn('rtsp://',state)
        video.close()

    def test_foreign_origin_is_rejected_before_connecting(self):
        video=ContinuousVideo(SimpleNamespace(),None,Path(__file__).parent)
        errors=[]
        handler=SimpleNamespace(server=SimpleNamespace(server_address=('127.0.0.1',8771)),headers={'Origin':'https://example.com','Upgrade':'websocket'},send_error=lambda *args:errors.append(args))
        video.forward_websocket(handler)
        self.assertEqual(errors[0][0],403)
        video.close()


if __name__=='__main__':unittest.main()
