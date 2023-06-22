import React from "react";

const XYController = ({ setY, setX, xValue, yValue, xSettings, ySettings }) => {
    const dotSize = 20; // Diameter of the dot in pixels
    const dotRadiusPercent = (dotSize / 2) / window.innerWidth * 100;

    const onMouseDownOrMove = (e) => {
        // check if mouse is down with javascript
        let isMouseDown = false;
        if (e.buttons !== undefined) {
            isMouseDown = e.buttons === 1;
        } else if (e.nativeEvent !== undefined) {

            isMouseDown = e.nativeEvent.which === 1;
        }

        if (!isMouseDown) {
            return;
        }

        let x = e.clientX;
        let y = e.clientY;
        let rect = e.currentTarget.getBoundingClientRect();
        let xFraction = (x - rect.left) / rect.width;
        let yFraction = (y - rect.top) / rect.height;
        // clamp to [0, 1]
        xFraction = Math.max(0, Math.min(1, xFraction));
        yFraction = Math.max(0, Math.min(1, yFraction));

        let newXValue = xSettings.min + xFraction * (xSettings.max - xSettings.min);
        let newYValue = ySettings.min + yFraction * (ySettings.max - ySettings.min);
        setX(newXValue);
        setY(newYValue);
    };

    // convert x and y to local coordinates
    let localX = ((xValue - xSettings.min) / (xSettings.max - xSettings.min)) * (100 - 2 * dotRadiusPercent) + dotRadiusPercent;
    let localY = ((yValue - ySettings.min) / (ySettings.max - ySettings.min)) * (100 - 2 * dotRadiusPercent) + dotRadiusPercent;

    return (
        <div
            style={{
                // padding: dotSize,
                backgroundColor: "#d3d3d3",
                width: "100%",
                height: "100%",
                position: "relative",
            }}
            onMouseDown={(e) => { onMouseDownOrMove(e); }}
            onMouseMove={(e) => { onMouseDownOrMove(e); }}
        >
            <div
                style={{
                    position: "absolute",
                    backgroundColor: "teal",
                    width: dotSize,
                    height: dotSize,
                    borderRadius: "100%",
                    left: `calc(${localX}% - ${dotSize / 2}px)`,
                    top: `calc(${localY}% - ${dotSize / 2}px)`,
                    zIndex: 10,
                }}
            />
            {/* Legend */}
            <div style={{width: "100%", height: "100%", position: "absolute", cursor:"pointer", userSelect:"none"}}>
            <div style={{ width: "100%", height: "100%", position: "absolute" }}>
                <div style={{ height: "100%", display: "flex", flexDirection: "column", width: "auto", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ flex: "0 0 auto" }} >weird</div>
                    <div style={{ backgroundColour: "black", border: "solid black 1px", flex: 1 ,margin:8}}></div>
                    <div style={{ flex: "0 0 auto" }} >basic</div>
                </div>
            </div>
            <div style={{ width: "100%", height: "100%", position: "absolute", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%", display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{margin:4}}>sparse</div>
                <div style={{ backgroundColor: "black", border: "solid black 1px", flex: 1, margin:8 }}></div>
                <div style={{margin:4}}>busy</div>
            </div>
            </div>
        </div>
        </div>
    );
};

export default XYController;
