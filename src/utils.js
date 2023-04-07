export const softmax = (x, temperature) => {
    x = x.map((a) => a / temperature);
    let e_x = x.map((a) => Math.exp(a));
    let sum = e_x.reduce((a, b) => a + b);
    return e_x.map((a) => a / sum);
};
