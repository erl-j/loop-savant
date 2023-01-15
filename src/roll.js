import React from "react";
import * as Tone from "tone";
import useRefState from "./useRefState";
import Model from "./Model";
import RollView from "./RollView";
import * as _ from "lodash";
import { MODEL_PITCHES, MODEL_TIMESTEPS } from "./constants";

const N_STEPS = 10;

const wrapTimeStep = (timeStep) => (timeStep + MODEL_TIMESTEPS) % MODEL_TIMESTEPS

const fullToScale = (roll, scale) => {
    let out_roll_2d = []
    for (let octave = 0; octave < (1 + Math.floor(MODEL_PITCHES / 12)); octave++) {
        for (let i = 0; i < scale.length; i++) {
            let idx = scale[i] + octave * 12
            if (idx >= MODEL_PITCHES) {
                break
            }
            else {
                out_roll_2d.push(roll.slice(idx * MODEL_TIMESTEPS, (idx + 1) * MODEL_TIMESTEPS))
            }
        }
    }
    return out_roll_2d.flat()
}

const scaleToFull = (roll, scale) => {
    let out_roll_2d = []
    let roll_2d = _.chunk(roll, MODEL_TIMESTEPS)
    for (let pitch = 0; pitch < MODEL_PITCHES; pitch++) {
        if (scale.includes(pitch % 12)) {
            out_roll_2d.push(roll_2d.shift())
        }
        else {
            out_roll_2d.push(new Array(MODEL_TIMESTEPS).fill(0))
        }
    }
    return out_roll_2d.flat()
}

const SCALE = [0, 2, 4, 5, 7, 9, 11]
console.assert(MODEL_PITCHES % 12 == 0)
let n_pitches = (MODEL_PITCHES / 12) * SCALE.length

const Roll = ({ model }) => {

    let pitchRange = Array.from(Array(n_pitches).keys());
    let timeRange = Array.from(Array(MODEL_TIMESTEPS).keys());

    const [roll, setRoll, rollRef] = useRefState(new Array(n_pitches * MODEL_TIMESTEPS).fill(0))
    const [mask, setMask] = React.useState(new Array(n_pitches * MODEL_TIMESTEPS).fill(0))
    const synthRef = React.useRef(null);
    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)

    const runInfilling = () => {
        let fullMask = scaleToFull(mask, SCALE)
        let fullRoll = scaleToFull(roll, SCALE)
        model.generate(fullRoll, fullMask, N_STEPS).then(infilledRoll => {
            infilledRoll = fullToScale(infilledRoll, SCALE)
            setRoll(infilledRoll)
        }
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
            synth.volume.value = -12
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

            for (let i = 0; i < n_pitches; i++) {
                let noteIsActive = rollRef.current[i * MODEL_TIMESTEPS + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * MODEL_TIMESTEPS + previousTimeStep] == 1;
                let pitch = SCALE[i % SCALE.length] + Math.floor(i / SCALE.length) * 12
                if (noteIsActive && !noteWasActive) {
                    synthRef.current[i].triggerAttack(
                        Tone.Frequency(pitch + 32, "midi").toNote(),
                        time + timeOffset);
                }
                else if (!noteIsActive) {
                    synthRef.current[i].triggerRelease(
                        time + timeOffset);
                }
            }
            setTimeStep((step) => (step + 1) % MODEL_TIMESTEPS);
        }
            , "8n");

        Tone.start();
        Tone.Transport.start();
    }, [])

    return (
        <div>
            <button onClick={runInfilling}>hello</button>
            <RollView n_pitches={n_pitches} n_timesteps={MODEL_TIMESTEPS} roll={roll} setRoll={setRoll} timeStep={timeStep} mask={mask} setMask={setMask}></RollView>
        </div>
    );
}

export default Roll;