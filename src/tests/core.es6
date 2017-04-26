
import 'source-map-support/register';

import { ApiClient, getElement, getElementOptimistic } from '../index';
import expect from 'expect'

describe('core', () => {

    const api = new ApiClient();
    const reducer = api.reducer();
    let initState;
    let state;

    it('should init state', () => {
        initState = reducer(undefined, {});
        expect(initState).toEqual({
            aliases: {},
            lists: {},
            objects: {},
            updates: {},
            updatesMerged: {}
        });
    });

    it('should load single entity', () => {
        state = reducer(state, {
            clientName: 'api',
            type: 'JAP_LOAD_END',
            objects: {
                'cols:1': {
                    tid: 'cols:1',
                    type: 'cols',
                    id: '1',
                    attrs: {
                        firstName: 'Joe',
                        lastName: 'Doe'
                    },
                    rels: {}
                }
            }
        });
        expect(state).toEqual({
            aliases: {},
            lists: {},
            objects: {
                "cols:1": {
                    "attrs": {
                        firstName: 'Joe',
                        lastName: 'Doe'
                    },
                    "id": "1",
                    "rels": {},
                    "tid": "cols:1",
                    "type": "cols"
                }
            },
            updates: {},
            updatesMerged: {}
        });
        expect(getElement(state, 'cols', '1')).toEqual({
            "attrs": {
                firstName: 'Joe',
                lastName: 'Doe'
            },
            "id": "1",
            "rels": {},
            "tid": "cols:1",
            "type": "cols"
        });
        expect(getElementOptimistic(state, 'cols', '1')).toEqual({
            "attrs": {
                firstName: 'Joe',
                lastName: 'Doe'
            },
            "id": "1",
            "rels": {},
            "tid": "cols:1",
            "type": "cols"
        });
    });

    describe('changing', () => {
        const updKey = Math.random().toString().slice(2);
        let updatingState;

        it('should start updating record', () => {
            updatingState = reducer(state, {
                clientName: 'api',
                type: 'JAP_CHANGE_START',
                addUpdates: {
                    'cols:1': {
                        [updKey]: {
                            attrs: {
                                firstName: 'Mike'
                            }
                        }
                    }
                }
            });
            expect(updatingState).toEqual({
                aliases: {},
                lists: {},
                objects: {
                    "cols:1": {
                        "attrs": {
                            firstName: 'Joe',
                            lastName: 'Doe'
                        },
                        "id": "1",
                        "rels": {},
                        "tid": "cols:1",
                        "type": "cols"
                    }
                },
                "updates": {
                    "cols:1": {
                        [updKey]: {
                            attrs: {
                                firstName: 'Mike'
                            }
                        }
                    }
                },
                "updatesMerged": {
                    "cols:1": {
                        attrs: {
                            firstName: 'Mike',
                            lastName: 'Doe'
                        },
                        "id": "1",
                        "rels": {},
                        "tid": "cols:1",
                        "type": "cols"
                    }
                }
            });
            expect(getElement(updatingState, 'cols', '1')).toEqual({
                "attrs": {
                    firstName: 'Joe',
                    lastName: 'Doe'
                },
                "id": "1",
                "rels": {},
                "type": "cols",
                "tid": "cols:1",
            });
            expect(getElementOptimistic(updatingState, 'cols', '1')).toEqual({
                "attrs": {
                    firstName: 'Mike',
                    lastName: 'Doe'
                },
                "id": "1",
                "rels": {},
                "tid": "cols:1",
                "type": "cols"
            });
        });

        it('should finish deleting of existing record', () => {
            expect(reducer(updatingState, {
                clientName: 'api',
                type: 'JAP_CHANGE_END',
                objects: {
                    'cols:1': null
                },
                deleteUpdates: {
                    'cols:1': [updKey]
                },
            })).toEqual({
                aliases: {},
                lists: {},
                objects: {
                    "cols:1": null
                },
                "updates": {},
                "updatesMerged": {}
            });
        });

        it('should fail deleting of existing record', () => {
            expect(reducer(updatingState, {
                clientName: 'api',
                type: 'JAP_CHANGE_ERROR',
                deleteUpdates: {
                    'cols:1': [updKey]
                }
            })).toEqual({
                aliases: {},
                lists: {},
                objects: {
                    "cols:1": {
                        "attrs": {
                            firstName: 'Joe',
                            lastName: 'Doe'
                        },
                        "id": "1",
                        "rels": {},
                        "tid": "cols:1",
                        "type": "cols"
                    }
                },
                "updates": {},
                "updatesMerged": {}
            });
        });
    });

    describe('deleting', () => {
        const updKey = Math.random().toString().slice(2);
        let deletitionState;

        it('should start deleting of existing record', () => {
            deletitionState = reducer(state, {
                clientName: 'api',
                type: 'JAP_CHANGE_START',
                addUpdates: {
                    'cols:1': {
                        [updKey]: null
                    }
                },
                op: 'DELETE'
            });
            expect(deletitionState).toEqual({
                aliases: {},
                lists: {},
                objects: {
                    "cols:1": {
                        "attrs": {
                            "firstName": "Joe",
                            "lastName": "Doe"
                        },
                        "id": "1",
                        "rels": {},
                        "tid": "cols:1",
                        "type": "cols"
                    }
                },
                "updates": {
                    "cols:1": {
                        [updKey]: null
                    }
                },
                "updatesMerged": {
                    "cols:1": null
                }
            });
            expect(getElement(deletitionState, 'cols', '1')).toEqual({
                "attrs": {
                    "firstName": "Joe",
                    "lastName": "Doe"
                },
                "id": "1",
                "rels": {},
                "tid": "cols:1",
                "type": "cols"
            });
            expect(getElementOptimistic(deletitionState, 'cols', '1')).toEqual(null);
        });

        it('should finish deleting of existing record', () => {
            expect(reducer(deletitionState, {
                clientName: 'api',
                type: 'JAP_CHANGE_END',
                objects: {
                    'cols:1': null
                },
                deleteUpdates: {
                    'cols:1': [updKey]
                },
            })).toEqual({
                aliases: {},
                lists: {},
                objects: {
                    "cols:1": null
                },
                "updates": {},
                "updatesMerged": {}
            });
        });

        it('should fail deleting of existing record', () => {
            expect(reducer(deletitionState, {
                clientName: 'api',
                type: 'JAP_CHANGE_ERROR',
                deleteUpdates: {
                    'cols:1': [updKey]
                }
            })).toEqual({
                aliases: {},
                lists: {},
                objects: {
                    "cols:1": {
                        "attrs": {
                            "firstName": "Joe",
                            "lastName": "Doe"
                        },
                        "id": "1",
                        "rels": {},
                        "tid": "cols:1",
                        "type": "cols"
                    }
                },
                "updates": {},
                "updatesMerged": {}
            });
        });
    });

    describe('creating', () => {
        const updKey = Math.random().toString().slice(2);
        let updatingState;

        it('should start creating of record', () => {
            updatingState = reducer(initState, {
                clientName: 'api',
                type: 'JAP_CHANGE_START',
                addUpdates: {
                    'users:@test': {
                        [updKey]: {
                            attrs: {
                                firstName: 'Sandi'
                            }
                        }
                    }
                }
            });
            expect(updatingState).toEqual({
                aliases: {},
                lists: {},
                objects: {},
                "updates": {
                    "users:@test": {
                        [updKey]: {
                            attrs: {
                                firstName: 'Sandi'
                            }
                        }
                    }
                },
                "updatesMerged": {}
            });
            /*expect(getElement(updatingState, 'cols', '1')).toEqual({
                "attrs": {
                    firstName: 'Joe',
                    lastName: 'Doe'
                },
                "id": "1",
                "rels": {},
                "type": "cols",
                "tid": "cols:1",
            });
            expect(getElementOptimistic(updatingState, 'cols', '1')).toEqual({
                "attrs": {
                    firstName: 'Mike',
                    lastName: 'Doe'
                },
                "id": "1",
                "rels": {},
                "tid": "cols:1",
                "type": "cols"
            });*/
        });

        it('should finish creating of record', () => {
            expect(reducer(updatingState, {
                clientName: 'api',
                type: 'JAP_CHANGE_END',
                objects: {
                    'users:2': {
                        attrs: {
                            firstName: 'Sandi',
                            lastName: 'Unknown'
                        }
                    }
                },
                deleteUpdates: {
                    'users:@test': [updKey]
                },
            })).toEqual({
                aliases: {},
                lists: {},
                objects: {
                    "users:2": {
                        "attrs": {
                            "firstName": "Sandi",
                            "lastName": "Unknown"
                        }
                    }
                },
                "updates": {},
                "updatesMerged": {}
            });
        });

        it('should fail creating of record', () => {
            expect(reducer(updatingState, {
                clientName: 'api',
                type: 'JAP_CHANGE_ERROR',
                deleteUpdates: {
                    'users:@test': [updKey]
                }
            })).toEqual({
                aliases: {},
                lists: {},
                objects: {},
                "updates": {},
                "updatesMerged": {}
            });
        });
    });

    /*it('should set state for very first object loading', () => {
        expect(
            reducer(
                initialState,
                {
                    type: 'JAP_LOAD_START',
                    clientName: 'api',
                    tid: 'books:123'
                }
            )
        ).toEqual({
            lists: {},
            objects: {
                'books:123': {
                    tid: 'books:123',
                    loading: 1
                }
            }
        });
    });*/

    /*it('should set state for next object loading', () => {
        expect(
            reducer(
                {
                    lists: {},
                    objects: {
                        'books:123': {
                            tid: 'books:123',
                            attrs: {
                                name: 'Some book'
                            },
                            loading: 1
                        },
                        'books:456': {
                            tid: 'books:456',
                            loading: 0,
                            error: true
                        }
                    }
                },
                {
                    type: 'JAP_LOAD_START',
                    clientName: 'api',
                    tid: 'books:123'
                }
            )
        ).toEqual({
            lists: {},
            objects: {
                'books:123': {
                    attrs: {
                        name: 'Some book'
                    },
                    loading: 2,
                    tid: 'books:123'
                },
                'books:456': {
                    error: true,
                    loading: 0,
                    tid: 'books:456'
                }
            }
        });
    });*/
});