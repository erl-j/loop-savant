import React from 'react';
import * as Tone from 'tone';
import { WebMidi } from 'webmidi';

const MIN_NOTE = 43;
const POLYPHONY = 36;
const Transport = ({ rollRef, timeStepRef, n_pitches, n_timesteps, scale, setTimeStep, outputRef }) => {


    const midiTimeOffsetRef = React.useRef(0);

    const lastTimeMsRef = React.useRef(0);


    const synthRef = React.useRef(null);

    React.useEffect(() => {
        synthRef.current = new Tone.PolySynth(Tone.Synth, POLYPHONY).toDestination();
        synthRef.current.set({
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                release: 0.05,
                sustain: 0.5,
            },
            portamento: 0.5
        })
        synthRef.current.volume.value = -30;
        Tone.Transport.bpm.value = 160;
        const wrapTimeStep = (timeStep) => (timeStep + n_timesteps) % n_timesteps
        Tone.Transport.scheduleRepeat(function (time) {
            let currentTimeStep = timeStepRef.current;
            let previousTimeStep = wrapTimeStep(currentTimeStep - 1);
            let timeOffset = 0.0;

            console.log("performance.now: " + performance.now())


            console.log("Tone.context.currentTime: " + Tone.context.currentTime)
            console.log("WebMidi.time: " + WebMidi.time)

            console.log("Tone.context.currentTime: " + Tone.context.currentTime)
            console.log("WebMidi.time: " + WebMidi.time)



            const offset = WebMidi.time - Tone.context.currentTime * 1000;
            // const midiTime = time * 1000 + offset + 300.0
            // const midiTime = 300.0 + ((performance.now() / 1000) - Tone.now()) * 1000;

            for (let i = 0; i < n_pitches; i++) {
                let noteIsActive = rollRef.current[i * n_timesteps + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * n_timesteps + previousTimeStep] == 1;
                let pitch = MIN_NOTE + scale[i % scale.length] + Math.floor(i / scale.length) * 12
                let notestr = Tone.Frequency(pitch, "midi").toNote();


                if (!noteIsActive || currentTimeStep == 0) {

                    synthRef.current.triggerRelease(notestr,
                        time);
                    if (outputRef.current != "built-in") {
                        let channel = WebMidi.getOutputByName(outputRef.current).channels[1]
                        channel.stopNote(pitch, { time: offset + time * 1000 });
                    }

                }
                if (noteIsActive && !noteWasActive) {
                    if (outputRef.current == "built-in") {
                        synthRef.current.triggerAttack(
                            notestr,
                            time);
                    }
                    else if (outputRef.current != "built-in") {
                        let channel = WebMidi.getOutputByName(outputRef.current).channels[1]
                        channel.playNote(pitch, { time: offset + time * 1000 })
                    }

                }


            }
            setTimeStep((step) => (step + 1) % n_timesteps);

        }
            , "8n");

        Tone.start();

        midiTimeOffsetRef.current = 500.0 + WebMidi.time - Tone.context.currentTime * 1000;
        Tone.Transport.start();


    }, [])

    return <></>
}


export default Transport;