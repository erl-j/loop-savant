import * as React from "react"
import "./index.css"
import { Tooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css';


const Range = ({ min, max, value, step, onChange, name, description, displayValue }) => {

    if (displayValue === undefined) {
        displayValue = value
    }
    return (
        <>
            <div id={name}>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
                    <div>{name}</div>
                    <div>{displayValue}</div>
                </div>
                <input className="slider" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.valueAsNumber)}></input>
            </div>
            <Tooltip place={"right"} anchorId={name} content={description} style={{ zIndex: 10 }} />
        </>
    )
}

export default Range