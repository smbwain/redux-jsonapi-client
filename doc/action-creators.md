
# Action creators

## load

Load single item or list of items from server.

```
api.load({type, id, filter, page, sort, include, listName, alias, entrypoint})
```

- \[type] {string}                  type of jsonapi resource
- \[id] {string}                    pass it in the case of loading single item with known id
- \[filter] {object}                jsonapi filter
- \[page] {object}                  jsonapi page
- \[sort] {object}                  jsonapi sort
- \[include] {object}               include object
- \[listName] {string}              name of items list to be stored in state
- \[alias] {string}                 optional name of single item to be stored in state
- \[entrypoint] {string}            you may pass entrypoint url, instead of passing type/id properties

You should always pass _type_ or _entrypoint_ options.
If you load single item using _type_ option, you should pass _id_ option too.

Options _filter_, _page_ and _sort_ are always added to query (even if the case of loading single item).
But adding them to single item loading request is not a standard, so probably server ignores them in that case.

Result of loading always will be pushed to state, so you are able to get it by item id.
If you'd like to give your objects some identifiers, to get them from state by these identifiers,
you could you _listName_ for item lists and _alias_ for single items.

## create

```
api.create({type, id, attrs, rels, alias, include, meta})
```

Create new item. Sends POST request and saves result into state.

- type {string}                     type of jsonapi resource
- \[id] {string}                    id
- \[attrs] {object}                 object attributes
- \[rels] {object}                  object attributes
- \[alias] {string}                 optional alias of object to be saved in state
- \[include] {object}               include object
- \[meta] {object}                  optional meta object to be sent in POST request

update
------
```
api.update({type, id, attrs, rels, alias, include, meta})
```

Update item. Sends PATCH request and saves result into state.

- type {string}                     type of jsonapi resource
- id {string}                       id
- \[attrs] {object}                 object attributes
- \[rels] {object}                  object attributes
- \[alias] {string}                 optional alias of object to be saved in state
- \[include] {object}               include object
- \[meta] {object}                  optional meta object to be sent in POST request

remove
------
```
api.remove({type, id})
```

Remove item. Sends DELETE request and saves result into state.

- type {string}                     type of jsonapi resource
- id {string}                       id