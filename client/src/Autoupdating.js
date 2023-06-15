import React from "react";
const TimeAgo = ({timestamp, renderFunction, updateIntervalMs}) => {

    const [timeAgo, setTimeAgo] = React.useState(renderFunction(timestamp));

    React.useEffect(() => {
        const interval = setInterval(() => {
            setTimeAgo(renderFunction(timestamp));
        }, updateIntervalMs);
        return () => clearInterval(interval);
    }, [timestamp]);

    return renderFunction(timestamp);
}

export default TimeAgo;


