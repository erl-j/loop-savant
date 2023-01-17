import React from 'react'
import { Tooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css';

const ToolbarButton = ({ iconCharacter, text, keyboardCharacter, disabled, onActivate, isActive, hide }) => {

    const upHandler = (key) => {
    }

    const downHandler = (keyEvent) => {
        if (keyEvent.repeat) {
            console.log("repeat")
            return
        }
        else {

            let key = keyEvent.key

            let uppercasedKeyboardCharacter = keyboardCharacter.toUpperCase()
            let lowercasedKeyboardCharacter = keyboardCharacter.toLowerCase()

            if (key === keyboardCharacter || key === uppercasedKeyboardCharacter || key === lowercasedKeyboardCharacter) {
                onActivate()
            }
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
    }, [onActivate]);


    return (!hide &&
        <>
            <button id={text} disabled={disabled} style={{ backgroundColor: disabled ? "lightgrey" : isActive ? "blue" : "white" }}
                onClick={onActivate}>
                {iconCharacter}</button>
            <Tooltip anchorId={text} content={text + " " + `(${keyboardCharacter})`} />
        </>
    )

}

export default ToolbarButton