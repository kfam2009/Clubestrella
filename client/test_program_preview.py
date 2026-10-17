import base64
import unittest
from types import SimpleNamespace
from program_preview import ProgramPreview

class ProgramTests(unittest.TestCase):
    def test_captures_program_and_tracks_scene_changes_without_writes(self):
        calls=[]
        class FakeOBS:
            scene='Escena'
            def request(self,kind,data=None):
                calls.append((kind,data))
                if kind=='GetCurrentProgramScene':return {'currentProgramSceneName':self.scene}
                if kind=='GetSourceScreenshot':return {'imageData':'data:image/jpeg;base64,'+base64.b64encode(b'jpeg').decode()}
                raise AssertionError('Solo se permiten consultas')
        obs=FakeOBS();preview=ProgramPreview(SimpleNamespace(),None)
        preview.capture_once(obs);self.assertEqual(preview.snapshot()['gameScene'],'Escena')
        obs.scene='Otra escena';preview.capture_once(obs)
        self.assertEqual(preview.snapshot()['gameScene'],'Otra escena')
        self.assertTrue(preview.snapshot()['gameConnected'])
        self.assertEqual(calls[-1][1]['sourceName'],'Otra escena')
        self.assertEqual(calls[-1][1]['imageWidth'],960)
        self.assertEqual(preview.image,b'jpeg')
    def test_no_image_is_not_reported_as_connected(self):
        preview=ProgramPreview(SimpleNamespace(),None)
        self.assertFalse(preview.snapshot()['gameConnected'])
        self.assertEqual(preview.snapshot()['gameView'],'program')

if __name__=='__main__':unittest.main()
