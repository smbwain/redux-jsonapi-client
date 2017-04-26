
# Data accessors

Data accessors are static methods and could be imported from redux-jsonapi-client.
You should pass api state as first argument to data accessor.

## getElement

Read single element from state. Return null if there isn\' any.

```
getElement(apiState, type, id)      // reads single item by type and id
getElement(apiState, tid)           // by "tipe:id"
getElement(apiState, [tid, ...])
getElement(apiState, {type, id})    
getElement(apiState, {alias})       // by alias
getElement(apiState, {listName})    // reads first item of list by listName
```

## getElementOptimistic

Similar to getElement.

The difference is when you are sending update for some element, ___getElement___ still returns previous element version until server processes your update.
It returns new element version only after server has been processed your update.

___getElementOptimistic___ returns new version of object since the moment when you start your update on the assumption that a remote operation will succeed.
When your update's been completed, state will be updated. If server rejects your update, ___getElementOptimistic___ will switch back to original version.

```
getElementOptimistic(apiState, type, id)
getElementOptimistic(apiState, tid)
getElementOptimistic(apiState, [tid, ...])
getElementOptimistic(apiState, {type, id})
getElementOptimistic(apiState, {alias})
getElementOptimistic(apiState, {listName})
```

## getElements
-----------

Read list of items as array. Return empty array if there isn\'t appropriate list.

```
getElements(apiState, {listName})               // by listName

getElements(apiState, tid)                      // read single item as a list (wrapped in array) 
getElements(apiState, [tid, ...])
getElements(apiState, {type, id})
getElements(apiState, {alias})
```

## getListElementsOptimistic
-------------------------

The difference from getElements is the same as between getElement and getElementOptimistic. 

```
getElementsOptimistic(apiState, {listName})
getElementsOptimistic(apiState, tid)
getElementsOptimistic(apiState, [tid, ...])
getElementsOptimistic(apiState, {type, id})
getElementsOptimistic(apiState, {alias})
```