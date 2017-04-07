<!--
TODO
- information on async data
- change & elaborate wording up top
- elaborate on why we're using "tail" here
- "models" section
-->

Mesh can easily be used with React. Here's an example of how you might integrate the two libraries:

```javascript
import React from "react";
import ApplicationBus from "./application-bus";

var TodoListComponent = React.createClass({
  getInitialState: function() {
    return {
      todoItems : []
    };
  },
  componentDidMount: function() {

    this._operationTail = this.props.bus.execute({ action: "tail" });

    // update this component if any operation is completed against the bus
    this._operationTail.pipeTo({
      write: this.update
    });

    // fetch all the data for immediately & update the state
    this.update();
  },
  update: async function() {
    this.setState({
      todoItems: await this.props.bus.execute({ action: "getTodoItems" }).readAll()
    })
  },
  render: function() {
    return <div>

      <ul>
        { this.state.todoItems.map((todoItem) => {
          return <TodoItemComponent data={todoItem} {...this.props} />;
        })}
      </ul>

      <TodoFooterComponent {...this.props} />
    </div>
  }
});

var TodoItemComponent = React.createClass({
  removeTodoItem: function() {
    this.props.bus.execute({
      action: "removeTodoItem",
      data: this.props.data
    });
  },
  render: function() {
    return <li>
      { this.props.data.text } <button onClick={this.removeTodoItem}>remove</button>
    </li>;
  }
});

var TodoFooterComponent = React.createClass({
  addTodoItem: function() {
    this.props.bus.execute({
      action: "addTodoItem",
      data: {
        text: React.findDOMNode(this.refs.input).value
      }
    });
  },
  render: function() {
    return <div>
      <input type="text" ref="input" onEnter={this.addTodoItem}></input>
    </div>
  }
});

// actually render the component now
React.render(<TodoListComponent bus={ApplicationBus.create()} />, document.body);
```

This basic example is similar to the [Flux](https://facebook.github.io/flux/) architecture where you have one root component that executes an update for the entire application. The `tail` action above is where all the magic happens. Basically, the tail gets triggered whenever an operation gets executed against the bus. When that happens, the component, and all of its sub-components get re-rendered.

<!-- diagram here -->

Here's the `application-bus.js` implementation:

```javascript
import { TailableBus, WrapBus, EmptyResponse } from "mesh"

export function create() {

  var todoItems = [];

  var handlers = {
    addTodoItem: WrapBus.create(function(operation) {
      todoItems.push(operation.data);
    }),
    getTodoItems: WrapBus.create(function(operation) {
      return todoItems;
    }),
    removeTodoItem: WrapBus.create(function(operation) {
      todoItems.splice(todoItems.indexOf(operation.data), 1);
    })
  };

  // create a simple bus which routes operations according to the operation
  // action. If no handler exists, then no-op it.
  var bus = {
    execute: function(operation) {
      var handler = handlers[operation.action];
      return handler ? handler.execute(operation) : EmptyResponse.create();
    }
  };

  // make the bus tailable so that listeners can do stuff *after* an operation executes
  bus = TailableBus.create(bus);

  // register addTail as an action handler. Redirect all actions to the route handlers
  bus = AcceptBus(function(operation) {
    return operation.action === "tail";
  }, bus.addTail.bind(bus), bus);

  return bus;
}
```



<!-- TODO - illustration here -->

The cool thing about this particular example is that it supports asynchronous & realtime data out of the box. If we want to extend this app further to support something like pubnub, websockets, or some other realtime service, all we'd need to do is add a realtime bus adapter. Here's vanilla `realtime-bus.js` stub you can use with just about any protocol:


```javascript
export function create(localBus) {

  // received when some other client sends an operation
  remote.onmessage = function(message) {

    // pass to the remote operation to the local bus
    localBus.execute(JSON.parse(message));
  }

  return {
    execute: function(operation) {
      remote.send(JSON.stringify(operation));
      return localBus.execute(operation); // pass through to the local bus
    }
  };
}
```

With the above implementation, we can go ahead and plug it into our application:

```javascript
import { * as RealtimeBus } from "./realtime-bus";

// bus impl here

var bus = {
  execute: function(operation) {
    // same execute handling code as above
  }
};

// make the bus tailable so that listeners can do stuff *after* an operation executes
bus = TailableBus.create(bus);

// register addTail as an action handler. Redirect all other actions to the route handlers
bus = AcceptBus(function(operation) {
  return operation.action === "tail";
}, bus.addTail.bind(bus), bus);

// make it realtime!
bus = RealtimeBus.create(bus);

React.render(<TodoListComponent bus={bus} />, document.body);
```

That's it - just one line of code and you have a realtime single page app.
