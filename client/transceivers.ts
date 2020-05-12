import * as Emittery from 'emittery';
import { StreamTransceiverFactory, RemotePeer, Stream, LocalPeer, Peer } from "rtc-lib";
import { TrackKind } from './input_control';

interface StreamTrackerEvents {
  streamChanged: Stream | undefined;
}

export class StreamTransceiverTracker extends Emittery.Typed<StreamTrackerEvents> {
  name: string;
  tracks: Set<TrackKind>;
  stream: Stream | undefined;

  constructor(stream: Stream | undefined, tracks: Set<TrackKind> = new Set(['audio', 'video'])) {
    super();

    this.name = name;
    this.tracks = tracks;

    this.setStream(stream);
  }

  setStream(stream: Stream | undefined) {
    this.stream = stream;
    this.emit('streamChanged', stream);
  }

  protected createTransceiverFactory(kind: TrackKind, dummyStream: Stream): StreamTransceiverFactory {
    return (createTransceiver) => {
      const track = this.stream?.getTracks(kind)[0];

      const transceiver = createTransceiver(track ?? kind, {
        direction: track != null ? 'sendrecv' : 'recvonly',
        streams: [dummyStream.stream],
      });

      const update = (stream: Stream | undefined) => {
        const track = stream?.getTracks(kind)[0] ?? null;

        if(track === transceiver.sender.track) {
          return;
        }

        transceiver.sender.replaceTrack(track);
        transceiver.direction = track != null ? 'sendrecv' : 'recvonly';
      }

      this.on('streamChanged', update);

      return () => {
        this.off('streamChanged', update);
      };
    }
  }

  addToPeer(peer: RemotePeer | LocalPeer, name: string = Peer.DEFAULT_STREAM) {
    const dummyStream = new Stream(new MediaStream());
    const factories = Array.from(this.tracks.values(), (kind) => {
      return this.createTransceiverFactory(kind, dummyStream);
    });

    peer.addStream(name, dummyStream, factories);
  }
}

