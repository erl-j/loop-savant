import * as _ from "lodash";
import React from "react";
import {
    MODEL_PITCHES, MODEL_TIMESTEPS
} from "./constants";
import RollView from "./RollView";
import Toolbar from "./Toolbar";
import Transport from "./Transport";
import useRefState from "./useRefState";
import Sidepanel from "./Sidepanel";

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
let nPitches = (MODEL_PITCHES / 12) * SCALE.length

const Roll = ({ model }) => {

    const [roll, setRoll, rollRef] = useRefState(new Array(nPitches * MODEL_TIMESTEPS).fill(0))
    const [mask, setMask] = React.useState([...new Array(nPitches * MODEL_TIMESTEPS).fill(1)])

    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)


    const [nSteps, setNSteps] = React.useState(20)
    const [temperature, setTemperature] = React.useState(1.0)
    const [activityBias, setActivityBias] = React.useState(0.85)
    const [editMode, setEditMode] = React.useState("select");
    const [variationStrength, setVariationStrength] = React.useState(0.25)
    const [output, setOutput] = React.useState("built-in")
    const [tempo, setTempo] = React.useState(160)
    const [pitchOffset, setPitchOffset] = React.useState(0)
    const [modelIsBusy, setModelIsBusy] = React.useState(false)


    const [synthParameters, setSynthParameters] = React.useState({
        oscillator: {
            type: "sine"
        },
        envelope: {
            attack: 0.01,
            release: 0.05,
            sustain: 0.5,
        },
        volume: -12
    }
    )
    const runGeneration = () => {

        setModelIsBusy(true)
        console.log("running generation")
        let fullMask = scaleToFull(mask, SCALE)
        let fullRoll = scaleToFull(roll, SCALE)
        model.generate(fullRoll, fullMask, nSteps, temperature, activityBias).then(infilledRoll => {
            infilledRoll = fullToScale(infilledRoll, SCALE)
            setRoll(infilledRoll)
            setModelIsBusy(false)
        }
        )
    }

    const runVariation = (mode) => {
        setModelIsBusy(true)
        let fullMask = scaleToFull(mask, SCALE)
        let fullRoll = scaleToFull(roll, SCALE)
        let nSteps = (mode == "all") ? 5 : 2
        model.regenerate(fullRoll, fullMask, nSteps, temperature, activityBias, variationStrength, mode).then(infilledRoll => {
            infilledRoll = fullToScale(infilledRoll, SCALE)
            setRoll(infilledRoll)
            setModelIsBusy(false)
        })
    }

    const selectAll = () => {
        setMask(new Array(nPitches * MODEL_TIMESTEPS).fill(1))
        setEditMode("select")
    }


    const invertSelection = () => {
        let currentMask = [...mask]
        let newMask = new Array(currentMask.length).fill(0);
        newMask.forEach((e, i) => {
            newMask[i] = 1 - currentMask[i]
        })
        setMask(newMask)
        setEditMode("select")
    }

    const resetSelection = () => {
        setMask(new Array(nPitches * MODEL_TIMESTEPS).fill(0))
    }

    React.useEffect(() => {
        if (editMode == "draw") {
            resetSelection()
        }
        if (editMode == "erase") {
            resetSelection()
        }
    }, [editMode])

    const deleteSelection = () => {
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


    let n_masked = mask.reduce((a, b) => a + b, 0)


    // setOutput,
    // tempo,
    // setTempo,
    // pitchOffset,
    // setPitchOffset,
    // synthParameters,
    // setSynthParameters

    return (
        <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 16 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                    <Toolbar editMode={editMode} setEditMode={setEditMode}
                        nSteps={nSteps} setNSteps={setNSteps}
                        temperature={temperature} setTemperature={setTemperature}
                        activityBias={activityBias} setActivityBias={setActivityBias}
                        transformsAreAvailable={n_masked > 0}
                        runGeneration={runGeneration}
                        runVariation={runVariation}
                        deleteSelection={deleteSelection}
                        invertSelection={invertSelection}
                        setVariationStrength={setVariationStrength}
                        variationStrength={variationStrength}
                        output={output}
                        setOutput={setOutput}
                        tempo={tempo}
                        setTempo={setTempo}
                        pitchOffset={pitchOffset}
                        setPitchOffset={setPitchOffset}
                        selectAll={selectAll}
                        modelIsBusy={modelIsBusy}
                        synthParameters={synthParameters}
                        setSynthParameters={setSynthParameters}
                    ></Toolbar>
                    {/* <Sidepanel
                        setOutput={setOutput}
                        tempo={tempo}
                        setTempo={setTempo}
                        pitchOffset={pitchOffset}
                        setPitchOffset={setPitchOffset}
                        synthParameters={synthParameters}
                        setSynthParameters={setSynthParameters}></Sidepanel> */}

                </div>
                <div style={{ display: "flex", justifyContent: "space-evenly", flexDirection: "row" }}>
                    <RollView setTimeStep={setTimeStep} nPitches={nPitches} nTimeSteps={MODEL_TIMESTEPS} roll={roll} setRoll={setRoll} timeStep={timeStep} mask={mask} setMask={setMask} editMode={editMode} modelIsBusy={modelIsBusy} scale={SCALE}></RollView>
                    <Transport output={output} pitchOffset={pitchOffset} timeStepRef={timeStepRef} rollRef={rollRef} nPitches={nPitches} nTimeSteps={MODEL_TIMESTEPS} scale={SCALE} setTimeStep={setTimeStep} tempo={tempo} synthParameters={synthParameters} ></Transport>
                </div >
            </div >
        </div >
    );

}

export default Roll;