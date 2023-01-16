import React from "react";
import * as Tone from "tone";
import useRefState from "./useRefState";
import Model from "./Model";
import RollView from "./RollView";
import * as _ from "lodash";
import {
    MODEL_PITCHES, MODEL_TIMESTEPS
} from "./constants";

const MIN_NOTE = 52

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

    const [n_steps, setNSteps] = React.useState(10)
    const [temperature, setTemperature] = React.useState(1.0)
    const [activityBias, setActivityBias] = React.useState(0.0)

    const [isMaskMode, setIsMaskMode] = React.useState(false);

    const runInfilling = () => {
        console.log("runInfilling")
        let fullMask = scaleToFull(mask, SCALE)
        let fullRoll = scaleToFull(roll, SCALE)
        console.log(fullMask)
        model.generate(fullRoll, fullMask, n_steps, temperature, activityBias).then(infilledRoll => {
            infilledRoll = fullToScale(infilledRoll, SCALE)
            setRoll(infilledRoll)
        }
        )
    }

    function upHandler({ key }) {
        if (key === 'Shift') {
            setIsMaskMode(false);
        }
    }

    function downHandler({ key }) {
        if (key === 'Shift') {
            setIsMaskMode(true);
        }
        if (key === 'k') {
            (() => runInfilling())()
        }
    }

    // TODO: handle this better
    React.useEffect(() => {
        window.addEventListener('keydown', downHandler);
        window.addEventListener('keyup', upHandler);
        return () => {
            window.removeEventListener('keydown', downHandler);
            window.removeEventListener('keyup', upHandler);
        };
    }, [mask, roll, temperature, activityBias, isMaskMode]);

    const POLYPHONY = 6
    React.useEffect(() => {

        synthRef.current = new Tone.PolySynth(Tone.Synth, POLYPHONY).toDestination();
        synthRef.current.set({
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.01,
                release: 0.01,
                sustain: 1.0,
            },
            portamento: 0.5
        })
        synthRef.current.volume.value = -30;

        Tone.Transport.bpm.value = 160;

        Tone.Transport.scheduleRepeat((time) => {

            let currentTimeStep = timeStepRef.current;
            let previousTimeStep = wrapTimeStep(currentTimeStep - 1);

            let timeOffset = 0.001;

            for (let i = 0; i < n_pitches; i++) {
                let noteIsActive = rollRef.current[i * MODEL_TIMESTEPS + currentTimeStep] == 1;
                let noteWasActive = rollRef.current[i * MODEL_TIMESTEPS + previousTimeStep] == 1;
                let pitch = MIN_NOTE + SCALE[i % SCALE.length] + Math.floor(i / SCALE.length) * 12
                if (noteIsActive && !noteWasActive) {
                    synthRef.current.triggerAttack(
                        Tone.Frequency(pitch, "midi").toNote(),
                        time + timeOffset);
                }
                else if (!noteIsActive) {
                    synthRef.current.triggerRelease(Tone.Frequency(pitch, "midi").toNote(),
                        time + timeOffset);
                }
            }

            setTimeStep((step) => (currentTimeStep + 1) % MODEL_TIMESTEPS);
        }
            , "8n");

        //Tone.start();
        Tone.Transport.start();
    }, [])

    return (
        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <div>
                <div style={{ display: "flex", justifyContent: "space-evenly", flexDirection: "row" }}>
                    <div>
                        <button onClick={runInfilling}>hello</button>
                        <button onClick={() => setIsMaskMode((prev) => !prev)}>{isMaskMode ? "masking" : "roll"}</button>
                    </div>
                    <div>
                        <div>
                            <input type="range" min="1" max="30" step="1" value={n_steps} onChange={(e) => setNSteps(e.target.valueAsNumber)}></input>
                            <span>n_steps: {n_steps}</span>
                        </div>
                        <div>
                            <input type="range" min="0.0" max="5.0" step="0.01" value={temperature} onChange={(e) => setTemperature(e.target.valueAsNumber)}></input>
                            <span>temperature: {temperature}</span>
                        </div>
                        <div>
                            <input type="range" min="-1.0" max="5.0" step="0.01" value={activityBias} onChange={(e) => setActivityBias(e.target.valueAsNumber)}></input>
                            <span>activityBias: {activityBias}</span>
                        </div>
                    </div>
                </div>
                <RollView n_pitches={n_pitches} n_timesteps={MODEL_TIMESTEPS} roll={roll} setRoll={setRoll} timeStep={timeStep} mask={mask} setMask={setMask} isMaskMode={isMaskMode}></RollView>
            </div >
        </div >
    );
}

export default Roll;