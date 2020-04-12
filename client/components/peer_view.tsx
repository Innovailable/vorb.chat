import * as React from 'react';
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

import { Peer, RemotePeer, LocalPeer, Stream, MediaDomElement } from 'rtc-lib';
import { VolumeProcessor } from '../volume';

import { FeatherIcon } from './feather';
import { SimpleButton } from './form';
import { useAnimationFrameLoop } from './animation';

const usePeerStream = (peer: Peer) => {
  const [stream, setStream] = useState<Promise<Stream>>();

  useEffect(() => {
    setStream(peer.stream());

    const changeCb = () => {
      setStream(peer.stream());
    };

    peer.on('streams_changed', changeCb);

    return () => {
      peer.removeListener('streams_changed', changeCb);
    };
  }, [peer]);

  return stream;
}

const useStreamMute = (stream: Promise<Stream> | undefined, muteType: "audio" | "video"): [boolean, () => void] => {
  const [muted, setMuted] = useState(true);

  const toggleMute = useCallback(() => {
    if(stream == null) {
      return;
    }

    stream.then((stream) => {
      stream.mute(!muted, muteType);
    });
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

    stream.then((stream) => {
      setMuted(stream.muted(muteType));

      stream.on("mute_changed", muteChangedCb);
    });

    return () => {
      stream.then((stream) => stream.removeListener("mute_changed", muteChangedCb));
    };
  }, [stream]);

  return [muted, toggleMute];
}

const useStreamVolume = (stream?: Promise<Stream>) => {
  const [volume, setVolume] = useState(0);
  const processorRef = useRef<VolumeProcessor>();

  useAnimationFrameLoop(() => {
    if(processorRef.current == null) {
      return;
    }

    setVolume(processorRef.current.volume);
  });

  useEffect(() => {
    if(stream == null) {
      return;
    }

    const processor_p = stream.then((stream) => {
      const processor = new VolumeProcessor(stream.stream);
      processorRef.current = processor;
      return processor;
    });

    return () => {
      processor_p.then((processor) => processor.close());
    };
  }, [stream]);

  return volume;
}

export const VolumeInfo: React.SFC<{peer: Peer}> = ({ peer }) => {
  const stream = usePeerStream(peer);
  const [muted, toggleMuted] = useStreamMute(stream, "audio");
  const volume = useStreamVolume(stream);

  // TODO i am sorry ...
  //const red = Math.round(255 - Math.min(volume * 600, 255) / 4).toString(16).padStart(2, '0');
  //const other = Math.round(255 - Math.min(volume * 600, 255)).toString(16).padStart(2, '0');

  const opacity = Math.min(volume * 5, 1.);

  const style: React.CSSProperties = {
    backgroundColor: `rgba(200, 200, 200, ${opacity})`,
  };

  return <SimpleButton clicked={toggleMuted} className="user_input_btn" style={style}>
    <FeatherIcon icon={muted ? "mic-off" : "mic"} />
  </SimpleButton>;
}

export const CamInfo: React.SFC<{ peer: Peer }> = ({ peer }) => {
  const stream = usePeerStream(peer);
  const [muted, toggleMuted] = useStreamMute(stream, "video");

  return <SimpleButton clicked={toggleMuted} className="user_input_btn">
    <FeatherIcon icon={muted ? "video-off" : "video"} />
  </SimpleButton>;
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
    <SimpleButton clicked={toggleShow} className="user_input_btn">
      <FeatherIcon icon="key" />
    </SimpleButton>;
    {display}
  </div>
}

interface StreamVideoProps extends React.HTMLProps<HTMLVideoElement> {
  stream?: Peer | Stream | Promise<Stream>;
}

export const StreamVideo: React.SFC<StreamVideoProps> = ({ stream, ...other }) => {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if(video.current == null) {
      console.log("Unable to access video element");
      return;
    }

    if(stream == null) {
      return;
    }

    const ve = new MediaDomElement(video.current, stream);

    return () => {
      ve.clear();
    };
  }, [stream, video.current]);

  return <video autoPlay {...other} ref={video} />
}

export const LocalPeerDisplay: React.SFC<{ peer: LocalPeer }> = ({ peer }) => {
  return <div className="user_view user_self">
    <StreamVideo stream={peer} />
    <div className="user_buttons">
      <VolumeInfo peer={peer} />
      <CamInfo peer={peer} />
    </div>
  </div>;
}

export const RemotePeerDisplay: React.SFC<{ peer: RemotePeer }> = ({ peer }) => {
  return <div className="user_view">
    <StreamVideo stream={peer} />
    <div className="user_buttons">
      <VolumeInfo peer={peer} />
      <SecurityInfo peer={peer} />
    </div>
  </div>;
}
