import * as React from 'react';
import Select from 'react-select';

const DropDown = ({ options, value, onChange, label }) => {

    const selectStyles = {
        control: (baseStyles, state) => ({
            ...baseStyles,
            borderRadius: 0,
            fontSize: 12,
            height: 16,
            minHeight: 22,
        }),
        dropdownIndicator: (styles) => ({
            ...styles,
            paddingTop: 2,
            paddingBottom: 2,
        }),
        clearIndicator: (styles) => ({
            ...styles,
            paddingTop: 0,
            paddingBottom: 0,
        }),
    }


    return (< div >
        <span style={{ fontSize: 13 }}>{label}</span>
        <Select styles={selectStyles} options={options} onChange={(e) => onChange(e.value)} value={options.find((e) => e.value == value)} />
    </div >)

}

export default DropDown

