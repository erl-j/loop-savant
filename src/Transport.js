import React from 'react';
import * as Tone from 'tone';

const MIN_NOTE = 43;
const POLYPHONY = 36;
const Transport = ({ rollRef, timeStepRef, n_pitches, n_timesteps, scale, setTimeStep }) => {

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
        Tone.Transport.scheduleRepeat((time) => {
            let currentTimeStep = timeStepRef.current;
            let previousTimeStep = wrapTimeStep(currentTimeStep - 1);
            let timeOffset = 0.001;
            for (let i = 0; i < n_pitches; i++) {
                let noteIsActive = rollRef.current[i * n_timesteps + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * n_timesteps + previousTimeStep] == 1;
                let pitch = MIN_NOTE + scale[i % scale.length] + Math.floor(i / scale.length) * 12
                let notestr = Tone.Frequency(pitch, "midi").toNote();
                if (!noteIsActive || currentTimeStep == 0) {
                    synthRef.current.triggerRelease(notestr,
                        time + timeOffset);

                }
                if (noteIsActive && !noteWasActive) {
                    synthRef.current.triggerAttack(
                        notestr,
                        time + timeOffset);

                }

            }
            setTimeStep((step) => (step + 1) % n_timesteps);
        }
            , "8n");

        Tone.Transport.start();
        Tone.start();

    }, [])

    return <></>
}


export default Transport;