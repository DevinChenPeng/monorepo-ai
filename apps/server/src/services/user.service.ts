import type {
  User,
  CreateUserDTO,
  UpdateUserDTO,
} from "../types/user.types.js";

// 模拟数据库
let users: User[] = [
  {
    id: "1",
    name: "Alice",
    email: "alice@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "Bob",
    email: "bob@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export class UserService {
  // 获取所有用户
  static async findAll(): Promise<User[]> {
    return users;
  }

  // 根据 ID 获取用户
  static async findById(id: string): Promise<User | undefined> {
    return users.find((user) => user.id === id);
  }

  // 创建用户
  static async create(data: CreateUserDTO): Promise<User> {
    const newUser: User = {
      id: String(users.length + 1),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(newUser);
    return newUser;
  }

  // 更新用户
  static async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return null;

    const currentUser = users[index]!;
    const updatedUser: User = {
      id: currentUser.id,
      name: data.name ?? currentUser.name,
      email: data.email ?? currentUser.email,
      createdAt: currentUser.createdAt,
      updatedAt: new Date(),
    };
    users[index] = updatedUser;
    return updatedUser;
  }

  // 删除用户
  static async delete(id: string): Promise<boolean> {
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) return false;

    users.splice(index, 1);
    return true;
  }
}
