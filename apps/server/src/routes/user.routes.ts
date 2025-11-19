import { Router } from 'express';
import type { Router as RouterType } from 'express';
import * as userController from '../controllers/user.controller.js';

const router: RouterType = Router();

// 获取所有用户
router.get('/', userController.getAllUsers);

// 获取单个用户
router.get('/:id', userController.getUserById);

// 创建用户
router.post('/', userController.createUser);

// 更新用户
router.put('/:id', userController.updateUser);

// 删除用户
router.delete('/:id', userController.deleteUser);

export default router;
