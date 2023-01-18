import { invert, set } from 'lodash';
import * as React from 'react';
import { WebMidi } from "webmidi";
import ToolbarButton from './ToolbarButton';
import {
    FaPencilAlt, FaEraser, FaCropAlt, FaTrashAlt, FaAdjust, FaMagic, FaDna, FaExpand, Filter, FaPlus, FaMinus
} from "react-icons/fa";
import "./index.css";
import Range from './Range';

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
            <div>
                <h3>Draw</h3>
                <ToolbarButton text="draw tool" icon={<FaPencilAlt></FaPencilAlt>} keyboardCharacter="d" onActivate={() => setEditMode("draw")} isActive={editMode == "draw"} />
                <ToolbarButton text="erase tool" icon={<FaEraser></FaEraser>} keyboardCharacter="e" onActivate={() => setEditMode("erase")} isActive={editMode == "erase"} />
            </div>
            <div>
                <h3>Select</h3>
                <ToolbarButton text="select tool" icon={<FaCropAlt></FaCropAlt>} keyboardCharacter="s" onActivate={() => setEditMode("select")} isActive={editMode == "select"} />
                <ToolbarButton text="select all" icon={<FaExpand></FaExpand>} keyboardCharacter="a" onActivate={selectAll} />
                <ToolbarButton text="delete selected notes" icon={<FaTrashAlt></FaTrashAlt>} keyboardCharacter="Backspace" onActivate={deleteSelection} disabled={!transformsAreAvailable} />
                <ToolbarButton text="invert selection" icon={<FaAdjust></FaAdjust>} keyboardCharacter="i" onActivate={invertSelection} />
            </div>
            <div>
                <h3>Transform</h3>
                <ToolbarButton text="generation" icon={<FaMagic></FaMagic>} keyboardCharacter="g" onActivate={runGeneration} disabled={!transformsAreAvailable} />
                <ToolbarButton text="variation" icon={<FaDna></FaDna>} keyboardCharacter="v" onActivate={() => runVariation("all")} disabled={!transformsAreAvailable} />
                <ToolbarButton text="sparser" icon={<FaMinus></FaMinus>} keyboardCharacter="ArrowDown" onActivate={() => runVariation("sparser")} disabled={!transformsAreAvailable} />
                <ToolbarButton text="denser" icon={<FaPlus></FaPlus>} keyboardCharacter="ArrowUp" onActivate={() => runVariation("denser")} disabled={!transformsAreAvailable} />
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
            <div style={{ width: 200 }}>
                <h3>Sampling</h3>
                <Range name="n steps" description="set tempo in bpm" type="range" min="1" max="30" step="1" value={nSteps} onChange={(e) => setNSteps(e.target.valueAsNumber)}></Range>
                <Range name="temperature" displayValue={temperature.toFixed(2)} description="set temperature" type="range" min="0.0" max="2.0" step="0.01" value={temperature} onChange={(e) => setTemperature(e.target.valueAsNumber)}></Range>
                <Range name="activity bias" displayValue={activityBias.toFixed(2)} description="set activity bias" type="range" min="-2.0" max="2.0" step="0.01" value={activityBias} onChange={(e) => setActivityBias(e.target.valueAsNumber)}></Range>
            </div>
            {/* <div>
                    <input type="range" min="0.05" max="1.0" step="0.01" value={variationStrength} onChange={(e) => setVariationStrength(e.target.valueAsNumber)}></input>
                    <span>variationStrength: {variationStrength.toFixed(2)}</span>
                </div> */}

            <div style={{ width: 200 }}>
                <h3>Playback</h3>
                <Range name="tempo" displayValue={tempo + "bpm"} description="set tempo in bpm" type="range" min="30" max="300" step="1" value={tempo} onChange={(e) => setTempo(e.target.valueAsNumber)}></Range>
                <Range name="pitch" displayValue={pitchOffset > 0 ? "+" + pitchOffset : pitchOffset} description="transpose output" type="range" min="-24" max="24" step="1" value={pitchOffset} onChange={(e) => setPitchOffset(e.target.valueAsNumber)}></Range>
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