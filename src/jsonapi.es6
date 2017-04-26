
import request from 'superagent';

function req(options) {
    let req = request(options.method || 'GET', options.url);
    if(options.headers) {
        for(const key in options.headers) {
            req = req.set(key, options.headers[key]);
        }
    }
    if(options.body) {
        req = req.send(options.body);
    }
    return req;
}

function addObject(objects, data) {
    const obj = createObject(data);
    objects[obj.tid] = obj;
}

function createObject(data) {
    const obj = {
        tid: `${data.type}:${data.id}`,
        type: data.type,
        id: data.id,
        attrs: data.attributes,
        rels: {}
    };
    const rels = data.relationships;
    if(rels) {
        for (const relName in rels) {
            const data = rels[relName].data;
            if(Array.isArray(data)) {
                obj.rels[relName] = data.map(relEl => `${relEl.type}:${relEl.id}`);
            } else if(data) {
                obj.rels[relName] = `${data.type}:${data.id}`;
            } else {
                obj.rels[relName] = null;
            }
        }
    }
    return obj;
}

function addObjects(objects, data) {
    for(const item of data) {
        addObject(objects, item);
    }
}

function objectToQueryString(a) {
    function buildParams(prefix, obj, add) {
        var name, i, l, rbracket;
        rbracket = /\[\]$/;
        if (obj instanceof Array) {
            for (i = 0, l = obj.length; i < l; i++) {
                if (rbracket.test(prefix)) {
                    add(prefix, obj[i]);
                } else {
                    buildParams(prefix + "[" + ( typeof obj[i] === "object" ? i : "" ) + "]", obj[i], add);
                }
            }
        } else if (typeof obj == "object") {
            // Serialize object item.
            for (name in obj) {
                buildParams(prefix + "[" + name + "]", obj[ name ], add);
            }
        } else if (typeof obj == 'boolean') {
            add(prefix, obj ? '1' : '');
        } else if(obj !== undefined) {
            // Serialize scalar item.
            add(prefix, obj);
        }
    }

    var prefix, s, add, name, r20, output;
    s = [];
    r20 = /%20/g;
    add = function (key, value) {
        // If value is a function, invoke it and return its value
        value = ( typeof value == 'function' ) ? value() : ( value == null ? "" : value );
        s[ s.length ] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
    };
    if (a instanceof Array) {
        for (name in a) {
            add(name, a[name]);
        }
    } else {
        for (prefix in a) {
            buildParams(prefix, a[ prefix ], add);
        }
    }
    output = s.join("&").replace(r20, "+");
    return output;
}

function packFields(fields) {
    if(!fields) {
        return undefined;
    }
    const res = {};
    for(const name in fields) {
        res[name] = Array.isArray(fields[name]) ? fields.name.join(',') : fields;
    }
    return res;
}

function packInclude(include) {
    if(!include) {
        return undefined;
    }
    const res = [];
    const path = [];
    function deep(obj) {
        let noSubs = true;
        for (const name in obj) {
            if(name[0] == '$') {
                continue;
            }
            noSubs = false;
            path.push(name);
            deep(obj[name]);
            path.pop();
        }
        if(noSubs) {
            res.push(path.join('.'));
        }
    }
    deep(include);
    if(!res.length) {
        return undefined;
    }
    return res.join(',');
}

function packSort(sort) {
    if(Array.isArray(sort)) {
        sort = sort.map(sortElement => {
            if(Array.isArray(sortElement)) {
                return (sortElement[1] ? '' : '-') + sortElement[0];
            }
            return sortElement;
        }).join(',');
    }
    return sort;
}

export function jsonApi({
    path = '/',
    headers: configuredHeaders = {}
}) {
    function buildUrl(entrypoint, params) {
        const queryParams = objectToQueryString(params);
        return path + entrypoint + (queryParams ? (entrypoint.indexOf('?') == -1 ? '?' : '&')+queryParams : '');
    }

    function buildHeaders(getState) {
        return typeof configuredHeaders == 'function' ? configuredHeaders(getState) : {...configuredHeaders};
    }

    return apiClient => {
        const clientName = apiClient._clientName;

        function change(op, {type, id, attrs, rels: passedRels, alias, include, meta}) {
            const autoId = !id && op == 'POST';
            if(autoId) {
                id = '@' + Math.random().toString().slice(2);
            }
            const tid = `${type}:${id}`;
            const updKey = Math.random().toString().slice(2);
            let rels;
            if(passedRels) {
                rels = {};
                const stringify = obj => typeof obj == 'string' ? obj : `${obj.type}:${obj.id}`;
                for(const name in passedRels) {
                    const passedRel = passedRels[name];
                    rels[name] = passedRel == null
                        ? null
                        : Array.isArray(passedRel) ? passedRel.map(stringify) : stringify(passedRel);
                }
            }
            return (dispatch, getState) => {
                dispatch({
                    clientName,
                    op,
                    type: 'JAP_CHANGE_START',
                    addUpdates: op == 'DELETE' ? {
                        [tid]: {
                            [updKey]: null
                        }
                    } : {
                        [tid]: {
                            [updKey]: {
                                attrs,
                                rels
                            }
                        }
                    },
                    inclusions: (alias && !autoId) ? [tid, {
                        $alias: alias
                    }] : undefined
                });
                let relationships;
                if(rels) {
                    relationships = {};
                    const objectify = str => {
                        const parts = str.split(':');
                        return {
                            type: parts[0],
                            id: parts[1]
                        };
                    };
                    for(const relName in rels) {
                        const rel = rels[relName];
                        relationships[relName] = {
                            data: rel === null
                                ? null
                                : Array.isArray(rel)
                                    ? rel.map(objectify)
                                    : objectify(rel)
                        };
                    }
                }
                return Promise.resolve(req({
                    url: buildUrl(op == 'POST' ? type : `${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {
                        include: packInclude(include)
                    }),
                    headers: {
                        ...buildHeaders(getState),
                        'Content-type': 'application/vnd.api+json'
                    },
                    encoding: 'utf8',
                    method: op,
                    body: op == 'DELETE' ? undefined : JSON.stringify({
                        data: {
                            id: autoId ? undefined : id,
                            type,
                            attributes: attrs,
                            relationships
                        },
                        meta
                    })
                })).then(response => {
                    const body = response.body;
                    const inclusions = [];
                    const objects = {};
                    if(op != 'DELETE') {
                        const object = createObject(body.data);
                        objects[object.tid] = object;
                        if (body.included) {
                            addObjects(objects, body.included);
                        }
                        if (include) {
                            inclusions.push([object.tid, include]);
                        }
                        if (alias) {
                            inclusions.push([object.tid, {
                                $alias: alias
                            }]);
                        }
                    }
                    dispatch({
                        clientName,
                        type: 'JAP_CHANGE_END',
                        objects: op == 'DELETE' ? undefined : objects,
                        deleteUpdates: {
                            [tid]: [updKey]
                        },
                        inclusions
                    });
                    return {
                        getState,
                        response: body
                    };
                }, err => {
                    dispatch({
                        clientName,
                        type: 'JAP_CHANGE_ERROR',
                        deleteUpdates: {
                            [tid]: [updKey]
                        }
                    });
                    throw err;
                });
            };
        }

        /**
         * @param collection
         * @param entrypoint
         * @param listName
         * @param tid
         * @param filter
         * @param page
         * @param include
         * @returns {*} Action
         * load({url: '', listName: ''})
         */
        function load({collection, entrypoint, listName, type, id, tid, filter, page, sort, include, alias} = {}) {
            if(collection) {
                /*if(entrypoint) {
                 throw new Error(`You couldn't use "entrypoint" config with "collection"`);
                 }*/
                entrypoint = collection;
            }
            if(type && id) {
                entrypoint = `${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
                tid = `${type}:${id}`;
            } else if(tid) {
                const [type, id] = tid.split(':');
                entrypoint = `${encodeURIComponent(type)}/${encodeURIComponent(id)}`;
            }
            /*const inclusions = [];
            if(alias || listName) {
                inclusions.push([tid || null, {
                    $alias: alias,
                    $listName: listName
                }]);
            }
            if(include) {
                inclusions.push([tid || null, include]);
            }*/
            return (dispatch, getState) => {
                dispatch({
                    clientName,
                    type: 'JAP_LOAD_START',
                    //inclusions
                });
                return Promise.resolve(req({
                    url: buildUrl(entrypoint, {
                        filter,
                        page,
                        include: packInclude(include),
                        sort: packSort(sort)
                        // @todo: add fields
                    }),
                    headers: buildHeaders(getState),
                    encoding: 'utf8'
                })).then(response => {
                    const objects = {};
                    const body = response.body;
                    let tids;
                    if(body.included) {
                        addObjects(objects, body.included);
                    }
                    if(Array.isArray(body.data)) {
                        addObjects(objects, body.data);
                        tids = body.data.map(({type, id}) => `${type}:${id}`);
                        /*if(listName) {
                            lists = {
                                [listName]: {
                                    tids,
                                    meta: response.meta
                                }
                            };
                        }*/
                    } else if(body.data) {
                        addObject(objects, body.data);
                    }
                    const inclusions = [];
                    if(alias || listName) {
                        inclusions.push([{tids, meta: body.meta}, {
                            $alias: alias,
                            $listName: listName
                        }]);
                    }
                    if(include) {
                        inclusions.push([tid || null, include]);
                    }
                    dispatch({
                        clientName,
                        type: 'JAP_LOAD_END',
                        objects,
                        inclusions
                    });
                    return {
                        getState,
                        response: body
                    };
                }, err => {
                    dispatch({
                        clientName,
                        type: 'JAP_LOAD_ERROR'
                    });
                    throw err;
                });
            };
        }

        return {
            load,
            update: change.bind(null, 'PATCH'),
            create: change.bind(null, 'POST'),
            remove: change.bind(null, 'DELETE')
        };
    };
}