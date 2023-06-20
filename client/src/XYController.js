import React from "react";

const XYController = ({ setY, setX, xValue, yValue, xSettings, ySettings }) => {
    const [isMouseDown, setIsMouseDown] = React.useState(false);
    const dotSize = 20; // Diameter of the dot in pixels
    const dotRadiusPercent = (dotSize / 2) / window.innerWidth * 100;

    const onMouseDownOrMove = (e) => {
        if (isMouseDown) {
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
        }
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
            onMouseDown={() => setIsMouseDown(true)}
            onMouseUp={() => setIsMouseDown(false)}
            onMouseMove={onMouseDownOrMove}
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
                }}
            />
        </div>
    );
};

export default XYController;
