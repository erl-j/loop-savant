import { MODEL_TIMESTEPS } from './constants';
import * as Tone from 'tone';
import * as _ from 'lodash';
import { groupBy } from 'lodash';
import { Midi } from '@tonejs/midi'
import { MIN_NOTE } from './constants';

const exportMIDI = (roll_2d, pitchOffset, bpm) => {

    let notes = []

    let n_timesteps = roll_2d[0].length
    let n_pitches = roll_2d.length

    for (let pitch = 0; pitch < n_pitches; pitch++) {
        let note = null
        for (let timeStep = 0; timeStep < n_timesteps; timeStep++) {
            if (roll_2d[pitch][timeStep] == 1) {
                if (note == null) {
                    note = {
                        pitch: Tone.Frequency(pitch+pitchOffset, "midi").toMidi(), start: timeStep, end: timeStep+1 
                    }
                }
                else {
                    note.end = timeStep+1
                }
            }
            else {
                if (note != null) {
                    notes.push(note)
                    note = null
                }
            }
        }
    }

    // sort notes by start time
    notes.sort((a, b) => a.start - b.start)

    let T = 1 / 4

    var midi = new Midi()

    // add a track
    const track = midi.addTrack()

    for (let note of notes) {
        track.addNote({
            midi: note.pitch,
            time: note.start * T,
            duration: (note.end - note.start) * T
        })
    }

    // set the BPM
    midi.header.setTempo(bpm)

    // let obj = midi.toJSON()

    // console.log(obj)

    // obj.duration = n_timesteps * T

    // midi.fromJSON(obj)

    const data = new Uint8Array(midi.toArray()); // Replace with your actual data
    const blob = new Blob([data], { type: 'audio/midi' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ls_midi.mid';
    link.textContent = 'Download output.mid';

    // append the link to the DOM
    document.body.appendChild(link);
    link.click();
    link.remove();

}

export default exportMIDI;