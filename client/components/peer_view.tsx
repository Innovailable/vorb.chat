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
import { TextField } from '@rmwc/textfield';
import '@rmwc/textfield/styles';

import { FeatherIcon } from './feather';
import { SimpleButton } from './form';
import { useAnimationFrameLoop } from './animation';
import { usePromiseResult } from './helper';
import { useInputStream, useInputControl, useIsScreensharing, useInputScreenshare } from './rtc_room';
import { useVideoScaler } from './video_scale';
import { InputSelection } from './input_selection';

const securityText = require('./encryption_text.md');

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

    stream.toggleMute(muteType);
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

  let icon: string;

  if(muted) {
    icon = 'volume-x';
  } else {
    if(volume < .10) {
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

export const SecurityInfo: React.SFC<{ peer: RemotePeer }> = ({ peer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const fingerprints = peer.currentFingerprints();

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return <>
    <Button outlined onClick={open} className="user_input_btn overlay_button">
      <FeatherIcon icon="key" />
    </Button>
    <Dialog open={isOpen} onClose={close} renderToPortal={true}>
      <DialogTitle>Secure connection</DialogTitle>
      <DialogContent>
        <div className="key_info" dangerouslySetInnerHTML={{__html: securityText }} />
        Encryption key hash values:
        <TextField className="key_value" label="Local fingerprint" filled value={fingerprints.local?.hash ?? ""} readOnly />
        <TextField className="key_value" label="Remote fingerprint" filled value={fingerprints.remote?.hash ?? ""} readOnly />
      </DialogContent>
      <DialogActions>
        <DialogButton onClick={close} action="accept" isDefaultAction>Okay</DialogButton>
      </DialogActions>
    </Dialog>
  </>;
}

interface StreamVideoProps extends React.HTMLProps<HTMLVideoElement> {
  stream?: Stream;
}

export const StreamVideo = React.forwardRef<HTMLVideoElement,StreamVideoProps>(({ stream, ...other }, ref) => {
  const ourRef = useRef<HTMLVideoElement>(null);
  const mergedRef = useMergedRef(ourRef, ref);
  const videoActive = useStreamTrackActive(stream, 'video');

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

  const videoStyle: React.CSSProperties = {
    display: videoActive ? undefined : 'none',
  };

  const placeholder = videoActive ? null : <FeatherIcon icon="camera-off" className="video_placeholder" />;

  return <>
    {placeholder}
    <video autoPlay {...other} ref={mergedRef} style={videoStyle} />
  </>
});

export const ScreenshareButton: React.SFC = () => {
  const input = useInputControl();
  const isScreensharing = useIsScreensharing();

  const toggle = useCallback(() => {
    input?.toggleScreenshare();
  }, [input]);

  const icon = isScreensharing ? 'x' : 'monitor';

  return <Button outlined className="overlay_button" onClick={toggle} >
      <FeatherIcon icon={icon} />
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
  const screenShare  = useInputScreenshare();
  const peerName = usePeerName(peer);

  const videoRef = useVideoScaler();

  let streamView: React.ReactNode;

  if(screenShare) {
    streamView = <>
      <StreamVideo className="user_stream_main" stream={screenShare} />
      <Elevation z={5} className="user_stream_pip">
        <StreamVideo className="mirror" muted stream={stream} />
      </Elevation>
    </>
  } else {
    streamView = <StreamVideo className="mirror" muted stream={stream} />;
  }

  return <div className="user_view user_self">
    {streamView}
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

  const [scaleWrapperRef, viewRef, videoRef] = useVideoScaler();

  const fullscreenRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useMergedRef(scaleWrapperRef, fullscreenRef);

  const peerName = usePeerName(peer);

  const handleFullscreen = useCallback(() => {
    fullscreenRef.current?.requestFullscreen();
  }, []);

  let streamView: React.ReactNode;

  if(screenshareActive) {
    streamView = <>
      <StreamVideo className="user_stream_main" stream={screenshare} ref={videoRef} onDoubleClick={handleFullscreen} />
      <Elevation z={5} className="user_stream_pip">
        <StreamVideo stream={stream} onDoubleClick={handleFullscreen} />
      </Elevation>
    </>
  } else {
    streamView = <StreamVideo className="user_stream_main" stream={stream} ref={videoRef} onDoubleClick={handleFullscreen} />;
  }

  return <div className="user_wrapper" ref={wrapperRef}>
    <div className="user_view" ref={viewRef}>
      {streamView}
      <div className="user_buttons">
        <VolumeInfo stream={stream} />
        <SecurityInfo peer={peer} />
        <Button outlined className="overlay_button" type="button">{peerName}</Button>
      </div>
    </div>
  </div>;
}
