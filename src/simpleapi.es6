
import request from 'browser-request';

function parseResponse(url, onSuccess, onError) {
    return (error, response, body) => {
        let data;
        try {
            if (error) {
                throw err;
            }
            if (Math.floor(response.statusCode / 100) != 2) {
                throw new Error(`${url}: ${response.statusCode}`);
            }
            try {
                data = JSON.parse(body);
            } catch (err) {
                throw new Error(`${url}: Wrong json`);
            }
        } catch (err) {
            console.error(err.stack || err);
            onError(err);
            return;
        }
        onSuccess(data);
    }
}

function addObject(type, data, object) {
    const tid = `${type}:${object.Id}`;
    const attrs = {};
    for(const name in object) {
        if(name != 'Id') {
            attrs[name] = object[name];
        }
    }
    data.objects[tid] = {
        attrs
    };
}

function addObjects(type, data, objects) {
    for(const object of objects) {
        addObject(type, data, object);
    }
}

function addList(type, container, listName, objects) {
    container.lists[listName] = {
        tids: objects.map(item => `${type}:${item.Id}`)
    };
}

export function simpleApi({path = '/', customHeaders = {}}) {
    function buildUrl(entrypoint) {
        return path + entrypoint;
    }

    function buildHeaders() {
        return {
            ...customHeaders
        };
    }

    return apiClient => {
        const clientName = apiClient._clientName;
        return {
            /**
             * @param collection
             * @param entrypoint
             * @param listName
             * @param tid
             * @returns {function(*)}
             */
            load({type, entrypoint, listName, tid} = {}) {
                return dispatch => {
                    dispatch({
                        type: 'JAP_LOAD_START',
                        clientName,
                        listName,
                        tid
                    });
                    const url = buildUrl(entrypoint);
                    request({
                        url,
                        headers: {
                            ...buildHeaders(),
                            'accept': 'application/vnd.api+json'
                        },
                        encoding: 'utf8'
                    }, parseResponse(url, response => {
                        const data = {
                            objects: {},
                            lists: {}
                        };
                        if(Array.isArray(response)) {
                            addObjects(type, data, response);
                            addList(type, data, listName, response);
                        } else if(response) {
                            addObject(type, data, response);
                        }
                        dispatch({
                            type: 'JAP_LOAD_END',
                            clientName,
                            listName,
                            tid,
                            lists: Object.keys(data.lists).keys ? data.lists : null,
                            objects: Object.keys(data.objects).keys ? data.objects : null
                        });
                    }, err => {
                        dispatch({
                            type: 'JAP_LOAD_ERROR',
                            clientName,
                            listName,
                            tid
                        });
                    }));
                };
            },

            update(tid, attrs) {
                return dispatch => {
                    dispatch({
                        type: 'JAP_UPDATE_START',
                        tid,
                        clientName
                    });
                    const [type, id] = tid.split(':');
                    const url = buildUrl(`${type}/${id}`);
                    request({
                        url,
                        headers: {
                            ...buildHeaders(),
                            'Content-type': 'application/vnd.api+json'
                        },
                        encoding: 'utf8',
                        method: 'PATCH',
                        body: JSON.stringify({
                            data: {
                                attributes: attrs
                            }
                        })
                    }, parseResponse(data => {
                        dispatch({
                            type: 'JAP_UPDATE_END',
                            tid,
                            data: data.data,
                            clientName
                        });
                    }, err => {
                        dispatch({
                            type: 'JAP_UPDATE_ERROR',
                            tid,
                            clientName
                        });
                    }));
                };
            }
        };
    };
}