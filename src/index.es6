
import {jsonApi} from './jsonapi';

export {jsonApi};

function parseTid(apiState, tid, id) {
    if(id) {
        return `${tid}:${id}`;
    }
    if(tid && typeof tid == 'object') {
        if(tid.type && tid.id) {
            return `${tid.type}:${tid.id}`;
        } else if(Array.isArray(tid)) {
            return tid[0];
        } else if(tid.alias) {
            return apiState.aliases[tid.alias];
        } else if(tid.listName) {
            const list = apiState.lists[tid.listName];
            return list && list.tids && list.tids[0];
        } else {
            throw new Error('Bad identifier');
        }
    }
    return tid;
}

function parseTidsList(apiState, desc) {
    if(typeof desc == 'string') {
        return [desc];
    }
    if(desc && typeof desc == 'object') {
        if(desc.type && desc.id) {
            return [`${desc.type}:${desc.id}`];
        } else if(Array.isArray(desc)) {
            return desc;
        } else if(desc.alias) {
            return [apiState.aliases[desc.alias]];
        } else if(desc.listName) {
            const list = apiState.lists[desc.listName];
            return (list && list.tids) || [];
        }
    }
    throw new Error('Bad description');
}

export function getElement(apiState, tid, id) {
    return apiState.objects[parseTid(apiState, tid, id)] || null;
}

export function getElementOptimistic(apiState, tid, id) {
    tid = parseTid(apiState, tid, id);
    return tid in apiState.updatesMerged ? apiState.updatesMerged[tid] : apiState.objects[tid] || null;
}

export function getElements(apiState, desc) {
    return parseTidsList(apiState, desc).map(tid => apiState.objects[tid]);
}

export function getElementsOptimistic(apiState, desc) {
    return parseTidsList(apiState, desc).map(tid => tid in apiState.updatesMerged ? apiState.updatesMerged[tid] : apiState.objects[tid]);
}

export function getListData(apiState, listName) {
    return apiState.lists[listName];
}

/**
 * @deprecated
 */
export function getListElements(apiState, listName) {
    const list = apiState.lists[listName];
    if(list && list.tids) {
        return list.tids.map(tid => apiState.objects[tid]);
    }
    return [];
}

/**
 * @deprecated
 */
export function getListElementsOptimistic(apiState, listName) {
    const list = apiState.lists[listName];
    if(list && list.tids) {
        return list.tids.map(tid => apiState.updatesMerged[tid] || apiState.objects[tid]);
    }
    return [];
}

function subMerge(state, upd, key) {
    if(upd[key]) {
        state[key] = {
            ...state[key],
            ...upd[key]
        };
    }
}

function merge(state, upd) {
    state = {...state};
    subMerge(state, upd, 'objects');
    if(upd.inclusions) {
        for(const [tid, include] of upd.inclusions) {
            const res = parseIncludeAliases(state.objects, tid, include);
            state.lists = {...state.lists, ...res.lists};
            state.aliases = {...state.aliases, ...res.aliases};
        }
    }
    subMerge(state, upd, 'lists'); // deprecated
    subMerge(state, upd, 'aliases'); // deprecated
    if(upd.deleteUpdates) {
        state.updates = {...state.updates};
        state.updatesMerged = {...state.updatesMerged};
        for(const tid in upd.deleteUpdates) {
            state.updates[tid] = {...state.updates[tid]};
            for(const updKey of upd.deleteUpdates[tid]) {
                delete state.updates[tid][updKey];
            }
            if(!Object.keys(state.updates[tid]).length) {
                delete state.updates[tid];
            }
            mergeUpdates(state.updatesMerged, state.objects, state.updates, tid);
        }
    }
    if(upd.addUpdates) {
        state.updates = {...state.updates};
        state.updatesMerged = {...state.updatesMerged};
        for(const tid in upd.addUpdates) {
            state.updates[tid] = {
                ...state.updates[tid] || {},
                ...upd.addUpdates[tid]
            };
            // state.updatesMerged[tid] = {...state.updatesMerged[tid]};
            mergeUpdates(state.updatesMerged, state.objects, state.updates, tid);
        }
    }
    return state;
}

// !!! This method modifies its first argument
function mergeUpdates(updatesMerged, objects, updates, tid) {
    const original = objects[tid];
    const updatesOfObject = updates[tid];
    if(!original || !updatesOfObject) {
        delete updatesMerged[tid];
        return;
    }
    const [type, id] = tid.split(':');
    let res = {
        tid,
        id,
        type,
        attrs: {...original.attrs},
        rels: {...original.rels}
    };
    for(const updKey in updatesOfObject) {
        const update = updatesOfObject[updKey];
        if(!update) {
            res = null;
            break;
        }
        if(update.attrs) {
            for (const key in update.attrs) {
                res.attrs[key] = update.attrs[key];
            }
        }
        if(update.rels) {
            for (const name in update.rels) {
                res.rels[name] = update.rels[name];
            }
        }
    }
    updatesMerged[tid] = res;
}

function parseIncludeAliases(objects, id, include) {
    const result = {
        aliases: {},
        lists: {}
    };
    function deep(id, include) {
        let meta = {};
        if(id && id.tids) {
            meta = id.meta;
            id = id.tids;
        }
        if(Array.isArray(id)) {
            if(include.$listName) {
                result.lists[include.$listName] = {tids: id, meta};
            }
            id = id[0];
        } else {
            if(include.$listName) {
                result.lists[include.$listName] = id ? {tids: [id], meta} : null;
            }
        }
        if(include.$alias) {
            result.aliases[include.$alias] = id || null;
        }
        const object = id && objects[id];
        for(const subName in include) {
            if(subName[0] == '$') {
                continue;
            }
            deep(object && object.rels[subName], include[subName]);
        }
    }
    deep(id, include);
    return result;
}

export class ApiClient {
    constructor({clientName = 'api', fields = {}} = {}) {
        this._clientName = clientName;
        this._fields = fields;
    }

    use(module) {
        return module(this);
    }

    reducer() {
        return (state, action) => {
            if(!state) {
                state = {
                    updates: {}, // processing updates
                    updatesMerged: {}, // objects merged with updates data (for optimistic reads)
                    objects: {}, // list of objects received from server
                    aliases: {}, // aliases
                    lists: {} // lists
                };
            }
            if(action.clientName == this._clientName) switch(action.type) {
                case 'JAP_LOAD_START':
                case 'JAP_LOAD_ERROR':
                case 'JAP_LOAD_END':
                case 'JAP_CHANGE_START':
                case 'JAP_CHANGE_ERROR':
                case 'JAP_CHANGE_END':
                    return merge(state, action);
            }
            return state;
        }
    }
}