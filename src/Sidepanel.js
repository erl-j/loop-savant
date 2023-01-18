import * as React from 'react';
import Select from 'react-select';
import { WebMidi } from "webmidi";
import "./index.css";
import Range from './Range';

const Sidepanel = ({
    setOutput,
    tempo,
    setTempo,
    pitchOffset,
    setPitchOffset,
    synthParameters,
    setSynthParameters }) => {


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

    const waveformOptions = [
        { value: 'sine', label: 'sine' },
        { value: 'square', label: 'square' },
        { value: 'triangle', label: 'triangle' },
        { value: 'sawtooth', label: 'sawtooth' },
    ]

    let midiOptions = [{ value: "built-in", label: "built-in" }, ...midiOutputs.map((output) => {
        return { value: output.name, label: output.name }
    }),]

    return (
        <div style={{
            display: "flex", flexDirection: "row"
        }} >
            <div style={{}}>
                <h4>Playback</h4>
                <Range name="tempo" displayValue={tempo + "bpm"} description="set tempo in bpm" type="range" min="30" max="300" step="1" value={tempo} onChange={(e) => setTempo(e)}></Range>
                <Range name="pitch" displayValue={pitchOffset > 0 ? "+" + pitchOffset : pitchOffset} description="transpose output" type="range" min="-24" max="24" step="1" value={pitchOffset} onChange={(e) => setPitchOffset(e)}></Range>
                {midiOutputs.length > 0 &&
                    <Select isSearchable={false} defaultValue={midiOptions[0]} options={midiOptions} onChange={(e) => setOutput(e.value)}></Select>
                }
            </div>
            <div style={{}}>
                <h4>Synth</h4>
                <div style={{ display: "flex", flexDirection: "row" }}>
                    <Range name="attack" min={0.01} max={1} step={0.01} value={synthParameters.envelope.attack} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, attack: value } })
                    }} />
                    <Range name="decay" min={0.01} max={1} step={0.01} value={synthParameters.envelope.decay} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, decay: value } })
                    }} />
                </div>
                <div style={{ display: "flex", flexDirection: "row" }}>
                    <Range name="sustain" min={0.01} max={1} step={0.01} value={synthParameters.envelope.sustain} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, sustain: value } })
                    }} />
                    <Range name="release" min={0.01} max={1} step={0.01} value={synthParameters.envelope.release} onChange={(value) => {
                        setSynthParameters({ ...synthParameters, envelope: { ...synthParameters.envelope, release: value } })
                    }} />

                    <Select options={waveformOptions} value={waveformOptions.find(option => option.value === synthParameters.oscillator.type)} onChange={(option) => {
                        setSynthParameters({ ...synthParameters, oscillator: { ...synthParameters.oscillator, type: option.value } })
                    }} />
                </div>
            </div>
        </div >
    )
}

export default Sidepanel