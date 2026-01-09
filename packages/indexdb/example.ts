import { PubSub } from './pubSub';

type AppEvents = {
  message: string;
  count: number;
};

const bus = new PubSub<AppEvents>();

const stopMessageListener = bus.subscribe('message', (text) => {
  console.log('message event received:', text);
});

bus.subscribe('count', (value) => {
  console.log('count event received:', value);
});

bus.publish('message', 'Hello subscribers!');
bus.publish('count', 42);

stopMessageListener();
bus.publish('message', 'Nobody hears this');
