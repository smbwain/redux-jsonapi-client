
Simple jsonapi client for redux with relationships and optimistic/pessimistic updates on board

```
@todo
- Write some documentation for relationships
- Add examples
```

How it works
============

After configuring this library there are only two steps to get it work.

1. Use one of [the action creators](doc/action-creators.md), to make api call.

    E.g. load list of items:

    ```
    dispatch(api.load({
        type: 'items',                // name of jsonapi resource
        filter: {                     // filter to be attached to GET query
            color: 'green'
        },
        listName: 'items'             // name of list to be saved in state
    }));
    ```

    Using it with React, probably you'd like to call it from componentDidMount and/or componentDidUpdate method of your component.

2. Read data from state, using one of [the data accessors](doc/data-accessors.md).

    ```
    const itemsArray = getElements(state.api, {listName: 'items'})
    ```

    Using with React and react-redux, the best place to do it is mapStateToProps function in connect decorator.

Getting started
===============

- This project depends on [redux-thunk](https://www.npmjs.com/package/redux-thunk), so make sure it used in your projects.
  If no, install it first.
- Install redux-jsonapi-client:

    ```
    npm install redux-jsonapi-client --save
    ```
    
- Create some file in your project (e.g. ./api.es6) with configuration of your API

    ```
    import {ApiClient, jsonApi} from 'redux-jsonapi-client';
    
    export const apiClient = new ApiClient();
    export const api = apiClient.use(jsonApi({
        path: 'https://myapi/path/',
        headers: {
            // ...
        }
    }));
    ```

- Add apiClient.reducer to the list of your reducers

    ```
    import {apiClient} from './api.es6';
        
    const store = createStore(
        combineReducers({
            api: apiClient.reducer(),
            // ...
        })
        // ...
    ); 
    ```
    
- Now you have _api_ object in your store. There will be saved jsonapi objects data.

    You should use [action creators](doc/action-creators.md) to make api requests which puts data to store and
    use [data accessors](doc/data-accessors.md) passing state.api, to read data from store.
  
If you use it with React and react-redux, it could look like:

```
import {getElement} from 'redux-jsonapi-client';
import {api} from './api';

@connect((state, ownProps) => ({
    // load user from the state
    user: getElement(state.api, 'users', ownProps.userId)
}))
class UserView extends React.Component {
    
    componentDidMount() {
        // load user data from server, save it into the state
        api.load({
            type: 'users',
            id: this.props.userId
        });
    }
    
    render() {
        // ...
    }
}
```