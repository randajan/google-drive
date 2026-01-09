

export const vault = new WeakMap();

export const _modes = ["MERGE", "PULL", "PUSH"];

export const _recStates = [ "OK", "PULL", "PUSH", "DEL" ];

export const _onMissingActions = ["wait", "revive", "remove"];