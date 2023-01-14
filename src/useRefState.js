import { useState, useRef, useEffect } from 'react';
import React from 'react';

export const useRefState = (defaultValue) => {
    const [state, setState] = React.useState(defaultValue);
    const stateRef = React.useRef(state);
    stateRef.current = state;
    return [state, setState, stateRef];
};



export default useRefState;
