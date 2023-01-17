import React from 'react';
import * as Tone from 'tone';
import { WebMidi } from 'webmidi';

const MIN_NOTE = 38;
const POLYPHONY = 36;
const Transport = ({ rollRef, timeStepRef, nPitches, nTimeSteps, scale, setTimeStep, outputRef, tempo, pitchOffset }) => {

    const pitchOffsetRef = React.useRef(pitchOffset);
    const synthRef = React.useRef(null);

    React.useEffect(() => {
        pitchOffsetRef.current = pitchOffset;
        if (outputRef.current != "built-in") {
            let channel = WebMidi.getOutputByName(outputRef.current).channels[1]
            console.log("sending all notes off")
            channel.sendAllNotesOff();
        }
        if (synthRef.current != null) {
            synthRef.current.releaseAll();
        }
    }, [pitchOffset])


    React.useEffect(() => {
        Tone.Transport.bpm.rampTo(tempo, 0.5)
    }
        , [tempo])


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
        Tone.Transport.bpm.value = tempo;
        const wrapTimeStep = (timeStep) => (timeStep + nTimeSteps) % nTimeSteps
        Tone.Transport.scheduleRepeat(function (time) {
            let currentTimeStep = timeStepRef.current;
            let previousTimeStep = wrapTimeStep(currentTimeStep - 1);

            const offset = WebMidi.time - Tone.context.currentTime * 1000;
            const midiTime = offset + time * 1000

            for (let i = 0; i < nPitches; i++) {
                let noteIsActive = rollRef.current[i * nTimeSteps + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * nTimeSteps + previousTimeStep] == 1;
                let pitch = MIN_NOTE + scale[i % scale.length] + Math.floor(i / scale.length) * 12 + pitchOffsetRef.current;
                let notestr = Tone.Frequency(pitch, "midi").toNote();


                if (!noteIsActive || currentTimeStep == 0) {

                    synthRef.current.triggerRelease(notestr,
                        time);
                    if (outputRef.current != "built-in") {
                        let channel = WebMidi.getOutputByName(outputRef.current).channels[1]
                        channel.stopNote(pitch, { time: midiTime });
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
                        channel.playNote(pitch, { time: midiTime })
                    }
                }
            }
            setTimeStep((step) => (step + 1) % nTimeSteps);

        }
            , "8n");

        Tone.start();
        Tone.Transport.start();

        const cleanup = () => {
            console.log("transport unmounting")
            Tone.Transport.stop();
            Tone.Transport.cancel();
            if (outputRef.current != "built-in") {
                let channel = WebMidi.getOutputByName(outputRef.current).channels[1]
                console.log("sending all notes off")
                channel.sendAllNotesOff();
            }
        }

        window.addEventListener('beforeunload', cleanup);

        return () => {
            window.removeEventListener('beforeunload', cleanup);
        }



    }, [])

    return <></>
}


export default Transport;