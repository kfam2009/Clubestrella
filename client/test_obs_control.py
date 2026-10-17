import unittest
from obs_control import GraphicControl,GraphicsOBS,SOURCE

class FakeOBS:
    def __init__(self,item=None):self.item=item;self.calls=[]
    def request(self,kind,data=None):
        self.calls.append((kind,data))
        if kind=='GetCurrentProgramScene':return {'currentProgramSceneName':'Escena'}
        if kind=='GetSceneItemList':return {'sceneItems':[] if self.item is None else [self.item]}
        if kind=='GetInputList':return {'inputs':[]}
        if kind=='GetVideoSettings':return {'baseWidth':1280,'baseHeight':720}
        if kind=='CreateInput':return {'sceneItemId':12}
        if kind=='SetSceneItemEnabled':self.item['sceneItemEnabled']=data['sceneItemEnabled'];return {}
        if kind=='GetSceneItemEnabled':return {'sceneItemEnabled':False if self.item is None else self.item['sceneItemEnabled']}
        return {}
    def close(self):pass

class ControlTests(unittest.TestCase):
    def control(self,fake):
        control=GraphicControl();control.connect=lambda:fake;return control
    def test_status_never_changes_a_source(self):
        fake=FakeOBS({'sourceName':SOURCE,'sceneItemId':12,'sceneItemEnabled':False})
        self.assertFalse(self.control(fake).status()['enabled'])
        self.assertFalse(any(k.startswith(('Set','Create')) for k,_ in fake.calls))
    def test_install_is_invisible_and_scales_only_the_new_item(self):
        fake=FakeOBS();result=self.control(fake).install('http://127.0.0.1:8771/graphics.html')
        self.assertFalse(result['enabled'])
        create=next(data for kind,data in fake.calls if kind=='CreateInput')
        self.assertIs(create['sceneItemEnabled'],False)
        self.assertEqual(create['inputName'],SOURCE)
        transform=next(data for kind,data in fake.calls if kind=='SetSceneItemTransform')
        self.assertEqual(transform['sceneItemId'],12)
        self.assertAlmostEqual(transform['sceneItemTransform']['scaleX'],2/3)
    def test_existing_source_is_not_modified_during_install(self):
        fake=FakeOBS({'sourceName':SOURCE,'sceneItemId':12,'sceneItemEnabled':False})
        self.control(fake).install('http://127.0.0.1/graphics.html')
        self.assertFalse(any(k.startswith(('Set','Create')) for k,_ in fake.calls))
    def test_visibility_targets_only_the_dedicated_source(self):
        fake=FakeOBS({'sourceName':SOURCE,'sceneItemId':12,'sceneItemEnabled':False})
        self.assertTrue(self.control(fake).set_enabled(True)['enabled'])
        writes=[(k,d) for k,d in fake.calls if k.startswith('Set')]
        self.assertEqual(writes,[('SetSceneItemEnabled',{'sceneName':'Escena','sceneItemId':12,'sceneItemEnabled':True})])
        with self.assertRaises(ValueError):self.control(fake).set_enabled('true')
    def test_forbidden_obs_operations_are_rejected(self):
        obs=GraphicsOBS.__new__(GraphicsOBS)
        with self.assertRaises(ValueError):obs.request('StopStream')
        with self.assertRaises(ValueError):obs.request('CreateInput',{'inputName':SOURCE,'sceneItemEnabled':True})

if __name__=='__main__':unittest.main()
