import { invert, set } from 'lodash';
import * as React from 'react';
import { WebMidi } from "webmidi";

const Toolbar = ({
    setEditMode,
    editMode,
    transformsAreAvailable,
    runGeneration,
    runVariation,
    nSteps,
    temperature,
    activityBias,
    setNSteps,
    setActivityBias,
    setTemperature,
    deleteSelection,
    invertSelection,
    variationStrength,
    setVariationStrength,
    setOutput,
    output
}) => {


    const upHandler = (key) => {
    }

    const downHandler = (keyEvent) => {
        let key = keyEvent.key
        //edit modes
        if (key === 's' || key === 'S') {
            setEditMode("select")
        }
        if (key === 'd' || key === 'D') {
            setEditMode("draw")
        }
        if (key === 'e' || key === 'E') {
            setEditMode("erase")
        }

        if (key === 'i' || key === 'I') {
            invertSelection()
        }
        // transforms
        if (key === 'g' || key === 'G') {
            runGeneration()
        }
        if (key === 'v' || key === 'V') {
            runVariation()
        }
        if (key == "Backspace") {
            deleteSelection()
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
    }, [setEditMode, runVariation, deleteSelection, runGeneration]);

    const [midiOutputs, setMidiOutputs] = React.useState([])

    React.useEffect(() => {

        WebMidi.enable((err) => {
            if (err) {
                console.log("WebMidi could not be enabled.", err);
            } else {
                console.log("WebMidi enabled!");
                setMidiOutputs(WebMidi.outputs)
            }
        });
    }
        , [])

    const modes = ["draw", "erase", "select"]

    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-evenly" }}>
            <div style={{ display: "flex", flexDirection: "row" }}>

                {modes.map((mode) => <button key={mode} onClick={() => setEditMode(mode)} style={{ backgroundColor: editMode == mode ? "lightblue" : "white" }}>{mode}</button>
                )}
                <button disabled={!transformsAreAvailable} onClick={runGeneration}>generation</button >
                <button disabled={!transformsAreAvailable} onClick={runVariation}>variation</button>
                <button onClick={invertSelection}>invert selection</button>
                <button onClick={deleteSelection}>delete selection</button>
                {/* <button onClick={() => exportMIDI(_.chunk(roll, MODEL_TIMESTEPS))}>export midi</button> */}
            </div>
            <div>
                <div>
                    <input type="range" min="1" max="30" step="1" value={nSteps} onChange={(e) => setNSteps(e.target.valueAsNumber)}></input>
                    <span>nSteps: {nSteps}</span>
                </div>
                <div>
                    <input type="range" min="0.0" max="5.0" step="0.01" value={temperature} onChange={(e) => setTemperature(e.target.valueAsNumber)}></input>
                    <span>temperature: {temperature.toFixed(2)}</span>
                </div>
                <div>
                    <input type="range" min="-1.0" max="5.0" step="0.01" value={activityBias} onChange={(e) => setActivityBias(e.target.valueAsNumber)}></input>
                    <span>activityBias: {activityBias.toFixed(2)}</span>
                </div>
                <div>
                    <input type="range" min="0.05" max="1.0" step="0.01" value={variationStrength} onChange={(e) => setVariationStrength(e.target.valueAsNumber)}></input>
                    <span>variationStrength: {variationStrength.toFixed(2)}</span>
                </div>
                {
                    midiOutputs.length > 0 &&
                    <div>
                        <button onClick={() => setOutput("built-in")}>built-in</button>
                        <button onClick={() => setOutput(midiOutputs[0].name)}>{midiOutputs[0].name}</button>
                    </div>}
            </div>
        </div >
    )
}

export default Toolbar;