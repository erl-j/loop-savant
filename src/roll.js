import React from "react";
import * as Tone from "tone";
import useRefState from "./useRefState";
import Model from "./Model";
import RollView from "./RollView";

import { N_PITCHES, N_TIMESTEPS } from "./constants";

const N_STEPS = 10;
const pitchRange = Array.from(Array(N_PITCHES).keys());
const timeRange = Array.from(Array(N_TIMESTEPS).keys());

const wrapTimeStep = (timeStep) => (timeStep + N_TIMESTEPS) % N_TIMESTEPS

const Roll = ({ model }) => {


    const [roll, setRoll, rollRef] = useRefState(new Array(N_PITCHES * N_TIMESTEPS).fill(0))

    const [mask, setMask] = React.useState(new Array(N_PITCHES * N_TIMESTEPS).fill(0))

    const synthRef = React.useRef(null);

    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)

    const runInfilling = () => {
        model.generate(rollRef.current, mask, N_STEPS).then(infilledRoll =>
            setRoll(infilledRoll)
        )
    }

    React.useEffect(() => {
        let synths = [];
        pitchRange.forEach((pitch) => {
            const synth = new Tone.MonoSynth({
                oscillator: {
                    type: "square"
                },
                envelope: {
                    attack: 0.0,
                    release: 0.01
                }
            }).toDestination();
            synth.volume.value = synth.volume.value / N_PITCHES
            synths.push(synth);
        });
        synthRef.current = synths;

        Tone.Transport.scheduleRepeat((time) => {
            let stepDuration = Tone.TransportTime("16n").toSeconds();
            let currentTimeStep = timeStepRef.current;
            let previousTimeStep = wrapTimeStep(currentTimeStep - 1);
            let resolution = "8n";
            // get resolution in seconds
            let secondsPerBeat = 60 / Tone.Transport.bpm.value;

            let timeOffset = 0.0;

            for (let i = 0; i < N_PITCHES; i++) {
                let noteIsActive = rollRef.current[i * N_TIMESTEPS + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * N_TIMESTEPS + previousTimeStep] == 1;
                if (noteIsActive && !noteWasActive) {
                    synthRef.current[i].triggerAttack(
                        Tone.Frequency(i + 32, "midi").toNote(),
                        time + timeOffset);
                }
                if (!noteIsActive && noteWasActive) {
                    synthRef.current[i].triggerRelease(
                        time + timeOffset);
                }
            }
            setTimeStep((step) => (step + 1) % N_TIMESTEPS);
        }
            , "8n");

        Tone.start();
        Tone.Transport.start();
    }, [])

    return (
        <div>
            <button onClick={runInfilling}>hello</button>
            <RollView roll={roll} setRoll={setRoll} timeStep={timeStep} mask={mask} setMask={setMask}></RollView>
        </div>
    );
}

export default Roll;