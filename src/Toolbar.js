import { invert, set } from 'lodash';
import * as React from 'react';
import { WebMidi } from "webmidi";
import ToolbarButton from './ToolbarButton';

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
    output,
    tempo,
    setTempo,
    pitchOffset,
    setPitchOffset,
    selectAll,
    modelIsBusy,
}) => {




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
            <div style={{ width: "100%", display: "flex", flexDirection: "row", justifyContent: "space-evenly" }}>
                <div>
                    <h2>Draw</h2>
                    <ToolbarButton text="draw tool" iconCharacter="✏️" keyboardCharacter="d" onActivate={() => setEditMode("draw")} isActive={editMode == "draw"} />
                    <ToolbarButton text="erase tool" iconCharacter="🧽" keyboardCharacter="e" onActivate={() => setEditMode("erase")} isActive={editMode == "erase"} />
                </div>
                <div>
                    <h2>Select</h2>
                    <ToolbarButton text="select tool" iconCharacter="🥅" keyboardCharacter="s" onActivate={() => setEditMode("select")} isActive={editMode == "select"} />
                    <ToolbarButton text="select all" iconCharacter="📝" keyboardCharacter="a" onActivate={selectAll} />
                    <ToolbarButton text="delete selected notes" iconCharacter="🗑️" keyboardCharacter="Backspace" onActivate={deleteSelection} disabled={!transformsAreAvailable} />
                    <ToolbarButton text="invert selection" iconCharacter="🔄" keyboardCharacter="i" onActivate={invertSelection} />
                </div>
                <div>
                    <h2>Transform</h2>
                    <ToolbarButton text="generation" iconCharacter="🪄" keyboardCharacter="g" onActivate={runGeneration} disabled={!transformsAreAvailable} />
                    <ToolbarButton text="variation" iconCharacter="💅" keyboardCharacter="v" onActivate={runVariation} disabled={!transformsAreAvailable} />
                    <ToolbarButton text="denser" iconCharacter="📈" keyboardCharacter="ArrowUp" onActivate={() => runVariation("denser")} disabled={!transformsAreAvailable} hide={true} />
                    <ToolbarButton text="sparser" iconCharacter="📉" keyboardCharacter="ArrowDown" onActivate={() => runVariation("sparser")} disabled={!transformsAreAvailable} hide={true} />
                </div>

                {/* {modes.map((mode) => <button key={mode} onClick={() => setEditMode(mode)} style={{ backgroundColor: editMode == mode ? "lightblue" : "white" }}>{mode}</button>
                )}
                <button disabled={!transformsAreAvailable} onClick={runGeneration}>generation</button >
                <button disabled={!transformsAreAvailable} onClick={runVariation}>variation</button>
                <button onClick={selectAll}>select all</button> */}
                {/* <button onClick={() => runVariation("sparser")}>sparser</button>
                <button onClick={() => runVariation("denser")}>denser</button> */}
                {/* <button onClick={invertSelection}>invert selection</button>
                <button onClick={deleteSelection}>delete selection</button> */}
                {/* <button onClick={() => exportMIDI(_.chunk(roll, MODEL_TIMESTEPS))}>export midi</button> */}
            </div>
            <div>
                <h2>Sampling</h2>
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
            </div>
            {/* <div>
                    <input type="range" min="0.05" max="1.0" step="0.01" value={variationStrength} onChange={(e) => setVariationStrength(e.target.valueAsNumber)}></input>
                    <span>variationStrength: {variationStrength.toFixed(2)}</span>
                </div> */}

            <div>
                <h2>Playback</h2>
                <div>
                    <input type="range" min="30" max="300" step="1" value={tempo} onChange={(e) => setTempo(e.target.valueAsNumber)}></input>
                    <span>tempo: {tempo}</span>
                </div>
                <div>
                    <input type="range" min="-24" max="24" step="1" value={pitchOffset} onChange={(e) => setPitchOffset(e.target.valueAsNumber)}></input>
                    <span>pitchOffset: {pitchOffset}</span>
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