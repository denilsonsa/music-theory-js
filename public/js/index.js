import { h, render } from "./preact.js";
import { masterGain } from "./shared/audio-context.js";
import { router } from "./router/router.js";
import { Synth } from "./synth/synth.js";
import { FFT } from "./shared/fft.svg.js";
import { setupArranger } from "./arranger/arranger.js";

const device = document.getElementById("device");

function loadSynth(withMIDI) {
  // initialize the main synth,
  new Synth(document.getElementById("synth"), 1);
  // and the chord arranger,
  setupArranger(document.getElementById("arranger"));
  // and an FFT visualiser, using SVG instead of canvas,
  render(
    h(FFT, { source: masterGain, refresh: 20 }),
    document.getElementById("fft")
  );
  // and if we've not crashed by noew, we swap out the static img for the actual UI:
  document.getElementById("components").classList.remove("uninitialized");
  document.querySelector(".screenshot")?.classList.add("hidden");
}

function loadSucceeded(noMIDIwarning) {
  if (!noMIDIwarning) {
    loadSynth(true);
    device.classList.add("live");
  } else {
    loadSynth(false);
    alert(noMIDIwarning);
  }
}

function loadFailed(msg) {
  alert(msg);
}

device.textContent = "";
device.classList.add("led");

// router function for incoming MIDI messages
function getMIDIMessage(midiMessage) {
  var data = midiMessage.data;
  var status = data[0];
  var type = (status & 0xf0) >> 4;
  var channel = status & 0x0f;
  var data = data.slice(1);
  router.receive(type, channel, data);
}

// general bootstrapping
function onMidiSuccess(result) {
  let deviceCount = 0;

  for (let device of result.inputs.values()) {
    if (device.name === `LKMK3 MIDI`) {
      device.addEventListener(`midimessage`, getMIDIMessage);
    }
    deviceCount++;
  }
  if (deviceCount > 0) {
    loadSucceeded();
  } else {
    loadSynth(false);
    alert(
      "Web MIDI works, but no available MIDI devices were found\n(are they maybe already in use by another tab or program?)"
    );
  }
}

// even if midi device access fails, we still have a synth to play with
function onMidiFail(e) {
  console.error(e);
  alert(
    "Web MIDI is available, but MIDI device access failed (and the\nspec does not give me more details to help you find out why...)"
  );
  loadSynth(false);
}

// kick it all of.
if (!navigator.requestMIDIAccess) {
  // Warn the user that they won't have MIDI functionality. Then load anyway
  alert(
    "WebMIDI is not supported (without plugins?) in this browser.\nYou can still play around, just... no MIDI functionality, obviously."
  );
  loadSynth(false);
} else {
  navigator.requestMIDIAccess().then(onMidiSuccess, onMidiFail);
}
