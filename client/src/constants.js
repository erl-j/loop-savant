export const MODEL_PITCHES = 36;
export const MODEL_TIMESTEPS = 32;
export const SCALE = [0, 2, 4, 5, 7, 9, 11]

export const MIN_NOTE = 38;

export const MODEL_PARAMS = {
    "guillaume": {
        "path": "./guillaume4.onnx", "defaults": {
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
            "nSteps": 20, "temperature": 0.85, "activityBias": 0.9
        }
    },
    "clm": {
        "path": "./clm0.onnx", "defaults": {
            "nSteps": 20, "temperature": 0.85, "activityBias": 0.85
        }
    }
    ,
    "clm_quick": {
        // "path": "./clm_quick.onnx",
        "path": "./128_6_4.onnx",
        "defaults": {
            "nSteps": 20, "temperature": 0.85, "activityBias": 0.85
        }
    }
    ,
    "clm_medium": {
        "path": "./256_8_4.onnx", "defaults": {
            "nSteps": 20, "temperature": 0.85, "activityBias": 0.85
        }
    }
}
