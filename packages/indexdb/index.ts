import { PubSub } from './pubSub';

class IndexDB extends PubSub {
  constructor() {
    super();
  }
}

export default new IndexDB();
