import { MODEL_TIMESTEPS } from './constants';
import * as Tone from 'tone';
import * as _ from 'lodash';
import { groupBy } from 'lodash';
import { Midi } from '@tonejs/midi'

const exportMIDI = (roll_2d) => {

    let notes = []

    let n_timesteps = roll_2d[0].length
    let n_pitches = roll_2d.length

    for (let pitch = 0; pitch < n_pitches; pitch++) {
        let note = null
        for (let timeStep = 0; timeStep < n_timesteps; timeStep++) {
            if (roll_2d[pitch][timeStep] == 1) {
                if (note == null) {
                    note = {
                        pitch: Tone.Frequency(pitch, "midi").toMidi(), start: timeStep, end: timeStep
                    }
                }
                else {
                    note.end = timeStep
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

    let T = 1 / 8

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

    let obj = midi.toJSON()

    console.log(obj)

    obj.duration = n_timesteps * T

    midi.fromJSON(obj)
    // print uri to console with filename "test.mid"
    // in node 
    //fs.writeFileSync("output.mid", new Buffer(midi.toArray()))

    // in browser
    let midiArray = midi.toArray()
    let midiBlob = new Blob([new Uint8Array(midiArray)], { type: 'audio/midi' })
    let midiUrl = URL.createObjectURL(midiBlob)
    const link = document.createElement('a');
    let fileName = "output.mid"
    link.href = midiUrl
    link.download = fileName;
    // some browser needs the anchor to be in the doc
    document.body.append(link);
    link.click();
    link.remove();

}

export default exportMIDI;