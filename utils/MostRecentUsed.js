// All actions gets categorized
export const ACTIONS = ["summarize", "quality", "compare"];

// Storage key for the saved order
export const KEY = "most_recent_used";
export const PROMOTED_KEY = "promoted";

// Big buttons shown by default and allowed range
export const DEFAULT_MAX_COUNT = 2;
const MIN_COUNT = 1;
const MAX_COUNT = 3;


// live-compare is a shortcut for compare
// It will not change the order
function liveCompare(action){
    if (action === "live-compare") {
        return;
    }

    return action;
}


// Turn any saved value into a number between 1 and 3
export function Count(value){
    const number = parseInt(value, 10);
    if(isNaN(number)){
        return DEFAULT_MAX_COUNT;
    }
    if(number < MIN_COUNT){
        return MIN_COUNT;
    }
    if(number > MAX_COUNT){
        return MAX_COUNT;
    }
    return number;
}


// This will clean up the saved order
// Also remove unknown or repeated names
// add any missing action at the end
export function normalOrder(savedOrder){
    const cleaned = [];
    if (Array.isArray(savedOrder)) {
        for (const action of savedOrder) {
            const isKnown = ACTIONS.includes(action);
            const isRepeat = cleaned.includes(action);
            if (isKnown && !isRepeat) {
                cleaned.push(action);
            }
        }
    }
    for (const action of ACTIONS) {
        if (!cleaned.includes(action)) {
            cleaned.push(action);
        }
    }
    return cleaned;
}


// Move the action that was just used to the front
export function touchAction(savedOrder, action){
    const name = liveCompare(action);
    const order = normalOrder(savedOrder);
    if (!ACTIONS.includes(name)) {
        return order;
    }
    const newOrder = [name];
    for(const other of order){
        if(other !== name){
            newOrder.push(other);
        }
    }
    return newOrder;
}


// Split into big buttons and the ones under "More"
export function splitAction(savedOrder, promoted){
    const order = normalOrder(savedOrder);
    const count = Count(promoted);
    return {
        promoted: order.slice(0, count),
        rest: order.slice(count)
    }
}