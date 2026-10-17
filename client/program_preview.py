"""Small read-only snapshots of OBS Program, independent of scoreboard OCR."""
import base64
import os
import threading
import time

class ProgramPreview:
    def __init__(self,args,obs_factory):
        self.args=args;self.obs_factory=obs_factory;self.lock=threading.Lock()
        self.image=b'';self.updated=0.;self.revision=0;self.connected=False;self.scene=''
        self.stopped=threading.Event()
    def snapshot(self):
        with self.lock:
            age=time.time()-self.updated if self.updated else None
            return {'gameMode':'snapshots','gameView':'program','gameLabel':'Salida de OBS',
                    'gameImage':'game.jpg','gameConnected':bool(self.connected and age is not None and age<5),
                    'gameRevision':self.revision,'gameAge':round(age,1) if age is not None else None,
                    'gameScene':self.scene}
    def capture_once(self,obs):
        scene=obs.request('GetCurrentProgramScene')['currentProgramSceneName']
        reply=obs.request('GetSourceScreenshot',{'sourceName':scene,'imageFormat':'jpg','imageWidth':960,'imageHeight':540})
        data=base64.b64decode(reply['imageData'].split(',',1)[1])
        with self.lock:
            self.image=data;self.updated=time.time();self.revision+=1;self.connected=True;self.scene=scene
    def run(self):
        obs=None
        try:
            while not self.stopped.is_set():
                try:
                    if obs is None:obs=self.obs_factory(self.args.host,self.args.obs_port,os.environ.get('OBS_PASSWORD',''))
                    self.capture_once(obs)
                    self.stopped.wait(1.25)
                except Exception:
                    if obs:
                        try:obs.close()
                        except OSError:pass
                    obs=None
                    with self.lock:self.connected=False
                    self.stopped.wait(2)
        finally:
            if obs:obs.close()
    def close(self):self.stopped.set()
