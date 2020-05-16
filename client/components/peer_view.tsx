import * as React from 'react';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

import { Button } from '@rmwc/button';

import { Peer, RemotePeer, LocalPeer, Stream, MediaDomElement } from 'rtc-lib';
import { VolumeProcessor } from '../volume';
import useMergedRef from '@react-hook/merged-ref'

import { Dialog, DialogTitle, DialogContent, DialogActions, DialogButton } from '@rmwc/dialog';
import '@rmwc/dialog/styles';
import { Elevation } from '@rmwc/elevation';
import '@rmwc/elevation/styles';

import { FeatherIcon } from './feather';
import { SimpleButton } from './form';
import { useAnimationFrameLoop } from './animation';
import { usePromiseResult } from './helper';
import { useInputStream, useInputControl } from './rtc_room';
import { useVideoScaler } from './video_scale';
import { InputSelection } from './input_selection';

const usePeerStream = (peer: Peer, name?: string) => {
  const [streamPromise, setStreamPromise] = useState<Promise<Stream>>();
  const stream = usePromiseResult(streamPromise);

  useEffect(() => {
    setStreamPromise(peer.stream(name));

    const changeCb = () => {
      setStreamPromise(peer.stream(name));
    };

    peer.on('streams_changed', changeCb);

    return () => {
      peer.removeListener('streams_changed', changeCb);
    };
  }, [peer, name]);

  return stream;
}

const useStreamMute = (stream: Stream | undefined, muteType: "audio" | "video"): [boolean, () => void] => {
  const [muted, setMuted] = useState(true);

  const toggleMute = useCallback(() => {
    if(stream == null) {
      return;
    }

    stream.mute(!muted, muteType);
  }, [stream, muted]);

  useEffect(() => {
    if(stream == null) {
      setMuted(true);
      return;
    }

    const muteChangedCb = (type: string, muted: boolean) => {
      if(type === muteType) {
        setMuted(muted);
      }
    };

    setMuted(stream.muted(muteType));

    stream.on("mute_changed", muteChangedCb);

    return () => {
      stream.removeListener("mute_changed", muteChangedCb);
    };
  }, [stream]);

  return [muted, toggleMute];
}

const useStreamVolume = (stream: Stream | undefined) => {
  const [volume, setVolume] = useState(0);
  const processorRef = useRef<VolumeProcessor>();

  useAnimationFrameLoop(() => {
    if(processorRef.current == null) {
      setVolume(0);
      return;
    }

    setVolume(processorRef.current.volume);
  });

  useEffect(() => {
    if(stream == null || stream.getTracks('audio').length === 0) {
      return;
    }

    const processor = new VolumeProcessor(stream.stream);
    processorRef.current = processor;

    return () => {
      processor.close();
    };
  }, [stream]);

  return volume;
}

const useStreamActive = (stream: Stream | undefined) => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if(stream == null) {
      setActive(false);
      return;
    }

    const update = () => {
      setActive(stream.stream.active);
    };

    update();
    stream.on('tracks_changed', update);

    return () => {
      stream.off('tracks_changed', update);
    };
  }, [stream]);

  return active;
}

const usePeerName = (peer: LocalPeer | RemotePeer) => {
  const [peerName, setPeerName] = useState("");

  useEffect(() => {
    setPeerName(peer.status("name"));
    const changeCb = () => {
      setPeerName(peer.status("name"));
    }

    peer.on('status_changed', changeCb);

    return () => {
      peer.removeListener("status_changed", changeCb);
    }
  }, [peer]);

  return peerName;
}

const useStreamTrack = (stream: Stream | undefined, type: 'audio' | 'video') => {
  const [track, setTrack] = useState<MediaStreamTrack>();

  useEffect(() => {
    if(stream == null) {
      setTrack(undefined);
      return;
    }

    const update = () => {
      setTrack(stream.getTracks(type)[0]);
    };

    update();
    stream.on('tracks_changed', update);

    return () => {
      stream.off('tracks_changed', update);
    };
  }, [stream]);

  return track;
}

const useStreamTrackActive = (stream: Stream | undefined, type: 'audio' | 'video') => {
  const [active, setActive] = useState(false);
  const track = useStreamTrack(stream, type);

  useEffect(() => {
    if(track == null) {
      setActive(false);
      return;
    }

    const update = () => {
      console.log('mute is', track.muted);
      console.log(track);
      setActive(!track.muted);
    };

    update();
    track.addEventListener('mute', update);
    track.addEventListener('unmute', update);

    return () => {
      track.removeEventListener('mute', update);
      track.removeEventListener('unmute', update);
    };
  }, [track]);

  return active;
}

export const VolumeInfo: React.SFC<{ stream?: Stream }> = ({ stream }) => {
  const [muted, toggleMuted] = useStreamMute(stream, "audio");
  const volume = useStreamVolume(stream);

  // TODO i am sorry ...
  //const red = Math.round(255 - Math.min(volume * 600, 255) / 4).toString(16).padStart(2, '0');
  //const other = Math.round(255 - Math.min(volume * 600, 255)).toString(16).padStart(2, '0');

  const opacity = Math.min(volume * 5, 1.);

  let icon: string;

  if(muted) {
    icon = 'volume-x';
  } else {
    if(volume < .15) {
      icon = 'volume';
    } else if(volume < .25) {
      icon = 'volume-1';
    } else {
      icon = 'volume-2';
    }
  }

  return <Button outlined onClick={toggleMuted} className="user_input_btn overlay_button">
    <FeatherIcon icon={icon} />
  </Button>;
}

export const CamInfo: React.SFC<{ stream?: Stream }> = ({ stream }) => {
  const [muted, toggleMuted] = useStreamMute(stream, "video");

  return <Button outlined onClick={toggleMuted} className="user_input_btn overlay_button">
    <FeatherIcon icon={muted ? "video-off" : "video"} />
  </Button>;
}

export const SecurityInfo: React.SFC<{ peer: RemotePeer }> = ({ peer }) => {
  const [showing, setShowing] = useState(false);

  const toggleShow = useCallback(() => {
    setShowing(!showing);
  }, [showing, setShowing]);

  let display: React.ReactNode = null;

  if(showing) {
    // TODO state management
    const fingerprints = peer.currentFingerprints();

    display = <div className="key_info">
      <div>
        <span>Local:</span>
        <input value={fingerprints.local?.hash ?? ""} readOnly />
      </div>
      <div>
        <span>Remote:</span>
        <input value={fingerprints.remote?.hash ?? ""} readOnly />
      </div>
    </div>
  }

  return <div className="key_wrapper">
    <Button outlined onClick={toggleShow} className="user_input_btn overlay_button">
      <FeatherIcon icon="key" />
    </Button>
    {display}
  </div>;
}

interface StreamVideoProps extends React.HTMLProps<HTMLVideoElement> {
  stream?: Peer | Stream | Promise<Stream>;
}

export const StreamVideo = React.forwardRef<HTMLVideoElement,StreamVideoProps>(({ stream, ...other }, ref) => {
  const ourRef = useRef<HTMLVideoElement>(null);
  const mergedRef = useMergedRef(ourRef, ref);

  useEffect(() => {
    if(ourRef.current == null) {
      console.log("Unable to access video element");
      return;
    }

    if(stream == null) {
      return;
    }

    const ve = new MediaDomElement(ourRef.current, stream);

    return () => {
      ve.clear();
    };
  }, [stream]);

  return <video autoPlay {...other} ref={mergedRef} />
});

export const ScreenshareButton: React.SFC = () => {
  const input = useInputControl();

  const toggle = useCallback(() => {
    input?.toggleScreenshare();
  }, [input]);

  return <Button outlined className="overlay_button" onClick={toggle} >
      <FeatherIcon icon="share" />
  </Button>
};

export const InputConfigButton: React.SFC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return <>
    <Dialog open={isOpen} onClose={close} renderToPortal={true}>
      <DialogTitle>Select Devices</DialogTitle>
      <DialogContent>
        <InputSelection />
      </DialogContent>
      <DialogActions>
        <DialogButton onClick={close} action="accept" isDefaultAction>Okay</DialogButton>
      </DialogActions>
    </Dialog>
    <Button outlined className="overlay_button" type="button" onClick={open}>
      <FeatherIcon icon="settings" />
    </Button>
  </>;
};

export const LocalPeerDisplay: React.SFC<{ peer: LocalPeer }> = ({ peer }) => {
  const stream = useInputStream();
  const peerName = usePeerName(peer);

  return <div className="user_view user_self">
    <StreamVideo muted stream={stream} />
    <div className="user_buttons">
      <VolumeInfo stream={stream} />
      <InputConfigButton />
      <ScreenshareButton />
      <Button outlined className="overlay_button" type="button">{peerName}</Button>
    </div>
  </div>;
}

export const RemotePeerDisplay: React.SFC<{ peer: RemotePeer }> = ({ peer }) => {
  const stream = usePeerStream(peer);
  const screenshare = usePeerStream(peer, 'screenshare');
  const screenshareActive = useStreamTrackActive(screenshare, 'video');

  const [scaleWrapperRef, videoRef] = useVideoScaler();

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useMergedRef(scaleWrapperRef, fullscreenRef);

  const peerName = usePeerName(peer);

  const handleFullscreen = useCallback(() => {
    fullscreenRef.current?.requestFullscreen();
  }, []);

  let streamView: React.ReactNode;

  if(screenshareActive) {
    streamView = <>
      <StreamVideo className="user_stream_main" stream={screenshare} ref={videoRef} />
      <Elevation z={5} className="user_stream_pip">
        <StreamVideo stream={stream} />
      </Elevation>
    </>
  } else {
    streamView = <StreamVideo className="user_stream_main" stream={stream} ref={videoRef} />;
  }

  return <div className="user_wrapper" ref={wrapperRef}>
    <div className="user_view" onDoubleClick={handleFullscreen}>
      {streamView}
      <div className="user_buttons">
        <VolumeInfo stream={stream} />
        <SecurityInfo peer={peer} />
        <Button outlined className="overlay_button" type="button">{peerName}</Button>
      </div>
    </div>
  </div>;
}
