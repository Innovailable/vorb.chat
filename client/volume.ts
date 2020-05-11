import { get_audio_context } from './audio_context_pool';

export class VolumeProcessor {
  volume = 0;
  called = 0;
  private context: AudioContext;
  private source: MediaStreamAudioSourceNode;
  private processor: ScriptProcessorNode;

  constructor(stream: MediaStream) {
    this.context = get_audio_context();
    this.source = this.context.createMediaStreamSource(stream);
    this.processor = this.context.createScriptProcessor(512);

    this.processor.connect(this.context.destination);
    this.source.connect(this.processor);

    this.processor.onaudioprocess = (e) => {
      // TOOD multiple channels?
      const buffer = e.inputBuffer.getChannelData(0);
      let sum = 0;

      for(let i = 0; i < buffer.length; ++i) {
        const value = buffer[i];
        sum += value * value;
      }

      const cur_volume = Math.sqrt(sum / buffer.length);
      this.volume = Math.max(cur_volume, this.volume * 0.985);
      this.called++;
    };
  }

  close() {
    this.processor.disconnect();
    this.source.disconnect();
    this.context.close();
  }
}
