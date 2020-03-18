import * as React from 'react';

export const Counter = () => {
  const [counter, setCounter] = React.useState(0);

  React.useEffect(() => {
    let inner_count = counter;

    const interval = setInterval(() => {
      setCounter(inner_count++);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return <div>Counter: {counter}</div>;
}
