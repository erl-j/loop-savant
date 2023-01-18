import * as React from 'react'

const Tile = ({ isOn, onToggle, isSelected, isLoading, isBeingPlayed, isRoot, isAccent, onPressTile, dataKey }) => {


    return (<div
        className='selectable'
        data-key={dataKey}
        onMouseDown={() => {
            onPressTile();
        }
        }
        onMouseEnter={(e) => {
            // if pressed, toggle
            if (e.buttons == 1) {
                onPressTile();
            }

        }}

        style={{
            width: 32,
            height: 18,
            margin: 0,
            opacity: isSelected ? 1 : 0.1,
            backgroundColor: !isOn ?
                (isAccent ? "lightgray" : "white") : "black",
            border: isBeingPlayed ? "1px solid red" : "1px solid darkgray"
        }
        }
    ></div >)

}

export default Tile;

