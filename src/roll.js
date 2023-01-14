import React from "react";
import * as Tone from "tone";
import useRefState from "./useRefState";

const N_PITCHES = 36;
const N_TIMESTEPS = 32;

const pitchRange = Array.from(Array(N_PITCHES).keys());
const timeRange = Array.from(Array(N_TIMESTEPS).keys());

const Roll = () => {
    const [roll, setRoll, rollRef] = useRefState(new Array(N_PITCHES * N_TIMESTEPS).fill(0))

    const synthRef = React.useRef(null);

    const [timeStep, setTimeStep, timeStepRef] = useRefState(0)

    React.useEffect(() => {
        Tone.start();
        let synths = [];
        pitchRange.forEach((pitch) => {
            const synth = new Tone.Synth().toDestination();
            synths.push(synth);
            synthRef.current = synths;
        });
        Tone.Transport.scheduleRepeat((time) => {
            for (let i = 0; i < N_PITCHES; i++) {
                if (rollRef.current[i * N_TIMESTEPS + timeStepRef.current] == 1) {
                    synthRef.current[i].triggerAttackRelease(Tone.Frequency(i + 31, "midi").toNote(), "16n", time + 0.01);
                }
            }
            setTimeStep((step) => (step + 1) % N_TIMESTEPS);
        }
            , "16n");
        Tone.Transport.start();
    }, [])

    return (
        <div style={{ display: "flex", flexDirection: "column" }} >
            {pitchRange.map((pitch) =>
                <div key={pitch} style={{ display: "flex", flexDirection: "row" }} >
                    {timeRange.map((time) => {
                        return (
                            <div key={time} onClick={() => {
                                const newRoll = [...roll];
                                newRoll[pitch * N_TIMESTEPS + time] = 1 - newRoll[pitch * N_TIMESTEPS + time];
                                setRoll(newRoll);
                            }}
                                onMouseEnter={(e) => {
                                    // if pressed, toggle
                                    if (e.buttons == 1) {
                                        const newRoll = [...roll];
                                        newRoll[pitch * N_TIMESTEPS + time] = 1 - newRoll[pitch * N_TIMESTEPS + time];
                                        setRoll(newRoll);
                                    }
                                }}

                                style={{ width: 26, height: 16, margin: 0, backgroundColor: roll[pitch * N_TIMESTEPS + time] == 0 ? "red" : "black", borderRadius: timeStep == time ? 1 : 10 }}></div>
                        )
                    }
                    )}
                </div>
            )}
        </div>
    );
}

export default Roll;