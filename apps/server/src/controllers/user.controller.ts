import type { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service.js';
import { createError } from '../middlewares/errorHandler.js';

// 获取所有用户
export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await UserService.findAll();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
}

// 根据 ID 获取用户
export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      throw createError('User ID is required', 400);
    }
    const user = await UserService.findById(id);

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// 创建用户
export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      throw createError('Name and email are required', 400);
    }

    const user = await UserService.create({ name, email });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// 更新用户
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      throw createError('User ID is required', 400);
    }
    const { name, email } = req.body;

    const user = await UserService.update(id, { name, email });

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

// 删除用户
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      throw createError('User ID is required', 400);
    }
    const deleted = await UserService.delete(id);

    if (!deleted) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
