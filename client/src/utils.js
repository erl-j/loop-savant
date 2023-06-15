import * as _ from 'lodash';

export const softmax = (x, temperature) => {
    x = x.map((a) => a / temperature);
    let e_x = x.map((a) => Math.exp(a));
    let sum = e_x.reduce((a, b) => a + b);
    return e_x.map((a) => a / sum);
};

export const sample_categorical = (probs) => {
    let r = Math.random();
    let i = 0;
    while (r > 0) {
        r -= probs[i];
        i++;
    }
    return i - 1;
}


export const fullToScale = (roll, scale, n_pitches, n_timesteps) => {
    let out_roll_2d = []
    for (let octave = 0; octave < (1 + Math.floor(n_pitches/ 12)); octave++) {
        for (let i = 0; i < scale.length; i++) {
            let idx = scale[i] + octave * 12
            if (idx >= n_pitches) {
                break
            }
            else {
                out_roll_2d.push(roll.slice(idx * n_timesteps , (idx + 1) * n_timesteps))
            }
        }
    }
    return out_roll_2d.flat()
}

export const scaleToFull = (roll, scale, n_pitches, n_timesteps) => {
    let out_roll_2d = []
    let roll_2d = _.chunk(roll, n_timesteps)
    for (let pitch = 0; pitch < n_pitches; pitch++) {
        if (scale.includes(pitch % 12)) {
            out_roll_2d.push(roll_2d.shift())
        }
        else {
            out_roll_2d.push(new Array(n_timesteps).fill(0))
        }
    }
    return out_roll_2d.flat()
}


export const unixtimestampToHumanReadableTimeAgo = (unixTimestamp) => {
    const seconds = Math.floor((new Date() - unixTimestamp * 1000) / 1000);

    let interval = seconds / 31536000;

    if (interval > 1) {
        return Math.floor(interval) + " years ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
        return Math.floor(interval) + " months ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
        return Math.floor(interval) + " days ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
        return Math.floor(interval) + " hours ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
        return Math.floor(interval) + " minutes ago";
    }
    return "just now";
}
