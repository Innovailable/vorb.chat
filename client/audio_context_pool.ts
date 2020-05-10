import adapter from 'webrtc-adapter';

// TODO workaround for https://bugs.chromium.org/p/chromium/issues/detail?id=835767

//@ts-ignore
const AudioContext = window.AudioContext || window.webkitAudioContext;
const pool = Array<AudioContext>();

export function get_audio_context(): AudioContext {
  const pool_context = pool.shift();

  if(pool_context != null) {
    return pool_context;
  } else {
    return new AudioContext();
  }
}

export function fill_audio_context_pool() {
  if(adapter.browserDetails.browser !== "chrome") {
    return;
  }

  while(pool.length < 8) {
    const context = new AudioContext();

    if(context.state !== "running") {
      context.close();
      return;
    }

    pool.push(context);
  }
}
