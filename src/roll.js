import React from "react";
import * as Tone from "tone";
import useRefState from "./useRefState";
import Model from "./Model";
import RollView from "./RollView";

import { N_PITCHES, N_TIMESTEPS } from "./constants";

const pitchRange = Array.from(Array(N_PITCHES).keys());
const timeRange = Array.from(Array(N_TIMESTEPS).keys());

const wrapTimeStep = (timeStep) => (timeStep + N_TIMESTEPS) % N_TIMESTEPS

const Roll = () => {

    const [roll, setRoll, rollRef] = useRefState(new Array(N_PITCHES * N_TIMESTEPS).fill(0))

    const [mask, setMask] = React.useState(new Array(N_PITCHES * N_TIMESTEPS).fill(0))

    const synthRef = React.useRef(null);

    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)

    React.useEffect(() => {
        let synths = [];
        pitchRange.forEach((pitch) => {
            const synth = new Tone.MonoSynth({
                oscillator: {
                    type: "square"
                },
                envelope: {
                    attack: 0.0,
                    release: 0.0
                }
                ,
                filterEnvelope: {
                    attack: 0.0,
                    release: 0.0
                }
            }).toDestination();
            synths.push(synth);
            synthRef.current = synths;
        });
        Tone.Transport.scheduleRepeat((time) => {
            let currentTimeStep = timeStepRef.current;
            let previousTimeStep = wrapTimeStep(currentTimeStep - 1);
            let timeOffset = 0.001;
            for (let i = 0; i < N_PITCHES; i++) {
                let noteIsActive = rollRef.current[i * N_TIMESTEPS + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * N_TIMESTEPS + previousTimeStep] == 1;
                if (noteIsActive && !noteWasActive) {
                    synthRef.current[i].triggerAttack(Tone.Frequency(i + 31, "midi").toNote(), time + timeOffset);
                }
                if (!noteIsActive && noteWasActive) {
                    synthRef.current[i].triggerRelease(time + timeOffset);
                }
            }
            setTimeStep((step) => (step + 1) % N_TIMESTEPS);
        }
            , "8n");

        Tone.start();
        Tone.Transport.start();
    }, [])

    return (
        <RollView roll={roll} setRoll={setRoll} timeStep={timeStep} mask={mask} setMask={setMask}></RollView>
    );
}

export default Roll;