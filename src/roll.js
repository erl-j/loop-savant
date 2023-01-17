import React from "react";
import * as Tone from "tone";
import useRefState from "./useRefState";
import Model from "./Model";
import RollView from "./RollView";
import * as _ from "lodash";
import { WebMidi } from "webmidi";
import {
    MODEL_PITCHES, MODEL_TIMESTEPS
} from "./constants";
import exportMIDI from "./export_midi";
import Transport from "./Transport";




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
//const SCALE = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
console.assert(MODEL_PITCHES % 12 == 0)
let n_pitches = (MODEL_PITCHES / 12) * SCALE.length

const Roll = ({ model }) => {

    let pitchRange = Array.from(Array(n_pitches).keys());
    let timeRange = Array.from(Array(MODEL_TIMESTEPS).keys());

    const [roll, setRoll, rollRef] = useRefState(new Array(n_pitches * MODEL_TIMESTEPS).fill(0))
    const [mask, setMask] = React.useState([...new Array(n_pitches * MODEL_TIMESTEPS).fill(0)])

    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)

    const [n_steps, setNSteps] = React.useState(20)
    const [temperature, setTemperature] = React.useState(1.0)
    const [activityBias, setActivityBias] = React.useState(0.85)

    const [editMode, setEditMode] = React.useState("draw");

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

    const regenerate = () => {
        let fullMask = scaleToFull(mask, SCALE)
        let fullRoll = scaleToFull(roll, SCALE)
        model.regenerate(fullRoll, fullMask, n_steps, temperature, activityBias, 0.08).then(infilledRoll => {
            infilledRoll = fullToScale(infilledRoll, SCALE)
            setRoll(infilledRoll)
        })
    }


    const resetSelection = () => {
        setMask(new Array(n_pitches * MODEL_TIMESTEPS).fill(0))
    }

    React.useEffect(() => {
        if (editMode !== "select") {
            resetSelection()
        }
    }, [editMode])

    function upHandler({ key }) {

    }

    function downHandler({ key }) {
        if (key === 'k' || key === 'K') {
            runInfilling()
        }
        if (key === 'r' || key === 'r') {
            regenerate()
        }
        if (key === 's' || key === 'S') {
            setEditMode("select")
        }

        if (key === 'd' || key === 'D') {
            setEditMode("draw")
        }
        if (key === 'e' || key === 'E') {
            setEditMode("erase")
        }
        //delete
        if (key == "Backspace") {
            let newRoll = [...roll]
            newRoll = newRoll.map((x, i) => {
                if (mask[i]) {
                    return 0
                }
                else {
                    return x
                }
            })
            setRoll(newRoll)
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
    }, [mask, roll, temperature, activityBias, editMode]);



    const modes = ["draw", "erase", "select"]

    let n_masked = mask.reduce((a, b) => a + b, 0)

    return (
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 32 }}>
            <div>
                <div style={{ display: "flex", justifyContent: "space-evenly", flexDirection: "row" }}>
                    <div>
                        {
                            modes.map((mode) => <button key={mode} onClick={() => setEditMode(mode)} style={{ backgroundColor: editMode == mode ? "lightblue" : "white" }}>{mode}</button>
                            )}
                        <button disabled={n_masked === 0} onClick={() => runInfilling()}>regenerate</button>
                        <button disabled={n_masked === 0} onClick={() => regenerate()}>vary</button>
                        {/* <button disabled={n_masked === 0} onClick={() => invertCallback()}>invert selection</button> */}
                        <button onClick={() => exportMIDI(_.chunk(roll, MODEL_TIMESTEPS))}>export midi</button>
                    </div>
                    <div>
                        <div>
                            <input type="range" min="1" max="30" step="1" value={n_steps} onChange={(e) => setNSteps(e.target.valueAsNumber)}></input>
                            <span>n_steps: {n_steps}</span>
                        </div>
                        <div>
                            <input type="range" min="0.0" max="5.0" step="0.01" value={temperature} onChange={(e) => setTemperature(e.target.valueAsNumber)}></input>
                            <span>temperature: {temperature.toFixed(2)}</span>
                        </div>
                        <div>
                            <input type="range" min="-1.0" max="5.0" step="0.01" value={activityBias} onChange={(e) => setActivityBias(e.target.valueAsNumber)}></input>
                            <span>activityBias: {activityBias.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <RollView n_pitches={n_pitches} n_timesteps={MODEL_TIMESTEPS} roll={roll} setRoll={setRoll} timeStep={timeStep} mask={mask} setMask={setMask} editMode={editMode}></RollView>
                <Transport timeStepRef={timeStepRef} rollRef={rollRef} n_pitches={n_pitches} n_timesteps={MODEL_TIMESTEPS} scale={SCALE} setTimeStep={setTimeStep} ></Transport>
            </div >
        </div >
    );

}

export default Roll;