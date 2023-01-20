export const MODEL_PITCHES = 36;
export const MODEL_TIMESTEPS = 32;

export const MODEL_PARAMS = {
    "guillaume": {
        "path": "./guillaume.onnx", "defaults": {
            "nSteps": 30, "temperature": 0.85, "activityBias": 0.65
        },
    },
    "sonic": {
        "path": "./model.onnx", "defaults": {
            "nSteps": 20, "temperature": 1.0, "activityBias": 0.85
        }
    },
    "tiny": {
        "path": "./tiny.onnx", "defaults": {
            "nSteps": 20, "temperature": 0.85, "activityBias": 0.85
        }
    }
}
